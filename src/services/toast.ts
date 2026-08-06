type ToastType = "error" | "success" | "info";

export type ToastPayload = {
  message: string;
  type?: ToastType;
};

let toastHandler: ((payload: ToastPayload) => void) | null = null;

export const setToastHandler = (handler: ((payload: ToastPayload) => void) | null) => {
  toastHandler = handler;
};

export const showToast = (message: string, type: ToastType = "error") => {
  toastHandler?.({ message, type });
};
