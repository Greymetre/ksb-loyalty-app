import React from "react";
import { Text, View } from "react-native";
import { StatusBadge } from "@/components/StatusBadge";
import { Invoice } from "@/types/api";
import { money } from "@/utils/formatters";
import { styles } from "@/styles/appStyles";

export default function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const tone = invoice.status === "Credited" ? "green" : invoice.status === "Pending" ? "gold" : "red";
  return (
    <View style={styles.invoiceRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.invoiceId}>{invoice.id} · {invoice.date}</Text>
        <Text style={styles.invoiceDealer}>{invoice.dealer}</Text>
        <Text style={styles.invoiceAmount}>{money(invoice.amount)} · Reward {money(invoice.reward)}</Text>
      </View>
      <StatusBadge label={invoice.status} tone={tone} />
    </View>
  );
}
