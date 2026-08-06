import { apiClient } from "@/services/apiClient";
import { DashboardData, DashboardInvoice, SchemeTier, WalletSchemeBalance, WalletSummary } from "@/types/api";
import { normalizeSchemes } from "@/services/schemeApi";

const emptyWallet = (walletType: NonNullable<SchemeTier["walletType"]>): WalletSummary => ({
  walletType,
  balance: 0,
  earned: 0,
  redeemed: 0
});

const numberOr = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const arrayOr = (value: unknown) => Array.isArray(value) ? value : [];

const normalizeWalletType = (value: unknown): SchemeTier["walletType"] => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["regular", "slab", "wallet_a", "wallet a"].includes(normalized)) return "regular";
  if (["booster", "boost", "wallet_b", "wallet b"].includes(normalized)) return "booster";
  return undefined;
};

const booleanOrUndefined = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return !["false", "0", "no", "disabled"].includes(value.trim().toLowerCase());
  return Boolean(value);
};

const normalizeSchemeTier = (raw: any, inheritedWalletType?: SchemeTier["walletType"]): SchemeTier | null => {
  const amount = numberOr(
    raw?.amount ?? raw?.target_amount ?? raw?.targetAmount ?? raw?.min_amount ?? raw?.minimum_amount ?? raw?.invoice_value ?? raw?.sales_value ?? raw?.value,
    0
  );
  if (amount <= 0) return null;

  const rate = numberOr(raw?.rate ?? raw?.percentage ?? raw?.reward_percentage ?? raw?.reward_percent ?? raw?.slab_percentage, 0);
  const rewardLabel = raw?.reward_label ?? raw?.rewardLabel ?? raw?.reward_name ?? raw?.rewardName ?? raw?.reward ?? raw?.percentage_label ?? raw?.percentageLabel;
  const name = raw?.label ?? raw?.amount_label ?? raw?.amountLabel ?? raw?.name ?? raw?.tier_name ?? raw?.slab_name ?? raw?.title;
  return {
    amount,
    rate: rate || undefined,
    rewardLabel: rewardLabel || (rate ? `${rate}%` : undefined),
    walletType: normalizeWalletType(raw?.wallet_type ?? raw?.walletType ?? raw?.type ?? raw?.scheme_type ?? raw?.schemeType ?? raw?.wallet) ?? inheritedWalletType,
    label: name || ""
  };
};

const normalizeProgressStep = (raw: any, inheritedWalletType?: SchemeTier["walletType"]): SchemeTier | null => {
  const valueFrom = numberOr(raw?.value_from ?? raw?.valueFrom ?? raw?.amount ?? raw?.target_amount ?? raw?.targetAmount, 0);
  if (valueFrom <= 0) return null;

  const valueToRaw = raw?.value_to ?? raw?.valueTo;
  const valueTo = valueToRaw == null ? null : numberOr(valueToRaw, 0);
  const rate = numberOr(raw?.reward_value ?? raw?.rewardValue ?? raw?.rate ?? raw?.percentage, 0);
  const rewardLabel = raw?.reward_label ?? raw?.rewardLabel ?? raw?.label;
  const tierName = raw?.tier_name ?? raw?.tierName ?? raw?.name ?? raw?.title;

  return {
    amount: valueFrom,
    valueFrom,
    valueTo,
    rate: rate || undefined,
    rewardLabel: rewardLabel || (rate ? `${rate}%` : undefined),
    label: tierName || "",
    tierName,
    achieved: Boolean(raw?.achieved),
    current: Boolean(raw?.current),
    walletType: normalizeWalletType(raw?.wallet_type ?? raw?.walletType ?? raw?.type ?? raw?.scheme_type ?? raw?.schemeType ?? raw?.wallet) ?? inheritedWalletType
  };
};

const normalizeSchemeTiers = (source: any): SchemeTier[] => {
  const schemes = source.current_schemes ?? source.currentSchemes ?? source.current_scheme ?? source.currentScheme ?? source.scheme ?? {};
  const schemeList = Array.isArray(schemes) ? schemes : [schemes];
  const rawTiers = schemeList.flatMap((scheme: any) =>
    arrayOr(scheme?.tiers ?? scheme?.slabs ?? scheme?.scheme_tiers ?? scheme?.schemeTiers ?? scheme?.slab_details ?? scheme?.slabDetails)
      .map((tier: any) => ({
        ...tier,
        __schemeWalletType: normalizeWalletType(scheme?.wallet_type ?? scheme?.walletType ?? scheme?.type ?? scheme?.scheme_type ?? scheme?.schemeType ?? scheme?.wallet)
      }))
  );
  const tierRows = rawTiers.length ? rawTiers : schemeList;

  return tierRows
    .map((tier: any) => normalizeSchemeTier(tier, tier?.__schemeWalletType))
    .filter((tier): tier is SchemeTier => Boolean(tier))
    .sort((a, b) => a.amount - b.amount);
};

