import { Platform } from "react-native";
import * as Application from "expo-application";
import { apiClient } from "@/services/apiClient";

/**
 * Force update.
 *
 * The installed version is read from the native build - versionName on Android,
 * CFBundleShortVersionString on iOS - not from a constant in the JS, so it can
 * never drift from what is actually installed. The required version comes from
 * the CRM's Loyalty App Setting screen.
 *
 * Anything that goes wrong here - no network, no setting saved, a version the
 * server cannot parse - lets the app through. A version check must never be the
 * reason somebody cannot use the app.
 */

export const INSTALLED_APP_VERSION = Application.nativeApplicationVersion ?? "";

export const STORE_URL = Platform.select({
  android: `https://play.google.com/store/apps/details?id=${Application.applicationId ?? "com.fieldkonnect.vriddhiksb"}`,
  ios: "https://apps.apple.com/in/app/id0000000000",
  default: ""
}) as string;

/** -1 left is older, 0 same, 1 left is newer. Missing parts count as zero, so 1.2 == 1.2.0. */
export const compareVersions = (left: string, right: string): number => {
  const parts = (value: string) => String(value ?? "").trim().split(".").map(part => Number.parseInt(part, 10) || 0);
  const a = parts(left);
  const b = parts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const one = a[index] ?? 0;
    const two = b[index] ?? 0;
    if (one > two) return 1;
    if (one < two) return -1;
  }
  return 0;
};

const isVersion = (value: unknown) => typeof value === "string" && /^\d+(\.\d+){0,3}$/.test(value.trim());

/** True when the store has a version this install must move up to. */
export async function isUpdateRequired(): Promise<boolean> {
  try {
    const { data } = await apiClient.get("/loyalty/app-version", { timeout: 8000 });
    const required = Platform.OS === "ios" ? data?.data?.ios_version : data?.data?.android_version;
    if (!isVersion(required) || !isVersion(INSTALLED_APP_VERSION)) return false;
    return compareVersions(String(required), INSTALLED_APP_VERSION) > 0;
  } catch {
    return false;
  }
}
