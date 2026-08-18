import { apiClient } from "@/services/apiClient";
import { money } from "@/utils/formatters";

// Loyalty invoices expose three customer-facing states: Approved after HO
// approval, Rejected when explicitly rejected, and Pending at every other
// workflow stage (including SS and Sales approval).
export type InvoiceStatus = "approved" | "pending" | "rejected";

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  invoiceNumberDisplay: string;
  displayDate: string;
  amount: number;
  amountDisplay: string;
  rewardAmount: number;
  rewardDisplay: string;
  expectedRewardAmount: number;
  expectedRewardDisplay: string;
  rewardLabel: string;
  status: InvoiceStatus;
  statusLabel: string;
  isRewardCredited: boolean;
  isPending: boolean;
  attachment?: string | null;
  schemeNames: string[];
};

export type InvoiceMonthGroup = {
  monthKey: string;
  monthLabel: string;
  count: number;
  turnover: number;
  turnoverDisplay: string;
  rewardAmount: number;
  rewardDisplay: string;
  items: InvoiceListItem[];
};

export type InvoiceListSummary = {
  totalInvoices: number;
  rewardsCredited: number;
  rewardsCreditedDisplay: string;
  approvedInvoices: number;
  pendingInvoices: number;
  totalTurnover: number;
  totalTurnoverDisplay: string;
};

export type InvoiceFilterOption = {
  key: string;
  label: string;
};

export type InvoiceListResponse = {
  summary: InvoiceListSummary;
  searchPlaceholder: string;
  statuses: InvoiceFilterOption[];
  groups: InvoiceMonthGroup[];
  items: InvoiceListItem[];
};

export type InvoiceListParams = {
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
};

export type InvoiceApprovalHistory = {
  id: string;
  title: string;
  userName?: string;
  amount?: number | null;
  remark?: string | null;
  date?: string | null;
};

export type InvoiceDetail = InvoiceListItem & {
  invoiceDate?: string;
  schemeName?: string;
  schemeCode?: string;
  tierName?: string;
  hint?: string;
  createdAt?: string;
  approvalRemark?: string;
  history: InvoiceApprovalHistory[];
};

const numberOr = (value: any, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const formatMonth = (value?: string) => {
  if (!value) return "INVOICES";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.toUpperCase();
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date).toUpperCase();
};

const normalizeItem = (raw: any): InvoiceListItem => {
  const invoiceNumber = String(raw?.invoice_number ?? raw?.invoiceNumber ?? raw?.id ?? "");
  const status = String(raw?.status ?? raw?.approval_status_key ?? raw?.approval_status_label ?? "").toLowerCase();
  const rewardAmount = numberOr(raw?.reward_amount ?? raw?.rewardAmount ?? raw?.points ?? raw?.scheme_points, 0);
  const expectedRewardAmount = numberOr(raw?.expected_reward_amount ?? raw?.expectedRewardAmount, rewardAmount);
  const amount = numberOr(raw?.amount ?? raw?.invoice_amount ?? raw?.invoiceAmount, 0);
  const isRejected = Number(raw?.approval_status) === 4 || status === "rejected" || status.includes("reject");
  const isApproved = !isRejected && (Number(raw?.approval_status) === 3 || status === "approved" || status.includes("approved ho"));
  const isPending = !isApproved && !isRejected;
  const isRewardCredited = isApproved && (Boolean(raw?.is_reward_credited) || rewardAmount > 0);

  return {
    id: String(raw?.id ?? invoiceNumber),
    invoiceNumber,
    invoiceNumberDisplay: String(raw?.invoice_number_display ?? raw?.invoiceNumberDisplay ?? `#${invoiceNumber}`),
    displayDate: String(raw?.display_date ?? raw?.displayDate ?? raw?.invoice_date ?? raw?.invoiceDate ?? ""),
    amount,
    amountDisplay: String(raw?.amount_display ?? raw?.amountDisplay ?? money(amount)),
    rewardAmount,
    rewardDisplay: String(raw?.reward_display ?? raw?.rewardDisplay ?? (rewardAmount ? `+${money(rewardAmount)}` : "")),
    expectedRewardAmount,
    expectedRewardDisplay: String(raw?.expected_reward_display ?? raw?.expectedRewardDisplay ?? (expectedRewardAmount ? `+${money(expectedRewardAmount)}` : "—")),
    rewardLabel: String(raw?.reward_label ?? raw?.rewardLabel ?? "Reward"),
    status: isRejected ? "rejected" : isApproved ? "approved" : "pending",
    statusLabel: isRejected ? "Rejected" : isApproved ? "Approved" : "Pending",
    isRewardCredited,
    isPending,
    attachment: raw?.attachment ?? null,
    schemeNames: Array.isArray(raw?.scheme_names) ? raw.scheme_names : raw?.scheme_name ? [String(raw.scheme_name)] : []
  };
};

const normalizeGroup = (raw: any): InvoiceMonthGroup => {
  const items = Array.isArray(raw?.items) ? raw.items.map(normalizeItem) : [];
  const turnover = numberOr(raw?.turnover, items.reduce((sum: number, item: InvoiceListItem) => sum + item.amount, 0));
  const rewardAmount = numberOr(raw?.reward_amount ?? raw?.rewardAmount, items.reduce((sum: number, item: InvoiceListItem) => sum + item.rewardAmount, 0));
  return {
    monthKey: String(raw?.month_key ?? raw?.monthKey ?? raw?.month_label ?? raw?.monthLabel ?? ""),
    monthLabel: String(raw?.month_label ?? raw?.monthLabel ?? formatMonth(raw?.month_key ?? raw?.monthKey)),
    count: numberOr(raw?.count, items.length),
    turnover,
    turnoverDisplay: String(raw?.turnover_display ?? raw?.turnoverDisplay ?? money(turnover)),
    rewardAmount,
    rewardDisplay: String(raw?.reward_display ?? raw?.rewardDisplay ?? (rewardAmount ? `+${money(rewardAmount)}` : "+₹0")),
    items
  };
};

