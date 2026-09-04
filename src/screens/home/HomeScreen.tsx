import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import VriddhiLogo from "@/components/VriddhiLogo";
import { KsbLogo } from "@/components/KsbLogo";
import { StatusBadge } from "@/components/StatusBadge";
import EmptyScreen from "@/screens/common/EmptyScreen";
import LoadingScreen from "@/screens/common/LoadingScreen";
import { colors, gradients } from "@/constants/colors";
import { Route } from "@/navigation/routes";
import { walletApi } from "@/services/walletApi";
import { DashboardData, SchemeInfo, SchemeTier } from "@/types/api";
import { money, moneyInLakh } from "@/utils/formatters";
import { formatPercent, formatRewardLabel, getNextRewardMessage, getNextThresholdMessage, getTierProgress, getWalletTiers, isTierActive } from "@/utils/rewards";
import { styles } from "@/styles/appStyles";

export default function HomeScreen({ go, onOpenScheme }: { go: (route: Route) => void; onOpenScheme: (scheme: SchemeInfo | null, schemes: SchemeInfo[]) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadSchemes, setHasUnreadSchemes] = useState(false);
  useEffect(() => {
    walletApi.dashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!data?.activeSchemes?.length) return;
    AsyncStorage.getItem("ksb_read_scheme_ids").then((value) => {
      const readIds: number[] = value ? JSON.parse(value) : [];
      setHasUnreadSchemes(data.activeSchemes.some((scheme) => !readIds.includes(scheme.id)));
    }).catch(() => setHasUnreadSchemes(true));
  }, [data]);
  const openNotifications = async () => {
    setNotificationsOpen(true);
    const ids = data?.activeSchemes?.map((scheme) => scheme.id) || [];
    await AsyncStorage.setItem("ksb_read_scheme_ids", JSON.stringify(ids));
    setHasUnreadSchemes(false);
  };
  const dashboard = data;
  if (loading) return <LoadingScreen message="Loading dashboard" />;
  if (!dashboard) return <EmptyScreen title="Dashboard unavailable" message="No dashboard data returned from API." onBack={() => go("Login")} />;

  const slabWallet = dashboard?.slabWallet;
  const boosterWallet = dashboard?.boosterWallet;
  const slabBalance = slabWallet?.balance ?? 0;
  const boosterBalance = boosterWallet?.balance ?? 0;
  const totalRedeemable = slabBalance + boosterBalance;
  const activeWallets = dashboard.activeWallets ?? [slabWallet, boosterWallet].filter((wallet) => wallet?.isActive || (wallet?.balance ?? 0) > 0 || wallet?.title).length;
  const userName = dashboard?.userName || "";
  const isBoosterScheme = (scheme: SchemeInfo) =>
    [scheme.tag, scheme.code, scheme.name].some((value) => String(value ?? "").toLowerCase().includes("booster"));
  const regularSchemes = dashboard.activeSchemes.filter((scheme) => !isBoosterScheme(scheme));
  const boosterSchemes = dashboard.activeSchemes.filter(isBoosterScheme);
  const schemeGroups = [
    { key: "regular", title: "Active Regular Schemes", emptyText: "No currently active regular schemes.", schemes: regularSchemes },
    { key: "booster", title: "Active Booster Schemes", emptyText: "No currently active booster schemes.", schemes: boosterSchemes }
  ];
  const schemeTiers = dashboard?.currentSchemeTiers || [];
  const regularSchemeTiers = slabWallet?.progressSteps?.length ? slabWallet.progressSteps : getWalletTiers(schemeTiers, "regular");
  const boosterSchemeTiers = boosterWallet?.progressSteps?.length ? boosterWallet.progressSteps : getWalletTiers(schemeTiers, "booster");
  const regularTierLabels: SchemeTier[] = [{ amount: 0, label: "₹0", rewardLabel: "0%", walletType: "regular" }, ...regularSchemeTiers];
  const boosterTierLabels: SchemeTier[] = [{ amount: 0, label: "₹0", rewardLabel: "0%", walletType: "booster" }, ...boosterSchemeTiers];
  const slabRate = slabWallet?.rate ?? 2;
  const slabDays = slabWallet?.expiryDays;
  const slabInvoiceValue = slabWallet?.invoiceValue ?? 0;
  const slabRewardPercent = slabInvoiceValue > 0 ? (slabBalance / slabInvoiceValue) * 100 : slabRate;
  const slabTierProgress = getTierProgress(slabInvoiceValue, regularSchemeTiers, slabWallet?.progressPercent ?? 0);
  const slabRewardLabel = slabWallet?.achievedLabel || (slabTierProgress.currentTier ? formatRewardLabel(slabTierProgress.currentTier) : formatPercent(slabRewardPercent));
  const slabAchievementText = slabInvoiceValue
    ? `@ ${slabRewardLabel} on ${slabWallet?.invoiceValueShort || moneyInLakh(slabInvoiceValue)}`
    : `@ ${slabRewardLabel}`;
  const slabNextMessage = getNextRewardMessage(slabWallet || undefined, slabTierProgress);
  const slabNextMeta = slabTierProgress.nextTier ? getNextThresholdMessage(slabTierProgress) : (slabWallet?.daysLeftMessage || "Highest reward reached");
  const boosterRate = boosterWallet?.rate ?? 0;
  const boosterInvoiceValue = boosterWallet?.invoiceValue ?? 0;
  const boosterRewardPercent = boosterInvoiceValue > 0 ? (boosterBalance / boosterInvoiceValue) * 100 : boosterRate;
  const boosterTierProgress = getTierProgress(boosterInvoiceValue, boosterSchemeTiers, boosterWallet?.progressPercent ?? 0);
  const boosterRewardLabel = boosterWallet?.achievedLabel || (boosterTierProgress.currentTier ? formatRewardLabel(boosterTierProgress.currentTier) : formatPercent(boosterRewardPercent));
  const boosterAchievementText = boosterInvoiceValue
    ? `@ ${boosterRewardLabel} on ${boosterWallet?.invoiceValueShort || moneyInLakh(boosterInvoiceValue)}`
    : `@ ${boosterRewardLabel}`;
  const boosterNextMessage = getNextRewardMessage(boosterWallet || undefined, boosterTierProgress);
  const boosterNextMeta = getNextThresholdMessage(boosterTierProgress);
  return (
    <SafeAreaView style={styles.homeSafe}>
      {/* Outside the ScrollView, so the brand and the two controls stay put while the
          page moves under them. Sized to the icon buttons either side of it. */}
      <View style={styles.homeTopBar}>
        <Pressable onPress={() => go("Menu")} style={styles.homeIconButton}>
          <Text style={styles.homeMenuIcon}>☰</Text>
        </Pressable>
        {/* KSB first, then Vriddhi - the order the pre-login screens use. */}
        <View style={styles.homeBrand}>
          <KsbLogo size={40} />
          <View style={styles.homeBrandDivider} />
          <VriddhiLogo height={44} />
        </View>
        <Pressable onPress={openNotifications} style={styles.homeIconButton}>
          <Text style={styles.bellIcon}>🔔</Text>
          {hasUnreadSchemes ? <View style={localStyles.notificationDot} /> : null}
        </Pressable>
      </View>

      <ScrollView style={styles.homeScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeScrollContent}>
        <View style={styles.homePage}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingMuted}>Namaste 🙏</Text>
            {userName ? <Text style={styles.greetingName}>{userName} <Text style={styles.greetingJi}>ji</Text> 👋</Text> : null}
          </View>

          <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.redeemHero}>
            <View style={styles.heroRingOuter} />
            <View style={styles.heroRingInner} />
            <Text style={styles.redeemEyebrow}>TOTAL REDEEMABLE 💸</Text>
            <Text style={styles.redeemAmount}>{money(totalRedeemable)}</Text>
            <Text style={styles.redeemCopy}>Across slab + booster wallets</Text>
            <Pressable onPress={() => go("Redeem")} style={styles.redeemButton}>
              <Text style={styles.redeemButtonText}>₹  REDEEM REWARDS  →</Text>
            </Pressable>
          </LinearGradient>

        <View style={styles.walletSectionHead}>
          <Text style={styles.walletSectionTitle}>My Wallets</Text>
          <Text style={styles.walletSectionMeta}>{activeWallets} active</Text>
        </View>

        {schemeGroups.map((group) => (
          <View key={group.key}>
            <View style={styles.walletSectionHead}>
              <Text style={styles.walletSectionTitle}>{group.title}</Text>
              {group.schemes.length ? <Pressable onPress={() => onOpenScheme(null, group.schemes)}><Text style={localStyles.viewAll}>View details →</Text></Pressable> : null}
            </View>
            {group.schemes.map((scheme) => (
              <Pressable key={`${group.key}-${scheme.id}`} onPress={() => onOpenScheme(scheme, group.schemes)} style={localStyles.schemeCard}>
                <View style={localStyles.schemeHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.schemeName}>{scheme.name}</Text>
                    <Text style={localStyles.schemePeriod}>{scheme.period}</Text>
                  </View>
                  <StatusBadge label={`${scheme.daysLeft}DAY LEFT`} tone="green" />
                </View>
                <View style={localStyles.metricRow}>
                  <View><Text style={localStyles.metricLabel}>Achievement</Text><Text style={localStyles.metricValue}>{money(scheme.achievementValue)}</Text></View>
                  <View><Text style={localStyles.metricLabel}>Current slab</Text><Text style={localStyles.metricValue}>{scheme.currentSlab || "Not reached"}</Text></View>
                </View>
                <Text style={localStyles.nextText}>{scheme.nextSlab ? `${money(scheme.additionalValueRequired)} more to ${scheme.nextSlab}` : "Highest slab reached"}</Text>
                {scheme.pendingInvoiceValue > 0 ? <Text style={localStyles.awaitingText}>{money(scheme.pendingInvoiceValue)} invoices · {money(scheme.expectedPendingReward)} expected reward · Awaiting Approval</Text> : null}
              </Pressable>
            ))}
            {!group.schemes.length ? <Text style={styles.emptyInlineText}>{group.emptyText}</Text> : null}
          </View>
        ))}

        <View style={styles.homeWalletCard}>
          <View style={styles.homeWalletHeader}>
            <View style={styles.walletIconBox}><Text style={styles.walletIconText}>📊</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.homeWalletTitle}>Slab Wallet</Text>
              {slabWallet?.subtitle ? <Text style={styles.homeWalletSubtitle}>{slabWallet.subtitle}</Text> : null}
            </View>
            {slabWallet?.badgeText || slabDays != null ? <StatusBadge label={slabWallet?.badgeText || `${slabDays}D LEFT`} tone="red" /> : null}
          </View>
          <Text style={styles.homeWalletAmount}>{money(slabBalance)} <Text style={styles.homeWalletRate}>· {slabAchievementText}</Text></Text>
          <View style={styles.slabProgressBlock}>
            <View style={styles.slabTrack}>
              <View style={[styles.slabTrackFill, { width: `${slabTierProgress.progressPercent}%` }]} />
              <View style={[styles.currentSlabDot, { left: `${slabTierProgress.progressPercent}%` }]} />
            </View>
            <View style={styles.slabProgressRow}>
              {regularTierLabels.map((tier) => (
                <Text key={`${tier.amount}-${formatRewardLabel(tier)}`} style={[styles.slabRateText, isTierActive(tier, slabInvoiceValue) && styles.slabRateActive]}>{formatRewardLabel(tier)}</Text>
              ))}
            </View>
          </View>
          <View style={styles.nextSlabBox}>
            <View style={styles.targetIcon}><Text style={styles.targetIconText}>🎯</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextSlabTitle}>{slabNextMessage}</Text>
              <Text style={styles.nextSlabMeta}>{slabNextMeta}</Text>
            </View>
          </View>
          <Pressable onPress={() => go("Slab")} style={styles.openWalletButton}>
            <Text style={styles.openWalletText}>Open Slab Wallet  →</Text>
          </Pressable>
        </View>

        <View style={[styles.homeWalletCard, styles.boosterHomeCard]}>
          <View style={styles.homeWalletHeader}>
            <View style={[styles.walletIconBox, styles.boosterIconBox]}><Text style={styles.walletIconText}>🎁</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.homeWalletTitle}>Booster Wallet</Text>
              {boosterWallet?.subtitle ? <Text style={styles.homeWalletSubtitle}>{boosterWallet.subtitle}</Text> : null}
            </View>
            {boosterWallet?.badgeText ? <StatusBadge label={boosterWallet.badgeText} tone="green" /> : null}
          </View>
          <Text style={styles.boosterAmount}>{money(boosterBalance)} <Text style={styles.homeWalletRate}>· {boosterAchievementText}</Text></Text>
          <View style={styles.slabProgressBlock}>
            <View style={styles.slabTrack}>
              <View style={[styles.slabTrackFill, styles.boosterTrackFill, { width: `${boosterTierProgress.progressPercent}%` }]} />
              <View style={[styles.currentSlabDot, styles.boosterProgressDot, { left: `${boosterTierProgress.progressPercent}%` }]} />
            </View>
            <View style={styles.slabProgressRow}>
              {boosterTierLabels.map((tier) => (
                <Text key={`${tier.amount}-${formatRewardLabel(tier)}`} style={[styles.slabRateText, isTierActive(tier, boosterInvoiceValue) && styles.boosterRateActive]}>{formatRewardLabel(tier)}</Text>
              ))}
            </View>
          </View>
          <View style={[styles.nextSlabBox, styles.nextBoosterBox]}>
            <View style={styles.targetIcon}><Text style={styles.targetIconText}>🎯</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextSlabTitle, styles.nextBoosterTitle]}>{boosterNextMessage}</Text>
              <Text style={styles.nextSlabMeta}>{boosterNextMeta}</Text>
            </View>
          </View>
          <Pressable onPress={() => go("Booster")} style={styles.openBoosterButton}>
            <Text style={styles.openWalletText}>Open Booster Wallet  →</Text>
          </Pressable>
        </View>

        </View>
      </ScrollView>
      <Modal visible={notificationsOpen} transparent animationType="fade" onRequestClose={() => setNotificationsOpen(false)}>
        <Pressable style={localStyles.modalBackdrop} onPress={() => setNotificationsOpen(false)}>
          <Pressable style={localStyles.notificationPanel} onPress={() => undefined}>
            <View style={localStyles.notificationHead}><Text style={localStyles.notificationTitle}>Scheme Updates</Text><Pressable onPress={() => setNotificationsOpen(false)}><Text style={localStyles.close}>×</Text></Pressable></View>
            {dashboard.activeSchemes.map((scheme) => <View key={scheme.id} style={localStyles.notificationItem}><Text style={localStyles.notificationItemTitle}>{scheme.name} is now live</Text><Text style={localStyles.schemePeriod}>{scheme.period}</Text></View>)}
            {!dashboard.activeSchemes.length ? <Text style={localStyles.schemePeriod}>No new scheme updates.</Text> : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  notificationDot: { position: "absolute", right: 8, top: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: "#e13245", borderWidth: 1.5, borderColor: "#fff" },
  viewAll: { color: "#176bd1", fontWeight: "800", fontSize: 12 },
  schemeCard: { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e7edf5" },
  schemeHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  schemeName: { color: "#12233f", fontSize: 16, fontWeight: "800" },
  schemePeriod: { color: "#738095", fontSize: 11, marginTop: 4 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  metricLabel: { color: "#8994a5", fontSize: 10, textTransform: "uppercase", fontWeight: "700" },
  metricValue: { color: "#172740", fontSize: 14, fontWeight: "800", marginTop: 3 },
  nextText: { color: "#176bd1", fontWeight: "700", fontSize: 12, marginTop: 12 },
  awaitingText: { color: "#b36a00", backgroundColor: "#fff6dc", padding: 9, borderRadius: 9, marginTop: 10, fontSize: 11, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(8,20,40,.45)", justifyContent: "flex-start", paddingTop: 90, paddingHorizontal: 18 },
  notificationPanel: { backgroundColor: "#fff", borderRadius: 20, padding: 18, maxHeight: "70%" },
  notificationHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  notificationTitle: { color: "#12233f", fontSize: 18, fontWeight: "800" },
  close: { color: "#66758b", fontSize: 28 },
  notificationItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#edf1f6" },
  notificationItemTitle: { color: "#172740", fontWeight: "700" }
});
