import { apiClient } from "@/services/apiClient";
import { getUser } from "@/services/storage";

export type RedemptionMode = "NEFT" | "IMPS";

type CreateRedemptionOptions = {
  customerId?: number;
  loyaltySchemeId?: number;
};

const numberOrUndefined = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const getStoredCustomerId = async () => {
  const user = await getUser<any>();
  return numberOrUndefined(
    user?.customer_id ??
    user?.customerId ??
    user?.retailer_id ??
    user?.retailerId ??
    user?.id
  );
};

export const redemptionApi = {
  async preview(walletType: "SLAB" | "BOOSTER", amount: number, options: CreateRedemptionOptions = {}) {
    const loyaltySchemeId = numberOrUndefined(options.loyaltySchemeId) ?? 0;
    const { data } = await apiClient.post("/redemptions/preview", {
      loyalty_scheme_id: loyaltySchemeId,
      wallet_type: walletType === "SLAB" ? "Regular" : "Booster",
      points: amount
    });
    return data?.data || data;
  },
  async create(walletType: "SLAB" | "BOOSTER", amount: number, redeemMode: RedemptionMode = "NEFT", bankConfirmed = false, options: CreateRedemptionOptions = {}) {
    const customerId = numberOrUndefined(options.customerId) ?? await getStoredCustomerId() ?? 0;
    const loyaltySchemeId = numberOrUndefined(options.loyaltySchemeId) ?? 0;
    const { data } = await apiClient.post("/redemptions", {
      customer_id: customerId,
      loyalty_scheme_id: loyaltySchemeId,
      wallet_type: walletType === "SLAB" ? "Regular" : "Booster",
      redeem_mode: redeemMode,
      points: amount,
      bank_confirmed: bankConfirmed
    });
    return data;
  }
};
