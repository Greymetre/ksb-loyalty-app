import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../../constants/colors";
import { DealerRetailerFilter, DealerRetailerList, DealerRetailerListItem, dealerRetailerApi } from "../../services/dealerRetailerApi";
import { jakarta } from "../../styles/appStyles";

const empty: DealerRetailerList = {
  items: [], total: 0, page: 1, pageSize: 20,
  summary: { totalRetailers: 0, activeRetailers: 0, pendingKycRetailers: 0 },
};

export default function DealerRetailersScreen({ onBack, initialFilter = "all", initialActiveOnly = false }: { onBack: () => void; initialFilter?: DealerRetailerFilter; initialActiveOnly?: boolean }) {
  const [data, setData] = useState<DealerRetailerList>(empty);
  const [filter, setFilter] = useState<DealerRetailerFilter>(initialFilter);
  // Opened from a dashboard tile the screen shows only retailers with invoices, so the
  // number here matches the number that was tapped. Touching a chip means the dealer is
  // now driving the filter, and the list opens up to every assigned retailer.
  const [activeOnly, setActiveOnly] = useState(initialActiveOnly);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);
  const listRef = useRef<ScrollView>(null);

  const load = async (refresh = false) => {
    const currentRequest = ++requestId.current;
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await dealerRetailerApi.list(1, search, filter, activeOnly);
      if (currentRequest === requestId.current) setData(result);
    } catch {
      if (currentRequest === requestId.current) setData(empty);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const loadMore = async () => {
    if (loading || loadingMore || data.items.length >= data.total) return;
    const currentRequest = ++requestId.current;
    setLoadingMore(true);
    try {
      const next = await dealerRetailerApi.list(data.page + 1, search, filter, activeOnly);
      if (currentRequest === requestId.current) {
        setData(current => ({ ...next, items: [...current.items, ...next.items] }));
      }
    } finally {
      if (currentRequest === requestId.current) setLoadingMore(false);
    }
  };

  useEffect(() => {
    listRef.current?.scrollTo({ y: 0, animated: false });
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [search, filter, activeOnly]);

  // The server applies the same filter. This is only a guard for a server build
  // that does not know the kyc parameter yet, so the chip never shows a verified
  // retailer under Pending KYC.
  const visibleItems = filter === "pending" ? data.items.filter(item => item.kycStatus !== "verified") : data.items;

  const pickFilter = (next: DealerRetailerFilter) => {
    setActiveOnly(false);
    setFilter(next);
  };

  return <View style={s.root}>
    <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.back}><Text style={s.backText}>←</Text></Pressable>
        <Text style={s.title}>My Retailers</Text>
        <View style={s.headerSpace} />
      </View>
      <View style={s.summaryRow}>
        <Summary label="TOTAL RETAILERS" value={data.summary.totalRetailers} />
        <Summary label="PENDING KYC" value={data.summary.pendingKycRetailers} />
      </View>
    </LinearGradient>

    <View style={s.body}>
      <View style={s.searchBox}><Text style={s.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Search retailer or shop" style={s.search} /></View>
      <View style={s.chips}>
        <Chip label="All" count={data.summary.totalRetailers} active={filter === "all"} onPress={() => pickFilter("all")} />
        <Chip label="Pending KYC" count={data.summary.pendingKycRetailers} active={filter === "pending"} onPress={() => pickFilter("pending")} />
      </View>
      {activeOnly ? <Text style={s.scopeNote}>Showing retailers who have raised an invoice · tap a filter to see all</Text> : null}
      <ScrollView ref={listRef} showsVerticalScrollIndicator={false} contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
        <View style={s.cards}>
          {loading ? <View style={s.loading}><ActivityIndicator color={colors.primary} /><Text style={s.loadingText}>Loading retailers</Text></View> : null}
          {!loading && !visibleItems.length ? <View style={s.empty}><Text style={s.emptyIcon}>🏪</Text><Text style={s.emptyTitle}>No retailers found</Text><Text style={s.emptyText}>{filter === "pending" ? "Every assigned retailer has completed KYC." : "Retailers assigned to you will appear here."}</Text></View> : null}
          {visibleItems.map(item => <RetailerCard key={item.id} item={item} />)}
          {!loading && data.items.length < data.total ? <Pressable onPress={() => void loadMore()} disabled={loadingMore} style={s.more}>{loadingMore ? <ActivityIndicator color="#fff" /> : <Text style={s.moreText}>Load more retailers</Text>}</Pressable> : null}
        </View>
      </ScrollView>
    </View>
  </View>;
}

function Chip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    <View style={[s.chipCount, active && s.chipCountActive]}><Text style={[s.chipCountText, active && s.chipCountTextActive]}>{count}</Text></View>
  </Pressable>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <View style={s.summary}><Text style={s.summaryLabel}>{label}</Text><Text style={s.summaryValue}>{value}</Text></View>;
}

