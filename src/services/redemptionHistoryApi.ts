import { apiClient } from "@/services/apiClient";

export type RedemptionHistoryWalletType = "all" | "Regular" | "Booster";
export type RedemptionHistoryStatus = "all" | "pending" | "approved" | "rejected" | "hold";
export type RedemptionHistoryMode = "all" | "NEFT" | "IMPS";

export type RedemptionHistoryParams = {
  page?: number;
  pageSize?: number;
  walletType?: RedemptionHistoryWalletType;
  status?: RedemptionHistoryStatus;
  redeemMode?: RedemptionHistoryMode;
  fromDate?: string;
  toDate?: string;
  search?: string;
};

export type RedemptionHistoryItem = {
  id: string;
  transactionNoDisplay: string;
  schemeName: string;
  walletType: string;
  redeemMode: string;
  points: number;
  pointsDisplay: string;
  status: RedemptionHistoryStatus;
  statusLabel: string;
  displayDate: string;
  monthKey: string;
  monthLabel: string;
  maskedAccountNumber: string;
  bankName: string;
  remark?: string;
};

export type RedemptionHistoryGroup = {
  monthKey: string;
  monthLabel: string;
  count: number;
  points: number;
  pointsDisplay: string;
  items: RedemptionHistoryItem[];
};

export type RedemptionHistorySummary = {
  totalRedemptions: number;
  totalPoints: number;
  totalPointsDisplay: string;
  pendingPoints: number;
  pendingPointsDisplay: string;
  approvedPoints: number;
  approvedPointsDisplay: string;
  regularPoints: number;
  regularPointsDisplay: string;
  boosterPoints: number;
  boosterPointsDisplay: string;
};

export type RedemptionHistoryPagination = {
  page: number;
  pageSize: number;
  hasNext: boolean;
};

export type RedemptionHistoryResponse = {
  summary: RedemptionHistorySummary;
  groups: RedemptionHistoryGroup[];
  items: RedemptionHistoryItem[];
  pagination: RedemptionHistoryPagination;
};

const numberOr = (value: any, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const points = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const pointsDisplay = (raw: any, fallback: number) => String(raw ?? points(fallback));

const booleanOr = (value: any) => value === true || value === 1 || String(value).toLowerCase() === "true";

const statusKey = (value: any): RedemptionHistoryStatus => {
  const next = String(value || "").toLowerCase();
  if (next.includes("approve")) return "approved";
  if (next.includes("reject")) return "rejected";
  if (next.includes("hold")) return "hold";
  if (next.includes("pending")) return "pending";
  return "pending";
};

const formatMonth = (value?: string) => {
  if (!value) return "REDEMPTIONS";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.toUpperCase();
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date).toUpperCase();
};

const normalizeItem = (raw: any): RedemptionHistoryItem => {
  const transaction = String(raw?.transaction_no_display ?? raw?.transactionNoDisplay ?? raw?.transaction_no ?? raw?.transactionNo ?? raw?.id ?? "");
  const status = statusKey(raw?.status ?? raw?.status_label ?? raw?.statusLabel);
  const itemPoints = numberOr(raw?.points ?? raw?.redeem_points ?? raw?.requested_points ?? raw?.requestedPoints, 0);
  const displayDate = String(raw?.display_date ?? raw?.displayDate ?? raw?.created_at ?? raw?.createdAt ?? raw?.date ?? "");
  const monthKey = String(raw?.month_key ?? raw?.monthKey ?? (displayDate || "redemptions"));
  return {
    id: String(raw?.id ?? transaction),
    transactionNoDisplay: transaction ? String(raw?.transaction_no_display ?? raw?.transactionNoDisplay ?? transaction) : "Transaction",
    schemeName: String(raw?.scheme_name ?? raw?.schemeName ?? "Redemption"),
    walletType: String(raw?.wallet_type ?? raw?.walletType ?? ""),
    redeemMode: String(raw?.redeem_mode ?? raw?.redeemMode ?? ""),
    points: itemPoints,
    pointsDisplay: pointsDisplay(raw?.points_display ?? raw?.pointsDisplay, itemPoints),
    status,
    statusLabel: String(raw?.status_label ?? raw?.statusLabel ?? status.toUpperCase()),
    displayDate,
    monthKey,
    monthLabel: String(raw?.month_label ?? raw?.monthLabel ?? formatMonth(displayDate)),
    maskedAccountNumber: String(raw?.masked_account_number ?? raw?.maskedAccountNumber ?? raw?.bank_account?.masked_account_number ?? raw?.bankAccount?.maskedAccountNumber ?? ""),
    bankName: String(raw?.bank_name ?? raw?.bankName ?? raw?.bank_account?.bank_name ?? raw?.bankAccount?.bankName ?? ""),
    remark: raw?.remark ?? raw?.remarks ?? raw?.reason ?? undefined
  };
};

