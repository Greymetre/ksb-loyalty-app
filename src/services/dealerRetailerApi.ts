import { KycStage, KycStageSummary, isKycStage, kycStageInfo, readKycSummary } from "./kycStages";
import { apiClient } from "./apiClient";

export type DealerRetailerListItem = {
  id: number;
  code: string;
  ownerName: string;
  shopName: string;
  mobile: string;
  beatName: string;
  kycStatus: "verified" | "pending";
  kycStatusLabel: string;
  kycStage: KycStage;
  kycStageLabel: string;
  rewardPoints: number;
  invoiceCount: number;
  isActive: boolean;
};

export type DealerRetailerList = {
  items: DealerRetailerListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalRetailers: number;
    activeRetailers: number;
    pendingKycRetailers: number;
    kycSummary: KycStageSummary;
  };
};

const numberOr = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** "pending" is the old two-way filter, kept for anything still passing it. */
export type DealerRetailerFilter = "all" | "pending" | KycStage;

export const dealerRetailerApi = {
  async list(page = 1, search = "", filter: DealerRetailerFilter = "all", activeOnly = false): Promise<DealerRetailerList> {
    const { data } = await apiClient.get("/dealer/retailers", {
      // The kyc chip does not move the summary counts - those stay on the whole set
      // being viewed. activeOnly narrows that set to retailers who have raised an
      // invoice, which is what the dashboard tiles count.
      params: {
        page, page_size: 20, search, include_metrics: true,
        kyc: filter === "all" ? undefined : filter,
        active: activeOnly ? true : undefined,
      },
    });
    const rows = Array.isArray(data?.data) ? data.data : [];
    return {
      items: rows.map((row: any): DealerRetailerListItem => {
        const rawKycStatus = String(row?.kyc_status ?? row?.kycStatus ?? "").toLowerCase();
        const verified = rawKycStatus === "approved" || rawKycStatus === "verified";
        return {
          id: numberOr(row?.id),
          code: String(row?.code ?? ""),
          ownerName: String(row?.owner_name ?? row?.ownerName ?? row?.name ?? "Retailer"),
          shopName: String(row?.shop_name ?? row?.shopName ?? row?.name ?? ""),
          mobile: String(row?.mobile ?? ""),
          beatName: String(row?.beat_name ?? row?.beatName ?? ""),
          kycStatus: verified ? "verified" : "pending",
          kycStatusLabel: verified ? "Verified" : "Pending",
          // A server without stages still says verified or not; everything else reads as not started.
          kycStage: isKycStage(row?.kyc_stage) ? row.kyc_stage : verified ? "approved" : "none",
          kycStageLabel: String(row?.kyc_stage_label ?? kycStageInfo(isKycStage(row?.kyc_stage) ? row.kyc_stage : verified ? "approved" : "none").label),
          rewardPoints: numberOr(row?.reward_points ?? row?.rewardPoints),
          invoiceCount: numberOr(row?.invoice_count ?? row?.invoiceCount),
          isActive: Boolean(row?.is_active ?? row?.isActive),
        };
      }),
      total: numberOr(data?.pagination?.total),
      page: numberOr(data?.pagination?.page) || 1,
      pageSize: numberOr(data?.pagination?.page_size) || 20,
      summary: {
        totalRetailers: numberOr(data?.summary?.total_retailers ?? data?.summary?.totalRetailers),
        activeRetailers: numberOr(data?.summary?.active_retailers ?? data?.summary?.activeRetailers),
        pendingKycRetailers: numberOr(data?.summary?.pending_kyc_retailers ?? data?.summary?.pendingKycRetailers),
        kycSummary: readKycSummary(data?.summary?.kyc_summary ?? data?.summary?.kycSummary),
      },
    };
  },
};
