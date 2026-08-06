import { apiClient } from "@/services/apiClient";
import { SchemeInfo, SchemeTier } from "@/types/api";

const numberOr = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const firstDefined = (...values: unknown[]) => values.find((value) => value !== undefined && value !== null);

export const normalizeScheme = (raw: any): SchemeInfo => {
  const scheme = raw?.scheme ?? raw?.loyalty_scheme ?? raw?.loyaltyScheme ?? raw;
  const progress = raw?.progress ?? raw?.retailer_progress ?? raw?.retailerProgress ?? raw?.achievement ?? {};
  const startDate = firstDefined(raw?.start_date, raw?.startDate, scheme?.start_date, scheme?.startDate) as string | undefined;
  const endDate = firstDefined(raw?.end_date, raw?.endDate, scheme?.end_date, scheme?.endDate) as string | undefined;
  const tiers: SchemeTier[] = (raw?.tiers || raw?.slabs || scheme?.tiers || scheme?.slabs || []).map((tier: any): SchemeTier => ({
    amount: numberOr(tier?.value_from ?? tier?.valueFrom),
    valueFrom: numberOr(tier?.value_from ?? tier?.valueFrom),
    valueTo: firstDefined(tier?.value_to, tier?.valueTo) == null ? null : numberOr(firstDefined(tier?.value_to, tier?.valueTo)),
    rate: numberOr(tier?.reward_value ?? tier?.rewardValue),
    rewardLabel: tier?.reward_label ?? tier?.rewardLabel,
    label: tier?.tier_name ?? tier?.tierName ?? "Slab",
    tierName: tier?.tier_name ?? tier?.tierName
  })).sort((a: SchemeTier, b: SchemeTier) => (a.valueFrom ?? a.amount) - (b.valueFrom ?? b.amount));
  const achievementValue = numberOr(firstDefined(
    raw?.achievement_value, raw?.achievementValue,
    progress?.achievement_value, progress?.achievementValue,
    progress?.approved_invoice_value, progress?.approvedInvoiceValue,
    progress?.total_approved_invoice_value, progress?.totalApprovedInvoiceValue,
    raw?.achieved_value, raw?.achievedValue
  ));
  const computedCurrentTier = [...tiers].reverse().find((tier) => achievementValue >= (tier.valueFrom ?? tier.amount));
  const computedNextTier = tiers.find((tier) => (tier.valueFrom ?? tier.amount) > achievementValue);
  const currentSlab = firstDefined(raw?.current_slab, raw?.currentSlab, progress?.current_slab, progress?.currentSlab, computedCurrentTier?.tierName) as string | undefined;
  const nextSlab = firstDefined(raw?.next_slab, raw?.nextSlab, progress?.next_slab, progress?.nextSlab, computedNextTier?.tierName) as string | undefined;
  const explicitAdditional = firstDefined(raw?.additional_value_required, raw?.additionalValueRequired, progress?.additional_value_required, progress?.additionalValueRequired);
  return {
    id: numberOr(firstDefined(raw?.scheme_id, raw?.schemeId, scheme !== raw ? scheme?.id : undefined, raw?.id)),
    name: String(firstDefined(raw?.scheme_name, raw?.schemeName, raw?.name, scheme?.scheme_name, scheme?.schemeName, scheme?.name) ?? "Scheme"),
    code: firstDefined(raw?.scheme_code, raw?.schemeCode, scheme?.scheme_code, scheme?.schemeCode) as string | undefined,
    description: firstDefined(raw?.scheme_description, raw?.schemeDescription, scheme?.scheme_description, scheme?.schemeDescription, scheme?.description) as string | undefined,
    tag: firstDefined(
      raw?.scheme_tag, raw?.schemeTag, raw?.wallet_type, raw?.walletType, raw?.type,
      scheme?.scheme_tag, scheme?.schemeTag, scheme?.wallet_type, scheme?.walletType, scheme?.type
    ) as string | undefined,
    basedOn: firstDefined(raw?.based_on, raw?.basedOn, scheme?.based_on, scheme?.basedOn) as string | undefined,
    startDate,
    endDate,
    period: startDate && endDate ? `${startDate} - ${endDate}` : "",
    daysLeft: numberOr(firstDefined(raw?.days_left, raw?.daysLeft, scheme?.days_left, scheme?.daysLeft)),
    brochurePath: firstDefined(raw?.brochure_path, raw?.brochurePath, scheme?.brochure_path, scheme?.brochurePath) as string | undefined,
    achievementValue,
    pendingInvoiceValue: numberOr(firstDefined(raw?.pending_invoice_value, raw?.pendingInvoiceValue, progress?.pending_invoice_value, progress?.pendingInvoiceValue)),
    expectedPendingReward: numberOr(firstDefined(raw?.expected_pending_reward, raw?.expectedPendingReward, progress?.expected_pending_reward, progress?.expectedPendingReward)),
    currentSlab,
    nextSlab,
    additionalValueRequired: explicitAdditional == null
      ? Math.max((computedNextTier?.valueFrom ?? computedNextTier?.amount ?? achievementValue) - achievementValue, 0)
      : numberOr(explicitAdditional),
    tiers
  };
};

export const normalizeSchemes = (raw: any): SchemeInfo[] => {
  const source = raw?.data ?? raw;
  return (Array.isArray(source) ? source : source ? [source] : []).map(normalizeScheme);
};

export const schemeApi = {
  async current() {
    const { data } = await apiClient.get("/scheme/current");
    return normalizeSchemes(data);
  }
};
