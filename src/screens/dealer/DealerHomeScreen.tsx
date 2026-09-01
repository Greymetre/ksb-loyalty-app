import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { KsbLogo } from "../../components/KsbLogo";
import { colors, gradients } from "../../constants/colors";
import { DealerDashboardData, dealerDashboardApi } from "../../services/dealerDashboardApi";
import { clearToken, getUser } from "../../services/storage";
import { jakarta, styles as appStyles } from "../../styles/appStyles";
import DealerInvoicesScreen from "./DealerInvoicesScreen";
import DealerNewInvoiceScreen from "./DealerNewInvoiceScreen";
import SchemeSlider from "@/components/home/SchemeSlider";
import DealerSchemeDetailScreen from "./DealerSchemeDetailScreen";
import { DealerInvoiceItem } from "../../services/dealerInvoiceApi";
import DealerRetailersScreen from "./DealerRetailersScreen";
import DealerInvoiceDetailsSheet from "./DealerInvoiceDetailsSheet";
import DealerProfileScreen from "./DealerProfileScreen";

type DealerTab = "Dashboard" | "Invoices" | "New Entry" | "Edit Invoice" | "Scheme Detail" | "Retailers" | "Profile";
type DealerProfile = { name?: string; owner_name?: string; shop_name?: string; customer_type_name?: string; zone?: string; zone_name?: string; custom_fields?: Record<string, unknown> };
const emptyDashboard: DealerDashboardData = { assignedRetailers: 0, activeRetailers: 0, pendingKycRetailers: 0, totalInvoices: 0, totalInvoiceAmount: 0, approvedInvoiceAmount: 0, expectedInvoiceAmount: 0, totalRewardEarned: 0, totalExpectedReward: 0, recentInvoices: [] };
const tabs: Array<{ label: DealerTab; icon: string }> = [
  { label: "Dashboard", icon: "🏠" }, { label: "Invoices", icon: "📄" },
  { label: "New Entry", icon: "+" }, { label: "Retailers", icon: "🏪" }, { label: "Profile", icon: "👤" },
];
const drawerTabs: Array<{ label: DealerTab; title: string; subtitle: string; icon: string }> = [
  { label: "Invoices", title: "Invoices", subtitle: "View and manage retailer invoices", icon: "📄" },
  { label: "Retailers", title: "Retailers", subtitle: "View assigned retailers", icon: "🏪" },
  { label: "Profile", title: "Profile", subtitle: "View and update account details", icon: "👤" },
];
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const money = (value: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value || 0)}`;
// Reward points reach six figures and used to wrap onto a second line inside the
// summary card. From a thousand up they are shown in K, one decimal.
const compactMoney = (value: number) => {
  const amount = value || 0;
  if (Math.abs(amount) < 1000) return money(amount);
  const thousands = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount / 1000);
  return `₹${thousands.replace(/\.0$/, "")}K`;
};
const inProcessBadge = { backgroundColor: "#e8f1ff" } as const;
const inProcessText = { color: "#3563aa" } as const;
const holdBadge = { backgroundColor: "#efeaff" } as const;
const holdText = { color: "#5b45c9" } as const;

export default function DealerHomeScreen({ onLogout }: { onLogout: () => void }) {
  const [selectedTab, setSelectedTab] = useState<DealerTab>("Dashboard");
  const [tabVisit, setTabVisit] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<DealerProfile>({});
  const [dashboard, setDashboard] = useState<DealerDashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<DealerInvoiceItem | null>(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [retailerFilter, setRetailerFilter] = useState<"all" | "pending">("all");
  const [retailerActiveOnly, setRetailerActiveOnly] = useState(false);

  const loadDashboard = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      setProfile((await getUser<DealerProfile>()) || {});
      setDashboard(await dealerDashboardApi.get());
    } catch { if (!refresh) setDashboard(emptyDashboard); }
    finally { setLoading(false); setRefreshing(false); }
  };
  // The dealer dashboard stays mounted while moving between its bottom tabs.
  // Reload it whenever the Dashboard tab is selected so counts and recent
  // invoices are never stale.
  useEffect(() => {
    if (selectedTab === "Dashboard") void loadDashboard();
  }, [selectedTab]);

  const selectTab = (tab: DealerTab) => {
    const isSameTab = tab === selectedTab;
    // Reaching Retailers from the tab bar always means the full list; only the
    // dashboard's Pending KYC tile opens it pre-filtered.
    if (tab === "Retailers") { setRetailerFilter("all"); setRetailerActiveOnly(false); }
    setSelectedTab(tab);
    // Invoice/New Entry screens are locally tabbed and therefore remain
    // mounted on a repeated press. A visit key guarantees their APIs reload.
    setTabVisit((visit) => visit + 1);
    if (tab === "Dashboard" && isSameTab) void loadDashboard(true);
  };

  const selectDrawerTab = (tab: DealerTab) => {
    setMenuOpen(false);
    selectTab(tab);
  };

  const fields = profile.custom_fields || {};
  const dealerName = text(profile.owner_name) || text(profile.name) || text(profile.shop_name) || "Dealer Partner";
  const zone = text(fields.zone_name) || text(fields.zone) || text(profile.zone_name) || text(profile.zone);
  const partner = text(profile.customer_type_name) || "Distributor Partner";
  const logout = async () => { if (loggingOut) return; setLoggingOut(true); try { await clearToken(); onLogout(); } finally { setLoggingOut(false); } };

  if (selectedTab === "Invoices") return <SafeAreaView style={appStyles.homeSafe} edges={["top"]}><View style={local.screen}><DealerInvoicesScreen key={`invoices-${tabVisit}`} onBack={() => selectTab("Dashboard")} onNew={() => { setEditingInvoice(null); selectTab("New Entry"); }} onEdit={(invoice) => { setEditingInvoice(invoice); selectTab("Edit Invoice"); }} /><DealerTabs selected={selectedTab} onSelect={selectTab} /></View></SafeAreaView>;
  if (selectedTab === "New Entry") return <SafeAreaView style={appStyles.homeSafe} edges={["top"]}><View style={local.screen}><DealerNewInvoiceScreen key={`new-entry-${tabVisit}`} onBack={() => selectTab("Dashboard")} onCreated={() => { void loadDashboard(true); selectTab("Invoices"); }} /><DealerTabs selected={selectedTab} onSelect={selectTab} /></View></SafeAreaView>;
  if (selectedTab === "Scheme Detail" && selectedSchemeId) return <SafeAreaView style={appStyles.homeSafe} edges={["top"]}><View style={local.screen}><DealerSchemeDetailScreen key={`scheme-${selectedSchemeId}-${tabVisit}`} schemeId={selectedSchemeId} onBack={() => { setSelectedSchemeId(null); selectTab("Dashboard"); }} /><DealerTabs selected="Dashboard" onSelect={selectTab} /></View></SafeAreaView>;
  if (selectedTab === "Edit Invoice" && editingInvoice) return <SafeAreaView style={appStyles.homeSafe} edges={["top"]}><View style={local.screen}><DealerNewInvoiceScreen key={`edit-invoice-${editingInvoice.id}-${tabVisit}`} invoice={editingInvoice} onBack={() => selectTab("Invoices")} onCreated={() => { setEditingInvoice(null); void loadDashboard(true); selectTab("Invoices"); }} /><DealerTabs selected="Invoices" onSelect={selectTab} /></View></SafeAreaView>;
  if (selectedTab === "Retailers") return <SafeAreaView style={appStyles.homeSafe} edges={["top"]}><View style={local.screen}><DealerRetailersScreen key={`retailers-${retailerFilter}-${retailerActiveOnly}-${tabVisit}`} initialFilter={retailerFilter} initialActiveOnly={retailerActiveOnly} onBack={() => selectTab("Dashboard")} /><DealerTabs selected={selectedTab} onSelect={selectTab} /></View></SafeAreaView>;
  if (selectedTab === "Profile") return <SafeAreaView style={appStyles.homeSafe} edges={["top"]}><View style={local.screen}><DealerProfileScreen key={`profile-${tabVisit}`} onBack={() => selectTab("Dashboard")} onLogout={onLogout} /><DealerTabs selected={selectedTab} onSelect={selectTab} /></View></SafeAreaView>;

  return <SafeAreaView style={appStyles.homeSafe} edges={["top"]}><View style={local.screen}>
    <ScrollView style={appStyles.homeScroll} contentContainerStyle={local.scroll} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}>
      <View style={appStyles.homeTopBar}>
        <Pressable style={appStyles.homeIconButton} onPress={() => setMenuOpen(true)}><Text style={appStyles.homeMenuIcon}>☰</Text></Pressable>
        <View style={appStyles.homeBrand}><KsbLogo size={30} /><Text style={appStyles.homeBrandText}>धनवर्षा</Text></View>
        <Pressable style={appStyles.homeIconButton}><Text style={appStyles.bellIcon}>🔔</Text></Pressable>
      </View>

      <View style={appStyles.homePage}>
        <View style={appStyles.greetingBlock}>
          <Text style={appStyles.greetingMuted}>Namaste 🙏</Text>
          <Text style={appStyles.greetingName} numberOfLines={1}>{dealerName}<Text style={appStyles.greetingJi}> ji</Text></Text>
          <Text style={local.partner}>{partner}{zone ? ` · ${zone}` : ""}</Text>
        </View>

        <SchemeSlider onOpen={(schemeId) => { setSelectedSchemeId(schemeId); selectTab("Scheme Detail"); }} />

        <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[appStyles.redeemHero, local.hero]}>
          <View style={appStyles.heroRingOuter} /><View style={appStyles.heroRingInner} />
          <Text style={appStyles.redeemEyebrow}>RETAILER REWARDS SUMMARY</Text>
          {loading ? <ActivityIndicator color="#fff" size="large" style={local.loader} /> : <View style={local.rewardRow}>
            <Reward label="REWARD EARNED" value={compactMoney(dashboard.totalRewardEarned)} meta={`Approved amount · ${money(dashboard.approvedInvoiceAmount)}`} />
            <View style={local.divider} />
            <Reward label="EXPECTED REWARD" value={compactMoney(dashboard.totalExpectedReward)} meta={`Expected amount · ${money(dashboard.expectedInvoiceAmount)}`} />
          </View>}
        </LinearGradient>

        <View style={local.grid}>
          <Summary icon="🏪" value={`${dashboard.assignedRetailers}`} label="Total retailers" />
          <Summary icon="✅" value={`${dashboard.activeRetailers}`} label="Active retailers" />
          <Summary icon="📄" value={`${dashboard.totalInvoices}`} label="Invoices uploaded" />
          <Summary icon="🪪" value={`${dashboard.pendingKycRetailers}`} label="Pending KYC retailers" onPress={() => { setRetailerFilter("pending"); setRetailerActiveOnly(true); setSelectedTab("Retailers"); setTabVisit(visit => visit + 1); }} />
        </View>

        <View style={appStyles.walletSectionHead}><Text style={appStyles.walletSectionTitle}>Recent invoice activity</Text><Pressable onPress={() => selectTab("Invoices")}><Text style={local.link}>View all →</Text></Pressable></View>
        {!loading && !dashboard.recentInvoices.length ? <View style={local.empty}><Text style={local.emptyIcon}>📭</Text><Text style={local.emptyTitle}>No invoice activity yet</Text><Text style={local.emptyText}>Invoices from your assigned retailers will appear here.</Text></View> : null}
        {dashboard.recentInvoices.map(invoice => {
          const approved = invoice.status === "approved";
          const rejected = invoice.status === "rejected";
          const inProcess = invoice.status === "in_process";
          const held = invoice.status === "hold";
          return <Pressable key={invoice.id} style={local.invoice} onPress={() => setSelectedInvoiceId(invoice.id)}>
            <View style={local.invoiceIcon}><Text style={local.iconText}>📄</Text></View>
            <View style={local.invoiceInfo}><Text style={local.invoiceName} numberOfLines={1}>{invoice.retailerName}</Text><Text style={local.invoiceMeta} numberOfLines={1}>{invoice.invoiceNumber} · {invoice.displayDate}</Text></View>
            <View style={local.invoiceRight}><Text style={local.invoiceAmount}>{money(invoice.amount)}</Text><View style={[local.badge, approved ? local.approvedBg : rejected ? local.rejectedBg : held ? holdBadge : inProcess ? inProcessBadge : local.pendingBg]}><Text style={[local.badgeText, approved ? local.approved : rejected ? local.rejected : held ? holdText : inProcess ? inProcessText : local.pending]}>{invoice.statusLabel}</Text></View></View>
          </Pressable>;
        })}
      </View>
    </ScrollView>

    <View style={appStyles.homeTabs}>{tabs.map(tab => {
      const active = selectedTab === tab.label;
      if (tab.label === "New Entry") return <Pressable key={tab.label} onPress={() => selectTab(tab.label)} style={appStyles.redeemFab}><Text style={[appStyles.redeemFabText, active && appStyles.redeemFabTextActive]}>{tab.icon}</Text><Text style={active ? appStyles.redeemFabLabelActive : appStyles.redeemFabLabel}>{tab.label}</Text></Pressable>;
      return <Pressable key={tab.label} onPress={() => selectTab(tab.label)} style={appStyles.homeTabItem}><Text style={appStyles.homeTabIcon}>{tab.icon}</Text><Text style={active ? appStyles.homeTabActive : appStyles.homeTabText}>{tab.label}</Text></Pressable>;
    })}</View>

    <DealerInvoiceDetailsSheet invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} onEdit={(invoice) => { setSelectedInvoiceId(null); setEditingInvoice(invoice); selectTab("Edit Invoice"); }} onDeleted={() => void loadDashboard(true)} />

    {menuOpen ? <View style={local.drawerLayer}><Pressable style={local.backdrop} onPress={() => setMenuOpen(false)} /><SafeAreaView style={local.drawer} edges={["top", "bottom"]}>
      <LinearGradient colors={gradients.green} style={local.drawerHead}><View><Text style={local.drawerTitle}>Account</Text><Text style={local.drawerUser}>{dealerName}</Text></View><Pressable style={local.close} onPress={() => setMenuOpen(false)}><Text style={local.closeText}>×</Text></Pressable></LinearGradient>
      <View style={local.drawerBody}>
        <View style={local.drawerMenu}>
          {drawerTabs.map(item => <Pressable key={item.label} style={local.drawerItem} onPress={() => selectDrawerTab(item.label)}>
            <View style={local.drawerItemIcon}><Text style={local.drawerItemEmoji}>{item.icon}</Text></View>
            <View style={local.drawerItemCopy}><Text style={local.drawerItemTitle}>{item.title}</Text><Text style={local.drawerItemSubtitle}>{item.subtitle}</Text></View>
            <Text style={local.drawerChevron}>›</Text>
          </Pressable>)}
        </View>
        <Pressable style={local.logout} onPress={logout} disabled={loggingOut}>{loggingOut ? <ActivityIndicator color={colors.danger} /> : <Text style={local.logoutIcon}>↪</Text>}<Text style={local.logoutText}>{loggingOut ? "Logging out..." : "Logout"}</Text></Pressable>
      </View>
    </SafeAreaView></View> : null}
  </View></SafeAreaView>;
}

function Reward({ label, value, meta }: { label: string; value: string; meta: string }) { return <View style={local.reward}><Text style={local.rewardLabel}>{label}</Text><Text style={local.rewardValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text><Text style={local.rewardMeta}>{meta}</Text></View>; }
function Summary({ icon, value, label, onPress }: { icon: string; value: string; label: string; onPress?: () => void }) {
  const body = <><View style={local.summaryIcon}><Text style={local.iconText}>{icon}</Text></View><Text style={local.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text><Text style={local.summaryLabel}>{label}</Text></>;
  if (!onPress) return <View style={local.summary}>{body}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [local.summary, pressed && local.summaryPressed]}>{body}</Pressable>;
}
function DealerTabs({ selected, onSelect }: { selected: DealerTab; onSelect: (tab: DealerTab) => void }) { return <View style={appStyles.homeTabs}>{tabs.map(tab => { const active=selected===tab.label; if(tab.label==="New Entry") return <Pressable key={tab.label} onPress={()=>onSelect(tab.label)} style={appStyles.redeemFab}><Text style={[appStyles.redeemFabText,active&&appStyles.redeemFabTextActive]}>{tab.icon}</Text><Text style={active?appStyles.redeemFabLabelActive:appStyles.redeemFabLabel}>{tab.label}</Text></Pressable>; return <Pressable key={tab.label} onPress={()=>onSelect(tab.label)} style={appStyles.homeTabItem}><Text style={appStyles.homeTabIcon}>{tab.icon}</Text><Text style={active?appStyles.homeTabActive:appStyles.homeTabText}>{tab.label}</Text></Pressable>;})}</View>; }

const local = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, scroll: { flexGrow: 1, paddingBottom: 124 }, partner: { fontFamily: jakarta.semiBold, color: colors.muted, fontSize: 13, marginTop: 4 },
  // The invoice-count line and the New Entry button used to sit under the reward
  // row. With those gone the card is sized by its content: the shared redeemHero
  // minHeight is overridden to 0 and the reward row no longer needs a bottom gap.
  hero: { minHeight: 0 }, loader: { marginVertical: 28 }, rewardRow: { flexDirection: "row", marginTop: 22, marginBottom: 0 }, reward: { flex: 1 }, divider: { width: 1, backgroundColor: "rgba(255,255,255,.28)", marginHorizontal: 15 },
  rewardLabel: { fontFamily: jakarta.bold, color: "rgba(255,255,255,.72)", fontSize: 9, letterSpacing: .8 }, rewardValue: { fontFamily: jakarta.extraBold, color: "#fff", fontSize: 24, marginTop: 7 }, rewardMeta: { fontFamily: jakarta.medium, color: "rgba(255,255,255,.75)", fontSize: 10, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 13 }, summary: { width: "48%", minHeight: 148, borderRadius: 24, padding: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dce7f0", shadowColor: colors.navy, shadowOpacity: .06, shadowRadius: 14, elevation: 3 },
  summaryPressed: { opacity: .75 },
  summaryIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#e8f4ff", marginBottom: 12 }, iconText: { fontSize: 21 }, summaryValue: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 24 }, summaryLabel: { fontFamily: jakarta.bold, color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5, textTransform: "uppercase" }, link: { fontFamily: jakarta.bold, color: colors.primary, fontSize: 13 },
  invoice: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#dce7f0", padding: 15 }, invoiceIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#e8f4ff", alignItems: "center", justifyContent: "center" }, invoiceInfo: { flex: 1, marginLeft: 12 }, invoiceName: { fontFamily: jakarta.bold, color: colors.navy, fontSize: 14 }, invoiceMeta: { fontFamily: jakarta.medium, color: colors.muted, fontSize: 10, marginTop: 4 }, invoiceRight: { alignItems: "flex-end", marginLeft: 8 }, invoiceAmount: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14 }, badge: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4, marginTop: 5 }, badgeText: { fontFamily: jakarta.bold, fontSize: 9 }, approvedBg: { backgroundColor: "#e5f8ee" }, pendingBg: { backgroundColor: "#fff2da" }, rejectedBg: { backgroundColor: "#ffe9e9" }, approved: { color: "#13875a" }, pending: { color: "#a96810" }, rejected: { color: colors.danger },
  empty: { alignItems: "center", backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#dce7f0", padding: 28 }, emptyIcon: { fontSize: 30 }, emptyTitle: { fontFamily: jakarta.bold, color: colors.navy, fontSize: 15, marginTop: 9 }, emptyText: { fontFamily: jakarta.medium, color: colors.muted, fontSize: 11, marginTop: 5 },
  drawerLayer: { ...StyleSheet.absoluteFillObject, zIndex: 50 }, backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,22,43,.48)" }, drawer: { width: "78%", maxWidth: 330, flex: 1, backgroundColor: "#fff" }, drawerHead: { minHeight: 124, padding: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, drawerTitle: { fontFamily: jakarta.extraBold, color: "#fff", fontSize: 24 }, drawerUser: { fontFamily: jakarta.medium, color: "#dce9fb", fontSize: 13, marginTop: 4 }, close: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,.14)", alignItems: "center", justifyContent: "center" }, closeText: { color: "#fff", fontSize: 30 }, drawerBody: { flex: 1, padding: 18, justifyContent: "space-between" }, drawerMenu: { gap: 10 }, drawerItem: { minHeight: 68, borderRadius: 17, borderWidth: 1, borderColor: "#dfe8f2", backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 13 }, drawerItemIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#eaf4ff", alignItems: "center", justifyContent: "center" }, drawerItemEmoji: { fontSize: 20 }, drawerItemCopy: { flex: 1, marginLeft: 12 }, drawerItemTitle: { fontFamily: jakarta.bold, color: colors.navy, fontSize: 15 }, drawerItemSubtitle: { fontFamily: jakarta.medium, color: colors.muted, fontSize: 10, marginTop: 3 }, drawerChevron: { color: colors.primary, fontSize: 28, lineHeight: 30 }, logout: { height: 58, borderRadius: 16, borderWidth: 1, borderColor: "#ffd0d5", backgroundColor: "#fff4f5", flexDirection: "row", alignItems: "center", paddingHorizontal: 18 }, logoutIcon: { color: colors.danger, fontSize: 25, marginRight: 13 }, logoutText: { fontFamily: jakarta.bold, color: colors.danger, fontSize: 16, marginLeft: 12 },
});
