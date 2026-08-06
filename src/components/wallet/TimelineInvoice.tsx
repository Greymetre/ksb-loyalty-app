import React from "react";
import { Text, View } from "react-native";
import { DashboardInvoice } from "@/types/api";
import { money } from "@/utils/formatters";
import { formatCompactDate } from "@/utils/rewards";
import { styles } from "@/styles/appStyles";

export default function TimelineInvoice({ invoice, color }: { invoice: DashboardInvoice; color: string }) {
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.timelineDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.timelineTitle}>{invoice.invoiceNumber} · {formatCompactDate(invoice.date)}</Text>
        <Text style={styles.timelineSub}>{invoice.schemeName || invoice.schemeTag} · {invoice.tierName || invoice.rewardLabel || "Reward"}</Text>
      </View>
      <Text style={[styles.timelineAmount, { color }]}>{money(invoice.points)}</Text>
    </View>
  );
}
