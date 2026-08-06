import React from "react";
import { Pressable, Text, View } from "react-native";
import { Route } from "@/navigation/routes";
import { styles } from "@/styles/appStyles";

type TabKey = "Home" | "Invoices" | "Redeem" | "RedemptionHistory" | "Profile";

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

  return (
    <View style={styles.homeTabs}>
      <Pressable onPress={() => go("Home")} style={styles.homeTabItem}><Text style={styles.homeTabIcon}>🏠</Text><Text style={activeTab === "Home" ? styles.homeTabActive : styles.homeTabText}>Home</Text></Pressable>
      <Pressable onPress={() => go("Invoices")} style={styles.homeTabItem}><Text style={styles.homeTabIcon}>📄</Text><Text style={activeTab === "Invoices" ? styles.homeTabActive : styles.homeTabText}>Invoices</Text></Pressable>
      <Pressable onPress={() => go("Redeem")} style={styles.redeemFab}><Text style={[styles.redeemFabText, activeTab === "Redeem" && styles.redeemFabTextActive]}>₹</Text><Text style={activeTab === "Redeem" ? styles.redeemFabLabelActive : styles.redeemFabLabel}>Redeem</Text></Pressable>
      <Pressable onPress={() => go("RedemptionHistory")} style={styles.homeTabItem}><Text style={styles.homeTabIcon}>📊</Text><Text style={activeTab === "RedemptionHistory" ? styles.homeTabActive : styles.homeTabText}>History</Text></Pressable>
      <Pressable onPress={() => go("Profile")} style={styles.homeTabItem}><Text style={styles.homeTabIcon}>👤</Text><Text style={activeTab === "Profile" ? styles.homeTabActive : styles.homeTabText}>Profile</Text></Pressable>
    </View>
  );
}