function RetailerCard({ item }: { item: DealerRetailerListItem }) {
  const initials = item.ownerName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "R";
  const verified = item.kycStatus === "verified";
  const meta = [item.shopName, item.beatName].filter(Boolean).join(" · ");
  return <View style={s.card}>
    <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
    <View style={s.cardBody}>
      <Text style={s.owner} numberOfLines={1}>{item.ownerName}</Text>
      <Text style={s.meta} numberOfLines={1}>{meta || item.code || item.mobile}</Text>
      {item.code ? <Text style={s.code} numberOfLines={1}>{item.code}{item.mobile ? ` · ${item.mobile}` : ""}</Text> : null}
    </View>
    <View style={s.cardRight}>
      <View style={[s.badge, verified ? s.verifiedBg : s.pendingBg]}><Text style={[s.badgeText, verified ? s.verified : s.pending]}>{item.kycStatusLabel}</Text></View>
      <Text style={s.points}>{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(item.rewardPoints)} pts</Text>
    </View>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, hero: { paddingBottom: 20 }, header: { height: 76, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,.32)", backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }, backText: { color: "#fff", fontSize: 30 }, title: { fontFamily: jakarta.extraBold, color: "#fff", fontSize: 20, textTransform: "uppercase", letterSpacing: .8 }, headerSpace: { width: 46 },
  summaryRow: { flexDirection: "row", gap: 12, paddingHorizontal: 20 }, summary: { flex: 1, minHeight: 82, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,.28)", backgroundColor: "rgba(255,255,255,.13)" }, summaryLabel: { fontFamily: jakarta.bold, color: "#d6e5f7", fontSize: 9, letterSpacing: .8 }, summaryValue: { fontFamily: jakarta.extraBold, color: "#fff", fontSize: 24, marginTop: 6 },
  body: { flex: 1, paddingHorizontal: 20 }, searchBox: { height: 58, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 18 }, searchIcon: { fontSize: 24, color: colors.muted }, search: { flex: 1, marginLeft: 9, fontFamily: jakarta.semiBold, color: colors.navy },
  chips: { flexDirection: "row", gap: 10, marginTop: 14 },
  scopeNote: { fontFamily: jakarta.medium, color: colors.muted, fontSize: 10, marginTop: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, height: 38, paddingHorizontal: 14, borderRadius: 99, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: jakarta.bold, color: colors.navy, fontSize: 12 },
  chipTextActive: { color: "#fff" },
  chipCount: { minWidth: 22, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: "#eef3fa", alignItems: "center", justifyContent: "center" },
  chipCountActive: { backgroundColor: "rgba(255,255,255,.22)" },
  chipCountText: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 10 },
  chipCountTextActive: { color: "#fff" },
  list: { paddingTop: 16, paddingBottom: 135 }, cards: { gap: 12 }, loading: { padding: 30, alignItems: "center" }, loadingText: { fontFamily: jakarta.medium, color: colors.muted, marginTop: 8 }, empty: { padding: 35, alignItems: "center", backgroundColor: "#fff", borderRadius: 22 }, emptyIcon: { fontSize: 30 }, emptyTitle: { fontFamily: jakarta.bold, color: colors.navy, marginTop: 8 }, emptyText: { fontFamily: jakarta.medium, color: colors.muted, fontSize: 11, marginTop: 5 },
  card: { minHeight: 102, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 21, borderWidth: 1, borderColor: colors.border, padding: 15 }, avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#eaf3ff", alignItems: "center", justifyContent: "center" }, avatarText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 16 }, cardBody: { flex: 1, minWidth: 0, marginLeft: 12 }, owner: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14 }, meta: { fontFamily: jakarta.semiBold, color: colors.muted, fontSize: 11, marginTop: 3 }, code: { fontFamily: jakarta.medium, color: "#98a6ba", fontSize: 9, marginTop: 4 }, cardRight: { alignItems: "flex-end", marginLeft: 8 }, badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }, badgeText: { fontFamily: jakarta.bold, fontSize: 9 }, verifiedBg: { backgroundColor: "#e5f8ee" }, verified: { color: "#13875a" }, pendingBg: { backgroundColor: "#fff2da" }, pending: { color: "#a96810" }, points: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 12, marginTop: 7 },
  more: { height: 48, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 4 }, moreText: { fontFamily: jakarta.bold, color: "#fff", fontSize: 12 },
});
