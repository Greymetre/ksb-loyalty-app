import { apiClient } from "@/services/apiClient";
import { clearToken, getToken } from "@/services/storage";

/**
 * Ending the session from outside a screen.
 *
 * The token can stop being valid while the app is open - somebody force-logs the
 * customer out from the CRM, or their device id is reset. Every call then comes back
 * "Unauthenticated.", and without this the app sat on whatever screen it was on
 * showing an error toast, still believing it was signed in.
 *
 * The API client cannot navigate on its own: this app routes through a `route` state
 * in App.tsx rather than react-navigation, so App registers a handler here and the
 * interceptor calls it.
 */
type SignOutHandler = (reason: string) => void;

let handler: SignOutHandler | null = null;
let signingOut = false;

export const setSessionExpiredHandler = (next: SignOutHandler | null) => {
  handler = next;
};

/** Call after a successful sign-in so a later expiry is acted on again. */
export const resetSessionExpiry = () => {
  signingOut = false;
};

/**
 * Clears the stored session and sends the app back to Login. A screen loading four
 * things at once produces four 401s; only the first one is acted on.
 */
export const expireSession = (reason = "You have been signed out. Please sign in again.") => {
  if (signingOut) return;
  signingOut = true;
  void clearToken().finally(() => handler?.(reason));
};

/**
 * Signing out on purpose.
 *
 * Clearing the token locally is not enough: the server still holds a live token and
 * still shows the customer as signed in on Customer App Details in the CRM. Telling
 * it first revokes the token and marks the session closed.
 *
 * The call is best effort. Somebody signing out on a train with no signal still gets
 * signed out of the app - the local session is cleared either way, and the token they
 * leave behind is the same one a force logout can revoke later.
 */
export const signOut = async () => {
  try {
    if (await getToken()) {
      await apiClient.post("/customer/logout", null, { timeout: 6000 });
    }
  } catch {
    // Offline, or the token was already dead. Either way, carry on and clear it.
  }
  await clearToken();
  signingOut = false;
};
