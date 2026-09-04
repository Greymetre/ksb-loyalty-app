import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";
import { DealerInvoiceItem, dealerInvoiceApi } from "../../services/dealerInvoiceApi";
import { showToast } from "../../services/toast";
import { jakarta } from "../../styles/appStyles";
import InvoiceAttachmentViewer from "@/components/InvoiceAttachmentViewer";
import { isPdfAttachment } from "../../utils/invoiceAttachments";

const money = (value: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value || 0)}`;
const inProcessBadge = { backgroundColor: "#faf1de" } as const;
const inProcessText = { color: "#3563aa" } as const;
const holdBadge = { backgroundColor: "#efeaff" } as const;
const holdText = { color: "#5b45c9" } as const;

export default function DealerInvoiceDetailsSheet({
  invoiceId,
  onClose,
  onEdit,
  onDeleted,
}: {
  invoiceId: string | null;
  onClose: () => void;
  onEdit?: (invoice: DealerInvoiceItem) => void;
  onDeleted?: () => void;
}) {
  const [invoice, setInvoice] = useState<DealerInvoiceItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setInvoice(null);
    if (!invoiceId) return () => { active = false; };
    setLoading(true);
    dealerInvoiceApi.detail(invoiceId)
      .then(result => { if (active) setInvoice(result); })
      .catch(() => { if (active) showToast("Unable to load invoice details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invoiceId]);

  const remove = () => {
    if (!invoice?.canDelete || deleting) return;
    Alert.alert("Delete invoice?", "This pending invoice will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setDeleting(true);
          try {
            await dealerInvoiceApi.remove(invoice.id);
            showToast("Invoice deleted successfully.", "success");
            onClose();
            onDeleted?.();
          } finally { setDeleting(false); }
        },
      },
    ]);
  };

  const approved = invoice?.status === "approved";
  const rejected = invoice?.status === "rejected";
  const inProcess = invoice?.status === "in_process";
  const held = invoice?.status === "hold";
  const reward = approved ? invoice?.rewardAmount || 0 : invoice?.expectedRewardAmount || 0;
  const invoiceDate = invoice?.invoiceDate ? invoice.invoiceDate.slice(0, 10) : "-";

  return <><Modal visible={Boolean(invoiceId)} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={s.overlay} onPress={onClose}>
      <Pressable style={s.sheet} onPress={() => undefined}>
        <View style={s.handle} />
        {loading ? <View style={s.loading}><ActivityIndicator color={colors.primary} size="large" /><Text style={s.loadingText}>Loading invoice details</Text></View> : null}
        {!loading && !invoice ? <View style={s.loading}><Text style={s.errorIcon}>!</Text><Text style={s.loadingText}>Invoice details unavailable</Text><Pressable style={s.closeButton} onPress={onClose}><Text style={s.closeText}>Close</Text></Pressable></View> : null}
        {!loading && invoice ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={s.titleRow}>
            <Text style={s.title} numberOfLines={1}>{invoice.invoiceNumber || `Invoice #${invoice.id}`}</Text>
            <View style={[s.badge, approved ? s.approvedBg : rejected ? s.rejectedBg : held ? holdBadge : inProcess ? inProcessBadge : s.pendingBg]}>
              <Text style={[s.badgeText, approved ? s.approved : rejected ? s.rejected : held ? holdText : inProcess ? inProcessText : s.pending]}>{invoice.statusLabel}</Text>
            </View>
          </View>
          <View style={s.rule} />

          <View style={s.retailerRow}>
            <View style={s.storeIcon}><Text style={s.storeEmoji}>🏪</Text></View>
            <View style={s.retailerInfo}>
              <Text style={s.owner} numberOfLines={1}>{invoice.ownerName || invoice.retailerName}</Text>
              <Text style={s.shop} numberOfLines={1}>{invoice.shopName || invoice.retailerName}</Text>
              {(invoice.retailerCode || invoice.mobile) ? <Text style={s.retailerMeta}>{[invoice.retailerCode, invoice.mobile].filter(Boolean).join(" · ")}</Text> : null}
            </View>
          </View>
          <View style={s.rule} />

          <View style={s.details}>
            <Detail label="INVOICE DATE" value={invoiceDate} />
            <Detail label="SCHEME" value={invoice.schemeName || "-"} />
            <Detail label="INVOICE AMOUNT" value={money(invoice.amount)} />
            <Detail label={approved ? "REWARD EARNED" : rejected ? "REWARD" : "EXPECTED REWARD"} value={rejected ? "No reward" : money(reward)} accent={!rejected} />
          </View>
          {/* An invoice can carry up to ten files; each opens in the viewer. */}
          {invoice.attachments.map((file, index) => <Pressable key={`att-${file.id}-${file.url}`} style={s.attachment} onPress={() => setPreviewAttachment(file.url)}>
            {isPdfAttachment({ type: file.mimeType, name: file.fileName || file.url })
              ? <View style={[s.attachmentPreview, s.attachmentDoc]}><Text style={s.attachmentDocIcon}>📄</Text></View>
              : <Image source={{ uri: file.url }} resizeMode="cover" style={s.attachmentPreview} />}
            <View style={s.attachmentText}>
              <Text style={s.attachmentTitle} numberOfLines={1}>{file.fileName || `Invoice attachment ${index + 1}`}</Text>
              <Text style={s.attachmentMeta}>Tap to view</Text>
            </View>
            <Text style={s.attachmentOpen}>›</Text>
          </Pressable>)}

          {(invoice.canEdit || invoice.canDelete) ? <View style={s.actions}>
            {invoice.canEdit && onEdit ? <Pressable style={s.edit} onPress={() => onEdit(invoice)}><Text style={s.editText}>✎  Edit</Text></Pressable> : null}
            {invoice.canDelete ? <Pressable style={s.remove} onPress={remove} disabled={deleting}>{deleting ? <ActivityIndicator color={colors.danger} /> : <Text style={s.removeText}>▱  Delete</Text>}</Pressable> : null}
          </View> : null}
          <Pressable style={s.closeButton} onPress={onClose}><Text style={s.closeText}>Close</Text></Pressable>
        </ScrollView> : null}
      </Pressable>
    </Pressable>
  </Modal><InvoiceAttachmentViewer uri={previewAttachment} onClose={() => setPreviewAttachment(null)} /></>;
}