const normalizeGroup = (raw: any): RedemptionHistoryGroup => {
  const items = Array.isArray(raw?.items) ? raw.items.map(normalizeItem) : [];
  const groupPoints = numberOr(raw?.points ?? raw?.total_points ?? raw?.totalPoints, items.reduce((sum: number, item: RedemptionHistoryItem) => sum + item.points, 0));
  return {
    monthKey: String(raw?.month_key ?? raw?.monthKey ?? raw?.month_label ?? raw?.monthLabel ?? "redemptions"),
    monthLabel: String(raw?.month_label ?? raw?.monthLabel ?? formatMonth(raw?.month_key ?? raw?.monthKey)),
    count: numberOr(raw?.count, items.length),
    points: groupPoints,
    pointsDisplay: pointsDisplay(raw?.points_display ?? raw?.pointsDisplay ?? raw?.total_points_display ?? raw?.totalPointsDisplay, groupPoints),
    items
  };
};

const groupItems = (items: RedemptionHistoryItem[]) => {
  const grouped = new Map<string, RedemptionHistoryGroup>();
  items.forEach((item) => {
    const current = grouped.get(item.monthKey) || {
      monthKey: item.monthKey,
      monthLabel: item.monthLabel,
      count: 0,
      points: 0,
      pointsDisplay: "0",
      items: []
    };
    current.items.push(item);
    current.count += 1;
    current.points += item.points;
    current.pointsDisplay = points(current.points);
    grouped.set(item.monthKey, current);
  });
  return Array.from(grouped.values());
};

const normalizeSummary = (raw: any, items: RedemptionHistoryItem[]): RedemptionHistorySummary => {
  const source = raw?.summary || {};
  const totalPoints = numberOr(source.total_points ?? source.totalPoints, items.reduce((sum, item) => sum + item.points, 0));
  const pendingPoints = numberOr(source.pending_points ?? source.pendingPoints, items.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.points, 0));
  const approvedPoints = numberOr(source.approved_points ?? source.approvedPoints, items.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.points, 0));
  const regularPoints = numberOr(source.regular_points ?? source.regularPoints, items.filter((item) => item.walletType.toLowerCase().includes("regular")).reduce((sum, item) => sum + item.points, 0));
  const boosterPoints = numberOr(source.booster_points ?? source.boosterPoints, items.filter((item) => item.walletType.toLowerCase().includes("booster")).reduce((sum, item) => sum + item.points, 0));
  return {
    totalRedemptions: numberOr(source.total_redemptions ?? source.totalRedemptions ?? source.count, items.length),
    totalPoints,
    totalPointsDisplay: pointsDisplay(source.total_points_display ?? source.totalPointsDisplay, totalPoints),
    pendingPoints,
    pendingPointsDisplay: pointsDisplay(source.pending_points_display ?? source.pendingPointsDisplay, pendingPoints),
    approvedPoints,
    approvedPointsDisplay: pointsDisplay(source.approved_points_display ?? source.approvedPointsDisplay, approvedPoints),
    regularPoints,
    regularPointsDisplay: pointsDisplay(source.regular_points_display ?? source.regularPointsDisplay, regularPoints),
    boosterPoints,
    boosterPointsDisplay: pointsDisplay(source.booster_points_display ?? source.boosterPointsDisplay, boosterPoints)
  };
};

const normalizeResponse = (raw: any): RedemptionHistoryResponse => {
  const source = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
  const groups = Array.isArray(source?.groups) ? source.groups.map(normalizeGroup) : [];
  const rawItems = Array.isArray(source?.items) ? source.items : Array.isArray(source?.data) ? source.data : [];
  const items = groups.length ? groups.flatMap((group: RedemptionHistoryGroup) => group.items) : rawItems.map(normalizeItem);
  const resolvedGroups = groups.length ? groups : groupItems(items);
  const paginationSource = source?.pagination || raw?.pagination || {};
  return {
    summary: normalizeSummary(source, items),
    groups: resolvedGroups,
    items,
    pagination: {
      page: numberOr(paginationSource.page ?? source?.page, 1),
      pageSize: numberOr(paginationSource.page_size ?? paginationSource.pageSize ?? source?.page_size, 20),
      hasNext: booleanOr(paginationSource.has_next ?? paginationSource.hasNext)
    }
  };
};

export const redemptionHistoryApi = {
  async list(params: RedemptionHistoryParams = {}) {
    const { data } = await apiClient.get("/redemptions/history", {
      params: {
        page: params.page ?? 1,
        page_size: params.pageSize ?? 20,
        wallet_type: params.walletType && params.walletType !== "all" ? params.walletType : "all",
        status: params.status || "all",
        redeem_mode: params.redeemMode || "all",
        date_from: params.fromDate || "",
        date_to: params.toDate || "",
        start_date: params.fromDate || "",
        end_date: params.toDate || "",
        search: params.search || ""
      }
    });
    return normalizeResponse(data);
  }
};
