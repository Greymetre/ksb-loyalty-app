import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { CalendarDateField, CalendarDatePicker } from "@/components/CalendarDatePicker";
import { colors, gradients } from "@/constants/colors";
import { Route } from "@/navigation/routes";
import { InvoiceListItem, InvoiceListResponse, InvoiceMonthGroup, invoiceApi } from "@/services/invoiceApi";
import { jakarta } from "@/styles/appStyles";

const emptyInvoiceData: InvoiceListResponse = {
  summary: {
    totalInvoices: 0,
    rewardsCredited: 0,
    rewardsCreditedDisplay: "₹0",
    approvedInvoices: 0,
    pendingInvoices: 0,
    rejectedInvoices: 0,
    totalTurnover: 0,
    totalTurnoverDisplay: "₹0"
  },
  searchPlaceholder: "Search invoice number",
  statuses: [
    { key: "all", label: "All" },
    { key: "approved", label: "Approved" },
    { key: "pending", label: "Pending" },
    { key: "rejected", label: "Rejected" }
  ],
  groups: [],
  items: []
};

export default function InvoicesScreen({ go, onOpenInvoice }: { go: (route: Route) => void; onOpenInvoice: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const [invoiceData, setInvoiceData] = useState<InvoiceListResponse>(emptyInvoiceData);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    invoiceApi.list({ search, status, fromDate, toDate })
      .then((data) => {
        if (alive) setInvoiceData(data);
      })
      .catch(() => {
        if (alive) setInvoiceData(emptyInvoiceData);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [search, status, fromDate, toDate]);

  const groups = useMemo(() => invoiceData.groups.filter((group) => group.items.length), [invoiceData.groups]);
  const statusOptions = invoiceData.statuses.length ? invoiceData.statuses : emptyInvoiceData.statuses;
  const activeStatusLabel = statusOptions.find((option) => option.key === status)?.label || "All";

  return (
    <SafeAreaView edges={["left", "right"]} style={screenStyles.safe}>
      <StatusBar style="light" />
      <View style={[screenStyles.phone, { paddingTop: Math.max(insets.top, 12) }]}>
        <InvoiceHeader summary={invoiceData.summary} loading={loading} onBack={() => go("Home")} />
        <ScrollView style={screenStyles.scroll} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={screenStyles.content}>
          <View style={screenStyles.searchRow}>
            <View style={screenStyles.searchBox}>
              <Text style={screenStyles.searchIcon}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={invoiceData.searchPlaceholder}
                placeholderTextColor="#737d87"
                style={screenStyles.searchInput}
              />
            </View>
            <Pressable onPress={() => setFilterOpen(true)} style={screenStyles.filterButton}>
              <Text style={screenStyles.filterIcon}>⚙</Text>
            </Pressable>
          </View>
          <ActiveFilters
            status={status}
            statusLabel={activeStatusLabel}
            fromDate={fromDate}
            toDate={toDate}
            onClearStatus={() => setStatus("all")}
            onClearDates={() => {
              setFromDate("");
              setToDate("");
            }}
          />
          <View style={screenStyles.infoBanner}>
            <Text style={screenStyles.infoIcon}>ℹ</Text>
            <Text style={screenStyles.infoText}>Invoices are uploaded by your dealer & verified by KSB. You can view all rewards earned here.</Text>
          </View>
          {loading ? (
            <View style={screenStyles.loadingCard}><ActivityIndicator color={colors.primary} /><Text style={screenStyles.loadingText}>Loading invoices</Text></View>
          ) : null}
          {!loading && groups.length === 0 ? <Text style={screenStyles.emptyText}>No invoices found.</Text> : null}
          {groups.map((group) => <MonthSection key={group.monthKey || group.monthLabel} group={group} onOpenInvoice={onOpenInvoice} />)}
        </ScrollView>
        <FilterSheet
          visible={filterOpen}
          status={status}
          fromDate={fromDate}
          toDate={toDate}
          options={statusOptions}
          onClose={() => setFilterOpen(false)}
          onApply={(nextStatus, nextFromDate, nextToDate) => {
            setStatus(nextStatus);
            setFromDate(nextFromDate);
            setToDate(nextToDate);
            setFilterOpen(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function InvoiceHeader({ summary, loading, onBack }: { summary: InvoiceListResponse["summary"]; loading: boolean; onBack: () => void }) {
  return (
    <View style={screenStyles.header}>
      <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Pressable onPress={onBack} style={screenStyles.headerButton}><Text style={screenStyles.headerButtonText}>←</Text></Pressable>
      <Pressable style={[screenStyles.headerButton, screenStyles.downloadButton]}><Text style={screenStyles.headerButtonText}>↓</Text></Pressable>
      <Text style={screenStyles.headerTitle}>MY INVOICES</Text>
      <View style={screenStyles.summaryRow}>
        <SummaryTile label="TOTAL INVOICES" value={loading ? "..." : String(summary.totalInvoices)} />
        <SummaryTile label="REWARDS EARNED" value={loading ? "..." : summary.rewardsCreditedDisplay} />
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

function MonthSection({ group, onOpenInvoice }: { group: InvoiceMonthGroup; onOpenInvoice: (id: string) => void }) {
  return (
    <View style={screenStyles.monthSection}>
      <View style={screenStyles.monthHeader}>
        <View style={screenStyles.monthTitleRow}>
          <Text style={screenStyles.monthTitle}>{group.monthLabel}</Text>
          <Text style={screenStyles.countBadge}>{group.count}</Text>
        </View>
        <Text style={screenStyles.monthMeta}>Turnover <Text style={screenStyles.monthAmount}>{group.turnoverDisplay}</Text> · <Text style={screenStyles.monthReward}>{group.rewardDisplay}</Text></Text>
      </View>
      <View style={screenStyles.invoiceCard}>
        {group.items.map((invoice, index) => (
          <InvoiceListRow key={`${invoice.id}-${invoice.invoiceNumber}-${index}`} invoice={invoice} isLast={index === group.items.length - 1} onPress={() => onOpenInvoice(invoice.id)} />
        ))}
      </View>
    </View>
  );
}

function InvoiceListRow({ invoice, isLast, onPress }: { invoice: InvoiceListItem; isLast: boolean; onPress: () => void }) {
  const pending = invoice.isPending || invoice.status === "pending";
  const rejected = invoice.status === "rejected";
  return (
    <Pressable onPress={onPress} style={[screenStyles.invoiceRow, isLast && screenStyles.invoiceRowLast]}>
      <View style={[screenStyles.docIconBox, pending && screenStyles.docIconPending, rejected && screenStyles.docIconRejected]}>
        <Text style={screenStyles.docIcon}>▤</Text>
        <View style={[screenStyles.statusDot, pending && screenStyles.statusDotPending, rejected && screenStyles.statusDotRejected]}>
          <Text style={screenStyles.statusDotText}>{pending ? "⌛" : rejected ? "!" : "✓"}</Text>
        </View>
      </View>
      <View style={screenStyles.invoiceMain}>
        <View style={screenStyles.invoiceTitleRow}>
          <Text numberOfLines={1} style={screenStyles.invoiceNumber}>{invoice.invoiceNumberDisplay}</Text>
          {pending ? <Text style={screenStyles.pendingBadge}>PENDING</Text> : null}
          {rejected ? <Text style={screenStyles.rejectedBadge}>REJECTED</Text> : null}
        </View>
        <Text numberOfLines={1} style={screenStyles.invoiceSub}>{invoice.displayDate} · {invoice.amountDisplay}</Text>
      </View>
      <View style={screenStyles.rewardBlock}>
        <Text style={[screenStyles.rewardValue, pending && screenStyles.pendingReward, rejected && screenStyles.pendingReward]}>{pending ? invoice.expectedRewardDisplay : rejected ? "—" : invoice.rewardDisplay}</Text>
        <Text style={screenStyles.rewardLabel}>{pending ? "Awaiting Approval" : rejected ? "Rejected" : "Reward Earned"}</Text>
      </View>
      <Text style={screenStyles.chevron}>›</Text>
    </Pressable>
  );
}

function ActiveFilters({
  status,
  statusLabel,
  fromDate,
  toDate,
  onClearStatus,
  onClearDates
}: {
  status: string;
  statusLabel: string;
  fromDate: string;
  toDate: string;
  onClearStatus: () => void;
  onClearDates: () => void;
}) {
  const filters = [
    status !== "all" ? { key: "status", label: statusLabel, onClear: onClearStatus } : null,
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
  status,
  fromDate,
  toDate,
  options,
  onClose,
  onApply
}: {
  visible: boolean;
  status: string;
  fromDate: string;
  toDate: string;
  options: { key: string; label: string }[];
  onClose: () => void;
  onApply: (status: string, fromDate: string, toDate: string) => void;
}) {
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftFromDate, setDraftFromDate] = useState(fromDate);
  const [draftToDate, setDraftToDate] = useState(toDate);
  const [calendarField, setCalendarField] = useState<"from" | "to" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDraftStatus(status);
    setDraftFromDate(fromDate);
    setDraftToDate(toDate);
    setCalendarField(null);
    setError("");
  }, [fromDate, status, toDate, visible]);

  const apply = () => {
    const validationError = validateDateRange(draftFromDate, draftToDate);
    if (validationError) {
      setError(validationError);
      return;
    }
    onApply(draftStatus, draftFromDate.trim(), draftToDate.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={screenStyles.sheetOverlay}>
        <Pressable style={screenStyles.sheet}>
          <View style={screenStyles.sheetHandle} />
          <View style={screenStyles.sheetTitleRow}>
            <Text style={screenStyles.sheetTitle}>Filter invoices</Text>
            <Pressable
              onPress={() => {
                setDraftStatus("all");
                setDraftFromDate("");
                setDraftToDate("");
                setCalendarField(null);
                setError("");
              }}
            >
              <Text style={screenStyles.sheetReset}>Reset</Text>
            </Pressable>
          </View>
          <Text style={screenStyles.sheetSectionTitle}>Status</Text>
          {options.map((option) => (
            <Pressable key={option.key} onPress={() => setDraftStatus(option.key)} style={[screenStyles.sheetOption, draftStatus === option.key && screenStyles.sheetOptionActive]}>
              <Text style={[screenStyles.sheetOptionText, draftStatus === option.key && screenStyles.sheetOptionTextActive]}>{option.label}</Text>
              {draftStatus === option.key ? <Text style={screenStyles.sheetTick}>✓</Text> : null}
            </Pressable>
          ))}
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

const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#e8edf3" },
  phone: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  header: { height: 254, paddingHorizontal: 28, paddingTop: 44, overflow: "hidden" },
  headerButton: { position: "absolute", left: 28, top: 54, width: 46, height: 46, borderRadius: 15, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.42)", backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  downloadButton: { left: undefined, right: 28 },
  headerButtonText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 21, marginTop: -2 },
  headerTitle: { marginTop: 26, textAlign: "center", fontFamily: jakarta.extraBold, color: colors.white, fontSize: 15, letterSpacing: 6 },
  summaryRow: { marginTop: 30, flexDirection: "row", gap: 12, zIndex: 2 },
  summaryTile: { flex: 1, minHeight: 72, borderRadius: 16, borderWidth: 1.2, borderColor: "rgba(255,255,255,0.26)", backgroundColor: "rgba(255,255,255,0.13)", paddingHorizontal: 15, paddingVertical: 13 },
  summaryLabel: { fontFamily: jakarta.extraBold, color: "rgba(255,255,255,0.82)", fontSize: 8, letterSpacing: 2.2 },
  summaryValue: { marginTop: 6, fontFamily: jakarta.extraBold, color: colors.white, fontSize: 24, letterSpacing: 0 },
  headerWave: { position: "absolute", left: 0, right: 0, bottom: -1 },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 34 },
  searchRow: { flexDirection: "row", gap: 5, alignItems: "center" },
  searchBox: { flex: 1, height: 58, borderRadius: 18, borderWidth: 1, borderColor: "#dfe6ee", backgroundColor: colors.white, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, shadowColor: colors.navy, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  searchIcon: { fontSize: 28, color: "#99a5af", marginRight: 12 },
  searchInput: { flex: 1, height: "100%", padding: 0, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14 },
  filterButton: { width: 58, height: 58, borderRadius: 18, borderWidth: 1, borderColor: "#dfe6ee", backgroundColor: colors.white, alignItems: "center", justifyContent: "center", shadowColor: colors.navy, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  filterIcon: { fontSize: 22 },
  activeFilterWrap: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  activeFilterPill: { height: 30, paddingHorizontal: 13, borderRadius: 999, backgroundColor: "#e8f4ff", borderWidth: 1, borderColor: "#a7d4f2", flexDirection: "row", alignItems: "center", gap: 8 },
  activeFilterText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 11 },
  clearFilter: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 17, marginTop: -2 },
  infoBanner: { marginTop: 22, borderRadius: 16, borderWidth: 1.2, borderStyle: "dashed", borderColor: "#a7d8ef", backgroundColor: "#f4fbff", padding: 15, flexDirection: "row", gap: 13, alignItems: "center" },
  infoIcon: { width: 26, height: 26, borderRadius: 4, overflow: "hidden", textAlign: "center", lineHeight: 26, backgroundColor: "#7ca8bb", color: colors.white, fontFamily: jakarta.extraBold, fontSize: 18 },
  infoText: { flex: 1, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 12, lineHeight: 19 },
  loadingCard: { marginTop: 18, borderRadius: 18, padding: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: "#dfe6ee", alignItems: "center", gap: 8 },
  loadingText: { fontFamily: jakarta.bold, color: colors.muted, fontSize: 12 },
  emptyText: { marginTop: 22, textAlign: "center", fontFamily: jakarta.bold, color: colors.muted, fontSize: 13 },
  monthSection: { marginTop: 24 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  monthTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  monthTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14, letterSpacing: 2.2 },
  countBadge: { minWidth: 30, height: 24, borderRadius: 999, overflow: "hidden", textAlign: "center", lineHeight: 24, backgroundColor: "#e1f1ff", borderWidth: 1, borderColor: "#a7d4f2", fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 12 },
  monthMeta: { flex: 1, textAlign: "right", fontFamily: jakarta.extraBold, color: "#9aa6b3", fontSize: 11 },
  monthAmount: { color: colors.navy },
  monthReward: { color: colors.primary },
  invoiceCard: { marginTop: 14, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: "#dfe6ee", overflow: "hidden", shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  invoiceRow: { minHeight: 92, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#e9eef3", flexDirection: "row", alignItems: "center" },
  invoiceRowLast: { borderBottomWidth: 0 },
  docIconBox: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#e8f6f2", alignItems: "center", justifyContent: "center", marginRight: 14 },
  docIconPending: { backgroundColor: "#fff8df" },
  docIconRejected: { backgroundColor: "#fff0f0" },
  docIcon: { color: "#77bde6", fontSize: 29, marginTop: -1 },
  statusDot: { position: "absolute", right: -3, bottom: -3, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.white, alignItems: "center", justifyContent: "center" },
  statusDotPending: { backgroundColor: "#a97900" },
  statusDotRejected: { backgroundColor: colors.danger },
  statusDotText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 11 },
  invoiceMain: { flex: 1, minWidth: 0 },
  invoiceTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  invoiceNumber: { flexShrink: 1, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 15 },
  pendingBadge: { borderRadius: 999, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 3, backgroundColor: "#fff4d8", fontFamily: jakarta.extraBold, color: "#a97900", fontSize: 9 },
  rejectedBadge: { borderRadius: 999, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 3, backgroundColor: "#ffe9e9", fontFamily: jakarta.extraBold, color: colors.danger, fontSize: 9 },
  invoiceSub: { marginTop: 5, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 11.5 },
  rewardBlock: { width: 92, alignItems: "flex-end", marginLeft: 8 },
  rewardValue: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 15 },
  pendingReward: { color: "#9aa6b3" },
  rewardLabel: { marginTop: 3, textAlign: "right", fontFamily: jakarta.extraBold, color: "#9aa6b3", fontSize: 10.5 },
  chevron: { marginLeft: 10, color: "#9aa6b3", fontSize: 26, lineHeight: 26 },
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,30,46,0.35)" },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.white, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34 },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 99, backgroundColor: "#d9e2ea", marginBottom: 18 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  sheetTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 18 },
  sheetReset: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 13 },
  sheetSectionTitle: { marginTop: 10, marginBottom: 9, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 11, letterSpacing: 2.2 },
  sheetOption: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "transparent" },
  sheetOptionActive: { backgroundColor: "#e8f4ff", borderColor: "#a7d4f2" },
  sheetOptionText: { flex: 1, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 14 },
  sheetOptionTextActive: { color: colors.primary },
  sheetTick: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 16 },
  dateInputRow: { flexDirection: "row", gap: 12 },
  sheetError: { marginTop: 10, fontFamily: jakarta.bold, color: colors.danger, fontSize: 12 },
  sheetApplyButton: { marginTop: 22, height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sheetApplyText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13, letterSpacing: 2.2 }
});
