import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "ksb_auth_token";
const USER_KEY = "ksb_auth_user";

export const saveToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const saveUser = (user: unknown) => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user || {}));
export const getUser = async <T = any>() => {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};
export const clearToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
};
