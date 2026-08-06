import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { CalendarDateField, CalendarDatePicker } from "@/components/CalendarDatePicker";
import { colors, gradients } from "@/constants/colors";
import { Route } from "@/navigation/routes";
import {
  RedemptionHistoryGroup,
  RedemptionHistoryItem,
  RedemptionHistoryMode,
  RedemptionHistoryResponse,
  RedemptionHistoryStatus,
  RedemptionHistoryWalletType,
  redemptionHistoryApi
} from "@/services/redemptionHistoryApi";
import { showToast } from "@/services/toast";
import { clearToken } from "@/services/storage";
import { jakarta } from "@/styles/appStyles";

const pageSize = 20;

const emptyData: RedemptionHistoryResponse = {
  summary: {
    totalRedemptions: 0,
    totalPoints: 0,
    totalPointsDisplay: "0",
    pendingPoints: 0,
    pendingPointsDisplay: "0",
    approvedPoints: 0,
    approvedPointsDisplay: "0",
    regularPoints: 0,
    regularPointsDisplay: "0",
    boosterPoints: 0,
    boosterPointsDisplay: "0"
  },
  groups: [],
  items: [],
  pagination: { page: 1, pageSize, hasNext: false }
};

const walletOptions: { key: RedemptionHistoryWalletType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Regular", label: "Regular Wallet" },
  { key: "Booster", label: "Booster Wallet" }
];

const statusOptions: { key: RedemptionHistoryStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "hold", label: "Hold" }
];

const modeOptions: { key: RedemptionHistoryMode; label: string }[] = [
  { key: "all", label: "All" },
  { key: "NEFT", label: "NEFT" },
  { key: "IMPS", label: "IMPS" }
];

export default function RedemptionHistoryScreen({ go }: { go: (route: Route) => void }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<RedemptionHistoryResponse>(emptyData);
  const [walletType, setWalletType] = useState<RedemptionHistoryWalletType>("all");
  const [status, setStatus] = useState<RedemptionHistoryStatus>("all");
  const [redeemMode, setRedeemMode] = useState<RedemptionHistoryMode>("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const loadHistory = async (page: number, append = false) => {
    const currentRequest = ++requestId.current;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const next = await redemptionHistoryApi.list({ page, pageSize, walletType, status, redeemMode, search, fromDate, toDate });
      if (currentRequest !== requestId.current) return;
      setData((current) => append ? mergeHistory(current, next) : next);
    } catch (error: any) {
      if (currentRequest !== requestId.current) return;
      if (error?.response?.status === 401) {
        await clearToken();
        go("Login");
      } else {
        showToast("Unable to load redemption history", "error");
      }
      if (!append) setData(emptyData);
    } finally {
      if (currentRequest === requestId.current) {
        append ? setLoadingMore(false) : setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadHistory(1, false);
  }, [walletType, status, redeemMode, search, fromDate, toDate]);

  const groups = useMemo(() => data.groups.filter((group) => group.items.length), [data.groups]);
  const hasItems = data.items.length > 0;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 180;
    if (nearBottom && data.pagination.hasNext && !loading && !loadingMore) {
      loadHistory(data.pagination.page + 1, true);
    }
  };

  return (
    <SafeAreaView edges={["left", "right"]} style={screenStyles.safe}>
      <StatusBar style="light" />
      <View style={[screenStyles.phone, { paddingTop: Math.max(insets.top, 12) }]}>
        <HistoryHeader summary={data.summary} loading={loading} onBack={() => go("Home")} />
        <ScrollView
          style={screenStyles.scroll}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={screenStyles.content}
          scrollEventThrottle={16}
          onScroll={handleScroll}
        >
          <View style={screenStyles.searchRow}>
            <View style={screenStyles.searchBox}>
              <Text style={screenStyles.searchIcon}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search transaction or scheme"
                placeholderTextColor="#737d87"
                style={screenStyles.searchInput}
              />
            </View>
            <Pressable onPress={() => setFilterOpen(true)} style={screenStyles.filterButton}>
              <Text style={screenStyles.filterIcon}>⚙</Text>
            </Pressable>
          </View>
          <ActiveFilters
            walletType={walletType}
            status={status}
            redeemMode={redeemMode}
            fromDate={fromDate}
            toDate={toDate}
            onClearWallet={() => setWalletType("all")}
            onClearStatus={() => setStatus("all")}
            onClearMode={() => setRedeemMode("all")}
            onClearDates={() => {
              setFromDate("");
              setToDate("");
            }}
          />

          <View style={screenStyles.summaryGrid}>
            <SmallSummary label="Pending" value={data.summary.pendingPointsDisplay} tone="amber" />
            <SmallSummary label="Approved" value={data.summary.approvedPointsDisplay} tone="green" />
            <SmallSummary label="Regular" value={data.summary.regularPointsDisplay} tone="blue" />
            <SmallSummary label="Booster" value={data.summary.boosterPointsDisplay} tone="gold" />
          </View>

          {loading ? (
            <View style={screenStyles.loadingCard}><ActivityIndicator color={colors.primary} /><Text style={screenStyles.loadingText}>Loading redemption history</Text></View>
          ) : null}
          {!loading && !hasItems ? <EmptyHistory /> : null}
          {!loading && groups.map((group) => <MonthSection key={group.monthKey || group.monthLabel} group={group} />)}
          {loadingMore ? <View style={screenStyles.moreLoader}><ActivityIndicator color={colors.primary} /></View> : null}
        </ScrollView>
        <FilterSheet
          visible={filterOpen}
          walletType={walletType}
          status={status}
          redeemMode={redeemMode}
          fromDate={fromDate}
          toDate={toDate}
          onWalletChange={setWalletType}
          onStatusChange={setStatus}
          onModeChange={setRedeemMode}
          onDateChange={(nextFromDate, nextToDate) => {
            setFromDate(nextFromDate);
            setToDate(nextToDate);
          }}
          onClose={() => setFilterOpen(false)}
        />
      </View>
    </SafeAreaView>
  );
}

