import axios from "axios";
import { getToken } from "@/services/storage";
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
