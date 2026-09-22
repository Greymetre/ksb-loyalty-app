import { PermissionsAndroid, Platform } from "react-native";
import { apiClient } from "@/services/apiClient";
import { showToast } from "@/services/toast";

/**
 * Push notifications (Firebase Cloud Messaging). After sign-in - and on start-up when already
 * signed in - the phone's token is sent to the server, which keeps it on the retailer or dealer;
 * on sign-out it is taken off again.
 *
 * Tapping a notification opens the screen it names. The server puts it in the message data:
 * `screen` (a route, e.g. "InvoiceDetail", "Kyc", "Scheme") and optionally `id` (e.g. the invoice).
 * This works whether the app was open, in the background or closed: the target is held here
 * until App.tsx is signed in and past the splash, then App takes it and navigates.
 *
 * Firebase is loaded defensively: a build without google-services.json / GoogleService-Info.plist,
 * or without the native module, has no Firebase app - then nothing here runs and nothing fails.
 */
type Messaging = any;

let currentToken: string | null = null;
let listening = false;

const loadMessaging = (): Messaging | null => {
  try {
    const { getApps } = require("@react-native-firebase/app");
    if (!getApps().length) return null;
    const { getMessaging } = require("@react-native-firebase/messaging");
    return getMessaging();
  } catch {
    return null;
  }
};

const api = () => require("@react-native-firebase/messaging");

export type PushTarget = { screen: string; id?: string };
let pendingTarget: PushTarget | null = null;
let targetListener: (() => void) | null = null;

const openFromNotification = (message: any) => {
  const screen = message?.data?.screen;
  if (!screen || typeof screen !== "string") return;
  pendingTarget = { screen, id: message?.data?.id ? String(message.data.id) : undefined };
  targetListener?.();
};

/** App.tsx: called whenever a notification is tapped, so it can take the target when ready. */
export const setPushTargetListener = (listener: (() => void) | null) => {
  targetListener = listener;
};

/** App.tsx: the tapped notification's target, once - or null. */
export const takePushTarget = (): PushTarget | null => {
  const target = pendingTarget;
  pendingTarget = null;
  return target;
};

const askPermission = async (messaging: Messaging): Promise<boolean> => {
  if (Platform.OS === "android") {
    if (Number(Platform.Version) < 33) return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const { requestPermission, AuthorizationStatus } = api();
  const status = await requestPermission(messaging);
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
};

const sendToken = async (token: string) => {
  currentToken = token;
  await apiClient.post("/push/register", { token, platform: Platform.OS });
};

/** Call after sign-in, and on start-up when a session is already stored. */
export const registerForPush = async () => {
  const messaging = loadMessaging();
  if (!messaging) return;
  try {
    if (!(await askPermission(messaging))) return;
    const { getToken, onTokenRefresh, onMessage, onNotificationOpenedApp, getInitialNotification } = api();
    const token = await getToken(messaging);
    if (!token) return;
    await sendToken(token);
    if (listening) return;
    listening = true;
    onTokenRefresh(messaging, (next: string) => void sendToken(next).catch(() => undefined));
    // Open, in front: iOS shows the banner itself (firebase.json); Android does not, so the app
    // shows a toast. Tapping a system notification - background or closed - opens its screen.
    onMessage(messaging, (message: any) => {
      if (Platform.OS !== "android") return;
      const title = message?.notification?.title;
      const body = message?.notification?.body;
      if (title || body) showToast([title, body].filter(Boolean).join(": "), "success");
    });
    onNotificationOpenedApp(messaging, openFromNotification);
    void getInitialNotification(messaging).then((message: any) => { if (message) openFromNotification(message); }).catch(() => undefined);
  } catch (error) {
    console.warn("Push registration failed", error);
  }
};

/** Call on sign-out, before the session is cleared, so this phone stops getting that account's notifications. */
export const unregisterForPush = async () => {
  try {
    if (currentToken) await apiClient.post("/push/unregister", { token: currentToken }, { timeout: 6000 });
  } catch {
    // Signing out must not wait on this; the next sign-in on this phone moves the token anyway.
  }
};

/** Required by Firebase for messages that arrive while the app is in the background or closed. */
export const registerBackgroundPushHandler = () => {
  try {
    const { getApps } = require("@react-native-firebase/app");
    if (!getApps().length) return;
    const { getMessaging, setBackgroundMessageHandler } = require("@react-native-firebase/messaging");
    setBackgroundMessageHandler(getMessaging(), async () => undefined);
  } catch {
    // No Firebase in this build.
  }
};
