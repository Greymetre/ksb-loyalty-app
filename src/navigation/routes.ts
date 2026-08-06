export type Route =
  | "Splash"
  | "Login"
  | "Email"
  | "Password"
  | "SetPassword"
  | "Register"
  | "Home"
  | "Slab"
  | "Booster"
  | "Invoices"
  | "InvoiceDetail"
  | "Redeem"
  | "RedeemSlab"
  | "RedeemBooster"
  | "RedemptionHistory"
  | "Scheme"
  | "Menu"
  | "Profile"
  | "Kyc";

export type SessionDraft = {
  mobile: string;
  email?: string;
  maskedEmail?: string;
  customerExists?: boolean;
  requestId: string;
  testingOtp?: string;
  isRegistered: boolean;
};
