import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../../constants/colors";
import { ProfileData, profileApi } from "../../services/profileApi";
import { clearToken } from "../../services/storage";
import { showToast } from "../../services/toast";
import { jakarta } from "../../styles/appStyles";

const emptyProfile: ProfileData = {
  ownerName: "",
  firmName: "",
  mobile: "",
  email: "",
  gstNumber: "",
  address: "",
  city: "",
  cityId: null,
  state: "",
  stateId: null,
  pincode: "",
  pincodeId: null,
  customerType: "",
  kycStatus: "",
  distributionArea: ""
};

export default function DealerProfileScreen({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setProfile(await profileApi.get());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const update = (key: keyof ProfileData, value: string) => setProfile(current => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      setProfile(await profileApi.update(profile));
      setEditing(false);
      showToast("Profile updated successfully", "success");
    } catch {
      showToast("Unable to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => Alert.alert("Logout", "Are you sure you want to logout?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Logout",
      style: "destructive",
      onPress: async () => {
        await clearToken();
        onLogout();
      }
    }
  ]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Loading profile...</Text></View>;

  if (failed) return <View style={styles.center}><Text style={styles.errorIcon}>!</Text><Text style={styles.errorTitle}>Profile unavailable</Text><Text style={styles.errorText}>Dealer profile details load nahi ho paayi.</Text><Pressable onPress={() => void load()} style={styles.retry}><Text style={styles.retryText}>TRY AGAIN</Text></Pressable></View>;

  const kyc = kycLabel(profile.kycStatus);
  const customerType = profile.customerType || "Dealer";

  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.headerButton}><Text style={styles.headerIcon}>←</Text></Pressable>
          <Text style={styles.headerTitle}>MY PROFILE</Text>
          <Pressable onPress={() => setEditing(value => !value)} style={styles.headerButton}><Text style={styles.editIcon}>{editing ? "×" : "✎"}</Text></Pressable>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile.ownerName || profile.firmName)}</Text></View>
        <Text style={styles.name} numberOfLines={1}>{profile.ownerName || "Dealer Partner"}</Text>
        <Text style={styles.meta} numberOfLines={1}>{[profile.firmName, customerType].filter(Boolean).join(" · ")}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.infoRow}>
          <InfoCard label="MOBILE" value={profile.mobile || "-"} />
          <InfoCard label="KYC" value={kyc.label} tone={kyc.tone} />
        </View>

        <Section title="Business Details">
          <Field label="Owner Name" value={profile.ownerName} editable={editing} onChangeText={value => update("ownerName", value)} />
          <Field label="Firm Name" value={profile.firmName} editable={editing} onChangeText={value => update("firmName", value)} />
          <Field label="Distribution Area" value={profile.distributionArea} editable={false} />
          {editing ? <>
            <Field label="Email" value={profile.email} editable keyboardType="email-address" autoCapitalize="none" onChangeText={value => update("email", value)} />
            <Field label="GST Number" value={profile.gstNumber} editable autoCapitalize="characters" onChangeText={value => update("gstNumber", value.toUpperCase())} />
          </> : null}
        </Section>

        <Section title="Address">
          <Field label="Address" value={profile.address} editable={editing} multiline onChangeText={value => update("address", value)} />
          <View style={styles.twoColumns}>
            <Field wrapStyle={styles.column} label="City" value={profile.city} editable={false} />
            <Field wrapStyle={styles.column} label="Pincode" value={profile.pincode} editable={false} />
          </View>
          <Field label="State" value={profile.state} editable={false} />
        </Section>

        {editing ? <Pressable disabled={saving} onPress={() => void save()} style={styles.saveButton}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>SAVE PROFILE</Text>}
        </Pressable> : null}

        <Pressable onPress={logout} style={styles.logoutButton}><Text style={styles.logoutText}>LOGOUT</Text></Pressable>
      </View>
    </ScrollView>
  </View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Field({ label, value, editable, wrapStyle, ...props }: React.ComponentProps<typeof TextInput> & { label: string; value: string; editable: boolean; wrapStyle?: object }) {
  return <View style={[styles.fieldWrap, wrapStyle]}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} editable={editable} placeholder="-" placeholderTextColor="#98a5b7" style={[styles.input, !editable && styles.readonly, props.multiline && styles.multiline]} {...props} /></View>;
}

