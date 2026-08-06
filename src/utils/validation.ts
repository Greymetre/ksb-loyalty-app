export const isValidIndianMobile = (value: string) => /^[6-9]\d{9}$/.test(value);
export const isValidOtp = (value: string) => /^\d{4}$/.test(value);
