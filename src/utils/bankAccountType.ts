/** Bank account type, the same three everywhere - CRM, SFA and VRiDDHi. The value is what is
 *  stored in custom_fields.bank_account_type; the label is what people see. */
export const BANK_ACCOUNT_TYPES = [
  { label: "Savings", value: "SAVINGS" },
  { label: "Current", value: "CURRENT" },
  { label: "OD", value: "OD" },
];

/** Reads any spelling already on record ("Savings", "saving", "Overdraft") as one of the three. */
export const normalizeBankAccountType = (value: unknown): string => {
  const text = String(value ?? "").trim();
  const key = text.toUpperCase().replace(/[^A-Z]/g, "");
  if (!key) return "";
  if (key.startsWith("SAVING")) return "SAVINGS";
  if (key.startsWith("CURRENT")) return "CURRENT";
  if (key === "OD" || key.startsWith("OVERDRAFT")) return "OD";
  return text;
};

export const bankAccountTypeLabel = (value: unknown): string => {
  const stored = normalizeBankAccountType(value);
  return BANK_ACCOUNT_TYPES.find(type => type.value === stored)?.label ?? stored;
};