const normalizeWalletScheme = (raw: any, inheritedWalletType?: SchemeTier["walletType"]): WalletSchemeBalance | null => {
  const points = numberOr(raw?.points ?? raw?.available_points ?? raw?.balance ?? raw?.available ?? raw?.redeemable_points ?? raw?.total_points, 0);
  const loyaltySchemeId = numberOr(raw?.loyaltySchemeId ?? raw?.loyalty_scheme_id ?? raw?.schemeId ?? raw?.scheme_id ?? raw?.id, 0) || undefined;
  const name = raw?.scheme_name ?? raw?.schemeName ?? raw?.name ?? raw?.title ?? raw?.label;
  if (!loyaltySchemeId && !name && points <= 0) return null;
  return {
    id: loyaltySchemeId,
    loyaltySchemeId,
    schemeId: numberOr(raw?.schemeId ?? raw?.scheme_id ?? raw?.loyaltySchemeId ?? raw?.loyalty_scheme_id, 0) || undefined,
    name: String(name || "Scheme"),
    points,
    pointsDisplay: raw?.points_display ?? raw?.pointsDisplay ?? raw?.available_points_display ?? raw?.availablePointsDisplay,
    walletType: normalizeWalletType(raw?.wallet_type ?? raw?.walletType ?? raw?.type ?? raw?.scheme_type ?? raw?.schemeType ?? raw?.wallet) ?? inheritedWalletType,
    redemptionEnabled: booleanOrUndefined(raw?.redemption_enabled ?? raw?.redemptionEnabled)
  };
};

const normalizeWalletSchemes = (raw: any, walletType?: SchemeTier["walletType"]) => {
  const sources = [
    ...arrayOr(raw?.schemes),
    ...arrayOr(raw?.scheme_balances),
    ...arrayOr(raw?.schemeBalances),
    ...arrayOr(raw?.current_schemes),
    ...arrayOr(raw?.currentSchemes)
  ];

  return sources
    .map((scheme: any) => normalizeWalletScheme(scheme, walletType))
    .filter((scheme): scheme is WalletSchemeBalance => Boolean(scheme))
    .filter((scheme) => !scheme.walletType || !walletType || scheme.walletType === walletType);
};

const findWalletSource = (source: any, walletType: NonNullable<SchemeTier["walletType"]>) => {
  return arrayOr(source.wallets).find((wallet: any) => {
    const normalized = normalizeWalletType(wallet?.key ?? wallet?.wallet_type ?? wallet?.walletType ?? wallet?.scheme_tag ?? wallet?.schemeTag ?? wallet?.type);
    return normalized === walletType;
  });
};

const normalizeRecentInvoice = (raw: any): DashboardInvoice => ({
  id: String(raw?.id ?? raw?.invoice_number ?? raw?.invoiceNumber ?? ""),
  invoiceNumber: String(raw?.invoice_number ?? raw?.invoiceNumber ?? raw?.id ?? ""),
  date: raw?.invoice_date ?? raw?.invoiceDate ?? raw?.date,
  amount: numberOr(raw?.amount ?? raw?.invoice_amount, 0),
  points: numberOr(raw?.points ?? raw?.scheme_points ?? raw?.reward, 0),
  schemeTag: raw?.scheme_tag ?? raw?.schemeTag,
  schemeName: raw?.scheme_name ?? raw?.schemeName,
  tierName: raw?.tier_name ?? raw?.tierName,
  rewardLabel: raw?.scheme_reward_value ? `${numberOr(raw.scheme_reward_value, 0)}%` : raw?.reward_label ?? raw?.rewardLabel,
  statusLabel: raw?.approval_status_label ?? raw?.status_label ?? raw?.status
});

