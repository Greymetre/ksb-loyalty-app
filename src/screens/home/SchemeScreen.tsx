import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ActivityRow from "@/components/common/ActivityRow";
import { GradientCard } from "@/components/GradientCard";
import { Header } from "@/components/Header";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import EmptyScreen from "@/screens/common/EmptyScreen";
import InvoiceAttachmentViewer from "@/components/InvoiceAttachmentViewer";
import LoadingScreen from "@/screens/common/LoadingScreen";
import { Route } from "@/navigation/routes";
import { schemeApi } from "@/services/schemeApi";
import { apiFileUrl } from "@/services/apiClient";
import { SchemeInfo } from "@/types/api";
import { styles } from "@/styles/appStyles";

type SchemeScreenProps = {
  go: (route: Route) => void;
  selectedScheme: SchemeInfo | null;
  dashboardSchemes: SchemeInfo[];
};

const mergeSchemeProgress = (detail: SchemeInfo, dashboard: SchemeInfo): SchemeInfo => ({
  ...detail,
  achievementValue: dashboard.achievementValue,
  pendingInvoiceValue: dashboard.pendingInvoiceValue,
  expectedPendingReward: dashboard.expectedPendingReward,
  currentSlab: dashboard.currentSlab,
  nextSlab: dashboard.nextSlab,
  additionalValueRequired: dashboard.additionalValueRequired
});

export default function SchemeScreen({ go, selectedScheme, dashboardSchemes }: SchemeScreenProps) {
  const [schemes, setSchemes] = useState<SchemeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  // Brochures open in the app rather than handing the person to a browser.
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  useEffect(() => {
    schemeApi.current()
      .then(setSchemes)
      .catch(() => setSchemes([]))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingScreen message="Loading scheme" />;
  const detailScheme = selectedScheme
    ? schemes.find((scheme) => scheme.id === selectedScheme.id)
    : undefined;
  const selectedDetail = selectedScheme
    ? mergeSchemeProgress(detailScheme || selectedScheme, selectedScheme)
    : undefined;
  const visibleSchemes = selectedDetail
    ? [selectedDetail]
    : dashboardSchemes.length
      ? dashboardSchemes.map((dashboardScheme) => {
          const detail = schemes.find((scheme) => scheme.id === dashboardScheme.id);
          return mergeSchemeProgress(detail || dashboardScheme, dashboardScheme);
        })
      : schemes;
  if (!visibleSchemes.length) return <EmptyScreen title="Scheme unavailable" message={selectedScheme == null ? "There are no currently active schemes." : "The selected scheme is no longer active."} onBack={() => go("Home")} />;

  return (
    <Screen>
      <Header title="Scheme Info" onBack={() => go("Home")} />
      <ScrollView contentContainerStyle={styles.pagePad}>
        {visibleSchemes.map((scheme) => <View key={scheme.id} style={localStyles.schemeBlock}>
          <GradientCard>
            <StatusBadge label={`${scheme.daysLeft}DAY LEFT`} />
            <Text style={styles.hindiHero}>{scheme.name}</Text>
            <Text style={styles.heroSub}>{scheme.period}</Text>
          </GradientCard>
          {scheme.description ? <Text style={localStyles.description}>{scheme.description}</Text> : null}
          <Text style={styles.sectionTitle}>Slabs & Reward Rules</Text>
          {scheme.tiers.map((tier, index) => <ActivityRow key={`${scheme.id}-${tier.valueFrom}-${index}`} text={`${tier.tierName || `Slab ${index + 1}`}: ₹${tier.valueFrom?.toLocaleString("en-IN")} - ${tier.valueTo == null ? "Above" : `₹${tier.valueTo.toLocaleString("en-IN")}`} · ${tier.rewardLabel || `${tier.rate || 0}${scheme.basedOn === "Percentage" ? "%" : ""}`}`} accent={String(tier.tierName ?? index + 1).trim() === String(scheme.currentSlab ?? "").trim()} />)}
          <View style={localStyles.progressBox}>
            <Text style={localStyles.progressTitle}>Your progress</Text>
            <Text style={localStyles.progressText}>Achievement: ₹{scheme.achievementValue.toLocaleString("en-IN")}</Text>
            <Text style={localStyles.progressText}>Current slab: {scheme.currentSlab || "Not reached"}</Text>
            <Text style={localStyles.progressText}>{scheme.nextSlab ? `₹${scheme.additionalValueRequired.toLocaleString("en-IN")} more required for ${scheme.nextSlab}` : "Highest slab reached"}</Text>
            {scheme.pendingInvoiceValue > 0 ? <Text style={localStyles.awaiting}>Expected ₹{scheme.expectedPendingReward.toLocaleString("en-IN")} · Awaiting Approval</Text> : null}
          </View>
          {scheme.brochurePath ? <Pressable style={localStyles.pdfButton} onPress={() => setPreviewUri(apiFileUrl(scheme.brochurePath))}><Text style={localStyles.pdfButtonText}>View / Download Scheme PDF</Text></Pressable> : null}
        </View>)}
      </ScrollView>
      <InvoiceAttachmentViewer uri={previewUri} onClose={() => setPreviewUri(null)} />
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  schemeBlock: { marginBottom: 28 },
  description: { color: "#607087", lineHeight: 20, marginTop: 14 },
  progressBox: { backgroundColor: "#faf2e2", borderRadius: 14, padding: 14, marginTop: 14 },
  progressTitle: { color: "#142744", fontWeight: "800", marginBottom: 7 },
  progressText: { color: "#50627a", fontSize: 12, marginTop: 4 },
  awaiting: { color: "#aa6500", fontWeight: "800", marginTop: 9 },
  pdfButton: { backgroundColor: "#176bd1", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 12 },
  pdfButtonText: { color: "#fff", fontWeight: "800" }
});