const groupItems = (items: InvoiceListItem[], rawItems: any[] = []) => {
  const grouped = new Map<string, { label: string; items: InvoiceListItem[] }>();
  items.forEach((item, index) => {
    const raw = rawItems[index] || {};
    const key = String(raw?.month_key ?? raw?.monthKey ?? item.displayDate ?? "invoices");
    const label = String(raw?.month_label ?? raw?.monthLabel ?? formatMonth(raw?.invoice_date ?? raw?.invoiceDate ?? item.displayDate));
    const current = grouped.get(key) || { label, items: [] };
    current.items.push(item);
    grouped.set(key, current);
  });

  return Array.from(grouped.entries()).map(([monthKey, group]) => normalizeGroup({ month_key: monthKey, month_label: group.label, items: group.items }));
};

const normalizeResponse = (raw: any): InvoiceListResponse => {
  const groups = Array.isArray(raw?.groups) ? raw.groups.map(normalizeGroup) : [];
  const rawItems = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.data) ? raw.data : [];
  const items = groups.length ? groups.flatMap((group: InvoiceMonthGroup) => group.items) : rawItems.map(normalizeItem);
  const resolvedGroups = groups.length ? groups : groupItems(items, rawItems);
  const totalTurnover = numberOr(raw?.summary?.total_turnover ?? raw?.summary?.totalTurnover, resolvedGroups.reduce((sum: number, group: InvoiceMonthGroup) => sum + group.turnover, 0));
  const rewardsCredited = numberOr(raw?.summary?.rewards_credited ?? raw?.summary?.rewardsCredited, items.reduce((sum: number, item: InvoiceListItem) => sum + (item.isRewardCredited ? item.rewardAmount : 0), 0));

  return {
    summary: {
      totalInvoices: numberOr(raw?.summary?.total_invoices ?? raw?.summary?.totalInvoices, items.length),
      rewardsCredited,
      rewardsCreditedDisplay: String(raw?.summary?.rewards_credited_display ?? raw?.summary?.rewardsCreditedDisplay ?? money(rewardsCredited)),
      approvedInvoices: numberOr(raw?.summary?.approved_invoices ?? raw?.summary?.approvedInvoices, items.filter((item: InvoiceListItem) => item.status === "approved").length),
      pendingInvoices: numberOr(raw?.summary?.pending_invoices ?? raw?.summary?.pendingInvoices, items.filter((item: InvoiceListItem) => item.status === "pending").length),
      totalTurnover,
      totalTurnoverDisplay: String(raw?.summary?.total_turnover_display ?? raw?.summary?.totalTurnoverDisplay ?? money(totalTurnover))
    },
    searchPlaceholder: String(raw?.filter_options?.search_placeholder ?? raw?.filterOptions?.searchPlaceholder ?? "Search invoice number"),
    statuses: Array.isArray(raw?.filter_options?.statuses) ? raw.filter_options.statuses : [],
    groups: resolvedGroups,
    items
  };
};

const normalizeDetail = (raw: any): InvoiceDetail => {
  const source = raw?.data ?? raw;
  const statusKey = String(raw?.status_key ?? raw?.statusKey ?? source?.approval_status_label ?? source?.approvalStatusLabel ?? "").toLowerCase();
  const listItem = normalizeItem({
    ...source,
    status: statusKey === "rejected" || statusKey.includes("reject") ? "rejected" : statusKey === "approved" || statusKey.includes("approved ho") ? "approved" : "pending",
    is_pending: raw?.is_pending ?? raw?.isPending,
    reward_amount: source?.scheme_points ?? source?.schemePoints,
    expected_reward_amount: source?.expected_scheme_points ?? source?.expectedSchemePoints,
    scheme_name: source?.scheme_name ?? source?.schemeName
  });
  const history = (source?.approval_logs ?? source?.approvalLogs ?? []).map((log: any) => ({
    id: String(log?.id ?? `${log?.status_type}-${log?.created_at}`),
    title: String(log?.status_type ?? log?.statusType ?? "Updated").replace(/_/g, " "),
    userName: log?.created_by_name ?? log?.createdByName,
    amount: log?.approved_amount ?? log?.approvedAmount,
    remark: log?.remark,
    date: log?.log_date ?? log?.logDate ?? log?.created_at ?? log?.createdAt
  }));
  return {
    ...listItem,
    invoiceDate: source?.invoice_date ?? source?.invoiceDate,
    schemeName: source?.scheme_name ?? source?.schemeName,
    schemeCode: source?.scheme_code ?? source?.schemeCode,
    tierName: source?.tier_name ?? source?.tierName,
    hint: source?.scheme_hint_message ?? source?.schemeHintMessage,
    createdAt: source?.created_at ?? source?.createdAt,
    approvalRemark: source?.approval_remark ?? source?.approvalRemark,
    history
  };
};

export const invoiceApi = {
  async list(params: InvoiceListParams = {}) {
    const { data } = await apiClient.get("/invoices", {
      params: {
        search: params.search || "",
        dealer_id: "",
        status: params.status && params.status !== "all" ? params.status : "",
        date_from: params.fromDate || "",
        date_to: params.toDate || "",
        start_date: params.fromDate || "",
        end_date: params.toDate || "",
        page: 1,
        page_size: 20
      }
    });
    return normalizeResponse(data);
  },
  async detail(id: string) {
    const { data } = await apiClient.get(`/invoices/${id}`);
    return normalizeDetail(data);
  }
};
