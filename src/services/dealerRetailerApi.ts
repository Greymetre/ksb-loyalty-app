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
  };
};

const numberOr = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const dealerRetailerApi = {
  async list(page = 1, search = ""): Promise<DealerRetailerList> {
    const { data } = await apiClient.get("/dealer/retailers", {
      params: { page, page_size: 20, search, include_metrics: true },
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
      },
    };
  },
};