const normalizeWalletSummary = (raw: any, fallback: WalletSummary): WalletSummary => {
  if (typeof raw === "number" || typeof raw === "string") {
    return {
      ...fallback,
      balance: numberOr(raw, 0),
      earned: 0,
      redeemed: 0
    };
  }

  const walletType = normalizeWalletType(raw?.key ?? raw?.wallet_type ?? raw?.walletType ?? raw?.scheme_tag ?? raw?.schemeTag ?? raw?.type) ?? fallback.walletType;
  const progressSteps = arrayOr(raw?.progressSteps ?? raw?.progress_steps)
    .map((step: any) => normalizeProgressStep(step, walletType))
    .filter((step): step is SchemeTier => Boolean(step));
  const schemes = normalizeWalletSchemes(raw, walletType);

  return {
    title: raw?.title ?? fallback.title,
    walletType,
    schemeName: raw?.schemeName ?? raw?.scheme_name ?? fallback.schemeName,
    loyaltySchemeId: numberOr(raw?.loyaltySchemeId ?? raw?.loyalty_scheme_id ?? raw?.schemeId ?? raw?.scheme_id ?? fallback.loyaltySchemeId, fallback.loyaltySchemeId ?? 0) || undefined,
    schemeId: numberOr(raw?.schemeId ?? raw?.scheme_id ?? raw?.loyaltySchemeId ?? raw?.loyalty_scheme_id ?? fallback.schemeId, fallback.schemeId ?? 0) || undefined,
    schemeCode: raw?.schemeCode ?? raw?.scheme_code ?? fallback.schemeCode,
    schemeTag: raw?.schemeTag ?? raw?.scheme_tag ?? fallback.schemeTag,
    basedOn: raw?.basedOn ?? raw?.based_on ?? fallback.basedOn,
    startDate: raw?.startDate ?? raw?.start_date ?? fallback.startDate,
    endDate: raw?.endDate ?? raw?.end_date ?? fallback.endDate,
    expiresOn: raw?.expiresOn ?? raw?.expires_on ?? fallback.expiresOn,
    isActive: raw?.isActive ?? raw?.is_active ?? fallback.isActive,
    redemptionEnabled: booleanOrUndefined(raw?.redemptionEnabled ?? raw?.redemption_enabled) ?? fallback.redemptionEnabled,
    balance: numberOr(raw?.balance ?? raw?.available ?? raw?.available_points ?? raw?.points, fallback.balance),
    earned: numberOr(raw?.earned ?? raw?.earned_points ?? raw?.total_earned ?? raw?.earnedPoints, fallback.earned),
    redeemed: numberOr(raw?.redeemed ?? raw?.redeemed_points ?? raw?.total_redeemed ?? raw?.redeemedPoints, fallback.redeemed),
    expiryDays: numberOr(raw?.expiryDays ?? raw?.expiry_days ?? raw?.days_left ?? raw?.daysLeft, fallback.expiryDays ?? 0),
    currentTier: numberOr(raw?.currentTier ?? raw?.current_tier ?? raw?.tier, fallback.currentTier ?? 0),
    nextMilestone: numberOr(raw?.nextMilestone ?? raw?.next_milestone ?? raw?.next_milestone_value, fallback.nextMilestone ?? 0),
    activeBoosters: numberOr(raw?.activeBoosters ?? raw?.active_boosters ?? raw?.active_booster_count, fallback.activeBoosters ?? 0),
    rate: numberOr(raw?.rate ?? raw?.current_rate ?? raw?.reward_rate ?? raw?.percentage ?? raw?.achieved_reward, fallback.rate ?? 0),
    nextRate: numberOr(raw?.nextRate ?? raw?.next_rate ?? raw?.next_percentage ?? raw?.next_reward, fallback.nextRate ?? 0),
    nextAmount: numberOr(raw?.nextAmount ?? raw?.next_amount ?? raw?.amount_to_next ?? raw?.remaining_for_next ?? raw?.amount_more_for_next_slab, fallback.nextAmount ?? 0),
    achievedPercentage: numberOr(raw?.achievedPercentage ?? raw?.achieved_percentage ?? raw?.achievement_percentage ?? raw?.percent_achieved ?? raw?.progress_percentage ?? raw?.progress_percent, fallback.achievedPercentage ?? 0),
    invoiceValue: numberOr(raw?.invoiceValue ?? raw?.invoice_value ?? raw?.total_invoice_value ?? raw?.invoice_amount ?? raw?.purchase_value ?? raw?.sales_value ?? raw?.achieved_value, fallback.invoiceValue ?? 0),
    invoiceValueShort: raw?.invoiceValueShort ?? raw?.invoice_amount_short ?? fallback.invoiceValueShort,
    achievedLabel: raw?.achievedLabel ?? raw?.achieved_label ?? fallback.achievedLabel,
    achievedTierName: raw?.achievedTierName ?? raw?.achieved_tier_name ?? fallback.achievedTierName,
    nextRewardLabel: raw?.nextRewardLabel ?? raw?.next_reward_label ?? fallback.nextRewardLabel,
    nextTierName: raw?.nextTierName ?? raw?.next_tier_name ?? fallback.nextTierName,
    daysLeftMessage: raw?.daysLeftMessage ?? raw?.days_left_message ?? fallback.daysLeftMessage,
    badgeText: raw?.badgeText ?? raw?.badge_text ?? fallback.badgeText,
    progressPercent: numberOr(raw?.progressPercent ?? raw?.progress_percent, fallback.progressPercent ?? 0),
    progressSteps: progressSteps.length ? progressSteps : fallback.progressSteps,
    message: raw?.message ?? raw?.achievement_message ?? raw?.achieved_message ?? raw?.wallet_message ?? fallback.message,
    nextMessage: raw?.nextMessage ?? raw?.next_message ?? raw?.next_slab_message ?? raw?.milestone_message ?? fallback.nextMessage,
    subtitle: raw?.subtitle ?? raw?.expiry_label ?? raw?.label ?? raw?.scheme_period ?? fallback.subtitle,
    schemes: schemes.length ? schemes : fallback.schemes
  };
};