function HistoryHeader({ summary, loading, onBack }: { summary: RedemptionHistoryResponse["summary"]; loading: boolean; onBack: () => void }) {
  return (
    <View style={screenStyles.header}>
      <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Pressable onPress={onBack} style={screenStyles.headerButton}><Text style={screenStyles.headerButtonText}>←</Text></Pressable>
      <Text style={screenStyles.headerTitle}>REDEMPTION HISTORY</Text>
      <View style={screenStyles.summaryRow}>
        <SummaryTile label="TOTAL REDEMPTIONS" value={loading ? "..." : String(summary.totalRedemptions)} />
        <SummaryTile label="TOTAL POINTS" value={loading ? "..." : summary.totalPointsDisplay} />
      </View>
      <Svg width="120%" height={82} viewBox="0 0 390 82" preserveAspectRatio="none" style={screenStyles.headerWave}>
        <Path d="M0 42 C72 21 151 24 224 45 C293 65 342 54 390 17 L390 82 L0 82 Z" fill="#f8fafc" />
      </Svg>
    </View>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={screenStyles.summaryTile}>
      <Text style={screenStyles.summaryLabel}>{label}</Text>
      <Text style={screenStyles.summaryValue}>{value}</Text>
    </View>
  );
}

function SmallSummary({ label, value, tone }: { label: string; value: string; tone: "amber" | "green" | "blue" | "gold" }) {
  const toneStyle = tone === "amber"
    ? screenStyles.smallSummaryAmber
    : tone === "green"
      ? screenStyles.smallSummaryGreen
      : tone === "blue"
        ? screenStyles.smallSummaryBlue
        : screenStyles.smallSummaryGold;
  return (
    <View style={[screenStyles.smallSummary, toneStyle]}>
      <Text style={screenStyles.smallSummaryLabel}>{label}</Text>
      <Text style={screenStyles.smallSummaryValue}>{value}</Text>
    </View>
  );
}

