import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Route } from "@/navigation/routes";
import { styles } from "@/styles/appStyles";

type TabKey = "Home" | "Invoices" | "Redeem" | "RedemptionHistory" | "Profile";

/** The tab bar's own height, before the system navigation area underneath it. */
export const TAB_BAR_HEIGHT = 88;

/**
 * Lifts a tab bar clear of the system navigation. The app draws edge to edge, so on a
 * phone with on-screen Back / Home / Recents buttons the bar sat underneath them: its
 * labels were hidden and a tap on a tab could land on Back instead. The bar now grows by
 * the navigation area and keeps its colour down to the edge, with its tabs above it.
 * Shared by the retailer and the dealer tab bars so the two cannot drift apart.
 */
export function useTabBarInsetStyle() {
  const { bottom } = useSafeAreaInsets();
  return { height: TAB_BAR_HEIGHT + bottom, paddingBottom: bottom };
}

/** Screen content that stays clear of the tab bar, navigation area included. */
export function TabContentArea({ withTabs, children }: { withTabs: boolean; children: React.ReactNode }) {
  const { bottom } = useSafeAreaInsets();
  return <View style={{ flex: 1, paddingBottom: withTabs ? TAB_BAR_HEIGHT + bottom : 0 }}>{children}</View>;
}

const activeTabForRoute = (route: Route): TabKey | null => {
  if (route === "Redeem" || route === "RedeemSlab" || route === "RedeemBooster") return "Redeem";
  if (route === "RedemptionHistory") return "RedemptionHistory";
  if (route === "Invoices") return "Invoices";
  if (route === "Profile" || route === "Kyc") return "Profile";
  if (route === "Home") return "Home";
  return null;
};

export default function HomeBottomTabs({ go, route }: { go: (route: Route) => void; route: Route }) {
  const activeTab = activeTabForRoute(route);
  const insetStyle = useTabBarInsetStyle();

  return (
    <View style={[styles.homeTabs, insetStyle]}>
      <Pressable onPress={() => go("Home")} style={styles.homeTabItem}><Text style={styles.homeTabIcon}>🏠</Text><Text style={activeTab === "Home" ? styles.homeTabActive : styles.homeTabText}>Home</Text></Pressable>
      <Pressable onPress={() => go("Invoices")} style={styles.homeTabItem}><Text style={styles.homeTabIcon}>📄</Text><Text style={activeTab === "Invoices" ? styles.homeTabActive : styles.homeTabText}>Invoices</Text></Pressable>
      <Pressable onPress={() => go("Redeem")} style={styles.redeemFab}><Text style={[styles.redeemFabText, activeTab === "Redeem" && styles.redeemFabTextActive]}>₹</Text><Text style={activeTab === "Redeem" ? styles.redeemFabLabelActive : styles.redeemFabLabel}>Redeem</Text></Pressable>
      <Pressable onPress={() => go("RedemptionHistory")} style={styles.homeTabItem}><Text style={styles.homeTabIcon}>📊</Text><Text style={activeTab === "RedemptionHistory" ? styles.homeTabActive : styles.homeTabText}>History</Text></Pressable>
      <Pressable onPress={() => go("Profile")} style={styles.homeTabItem}><Text style={styles.homeTabIcon}>👤</Text><Text style={activeTab === "Profile" ? styles.homeTabActive : styles.homeTabText}>Profile</Text></Pressable>
    </View>
  );
}
