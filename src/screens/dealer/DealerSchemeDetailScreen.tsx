import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DealerSchemeDetail, dealerSchemeDetailApi } from "@/services/dealerSchemeApi";
import { apiFileUrl } from "@/services/apiClient";
import InvoiceAttachmentViewer from "@/components/InvoiceAttachmentViewer";
import { colors } from "@/constants/colors";
import { slabRewardText } from "@/utils/rewards";

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const points = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const formatDate = (value: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function DealerSchemeDetailScreen({ schemeId, onBack }: { schemeId: number; onBack: () => void }) {
  const [detail, setDetail] = useState<DealerSchemeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // The brochure opens in the same popup the retailer side uses, rather than
  // handing the dealer off to a browser.
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    dealerSchemeDetailApi
      .get(schemeId)
      .then(row => {
        if (alive) setDetail(row);
      })
      .catch(() => {
        if (alive) setError("Unable to load scheme details.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [schemeId]);

  const tone =
    detail?.status === "expired" ? s.expired : detail?.status === "upcoming" ? s.upcoming : s.live;
  const toneText =
    detail?.status === "expired" ? s.expiredText : detail?.status === "upcoming" ? s.upcomingText : s.liveText;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.back}>
          <Text style={s.backText}>←</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          Scheme details
        </Text>
        <View style={s.back} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error || !detail ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={s.emptyTitle}>{error || "Scheme not found"}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <View style={[s.hero, tone]}>
            <View style={s.heroTop}>
              <Text style={s.heroName}>{detail.name}</Text>
              <View style={[s.pill, tone]}>
                <Text style={[s.pillText, toneText]}>{detail.statusLabel}</Text>
              </View>
            </View>
            {detail.code ? <Text style={s.heroCode}>{detail.code}</Text> : null}
            {detail.description ? <Text style={s.heroDesc}>{detail.description}</Text> : null}
            <Text style={s.heroDates}>
              {formatDate(detail.startDate)} — {formatDate(detail.endDate)}
              {detail.isLive && detail.daysRemaining > 0 ? `  ·  ${detail.daysRemaining} days left` : ""}
            </Text>
            {detail.note ? <Text style={s.heroNote}>{detail.note}</Text> : null}
            <View style={s.tagRow}>
              <Text style={s.tag}>{detail.tag}</Text>
              <Text style={s.tag}>{detail.basedOn === "Value + Percentage" ? "Value & % based" : detail.basedOn === "Percentage" ? "% based" : "Value based"}</Text>
              <Text style={s.tag}>{detail.areaScope}</Text>
            </View>
          </View>

          {detail.brochurePath ? (
            <Pressable style={s.brochure} onPress={() => setPreviewUri(apiFileUrl(detail.brochurePath))}>
              <Text style={s.brochureText}>View / Download Scheme PDF</Text>
            </Pressable>
          ) : null}

          <View style={s.grid}>
            <Stat label="SCHEME RETAILERS" value={String(detail.summary.schemeRetailers)} hint="With invoices" />
            <Stat label="TOTAL INVOICES" value={String(detail.summary.totalInvoices)} hint={`${detail.summary.approvedInvoices} approved`} />
            <Stat label="INVOICE AMOUNT" value={money(detail.summary.totalInvoiceAmount)} hint={`Approved ${money(detail.summary.approvedInvoiceAmount)}`} />
            <Stat label="PENDING AMOUNT" value={money(detail.summary.expectedInvoiceAmount)} hint={`${detail.summary.pendingInvoices} invoices`} />
          </View>

          <View style={s.pointsRow}>
            <View style={[s.pointsCard, s.earnedCard]}>
              <Text style={s.pointsLabel}>POINTS EARNED</Text>
              <Text style={[s.pointsValue, s.earnedValue]}>{points(detail.summary.pointsEarned)}</Text>
              <Text style={s.pointsHint}>On HO approved invoices</Text>
            </View>
            <View style={[s.pointsCard, s.expectedCard]}>
              <Text style={s.pointsLabel}>EXPECTED POINTS</Text>
              <Text style={[s.pointsValue, s.expectedValue]}>{points(detail.summary.pointsExpected)}</Text>
              <Text style={s.pointsHint}>On invoices awaiting approval</Text>
            </View>
          </View>

          {detail.slabs.length ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Slabs</Text>
              {detail.slabs.map((slab, index) => (
                <View key={`${slab.tierName}-${index}`} style={s.slab}>
                  <View style={s.slabLeft}>
                    <Text style={s.slabName}>{slab.tierName}</Text>
                    <Text style={s.slabRange}>
                      {money(slab.valueFrom)} — {slab.valueTo === null ? "and above" : money(slab.valueTo)}
                    </Text>
                  </View>
                  <Text style={s.slabReward}>
                    {slab.rewardLabel || slabRewardText(slab.rewardValue, slab.rewardType || detail.basedOn, money)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={s.section}>
            <Text style={s.sectionTitle}>Retailer wise ({detail.retailers.length})</Text>
            {!detail.retailers.length ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📭</Text>
                <Text style={s.emptyTitle}>No invoices under this scheme yet</Text>
              </View>
            ) : (
              detail.retailers.map(retailer => (
                <View key={retailer.retailerId} style={s.retailer}>
                  <View style={s.retailerLeft}>
                    <Text style={s.retailerName} numberOfLines={1}>
                      {retailer.shopName || retailer.retailerName}
                    </Text>
                    <Text style={s.retailerMeta}>
                      {retailer.invoiceCount} invoice{retailer.invoiceCount === 1 ? "" : "s"} · {money(retailer.invoiceAmount)}
                    </Text>
                  </View>
                  <View style={s.retailerRight}>
                    <Text style={s.retailerEarned}>{points(retailer.pointsEarned)}</Text>
                    {retailer.pointsExpected > 0 ? (
                      <Text style={s.retailerExpected}>+{points(retailer.pointsExpected)} exp.</Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <InvoiceAttachmentViewer uri={previewUri} title="Scheme brochure" onClose={() => setPreviewUri(null)} />
    </View>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.statHint} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  backText: { fontSize: 20, color: colors.navy },
  title: { flex: 1, textAlign: "center", fontWeight: "700", fontSize: 16, color: colors.navy },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  body: { padding: 16, paddingBottom: 120, gap: 14 },

  hero: { borderRadius: 20, borderWidth: 1, padding: 16 },
  heroTop: { flexDirection: "row", alignItems: "flex-start" },
  heroName: { flex: 1, fontWeight: "700", fontSize: 18, color: colors.navy, paddingRight: 10 },
  heroCode: { fontSize: 11, color: colors.muted, marginTop: 4 },
  heroDesc: { fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 17 },
  heroDates: { fontSize: 12, color: colors.navy, marginTop: 10, fontWeight: "600" },
  // The scheme note, directly under the dates.
  heroNote: { fontSize: 12, color: "#475569", marginTop: 6, lineHeight: 17 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: { fontSize: 10, fontWeight: "700", color: colors.primary, backgroundColor: "#faf0dd", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  pill: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontWeight: "700", fontSize: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  stat: { width: "48%", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#dce7f0", padding: 14 },
  statLabel: { fontSize: 9, fontWeight: "700", color: colors.muted, letterSpacing: 0.6 },
  statValue: { fontSize: 19, fontWeight: "700", color: colors.navy, marginTop: 6 },
  statHint: { fontSize: 10, color: colors.muted, marginTop: 4 },

  pointsRow: { flexDirection: "row", gap: 12 },
  pointsCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
  earnedCard: { backgroundColor: "#f2fbf6", borderColor: "#bfe6d2" },
  expectedCard: { backgroundColor: "#fffaef", borderColor: "#e4dcc0" },
  pointsLabel: { fontSize: 9, fontWeight: "700", color: colors.muted, letterSpacing: 0.6 },
  pointsValue: { fontSize: 22, fontWeight: "700", marginTop: 6 },
  earnedValue: { color: "#13875a" },
  expectedValue: { color: "#a96810" },
  pointsHint: { fontSize: 10, color: colors.muted, marginTop: 4 },

  brochure: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  brochureText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  section: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#dce7f0", padding: 14, gap: 10 },
  sectionTitle: { fontWeight: "700", fontSize: 14, color: colors.navy },

  slab: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#eef3f8", paddingTop: 10 },
  slabLeft: { flex: 1, paddingRight: 10 },
  slabName: { fontWeight: "700", fontSize: 13, color: colors.navy },
  slabRange: { fontSize: 11, color: colors.muted, marginTop: 3 },
  slabReward: { fontWeight: "700", fontSize: 14, color: colors.primary },

  retailer: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#eef3f8", paddingTop: 10 },
  retailerLeft: { flex: 1, paddingRight: 10 },
  retailerName: { fontWeight: "700", fontSize: 13, color: colors.navy },
  retailerMeta: { fontSize: 11, color: colors.muted, marginTop: 3 },
  retailerRight: { alignItems: "flex-end" },
  retailerEarned: { fontWeight: "700", fontSize: 14, color: "#13875a" },
  retailerExpected: { fontSize: 10, color: "#a96810", marginTop: 2 },

  empty: { alignItems: "center", paddingVertical: 20 },
  emptyIcon: { fontSize: 28 },
  emptyTitle: { fontWeight: "700", fontSize: 13, color: colors.navy, marginTop: 8, textAlign: "center" },

  live: { borderColor: "#bfe6d2", backgroundColor: "#f2fbf6" },
  liveText: { color: "#13875a" },
  expired: { borderColor: "#e6d0d3", backgroundColor: "#fdf5f5" },
  expiredText: { color: colors.danger },
  upcoming: { borderColor: "#e4dcc0", backgroundColor: "#fffaef" },
  upcomingText: { color: "#a96810" } });
