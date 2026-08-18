import { apiClient, apiFileUrl } from "./apiClient";

export type DealerRetailer = { id: number; code: string; name: string; ownerName: string; shopName: string; mobile: string };
export type DealerScheme = { id: number; name: string; code: string; startDate: string; endDate: string };
export type DealerInvoiceStatus = "approved" | "pending" | "in_process" | "rejected";
export type DealerInvoiceItem = {
  id: string; retailerId: number; schemeId: number | null; retailerName: string; invoiceNumber: string;
  invoiceDate: string; displayDate: string; amount: number; rewardAmount: number; expectedRewardAmount: number;
  status: DealerInvoiceStatus; statusLabel: string; canEdit: boolean; canDelete: boolean;
  ownerName: string; shopName: string; retailerCode: string; mobile: string; schemeName: string; attachment: string;
};
export type DealerInvoiceList = { items: DealerInvoiceItem[]; total: number; page: number; pageSize: number; summary: { totalInvoices: number; rewardsCredited: number; totalTurnover: number } };
export type UploadAsset = { uri: string; name?: string | null; mimeType?: string | null };

const n = (value: unknown) => Number(value) || 0;
const normalizeItem = (raw: any): DealerInvoiceItem => {
  const rawSchemeId = raw?.scheme_id ?? raw?.schemeId;
  const status = String(raw?.status ?? raw?.approval_status_key ?? raw?.approval_status_label ?? "").toLowerCase();
  const rejected = Number(raw?.approval_status) === 4 || status === "rejected" || status.includes("reject");
  const approved = !rejected && (Number(raw?.approval_status) === 3 || status === "approved" || status.includes("approved ho"));
  const inProcess = !rejected && !approved && ([1, 2].includes(Number(raw?.approval_status)) || status === "in_process" || status === "in-process" || status.includes("in process"));
  const normalizedStatus: DealerInvoiceStatus = rejected ? "rejected" : approved ? "approved" : inProcess ? "in_process" : "pending";
  return {
  id: String(raw?.id ?? ""), retailerId: n(raw?.retailer_id ?? raw?.retailerId ?? raw?.secondary_customer_id ?? raw?.secondaryCustomerId), schemeId: rawSchemeId === null || rawSchemeId === undefined || rawSchemeId === "" ? null : n(rawSchemeId),
  retailerName: String(raw?.retailer_name ?? raw?.retailerName ?? "Retailer"), invoiceNumber: String(raw?.invoice_number ?? raw?.invoiceNumber ?? ""),
  ownerName: String(raw?.owner_name ?? raw?.ownerName ?? raw?.customer_name ?? raw?.customerName ?? ""),
  shopName: String(raw?.shop_name ?? raw?.shopName ?? raw?.retailer_name ?? raw?.retailerName ?? ""),
  retailerCode: String(raw?.retailer_code ?? raw?.retailerCode ?? ""), mobile: String(raw?.mobile_number ?? raw?.mobileNumber ?? ""),
  invoiceDate: String(raw?.invoice_date ?? raw?.invoiceDate ?? ""), displayDate: String(raw?.display_date ?? raw?.displayDate ?? raw?.invoice_date ?? raw?.invoiceDate ?? ""),
  amount: n(raw?.amount), rewardAmount: n(raw?.reward_amount ?? raw?.rewardAmount), expectedRewardAmount: n(raw?.expected_reward_amount ?? raw?.expectedRewardAmount),
  schemeName: String(raw?.scheme_name ?? raw?.schemeName ?? ""), attachment: apiFileUrl(String(raw?.attachment_url ?? raw?.attachmentUrl ?? raw?.attachment ?? "")),
  status: normalizedStatus, statusLabel: normalizedStatus === "approved" ? "Approved" : normalizedStatus === "rejected" ? "Rejected" : normalizedStatus === "in_process" ? "In Process" : "Pending",
  canEdit: Boolean(raw?.can_edit ?? raw?.canEdit), canDelete: Boolean(raw?.can_delete ?? raw?.canDelete),
  };
};

export const dealerInvoiceApi = {
  async retailers(search = ""): Promise<DealerRetailer[]> {
    const { data } = await apiClient.get("/dealer/retailers", { params: { page: 1, page_size: 50, search, include_metrics: false } });
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map((x: any): DealerRetailer => ({ id: n(x.id), code: String(x.code ?? ""), name: String(x.name ?? ""), ownerName: String(x.owner_name ?? x.ownerName ?? ""), shopName: String(x.shop_name ?? x.shopName ?? x.name ?? ""), mobile: String(x.mobile ?? "") }));
  },
  async schemes(retailerId: number, invoiceDate: string): Promise<DealerScheme[]> {
    const { data } = await apiClient.get("/dealer/invoice-schemes", { params: { retailer_id: retailerId, invoice_date: invoiceDate } });
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map((x: any): DealerScheme => ({ id: n(x.id), name: String(x.name ?? ""), code: String(x.code ?? ""), startDate: String(x.start_date ?? x.startDate ?? ""), endDate: String(x.end_date ?? x.endDate ?? "") }));
  },
  async list(page = 1, search = "", status = ""): Promise<DealerInvoiceList> {
    const { data } = await apiClient.get("/dealer/invoices", { params: { page, page_size: 20, search, status: status === "all" ? "" : status } });
    const rows = Array.isArray(data?.items) ? data.items : [];
    return {
      items: rows.map(normalizeItem), total: n(data?.pagination?.total), page: n(data?.pagination?.page) || 1, pageSize: n(data?.pagination?.page_size) || 20,
      summary: { totalInvoices: n(data?.summary?.total_invoices ?? data?.summary?.totalInvoices), rewardsCredited: n(data?.summary?.rewards_credited ?? data?.summary?.rewardsCredited), totalTurnover: n(data?.summary?.total_turnover ?? data?.summary?.totalTurnover) },
    } as DealerInvoiceList;
  },
  async detail(id: string): Promise<DealerInvoiceItem> {
    const { data } = await apiClient.get(`/dealer/invoices/${id}`);
    return normalizeItem(data?.data ?? data ?? {});
  },
  async create(input: { retailerId: number; schemeId: number; invoiceNumber: string; invoiceDate: string; amount: number; attachment: UploadAsset }) {
    const form = new FormData();
    form.append("retailer_id", String(input.retailerId)); form.append("scheme_id", String(input.schemeId));
    form.append("invoice_number", input.invoiceNumber); form.append("invoice_date", input.invoiceDate); form.append("amount", String(input.amount));
    form.append("attachment_file", { uri: input.attachment.uri, name: input.attachment.name || `invoice-${Date.now()}.jpg`, type: input.attachment.mimeType || "image/jpeg" } as any);
    const { data } = await apiClient.post("/dealer/invoices", form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  },
  async update(id: string, input: { retailerId: number; schemeId: number; invoiceNumber: string; invoiceDate: string; amount: number; attachment?: UploadAsset | null }) {
    const form = new FormData();
    form.append("retailer_id", String(input.retailerId)); form.append("scheme_id", String(input.schemeId));
    form.append("invoice_number", input.invoiceNumber); form.append("invoice_date", input.invoiceDate); form.append("amount", String(input.amount));
    if (input.attachment) form.append("attachment_file", { uri: input.attachment.uri, name: input.attachment.name || `invoice-${Date.now()}.jpg`, type: input.attachment.mimeType || "image/jpeg" } as any);
    const { data } = await apiClient.post(`/dealer/invoices/${id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  },
  async remove(id: string) {
    const { data } = await apiClient.delete(`/dealer/invoices/${id}`);
    return data;
  },
};
