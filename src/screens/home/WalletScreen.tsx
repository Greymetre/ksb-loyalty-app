import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import BoosterSchemeCard from "@/components/wallet/BoosterSchemeCard";
import DetailSectionTitle from "@/components/wallet/DetailSectionTitle";
import DetailStat from "@/components/wallet/DetailStat";
import MiniSummary from "@/components/wallet/MiniSummary";
import SlabJourneyCard from "@/components/wallet/SlabJourneyCard";
import TimelineInvoice from "@/components/wallet/TimelineInvoice";
import EmptyScreen from "@/screens/common/EmptyScreen";
import LoadingScreen from "@/screens/common/LoadingScreen";
import { colors, gradients } from "@/constants/colors";
import { Route } from "@/navigation/routes";
import { walletApi } from "@/services/walletApi";
import { DashboardData } from "@/types/api";
import { money, moneyInLakh } from "@/utils/formatters";
import { formatRewardLabel, getTierProgress, isInvoiceForWallet } from "@/utils/rewards";
import { styles } from "@/styles/appStyles";
import Svg, { Circle, Path } from "react-native-svg";

export default function WalletScreen({ type, go }: { type: "SLAB" | "BOOSTER"; go: (route: Route) => void }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    walletApi.dashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, []);

  const isSlab = type === "SLAB";
  if (loading) return <LoadingScreen message={`Loading ${isSlab ? "slab" : "booster"} wallet`} />;
  if (!dashboard) return <EmptyScreen title="Wallet unavailable" message="No wallet data returned from API." onBack={() => go("Home")} />;

  const wallet = isSlab ? dashboard?.slabWallet : dashboard?.boosterWallet;
  if (!wallet) return <EmptyScreen title="Wallet unavailable" message="This wallet was not returned by the dashboard API." onBack={() => go("Home")} />;

  const balance = wallet?.balance ?? 0;
  const invoices = (dashboard?.recentInvoices || []).filter((invoice) => isInvoiceForWallet(invoice, isSlab ? "regular" : "booster"));
  const progress = getTierProgress(wallet?.invoiceValue ?? 0, wallet?.progressSteps || [], wallet?.progressPercent ?? 0);
  const rewardLabel = wallet?.achievedLabel || (progress.currentTier ? formatRewardLabel(progress.currentTier) : "0%");
  const heroSub = isSlab
    ? wallet?.invoiceValue
      ? `@ ${rewardLabel} on ${wallet?.invoiceValueShort || moneyInLakh(wallet.invoiceValue)} turnover`
      : wallet?.achievedLabel
        ? `@ ${rewardLabel}`
        : ""
    : `From ${invoices.length || dashboard?.approvedInvoices || 0} boosted invoices · ${wallet?.isActive ? 1 : 0} active booster`;
  const heroTone = isSlab ? styles.walletHeroGreen : styles.walletHeroGold;
  const activeColor = isSlab ? colors.primary : "#d4a000";
  const heroPillText = wallet?.subtitle;

  return (
    <SafeAreaView edges={["left", "right"]} style={[styles.walletDetailSafe, !isSlab && styles.walletDetailGoldSafe]}>
      <StatusBar style="light" />
      <ScrollView style={styles.walletDetailScrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.walletDetailScroll}>
        <LinearGradient
          colors={isSlab ? gradients.green : gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.walletDetailHero, heroTone, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.walletDetailTopRow}>
            <Pressable onPress={() => go("Home")} style={styles.walletHeroIcon}><Text style={styles.walletHeroIconText}>←</Text></Pressable>
            <Text style={styles.walletDetailTitle}>{isSlab ? "SLAB WALLET" : "BOOSTER WALLET"}</Text>
            <View style={styles.walletHeroIcon}><Text style={styles.walletHeroInfo}>i</Text></View>
          </View>
          {heroPillText ? (
            <View style={styles.walletHeroPill}>
              <Text style={styles.walletHeroPillText}>{isSlab ? `⏱ ${heroPillText}` : `∞  ${heroPillText}`}</Text>
            </View>
          ) : null}
          <Text style={styles.walletHeroLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.walletHeroAmount}>{money(balance)}</Text>
          {heroSub ? <Text style={styles.walletHeroSub}>{heroSub}</Text> : null}
          <Svg
            width="120%"
            height={92}
            viewBox="0 0 390 92"
            preserveAspectRatio="none"
            style={styles.walletHeroWaveSvg}
          >
            <Path
              d="M0 48 C65 28 120 24 190 48 C255 72 330 66 390 28 L390 92 L0 92 Z"
              fill="#f8fafc"
            />
          </Svg>
        </LinearGradient>

        <View style={styles.walletDetailBody}>
          {isSlab ? (
            <>
              <View style={styles.detailStatsCard}>
                <DetailStat label="EARNED" value={money(wallet?.earned ?? 0)} color={colors.primary} />
                <DetailStat label="REDEEMED" value={money(wallet?.redeemed ?? 0)} color="#d4a000" />
                <DetailStat label="INVOICES" value={String(dashboard?.approvedInvoices ?? dashboard?.totalInvoices ?? invoices.length)} color={colors.blue} />
                <DetailStat label="DAYS LEFT" value={String(wallet?.expiryDays ?? 0)} color={colors.danger} />
              </View>

              <View style={styles.expiryNotice}>
                <View style={styles.expiryIcon}><Text style={styles.expiryIconText}>⏰</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expiryTitle}>Use it or lose it</Text>
                  <Text style={styles.expiryText}>{wallet?.expiresOn ? `Slab balance wipes to ₹0 on ${wallet.expiresOn}. Redeem before the deadline.` : "Redeem before the scheme deadline."}</Text>
                </View>
              </View>

              <DetailSectionTitle title="YOUR SLAB JOURNEY" />
              <SlabJourneyCard wallet={wallet} progress={progress} />
            </>
          ) : (
            <>
              <View style={styles.detailSectionHead}>
                <View style={styles.inlineTitleWrap}>
                  <Text style={styles.detailSectionTitle}>Active Boosters</Text>
                  <Text style={styles.liveBadge}>{wallet?.isActive ? "1 LIVE" : "0 LIVE"}</Text>
                </View>
                <Text style={styles.viewAllLink}>View all →</Text>
              </View>
              <BoosterSchemeCard wallet={wallet} invoices={invoices} />
              <View style={styles.boosterDots}><View style={styles.boosterDotActive} /><View style={styles.boosterDot} /><View style={styles.boosterDot} /></View>

              <DetailSectionTitle title="LIFETIME" />
              <View style={styles.lifetimeCard}>
                <View style={styles.lifetimeHeader}>
                  <View style={styles.lifetimeIcon}><Text style={styles.lifetimeIconText}>∞</Text></View>
                  <View>
                    <Text style={styles.lifetimeTitle}>Lifetime Summary</Text>
                    {wallet?.subtitle ? <Text style={styles.lifetimeSub}>{wallet.subtitle}</Text> : null}
                  </View>
                </View>
                <View style={styles.lifetimeGrid}>
                  <MiniSummary title="LIFETIME EARNED" value={money(wallet?.earned ?? 0)} tone="gold" />
                  <MiniSummary title="LIFETIME REDEEMED" value={money(wallet?.redeemed ?? 0)} tone="blue" />
                </View>
              </View>
            </>
          )}

          <DetailSectionTitle title="TIMELINE" />
          <View style={styles.timelineCard}>
            {(invoices.length ? invoices : dashboard?.recentInvoices || []).slice(0, 4).map((invoice, index) => (
              <TimelineInvoice key={`${invoice.id}-${invoice.invoiceNumber}-${index}`} invoice={invoice} color={activeColor} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.walletStickyWrap}>
        <LinearGradient colors={isSlab ? gradients.main : gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.walletStickyButton}>
          <Pressable onPress={() => go(isSlab ? "RedeemSlab" : "RedeemBooster")} style={styles.walletStickyPress}>
            <Text style={[styles.walletStickyText, !isSlab && { color: colors.white }]}>₹  REDEEM {money(balance)}  →</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}
