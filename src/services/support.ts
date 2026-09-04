import { Linking } from "react-native";
import { showToast } from "@/services/toast";

/** The helpline shown across the app. One place, so it can never drift out of step. */
export const SUPPORT_NUMBER = "9713113280";

/** Formatted for display; dialled as a bare number. */
export const SUPPORT_NUMBER_DISPLAY = SUPPORT_NUMBER;

/**
 * Opens the dialer with the helpline in it.
 *
 * openURL is called straight out, without asking canOpenURL first. For tel: that question
 * cannot be answered honestly: iOS returns false unless the scheme is listed in
 * LSApplicationQueriesSchemes, and Android 11 and later returns false unless a matching
 * <queries> entry exists - so the guard reported "no dialer" on real phones that have
 * one, and the call never happened. The platform declarations are in place as well now,
 * but the call no longer depends on them.
 *
 * A device with no dialer at all - a simulator, a tablet with no SIM - throws, and then
 * the number is shown so it can still be dialled by hand.
 */
export async function callSupport(): Promise<void> {
  try {
    await Linking.openURL(`tel:${SUPPORT_NUMBER}`);
  } catch {
    showToast(`No dialer on this device. Call ${SUPPORT_NUMBER}`, "error");
  }
}