function Detail({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <View style={s.detail}><Text style={s.detailLabel}>{label}</Text><Text style={[s.detailValue, accent && s.detailAccent]} numberOfLines={2}>{value}</Text></View>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(7,22,43,.48)" }, sheet: { maxHeight: "84%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#fff", paddingTop: 10, paddingHorizontal: 22, paddingBottom: 24 }, handle: { width: 54, height: 5, borderRadius: 99, backgroundColor: "#dce3ec", alignSelf: "center", marginBottom: 17 }, content: { paddingBottom: 8 },
  loading: { minHeight: 290, alignItems: "center", justifyContent: "center" }, loadingText: { fontFamily: jakarta.semiBold, color: colors.muted, fontSize: 13, marginTop: 11 }, errorIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#ffe9e9", color: colors.danger, textAlign: "center", textAlignVertical: "center", lineHeight: 44, fontFamily: jakarta.extraBold, fontSize: 23 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, title: { flex: 1, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 21 }, badge: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 }, badgeText: { fontFamily: jakarta.bold, fontSize: 10 }, approvedBg: { backgroundColor: "#e5f8ee" }, pendingBg: { backgroundColor: "#fff2da" }, rejectedBg: { backgroundColor: "#ffe9e9" }, approved: { color: "#13875a" }, pending: { color: "#a96810" }, rejected: { color: colors.danger }, rule: { height: 1, backgroundColor: colors.border, marginVertical: 17 },
  retailerRow: { flexDirection: "row", alignItems: "center" }, storeIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#edf5ff", alignItems: "center", justifyContent: "center" }, storeEmoji: { fontSize: 23 }, retailerInfo: { flex: 1, marginLeft: 13 }, owner: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 16 }, shop: { fontFamily: jakarta.semiBold, color: colors.muted, fontSize: 13, marginTop: 2 }, retailerMeta: { fontFamily: jakarta.medium, color: "#98a6ba", fontSize: 10, marginTop: 3 },
  details: { flexDirection: "row", flexWrap: "wrap", rowGap: 19 }, detail: { width: "50%", paddingRight: 12 }, detailLabel: { fontFamily: jakarta.bold, color: "#8c9ab0", fontSize: 9, letterSpacing: .5 }, detailValue: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14, marginTop: 5, lineHeight: 19 }, detailAccent: { color: colors.primary }, attachment: { marginTop: 20, borderRadius: 16, backgroundColor: "#f4f8fd", borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", padding: 9 }, attachmentPreview: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#e7edf5" }, attachmentText: { flex: 1, marginLeft: 11 }, attachmentTitle: { fontFamily: jakarta.bold, color: colors.navy, fontSize: 12 }, attachmentMeta: { fontFamily: jakarta.medium, color: colors.primary, fontSize: 10, marginTop: 3 }, attachmentOpen: { color: colors.primary, fontSize: 26, paddingHorizontal: 7 }, attachmentDoc: { alignItems: "center", justifyContent: "center" }, attachmentDocIcon: { fontSize: 24 },
  actions: { flexDirection: "row", gap: 10, marginTop: 21 }, edit: { flex: 1, height: 50, borderRadius: 15, borderWidth: 1, borderColor: "#e0bd80", backgroundColor: "#faf2e2", alignItems: "center", justifyContent: "center" }, editText: { fontFamily: jakarta.bold, color: colors.primary, fontSize: 13 }, remove: { flex: 1, height: 50, borderRadius: 15, borderWidth: 1, borderColor: "#ffc3c8", backgroundColor: "#fff0f1", alignItems: "center", justifyContent: "center" }, removeText: { fontFamily: jakarta.bold, color: colors.danger, fontSize: 13 }, closeButton: { height: 50, borderRadius: 15, backgroundColor: "#edf3fb", alignItems: "center", justifyContent: "center", marginTop: 15 }, closeText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
});