const normalizeDashboard = (raw: any): DashboardData => {
  const source = raw?.data || raw || {};
  const user = source.user || source.profile || source.retailer || {};
  const dashboardInvoiceValue = numberOr(source.total_invoice_value ?? source.totalInvoiceValue ?? source.invoice_value ?? source.invoiceValue, 0);
  const activeWalletsRaw = source.activeWallets ?? source.active_wallets;
  const currentSchemeTiers = normalizeSchemeTiers(source);
  const slabWalletSource = findWalletSource(source, "regular") ?? source.slabWallet ?? source.wallet_a ?? source.regular_wallet ?? { points: source.slab_wallet, wallet_type: "Regular" };
  const boosterWalletSource = findWalletSource(source, "booster") ?? source.boosterWallet ?? source.wallet_b ?? { points: source.booster_wallet, wallet_type: "Booster" };
  const slabWallet = normalizeWalletSummary(slabWalletSource, emptyWallet("regular"));
  const boosterWallet = normalizeWalletSummary(boosterWalletSource, emptyWallet("booster"));
  const dashboardSchemes = normalizeWalletSchemes(source);
  const slabSchemes = dashboardSchemes.filter((scheme) => scheme.walletType === "regular");
  const boosterSchemes = dashboardSchemes.filter((scheme) => scheme.walletType === "booster");
  if (!slabWallet.schemes?.length && slabSchemes.length) {
    slabWallet.schemes = slabSchemes;
  }
  if (!boosterWallet.schemes?.length && boosterSchemes.length) {
    boosterWallet.schemes = boosterSchemes;
  }
  if (dashboardInvoiceValue > 0 && !slabWallet.invoiceValue) {
    slabWallet.invoiceValue = dashboardInvoiceValue;
  }
  if (dashboardInvoiceValue > 0 && !boosterWallet.invoiceValue) {
    boosterWallet.invoiceValue = dashboardInvoiceValue;
  }
  return {
    customerId: numberOr(source.customerId ?? source.customer_id ?? source.retailerId ?? source.retailer_id ?? user.customerId ?? user.customer_id ?? user.retailerId ?? user.retailer_id ?? user.id, 0) || undefined,
    userName: source.userName ?? source.user_name ?? source.owner_name ?? source.name ?? user.owner_name ?? user.name,
    totalRedeemable: numberOr(
      source.totalRedeemable ?? source.total_redeemable ?? source.redeemable ?? source.total_points ?? source.total_available_points,
      slabWallet.balance + boosterWallet.balance
    ),
    slabWallet,
    boosterWallet,
    currentSchemeTiers,
    totalInvoices: numberOr(source.totalInvoices ?? source.total_invoices, 0),
    approvedInvoices: numberOr(source.approvedInvoices ?? source.approved_invoices, 0),
    pendingInvoices: numberOr(source.pendingInvoices ?? source.pending_invoices, 0),
    rejectedInvoices: numberOr(source.rejectedInvoices ?? source.rejected_invoices, 0),
    activeWallets: activeWalletsRaw == null ? undefined : numberOr(activeWalletsRaw, 0),
    invoiceCount: numberOr(source.invoiceCount ?? source.invoice_count ?? source.invoices_count ?? source.total_invoices, 0),
    recentInvoices: Array.isArray(source.recentInvoices)
      ? source.recentInvoices.map(normalizeRecentInvoice)
      : Array.isArray(source.recent_invoices)
        ? source.recent_invoices.map(normalizeRecentInvoice)
        : [],
    recentActivities: Array.isArray(source.recentActivities)
      ? source.recentActivities
      : Array.isArray(source.recent_activities)
        ? source.recent_activities
        : [],
    activeSchemes: normalizeSchemes(source.current_schemes ?? source.currentSchemes ?? [])
  };
};

export const walletApi = {
  async dashboard() {
    const { data } = await apiClient.get("/retailer/dashboard");
    return normalizeDashboard(data);
  },
  async slab() {
    const { data } = await apiClient.get("/wallets/slab");
    return data?.data || data;
  },
  async booster() {
    const { data } = await apiClient.get("/wallets/booster");
    return data?.data || data;
  }
};