function InfoCard({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  return <View style={styles.infoCard}><Text style={styles.infoLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.infoValue, tone === "success" && styles.success, tone === "warning" && styles.warning, tone === "danger" && styles.danger]}>{value}</Text></View>;
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "DP";
}

function kycLabel(value: string): { label: string; tone: "success" | "warning" | "danger" } {
  const status = String(value || "").toLowerCase();
  if (status.includes("approve") || status.includes("verif")) return { label: "Verified", tone: "success" };
  if (status.includes("reject")) return { label: "Rejected", tone: "danger" };
  if (status.includes("missing")) return { label: "Not completed", tone: "warning" };
  return { label: "Pending", tone: "warning" };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 128 },
  hero: { minHeight: 330, paddingHorizontal: 20, paddingTop: 20, alignItems: "center" },
  headerRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 48, height: 48, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,.35)", backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center" },
  headerIcon: { color: "#fff", fontSize: 31, lineHeight: 34 },
  editIcon: { color: "#fff", fontSize: 27, lineHeight: 30 },
  headerTitle: { fontFamily: jakarta.extraBold, color: "#fff", fontSize: 20, letterSpacing: 2 },
  avatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: "rgba(255,255,255,.58)", backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center", marginTop: 22 },
  avatarText: { fontFamily: jakarta.extraBold, color: "#fff", fontSize: 30 },
  name: { fontFamily: jakarta.extraBold, color: "#fff", fontSize: 22, marginTop: 14, paddingHorizontal: 12 },
  meta: { fontFamily: jakarta.semiBold, color: "rgba(255,255,255,.8)", fontSize: 13, marginTop: 7, paddingHorizontal: 12 },
  body: { paddingHorizontal: 20, marginTop: 22, gap: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoCard: { width: "48%", minHeight: 82, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe5ef", paddingHorizontal: 16, paddingVertical: 14 },
  infoLabel: { fontFamily: jakarta.bold, color: colors.muted, fontSize: 10, letterSpacing: .8 },
  infoValue: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 17, marginTop: 6 },
  success: { color: "#119967" }, warning: { color: "#b97512" }, danger: { color: colors.danger },
  section: { backgroundColor: "#fff", borderRadius: 22, borderWidth: 1, borderColor: "#dbe5ef", padding: 17 },
  sectionTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 18, marginBottom: 15 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontFamily: jakarta.bold, color: colors.muted, fontSize: 11, letterSpacing: .5, textTransform: "uppercase", marginBottom: 7 },
  input: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: "#bdd3e8", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 12, fontFamily: jakarta.bold, color: colors.navy, fontSize: 14 },
  readonly: { backgroundColor: "#f7f9fc", borderColor: "#e0e7ef" },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  twoColumns: { flexDirection: "row", justifyContent: "space-between" },
  column: { width: "48%" },
  saveButton: { minHeight: 58, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: jakarta.extraBold, color: "#fff", fontSize: 15, letterSpacing: 1 },
  logoutButton: { minHeight: 58, borderRadius: 17, borderWidth: 1, borderColor: "#ffbdc5", backgroundColor: "#fff0f2", alignItems: "center", justifyContent: "center" },
  logoutText: { fontFamily: jakarta.extraBold, color: colors.danger, fontSize: 15, letterSpacing: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 28 },
  loadingText: { fontFamily: jakarta.semiBold, color: colors.muted, marginTop: 12 },
  errorIcon: { width: 52, height: 52, borderRadius: 26, textAlign: "center", textAlignVertical: "center", overflow: "hidden", backgroundColor: "#ffe9e9", color: colors.danger, fontFamily: jakarta.extraBold, fontSize: 28 },
  errorTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 20, marginTop: 14 },
  errorText: { fontFamily: jakarta.medium, color: colors.muted, fontSize: 13, marginTop: 6, textAlign: "center" },
  retry: { marginTop: 18, borderRadius: 14, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14 },
  retryText: { fontFamily: jakarta.extraBold, color: "#fff", fontSize: 13 }
});