function ChipRow<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={screenStyles.chipRow}>
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <Pressable key={option.key} onPress={() => onChange(option.key)} style={[screenStyles.chip, selected && screenStyles.chipActive]}>
            <Text style={[screenStyles.chipText, selected && screenStyles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ActiveFilters({
  walletType,
  status,
  redeemMode,
  fromDate,
  toDate,
  onClearWallet,
  onClearStatus,
  onClearMode,
  onClearDates
}: {
  walletType: RedemptionHistoryWalletType;
  status: RedemptionHistoryStatus;
  redeemMode: RedemptionHistoryMode;
  fromDate: string;
  toDate: string;
  onClearWallet: () => void;
  onClearStatus: () => void;
  onClearMode: () => void;
  onClearDates: () => void;
}) {
  const filters = [
    walletType !== "all" ? { key: "wallet", label: optionLabel(walletOptions, walletType), onClear: onClearWallet } : null,
    status !== "all" ? { key: "status", label: optionLabel(statusOptions, status), onClear: onClearStatus } : null,
    redeemMode !== "all" ? { key: "mode", label: optionLabel(modeOptions, redeemMode), onClear: onClearMode } : null,
    fromDate || toDate ? { key: "date", label: dateRangeLabel(fromDate, toDate), onClear: onClearDates } : null
  ].filter(Boolean) as { key: string; label: string; onClear: () => void }[];

  if (!filters.length) return null;
  return (
    <View style={screenStyles.activeFilterWrap}>
      {filters.map((filter) => (
        <View key={filter.key} style={screenStyles.activeFilterPill}>
          <Text style={screenStyles.activeFilterText}>{filter.label}</Text>
          <Pressable onPress={filter.onClear}><Text style={screenStyles.clearFilter}>×</Text></Pressable>
        </View>
      ))}
    </View>
  );
}

function FilterSheet({
  visible,
  walletType,
  status,
  redeemMode,
  fromDate,
  toDate,
  onWalletChange,
  onStatusChange,
  onModeChange,
  onDateChange,
  onClose
}: {
  visible: boolean;
  walletType: RedemptionHistoryWalletType;
  status: RedemptionHistoryStatus;
  redeemMode: RedemptionHistoryMode;
  fromDate: string;
  toDate: string;
  onWalletChange: (value: RedemptionHistoryWalletType) => void;
  onStatusChange: (value: RedemptionHistoryStatus) => void;
  onModeChange: (value: RedemptionHistoryMode) => void;
  onDateChange: (fromDate: string, toDate: string) => void;
  onClose: () => void;
}) {
  const [draftFromDate, setDraftFromDate] = useState(fromDate);
  const [draftToDate, setDraftToDate] = useState(toDate);
  const [calendarField, setCalendarField] = useState<"from" | "to" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDraftFromDate(fromDate);
    setDraftToDate(toDate);
    setCalendarField(null);
    setError("");
  }, [fromDate, toDate, visible]);

  const apply = () => {
    const validationError = validateDateRange(draftFromDate, draftToDate);
    if (validationError) {
      setError(validationError);
      return;
    }
    onDateChange(draftFromDate.trim(), draftToDate.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={screenStyles.sheetOverlay}>
        <Pressable style={screenStyles.sheet}>
          <View style={screenStyles.sheetHandle} />
          <View style={screenStyles.sheetTitleRow}>
            <Text style={screenStyles.sheetTitle}>Filter history</Text>
            <Pressable
              onPress={() => {
                onWalletChange("all");
                onStatusChange("all");
                onModeChange("all");
                onDateChange("", "");
                setDraftFromDate("");
                setDraftToDate("");
                setCalendarField(null);
                setError("");
              }}
            >
              <Text style={screenStyles.sheetReset}>Reset</Text>
            </Pressable>
          </View>
          <Text style={screenStyles.sheetSectionTitle}>Wallet</Text>
          <ChipRow options={walletOptions} value={walletType} onChange={onWalletChange} />
          <Text style={screenStyles.sheetSectionTitle}>Status</Text>
          <ChipRow options={statusOptions} value={status} onChange={onStatusChange} />
          <Text style={screenStyles.sheetSectionTitle}>Mode</Text>
          <ChipRow options={modeOptions} value={redeemMode} onChange={onModeChange} />
          <Text style={screenStyles.sheetSectionTitle}>Date range</Text>
          <View style={screenStyles.dateInputRow}>
            <CalendarDateField label="From" value={draftFromDate} onPress={() => setCalendarField("from")} />
            <CalendarDateField label="To" value={draftToDate} onPress={() => setCalendarField("to")} />
          </View>
          <CalendarDatePicker
            visible={calendarField !== null}
            title={calendarField === "to" ? "Select to date" : "Select from date"}
            value={calendarField === "to" ? draftToDate : draftFromDate}
            minDate={calendarField === "to" ? draftFromDate : undefined}
            maxDate={calendarField === "from" ? draftToDate : undefined}
            onClose={() => setCalendarField(null)}
            onSelect={(value) => {
              if (calendarField === "to") {
                setDraftToDate(value);
              } else {
                setDraftFromDate(value);
              }
              setCalendarField(null);
              setError("");
            }}
          />
          {error ? <Text style={screenStyles.sheetError}>{error}</Text> : null}
          <Pressable onPress={apply} style={screenStyles.sheetApplyButton}>
            <Text style={screenStyles.sheetApplyText}>APPLY FILTERS</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MonthSection({ group }: { group: RedemptionHistoryGroup }) {
  return (
    <View style={screenStyles.monthSection}>
      <View style={screenStyles.monthHeader}>
        <View style={screenStyles.monthTitleRow}>
          <Text style={screenStyles.monthTitle}>{group.monthLabel}</Text>
          <Text style={screenStyles.countBadge}>{group.count}</Text>
        </View>
        <Text style={screenStyles.monthMeta}>Points <Text style={screenStyles.monthPoints}>{group.pointsDisplay}</Text></Text>
      </View>
      <View style={screenStyles.historyCard}>
        {group.items.map((item, index) => (
          <HistoryRow key={`${item.id}-${item.transactionNoDisplay}-${index}`} item={item} isLast={index === group.items.length - 1} />
        ))}
      </View>
    </View>
  );
}

function HistoryRow({ item, isLast }: { item: RedemptionHistoryItem; isLast: boolean }) {
  return (
    <View style={[screenStyles.historyRow, isLast && screenStyles.historyRowLast]}>
      <View style={[screenStyles.statusIconBox, statusIconTone(item.status)]}>
        <Text style={screenStyles.statusIconText}>{statusSymbol(item.status)}</Text>
      </View>
      <View style={screenStyles.historyMain}>
        <View style={screenStyles.historyTitleRow}>
          <Text numberOfLines={1} style={screenStyles.transactionNo}>{item.transactionNoDisplay}</Text>
          <Text style={[screenStyles.statusBadge, statusBadgeStyle(item.status)]}>{item.statusLabel}</Text>
        </View>
        <Text numberOfLines={1} style={screenStyles.schemeText}>{item.schemeName}</Text>
        <Text numberOfLines={1} style={screenStyles.bankText}>
          {item.displayDate} · {item.walletType} · {item.redeemMode}
        </Text>
        <Text numberOfLines={1} style={screenStyles.bankText}>
          {[item.bankName, item.maskedAccountNumber].filter(Boolean).join(" · ")}
        </Text>
        {item.remark ? <Text numberOfLines={2} style={screenStyles.remarkText}>{item.remark}</Text> : null}
      </View>
      <View style={screenStyles.pointsBlock}>
        <Text style={screenStyles.pointsValue}>{item.pointsDisplay}</Text>
        <Text style={screenStyles.pointsLabel}>points</Text>
      </View>
    </View>
  );
}

function EmptyHistory() {
  return (
    <View style={screenStyles.emptyCard}>
      <Text style={screenStyles.emptyIcon}>₹</Text>
      <Text style={screenStyles.emptyTitle}>No redemptions found</Text>
      <Text style={screenStyles.emptyText}>Try changing filters or date range.</Text>
    </View>
  );
}

function statusIconTone(status: RedemptionHistoryStatus) {
  if (status === "approved") return screenStyles.statusIconApproved;
  if (status === "rejected") return screenStyles.statusIconRejected;
  if (status === "hold") return screenStyles.statusIconHold;
  return screenStyles.statusIconPending;
}

function statusBadgeStyle(status: RedemptionHistoryStatus) {
  if (status === "approved") return screenStyles.statusBadgeApproved;
  if (status === "rejected") return screenStyles.statusBadgeRejected;
  if (status === "hold") return screenStyles.statusBadgeHold;
  return screenStyles.statusBadgePending;
}

function statusSymbol(status: RedemptionHistoryStatus) {
  if (status === "approved") return "✓";
  if (status === "rejected") return "!";
  if (status === "hold") return "•";
  return "⌛";
}

function optionLabel<T extends string>(options: { key: T; label: string }[], value: T) {
  return options.find((option) => option.key === value)?.label || value;
}

function isValidDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function validateDateRange(fromDate: string, toDate: string) {
  const from = fromDate.trim();
  const to = toDate.trim();
  if (!from && !to) return "";
  if (!from || !to) return "Please enter both from and to dates.";
  if (!isValidDateValue(from) || !isValidDateValue(to)) return "Use valid dates in YYYY-MM-DD format.";
  if (from > to) return "From date cannot be after to date.";
  return "";
}

function dateRangeLabel(fromDate: string, toDate: string) {
  if (fromDate && toDate) return `${fromDate} to ${toDate}`;
  return fromDate || toDate;
}

function mergeHistory(current: RedemptionHistoryResponse, next: RedemptionHistoryResponse): RedemptionHistoryResponse {
  const groupMap = new Map(current.groups.map((group) => [group.monthKey, { ...group, items: [...group.items] }]));
  next.groups.forEach((group) => {
    const existing = groupMap.get(group.monthKey);
    if (existing) {
      existing.items.push(...group.items);
      existing.count += group.count;
      existing.points += group.points;
      existing.pointsDisplay = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(existing.points);
    } else {
      groupMap.set(group.monthKey, group);
    }
  });
  return {
    summary: next.summary,
    items: [...current.items, ...next.items],
    groups: Array.from(groupMap.values()),
    pagination: next.pagination
  };
}

const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#e8edf3" },
  phone: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  header: { height: 254, paddingHorizontal: 28, paddingTop: 44, overflow: "hidden" },
  headerButton: { position: "absolute", left: 28, top: 54, width: 46, height: 46, borderRadius: 15, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.42)", backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  headerButtonText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 21, marginTop: -2 },
  headerTitle: { marginTop: 22, textAlign: "center", fontFamily: jakarta.extraBold, color: colors.white, fontSize: 15, letterSpacing: 3, marginLeft: 15 },
  summaryRow: { marginTop: 30, flexDirection: "row", gap: 12, zIndex: 2 },
  summaryTile: { flex: 1, minHeight: 72, borderRadius: 16, borderWidth: 1.2, borderColor: "rgba(255,255,255,0.26)", backgroundColor: "rgba(255,255,255,0.13)", paddingHorizontal: 15, paddingVertical: 13 },
  summaryLabel: { fontFamily: jakarta.extraBold, color: "rgba(255,255,255,0.82)", fontSize: 8, letterSpacing: 2.2 },
  summaryValue: { marginTop: 6, fontFamily: jakarta.extraBold, color: colors.white, fontSize: 24, letterSpacing: 0 },
  headerWave: { position: "absolute", left: 0, right: 0, bottom: -1 },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 36 },
  searchRow: { flexDirection: "row", gap: 5, alignItems: "center" },
  searchBox: { flex: 1, height: 58, borderRadius: 18, borderWidth: 1, borderColor: "#dfe6ee", backgroundColor: colors.white, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, shadowColor: colors.navy, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  searchIcon: { fontSize: 28, color: "#99a5af", marginRight: 12 },
  searchInput: { flex: 1, height: 44, padding: 0, paddingTop: 0, paddingBottom: 0, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 13, lineHeight: 18, textAlignVertical: "center" },
  filterButton: { width: 58, height: 58, borderRadius: 18, borderWidth: 1, borderColor: "#dfe6ee", backgroundColor: colors.white, alignItems: "center", justifyContent: "center", shadowColor: colors.navy, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  filterIcon: { fontSize: 22 },
  activeFilterWrap: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  activeFilterPill: { height: 30, paddingHorizontal: 13, borderRadius: 999, backgroundColor: "#e8f4ff", borderWidth: 1, borderColor: "#a7d4f2", flexDirection: "row", alignItems: "center", gap: 8 },
  activeFilterText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 11 },
  clearFilter: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 17, marginTop: -2 },
  chipRow: { gap: 8, paddingRight: 18 },
  chip: { minHeight: 34, borderRadius: 999, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: colors.white, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  chipActive: { borderColor: "#a7d4f2", backgroundColor: "#e8f4ff" },
  chipText: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 12 },
  chipTextActive: { color: colors.primary },
  summaryGrid: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  smallSummary: { width: "48.4%", minHeight: 62, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  smallSummaryAmber: { borderColor: "#f3d486", backgroundColor: "#fff9e8" },
  smallSummaryGreen: { borderColor: "#a7d4f2", backgroundColor: "#e8f4ff" },
  smallSummaryBlue: { borderColor: "#b8daf2", backgroundColor: "#f0f8ff" },
  smallSummaryGold: { borderColor: "#efd897", backgroundColor: "#fff8df" },
  smallSummaryLabel: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 10, letterSpacing: 1.8 },
  smallSummaryValue: { marginTop: 5, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 18 },
  loadingCard: { marginTop: 18, borderRadius: 18, padding: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: "#dfe6ee", alignItems: "center", gap: 8 },
  loadingText: { fontFamily: jakarta.bold, color: colors.muted, fontSize: 12 },
  moreLoader: { paddingVertical: 18 },
  monthSection: { marginTop: 24 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  monthTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  monthTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14, letterSpacing: 2.2 },
  countBadge: { minWidth: 30, height: 24, borderRadius: 999, overflow: "hidden", textAlign: "center", lineHeight: 24, backgroundColor: "#e1f1ff", borderWidth: 1, borderColor: "#a7d4f2", fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 12 },
  monthMeta: { flex: 1, textAlign: "right", fontFamily: jakarta.extraBold, color: "#9aa6b3", fontSize: 11 },
  monthPoints: { color: colors.primary },
  historyCard: { marginTop: 14, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: "#dfe6ee", overflow: "hidden", shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  historyRow: { minHeight: 116, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#e9eef3", flexDirection: "row", alignItems: "flex-start" },
  historyRowLast: { borderBottomWidth: 0 },
  statusIconBox: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 13 },
  statusIconPending: { backgroundColor: "#fff4d8" },
  statusIconApproved: { backgroundColor: "#e8f4ff" },
  statusIconRejected: { backgroundColor: "#ffe9e9" },
  statusIconHold: { backgroundColor: "#f3f5f7" },
  statusIconText: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 17 },
  historyMain: { flex: 1, minWidth: 0 },
  historyTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  transactionNo: { flex: 1, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14.5 },
  statusBadge: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontFamily: jakarta.extraBold, fontSize: 8.5 },
  statusBadgePending: { backgroundColor: "#fff4d8", color: "#a97900" },
  statusBadgeApproved: { backgroundColor: "#e8f4ff", color: colors.primary },
  statusBadgeRejected: { backgroundColor: "#ffe9e9", color: colors.danger },
  statusBadgeHold: { backgroundColor: "#eef1f4", color: colors.muted },
  schemeText: { marginTop: 4, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 12 },
  bankText: { marginTop: 4, fontFamily: jakarta.bold, color: "#7a8793", fontSize: 11 },
  remarkText: { marginTop: 5, fontFamily: jakarta.bold, color: "#a97900", fontSize: 11, lineHeight: 16 },
  pointsBlock: { width: 74, alignItems: "flex-end", marginLeft: 8 },
  pointsValue: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 16 },
  pointsLabel: { marginTop: 3, fontFamily: jakarta.extraBold, color: "#9aa6b3", fontSize: 10 },
  emptyCard: { marginTop: 24, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: "#dfe6ee", padding: 28, alignItems: "center" },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, overflow: "hidden", textAlign: "center", lineHeight: 54, backgroundColor: "#e8f4ff", color: colors.primary, fontFamily: jakarta.extraBold, fontSize: 28 },
  emptyTitle: { marginTop: 16, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 17 },
  emptyText: { marginTop: 6, fontFamily: jakarta.bold, color: colors.muted, fontSize: 12 },
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,30,46,0.35)" },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.white, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 26 },
  sheetHandle: { alignSelf: "center", width: 48, height: 5, borderRadius: 999, backgroundColor: "#d8e0e7", marginBottom: 18 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 19 },
  sheetReset: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 13 },
  sheetSectionTitle: { marginTop: 20, marginBottom: 9, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 11, letterSpacing: 2.2 },
  dateInputRow: { flexDirection: "row", gap: 12 },
  sheetError: { marginTop: 10, fontFamily: jakarta.bold, color: colors.danger, fontSize: 12 },
  sheetApplyButton: { marginTop: 24, height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sheetApplyText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13, letterSpacing: 2.2 }
});
