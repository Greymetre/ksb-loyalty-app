import React from "react";
import { Text, View } from "react-native";
import { StatusBadge } from "@/components/StatusBadge";
import { DashboardInvoice, WalletSummary } from "@/types/api";
import { money } from "@/utils/formatters";
import { formatCompactDate, getDateProgress } from "@/utils/rewards";
import { styles } from "@/styles/appStyles";

export default function BoosterSchemeCard({ wallet, invoices }: { wallet?: WalletSummary; invoices: DashboardInvoice[] }) {
  const elapsed = getDateProgress(wallet?.startDate, wallet?.endDate);
  const startLabel = formatCompactDate(wallet?.startDate);
  const endLabel = formatCompactDate(wallet?.endDate);
  const statusLabel = wallet?.expiryDays ? `${wallet.expiryDays}D LEFT` : wallet?.badgeText;
  const schemeTitle = wallet?.schemeName || wallet?.title;
  const schemeSub = [wallet?.basedOn, wallet?.achievedLabel || wallet?.progressSteps?.[0]?.rewardLabel].filter(Boolean).join(" · ");
  return (
    <View style={styles.boosterSchemeCard}>
      <View style={styles.boosterSchemeTop}>
        <View style={styles.boosterSchemeIcon}><Text style={styles.boosterSchemeIconText}>☔</Text></View>
        {statusLabel ? <StatusBadge label={statusLabel} tone="red" /> : null}
      </View>
      {schemeTitle ? <Text style={styles.boosterSchemeTitle}>{schemeTitle}</Text> : null}
      {schemeSub ? <Text style={styles.boosterSchemeSub}>{schemeSub}</Text> : null}
      <View style={styles.boosterEarnBox}>
        <View>
          <Text style={styles.boosterEarnLabel}>YOU'VE EARNED</Text>
          <Text style={styles.boosterEarnValue}>{money(wallet?.earned ?? 0)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.boosterEarnLabel}>INVOICES</Text>
          <Text style={styles.boosterUnits}>{invoices.length}</Text>
        </View>
      </View>
      {startLabel || endLabel ? (
        <>
          <View style={styles.boosterDateRow}>
            <Text style={styles.boosterDateText}>{startLabel}</Text>
            <Text style={styles.boosterElapsedText}>{Math.round(elapsed)}% elapsed</Text>
            <Text style={styles.boosterDateText}>{endLabel}</Text>
          </View>
          <View style={styles.boosterElapsedTrack}><View style={[styles.boosterElapsedFill, { width: `${elapsed}%` }]} /></View>
        </>
      ) : null}
    </View>
  );
}
