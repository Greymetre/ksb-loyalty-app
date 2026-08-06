import { Platform } from "react-native";

import { apiClient } from "@/services/apiClient";
import { saveToken, saveUser } from "@/services/storage";

export type NextAction = "email_required" | "register" | "password" | "set_password";
export type LookupResult = {
  nextAction: NextAction;
  mobile: string;
  email?: string;
  maskedEmail?: string;
  customerExists: boolean;
  mailBypassed: boolean;
  testingCode?: string;
  message?: string;
};

const pickToken = (data: any) => data?.access_token || data?.token || data?.data?.access_token || data?.data?.token;
const pickUser = (data: any) => data?.user || data?.retailer || data?.customer || data?.data?.user || data?.data?.retailer || data?.data?.customer;

export const authApi = {
  async lookup(mobile: string, email?: string): Promise<LookupResult> {
    // SMTP delivery is part of this request when an existing customer needs to
    // create a password, so allow more time than ordinary API reads.
    const { data } = await apiClient.post("/auth/customer-lookup", { mobile, email }, { timeout: 45000 });
    return {
      nextAction: data?.next_action,
      mobile: String(data?.mobile || mobile),
      email: data?.email || email,
      maskedEmail: data?.masked_email,
      customerExists: Boolean(data?.customer_exists),
      mailBypassed: Boolean(data?.mail_bypassed),
      testingCode: data?.testing_code,
      message: data?.message
    };
  },
  async login(mobile: string, password: string) {
    const { data } = await apiClient.post("/auth/customer-login", {
      mobile,
      password,
      device_type: Platform.OS,
      device_name: "KSB Retailer App",
      unique_id: "ksb-retailer-mobile",
      app_version: "1.0.0"
    });
    await persistSession(data);
    return data;
  },
  async forgotPassword(mobile: string) {
    const { data } = await apiClient.post("/auth/forgot-password", { mobile }, { timeout: 45000 });
    return {
      maskedEmail: data?.masked_email,
      mailBypassed: Boolean(data?.mail_bypassed),
      testingCode: data?.testing_code,
      message: data?.message
    };
  },
  async setPassword(mobile: string, code: string, password: string) {
    const { data } = await apiClient.post("/auth/set-password", { mobile, code, password });
    return data;
  }
};

async function persistSession(data: any) {
  const token = pickToken(data);
  if (token) await saveToken(token);
  const user = pickUser(data);
  if (user) await saveUser(user);
}
