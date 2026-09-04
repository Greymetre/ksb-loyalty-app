import axios from "axios";
import * as Application from "expo-application";

// Read here rather than importing appVersion, which imports this file back.
const INSTALLED_VERSION = Application.nativeApplicationVersion ?? "";
import { getToken } from "@/services/storage";
import { expireSession } from "@/services/session";
import { showToast } from "@/services/toast";

const DEFAULT_API_BASE_URL = "https://app.ksbindia.co.in/FieldKonnect_API/api";
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL =
  configuredApiBaseUrl && !configuredApiBaseUrl.includes("ksb-angular-frontend-production")
    ? configuredApiBaseUrl
    : DEFAULT_API_BASE_URL;

/** The public privacy policy page. Served by the API host, one level above /api. */
export const PRIVACY_POLICY_URL = `${API_BASE_URL.replace(/\/api\/?$/, "")}/privacy-policy`;

export const apiFileUrl = (path?: string | null) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}/${path.replace(/^\//, "")}`;
};

if (configuredApiBaseUrl && configuredApiBaseUrl !== API_BASE_URL) {
  console.warn("[API CONFIG] Ignoring invalid frontend API URL", {
    configuredApiBaseUrl,
    using: API_BASE_URL
  });
}

console.log("[API CONFIG]", { baseURL: API_BASE_URL });

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: { "Content-Type": "application/json", Accept: "application/json" }
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // The server reads this on any authenticated call and keeps the recorded version in
  // step, so a store update shows up without waiting for the next sign-in. A server
  // that does not read it simply ignores the header.
  if (INSTALLED_VERSION) config.headers["X-App-Version"] = INSTALLED_VERSION;
  console.log("[API REQUEST]", {
    method: config.method?.toUpperCase(),
    url: `${config.baseURL || ""}${config.url || ""}`,
    params: config.params,
    data: config.data
  });
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log("[API RESPONSE]", {
      status: response.status,
      url: `${response.config.baseURL || ""}${response.config.url || ""}`,
      data: response.data
    });
    const contentType = String(response.headers?.["content-type"] || "");
    const body = response.data;
    if (contentType.includes("text/html") || (typeof body === "string" && body.trim().toLowerCase().startsWith("<!doctype html"))) {
      const message = "API returned the web frontend HTML instead of JSON. Please check the backend base URL.";
      showToast(message, "error");
      return Promise.reject(new Error(message));
    }
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      console.log("[API ERROR]", {
        status: error.response?.status,
        url: `${error.config?.baseURL || ""}${error.config?.url || ""}`,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.log("[API ERROR]", error);
    }

    // The token can be revoked while the app is open - somebody force-logs the customer
    // out from the CRM, or resets their device. Sitting on the screen showing
    // "Unauthenticated." leaves them stuck: nothing loads and nothing tells them why.
    // Signing in again is the only way forward, so take them there.
    if (isSessionExpired(error)) {
      expireSession();
      return Promise.reject(error);
    }

    showToast(normalizeApiError(error), "error");
    return Promise.reject(error);
  }
);

export const normalizeApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string") return data;
    return data?.message || data?.error || data?.errors?.[0] || error.message || "Something went wrong";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
};

/**
 * A dead session, as opposed to any other failure. The API answers 401, and older
 * routes answer 200-shaped errors carrying Laravel's "Unauthenticated." - both mean
 * the token is gone.
 *
 * Signing in is excluded: a rejected login is a wrong password, not an expired
 * session, and bouncing the user off the login screen they are already on would only
 * hide the message telling them what went wrong. So is signing out, which is already
 * on its way to the login screen and should not also be told its session expired.
 */
const isSessionExpired = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;

  // No session to expire. The splash reports the installed version before anyone has
  // signed in, and that call is refused - which is expected, not a sign-out. Treating it
  // as one signed the user out of a session they never had and threw them at the login
  // screen a few frames into the splash.
  const headers: any = error.config?.headers;
  const sentToken = headers?.Authorization ?? headers?.authorization ?? headers?.get?.("Authorization");
  if (!sentToken) return false;

  const url = String(error.config?.url || "");
  if (/\/auth\//i.test(url) || /register|signup|logout/i.test(url)) return false;
  if (error.response?.status === 401) return true;
  const data: any = error.response?.data;
  const message = typeof data === "string" ? data : String(data?.message ?? data?.error ?? "");
  return /unauthenticated|unauthorized|token .*(expired|invalid)/i.test(message);
};
