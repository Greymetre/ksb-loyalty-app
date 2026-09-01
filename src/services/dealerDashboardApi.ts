import { apiClient } from "@/services/apiClient";

export type DealerRecentInvoice = {
  id: string;
  invoiceNumber: string;
  displayDate: string;
  retailerName: string;
  amount: number;
  status: "approved" | "pending" | "hold" | "in_process" | "rejected";
  statusLabel: string;
};

export type DealerDashboardData = {
  assignedRetailers: number;
  activeRetailers: number;
  pendingKycRetailers: number;
  totalInvoices: number;
  totalInvoiceAmount: number;
  approvedInvoiceAmount: number;
  expectedInvoiceAmount: number;
  totalRewardEarned: number;
  totalExpectedReward: number;
  recentInvoices: DealerRecentInvoice[];
};

const numberOr = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeInvoice = (raw: any): DealerRecentInvoice => {
  const status = String(raw?.status ?? raw?.approval_status_key ?? raw?.approval_status_label ?? "").toLowerCase();
  const rejected = Number(raw?.approval_status) === 4 || status === "rejected" || status.includes("reject");
  const approved = !rejected && (Number(raw?.approval_status) === 3 || status === "approved" || status.includes("approved ho"));
  const held = !rejected && !approved && (Number(raw?.approval_status) === 5 || status === "hold" || status.includes("hold"));
  const inProcess = !rejected && !approved && !held && ([1, 2].includes(Number(raw?.approval_status)) || status === "in_process" || status === "in-process" || status.includes("in process"));
  return {
  id: String(raw?.id ?? raw?.invoice_number ?? ""),
  invoiceNumber: String(raw?.invoice_number ?? raw?.invoiceNumber ?? ""),
  displayDate: String(raw?.display_date ?? raw?.displayDate ?? raw?.invoice_date ?? ""),
  retailerName: String(raw?.retailer_name ?? raw?.retailerName ?? raw?.shop_name ?? raw?.shopName ?? raw?.customer_name ?? raw?.customerName ?? "Retailer"),
  amount: numberOr(raw?.amount),
  status: rejected ? "rejected" : approved ? "approved" : held ? "hold" : inProcess ? "in_process" : "pending",
  statusLabel: rejected ? "Rejected" : approved ? "Approved" : held ? "Hold" : inProcess ? "In Process" : "Pending",
  };
};

export const dealerDashboardApi = {
  async get(): Promise<DealerDashboardData> {
    const { data } = await apiClient.get("/dealer/dashboard");
    const source = data?.data ?? data ?? {};
    const recent = source.recent_invoices ?? source.recentInvoices ?? [];
    return {
      assignedRetailers: numberOr(source.assigned_retailers ?? source.assignedRetailers),
      activeRetailers: numberOr(source.active_retailers ?? source.activeRetailers),
      pendingKycRetailers: numberOr(source.pending_kyc_retailers ?? source.pendingKycRetailers),
      totalInvoices: numberOr(source.total_invoices ?? source.totalInvoices),
      totalInvoiceAmount: numberOr(source.total_invoice_amount ?? source.totalInvoiceAmount),
      approvedInvoiceAmount: numberOr(source.approved_invoice_amount ?? source.approvedInvoiceAmount),
      expectedInvoiceAmount: numberOr(source.expected_invoice_amount ?? source.expectedInvoiceAmount),
      totalRewardEarned: numberOr(source.total_reward_earned ?? source.totalRewardEarned),
      totalExpectedReward: numberOr(source.total_expected_reward ?? source.totalExpectedReward),
      recentInvoices: Array.isArray(recent) ? recent.map(normalizeInvoice) : [],
    };
  },
};
