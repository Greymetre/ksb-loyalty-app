import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Header } from "@/components/Header";
import { Screen } from "@/components/Screen";
import LoadingScreen from "@/screens/common/LoadingScreen";
import EmptyScreen from "@/screens/common/EmptyScreen";
import { apiFileUrl } from "@/services/apiClient";
import { InvoiceDetail, invoiceApi } from "@/services/invoiceApi";
import InvoiceAttachmentViewer from "@/components/InvoiceAttachmentViewer";

export default function InvoiceDetailScreen({ invoiceId, onBack }: { invoiceId: string; onBack: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [attachment, setAttachment] = useState<string | null>(null);
  useEffect(() => {
    invoiceApi.detail(invoiceId).then(setInvoice).catch(() => setInvoice(null)).finally(() => setLoading(false));
  }, [invoiceId]);
  if (loading) return <LoadingScreen message="Loading invoice details" />;
  if (!invoice) return <EmptyScreen title="Invoice unavailable" message="Invoice details could not be loaded." onBack={onBack} />;

  const held = invoice.status === "hold";
  const inProcess = invoice.status === "in_process";
  const rejected = invoice.status === "rejected";
  const approved = invoice.status === "approved";
  const pending = !approved && !rejected;
  const statusLabel = rejected ? "Rejected" : approved ? "Approved" : held ? "Hold" : inProcess ? "In Process" : "Pending";
  return <Screen>
    <Header title={`Invoice #${invoice.invoiceNumber}`} onBack={onBack} />
    <View style={s.page}>
      <View style={[s.statusCard, pending && s.pendingCard, held && s.holdCard, inProcess && s.inProcessCard, rejected && s.rejectedCard]}>
        <Text style={s.statusTitle}>{statusLabel}</Text>
        <Text style={s.statusSub}>{rejected ? "This invoice was rejected. No reward will be credited." : pending ? `${invoice.expectedRewardDisplay} expected reward` : invoice.rewardAmount > 0 ? `${invoice.rewardDisplay} reward earned` : "Approved · No reward earned"}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.sectionTitle}>Invoice Details</Text>
        <Detail label="Invoice value" value={invoice.amountDisplay} />
        <Detail label="Invoice date" value={invoice.invoiceDate || invoice.displayDate} />
        <Detail label="Scheme" value={[invoice.schemeName, invoice.schemeCode].filter(Boolean).join(" · ") || "—"} />
        {invoice.schemeNote ? <Text style={s.schemeNote}>{invoice.schemeNote}</Text> : null}
        <Detail label="Slab" value={invoice.tierName || "Not reached"} />
        <Detail label="Reward" value={rejected ? "No reward earned (Rejected)" : pending ? `${invoice.expectedRewardDisplay} (Awaiting Approval)` : invoice.rewardAmount > 0 ? invoice.rewardDisplay : "No reward earned"} />
        {invoice.hint ? <Detail label="Next slab" value={invoice.hint} /> : null}
        {invoice.approvalRemark ? <Detail label="Approval remark" value={invoice.approvalRemark} /> : null}
      </View>
      {invoice.attachment ? <Pressable style={s.attachmentButton} onPress={() => setAttachment(apiFileUrl(invoice.attachment))}><Text style={s.attachmentText}>View / Download Invoice Attachment</Text></Pressable> : null}
    </View>
    <InvoiceAttachmentViewer uri={attachment} onClose={() => setAttachment(null)} />
  </Screen>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={s.detailRow}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value}</Text></View>;
}

const s = StyleSheet.create({
  page: { padding: 18 },
  statusCard: { backgroundColor: "#e7f8ee", borderRadius: 16, padding: 16, marginBottom: 14 },
  pendingCard: { backgroundColor: "#fff5d9" },
  holdCard: { backgroundColor: "#efeaff" },
  inProcessCard: { backgroundColor: "#faf1de" },
  rejectedCard: { backgroundColor: "#fff0f1" },
  statusTitle: { color: "#143053", fontSize: 17, fontWeight: "900" },
  statusSub: { color: "#64748b", fontSize: 12, marginTop: 5, fontWeight: "700" },
  // The scheme note, directly under the Scheme row it belongs to.
  schemeNote: { color: "#64748b", fontSize: 11.5, lineHeight: 16, marginTop: -4, marginBottom: 8 },
  card: { backgroundColor: "#fff", borderRadius: 17, padding: 16, borderWidth: 1, borderColor: "#e7edf5" },
  sectionTitle: { color: "#142744", fontSize: 15, fontWeight: "900", marginBottom: 7 },
  detailRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#edf1f5" },
  detailLabel: { color: "#8490a1", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: "#172a46", fontSize: 13, fontWeight: "700", marginTop: 4 },
  attachmentButton: { backgroundColor: "#176bd1", borderRadius: 13, padding: 14, alignItems: "center", marginTop: 12 },
  attachmentText: { color: "#fff", fontWeight: "900" }
});
