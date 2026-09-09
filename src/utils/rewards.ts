import { DashboardInvoice, SchemeTier } from "@/types/api";
import { money, moneyInLakh } from "@/utils/formatters";

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toFixed(1) : rounded}%`;
};

export const formatTierLabel = (tier: SchemeTier) => tier.label || moneyInLakh(tier.amount);

export const formatRewardLabel = (tier: SchemeTier) => tier.rewardLabel || (tier.rate ? formatPercent(tier.rate) : formatTierLabel(tier));

/**
 * What one slab pays, for a server that does not write it out itself.
 *
 * The type has to match exactly. A server that predates the per-slab type sends the
 * scheme's own Based On, and on a mixed scheme that reads "Value + Percentage" - a
 * "does it contain the word percent" test says yes for every slab and turns a
 * Rs. 1400 gift into 1400%. When the type cannot decide, the figure is shown bare:
 * no unit reads better than the wrong one.
 */
export const slabRewardText = (value: number, type?: string | null, moneyText?: (value: number) => string) => {
  const kind = (type || "").trim().toLowerCase();
  if (kind === "percentage") return `${value}%`;
  if (kind === "value + percentage") return String(value);
  return moneyText ? moneyText(value) : String(value);
};

export const isTierActive = (tier: SchemeTier, invoiceValue: number) =>
  tier.amount === 0 || Boolean(tier.achieved || tier.current) || invoiceValue >= getTierThreshold(tier);

export const getWalletTiers = (tiers: SchemeTier[], walletType: NonNullable<SchemeTier["walletType"]>) => {
  const walletTiers = tiers.filter((tier) => tier.walletType === walletType);
  return walletTiers.length ? walletTiers : tiers.filter((tier) => !tier.walletType);
};

export const getTierThreshold = (tier: SchemeTier) => tier.valueFrom ?? tier.amount;

export const getTierProgress = (invoiceValue: number, tiers: SchemeTier[], apiProgressPercent = 0) => {
  const currentIndex = tiers.findIndex((tier) => tier.current);
  const rangeIndex = tiers.findIndex((tier) => {
    const valueFrom = tier.valueFrom ?? tier.amount;
    const valueTo = tier.valueTo;
    return invoiceValue >= valueFrom && (valueTo == null || invoiceValue <= valueTo);
  });
  const achievedIndex = tiers.reduce((lastIndex, tier, index) => {
    if (tier.achieved || invoiceValue >= getTierThreshold(tier)) return index;
    return lastIndex;
  }, -1);
  const resolvedIndex = currentIndex >= 0 ? currentIndex : rangeIndex >= 0 ? rangeIndex : achievedIndex;
  const currentTier = resolvedIndex >= 0 ? tiers[resolvedIndex] : undefined;
  const computedProgress = resolvedIndex >= 0 && tiers.length ? ((resolvedIndex + 1) / tiers.length) * 100 : 0;
  const nextTier = tiers.find((tier) => getTierThreshold(tier) > invoiceValue) ?? (resolvedIndex >= 0 ? tiers[resolvedIndex + 1] : tiers[0]);

  return {
    progressPercent: clamp(Math.max(apiProgressPercent, computedProgress), 0, 100),
    nextTier,
    currentTier,
    remainingAmount: nextTier ? Math.max(getTierThreshold(nextTier) - invoiceValue, 0) : 0
  };
};

export const getNextRewardMessage = (wallet: { nextMessage?: string } | undefined, progress: ReturnType<typeof getTierProgress>) => {
  if (wallet?.nextMessage) return wallet.nextMessage;
  if (!progress.nextTier) return "Highest reward achieved";
  return `${money(progress.remainingAmount)} more for ${formatRewardLabel(progress.nextTier)} reward`;
};

export const getNextThresholdMessage = (progress: ReturnType<typeof getTierProgress>) => {
  if (!progress.nextTier) return "Highest reward reached";
  return `Next starts after ${moneyInLakh(getTierThreshold(progress.nextTier))}`;
};

export const formatCompactDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
};

export const formatTierRange = (tier: SchemeTier) => {
  const from = tier.valueFrom ?? tier.amount;
  if (!tier.valueTo || tier.valueTo > 90000000) return `>${moneyInLakh(from)}`;
  return `${moneyInLakh(from)}-${moneyInLakh(tier.valueTo)}`;
};

export const getDateProgress = (startDate?: string, endDate?: string) => {
  const start = startDate ? new Date(startDate).getTime() : 0;
  const end = endDate ? new Date(endDate).getTime() : 0;
  if (!start || !end || end <= start) return 0;
  return clamp(((Date.now() - start) / (end - start)) * 100, 0, 100);
};

export const isInvoiceForWallet = (invoice: DashboardInvoice, walletType: NonNullable<SchemeTier["walletType"]>) => {
  const tag = String(invoice.schemeTag ?? "").toLowerCase();
  return walletType === "regular" ? tag.includes("regular") || tag.includes("slab") : tag.includes("booster");
};

export const customerTypeIcon = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("plumber")) return "🔧";
  if (normalized.includes("retailer")) return "🏪";
  return "🤝";
};
