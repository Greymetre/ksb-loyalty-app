import { apiClient } from "@/services/apiClient";

export type DealerSchemeStatus = "live" | "expired" | "upcoming";

export type DealerScheme = {
  id: number;
  name: string;
  code: string;
  tag: string;
  walletType: string;
  startDate: string;
  endDate: string;
  status: DealerSchemeStatus;
  statusLabel: string;
  isLive: boolean;
  daysRemaining: number;
  areaScope: string;
};

const numberOr = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toStatus = (value: unknown): DealerSchemeStatus => {
  const status = String(value ?? "").toLowerCase();
  return status === "expired" || status === "upcoming" ? status : "live";
};

export const dealerSchemeApi = {
  async list(): Promise<DealerScheme[]> {
    const { data } = await apiClient.get("/dealer/schemes");
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map((row: any): DealerScheme => {
      const status = toStatus(row?.status);
      return {
        id: numberOr(row?.id),
        name: String(row?.scheme_name ?? row?.schemeName ?? "Scheme"),
        code: String(row?.scheme_code ?? row?.schemeCode ?? ""),
        tag: String(row?.scheme_tag ?? row?.schemeTag ?? "Regular"),
        walletType: String(row?.wallet_type ?? row?.walletType ?? "Regular"),
        startDate: String(row?.start_date ?? row?.startDate ?? ""),
        endDate: String(row?.end_date ?? row?.endDate ?? ""),
        status,
        statusLabel: String(row?.status_label ?? row?.statusLabel ?? (status === "expired" ? "Expired" : status === "upcoming" ? "Upcoming" : "Live")),
        isLive: Boolean(row?.is_live ?? row?.isLive ?? status === "live"),
        daysRemaining: numberOr(row?.days_remaining ?? row?.daysRemaining),
        areaScope: String(row?.area_scope ?? row?.areaScope ?? "All"),
      };
    });
  },
};

export type DealerSchemeRetailer = {
  retailerId: number;
  retailerName: string;
  shopName: string;
  invoiceCount: number;
  invoiceAmount: number;
  pointsEarned: number;
  pointsExpected: number;
};

export type DealerSchemeSlab = {
  tierName: string;
  valueFrom: number;
  valueTo: number | null;
  rewardValue: number;
};

export type DealerSchemeDetail = DealerScheme & {
  description: string;
  basedOn: string;
  summary: {
    schemeRetailers: number;
    totalInvoices: number;
    approvedInvoices: number;
    pendingInvoices: number;
    rejectedInvoices: number;
    totalInvoiceAmount: number;
    approvedInvoiceAmount: number;
    expectedInvoiceAmount: number;
    pointsEarned: number;
    pointsExpected: number;
  };
  slabs: DealerSchemeSlab[];
  retailers: DealerSchemeRetailer[];
};

export const dealerSchemeDetailApi = {
  async get(id: number): Promise<DealerSchemeDetail> {
    const { data } = await apiClient.get(`/dealer/schemes/${id}`);
    const row = data?.data ?? {};
    const s = row?.summary ?? {};
    const status = toStatus(row?.status);
    return {
      id: numberOr(row?.id),
      name: String(row?.scheme_name ?? "Scheme"),
      code: String(row?.scheme_code ?? ""),
      tag: String(row?.scheme_tag ?? "Regular"),
      walletType: String(row?.wallet_type ?? "Regular"),
      startDate: String(row?.start_date ?? ""),
      endDate: String(row?.end_date ?? ""),
      status,
      statusLabel: String(row?.status_label ?? ""),
      isLive: Boolean(row?.is_live),
      daysRemaining: numberOr(row?.days_remaining),
      areaScope: String(row?.area_scope ?? "All"),
      description: String(row?.scheme_description ?? ""),
      basedOn: String(row?.based_on ?? "Value"),
      summary: {
        schemeRetailers: numberOr(s?.scheme_retailers),
        totalInvoices: numberOr(s?.total_invoices),
        approvedInvoices: numberOr(s?.approved_invoices),
        pendingInvoices: numberOr(s?.pending_invoices),
        rejectedInvoices: numberOr(s?.rejected_invoices),
        totalInvoiceAmount: numberOr(s?.total_invoice_amount),
        approvedInvoiceAmount: numberOr(s?.approved_invoice_amount),
        expectedInvoiceAmount: numberOr(s?.expected_invoice_amount),
        pointsEarned: numberOr(s?.points_earned),
        pointsExpected: numberOr(s?.points_expected),
      },
      slabs: (Array.isArray(row?.slabs) ? row.slabs : []).map((x: any): DealerSchemeSlab => ({
        tierName: String(x?.tier_name ?? ""),
        valueFrom: numberOr(x?.value_from),
        valueTo: x?.value_to === null || x?.value_to === undefined ? null : numberOr(x.value_to),
        rewardValue: numberOr(x?.reward_value),
      })),
      retailers: (Array.isArray(row?.retailers) ? row.retailers : []).map((x: any): DealerSchemeRetailer => ({
        retailerId: numberOr(x?.retailer_id),
        retailerName: String(x?.retailer_name ?? "Retailer"),
        shopName: String(x?.shop_name ?? ""),
        invoiceCount: numberOr(x?.invoice_count),
        invoiceAmount: numberOr(x?.invoice_amount),
        pointsEarned: numberOr(x?.points_earned),
        pointsExpected: numberOr(x?.points_expected),
      })),
    };
  },
};
