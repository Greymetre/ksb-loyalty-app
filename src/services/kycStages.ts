/** The four KYC stages the CRM's KYC screen shows, counted by the server from the same index. */
export type KycStage = "approved" | "complete_pending" | "partial" | "none";

export type KycStageSummary = {
  total: number;
  approved: number;
  completePending: number;
  partial: number;
  notStarted: number;
};

export const KYC_STAGES: { key: KycStage; label: string; icon: string; color: string; background: string }[] = [
  { key: "approved", label: "Fully Approved", icon: "✅", color: "#13875a", background: "#e5f8ee" },
  { key: "complete_pending", label: "Awaiting Review", icon: "📋", color: "#a96810", background: "#fff2da" },
  { key: "partial", label: "Partly Submitted", icon: "⏳", color: "#1d4ed8", background: "#e6efff" },
  { key: "none", label: "Not Started", icon: "➖", color: "#5b6b82", background: "#eef2f7" },
];

export const emptyKycSummary: KycStageSummary = { total: 0, approved: 0, completePending: 0, partial: 0, notStarted: 0 };

const numberOr = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isKycStage = (value: unknown): value is KycStage =>
  value === "approved" || value === "complete_pending" || value === "partial" || value === "none";

export function readKycSummary(raw: any): KycStageSummary {
  if (!raw || typeof raw !== "object") return emptyKycSummary;
  return {
    total: numberOr(raw.total),
    approved: numberOr(raw.approved),
    completePending: numberOr(raw.complete_pending ?? raw.completePending),
    partial: numberOr(raw.partial),
    notStarted: numberOr(raw.not_started ?? raw.notStarted),
  };
}

export function kycStageCount(summary: KycStageSummary, stage: KycStage): number {
  if (stage === "approved") return summary.approved;
  if (stage === "complete_pending") return summary.completePending;
  if (stage === "partial") return summary.partial;
  return summary.notStarted;
}

export const kycStageInfo = (stage: KycStage) => KYC_STAGES.find(item => item.key === stage) ?? KYC_STAGES[3];
