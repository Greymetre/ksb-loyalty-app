import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyScreen from "@/screens/common/EmptyScreen";
import { colors, gradients } from "@/constants/colors";
import { Route } from "@/navigation/routes";
import { signOut } from "@/services/session";
import { kycApi } from "@/services/kycApi";
import { ProfileData, profileApi } from "@/services/profileApi";
import { LocationOption, MasterOption, registrationApi } from "@/services/registrationApi";
import { showToast } from "@/services/toast";
import { jakarta } from "@/styles/appStyles";

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

export default function ProfileScreen({ go }: { go: (route: Route) => void }) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [kycStatus, setKycStatus] = useState("Pending");
  const [stateOptions, setStateOptions] = useState<MasterOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [activeLookup, setActiveLookup] = useState<"city" | "pincode" | "state" | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const [profileResult, kycResult] = await Promise.allSettled([profileApi.get(), kycApi.get()]);
        if (!mounted) return;
        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
          setFailed(false);
        } else {
          setFailed(true);
        }
        if (kycResult.status === "fulfilled") {
          setKycStatus(getProfileKycStatus(kycResult.value.documents));
        } else if (profileResult.status === "fulfilled") {
          setKycStatus(normalizeProfileKycStatus(profileResult.value.kycStatus));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    registrationApi.states()
      .then(setStateOptions)
      .catch(() => setStateOptions([]));
  }, []);

  const update = (key: keyof ProfileData, value: string) => setProfile((current) => ({ ...current, [key]: value }));

  const applyLocation = (location: LocationOption) => {
    setProfile((current) => ({
      ...current,
      city: location.city || current.city,
      cityId: location.city ? location.cityId ?? null : current.cityId,
      pincode: location.pincode || current.pincode,
      pincodeId: location.pincode ? location.pincodeId ?? null : current.pincodeId,
      state: location.state || current.state,
      stateId: location.state ? location.stateId ?? null : current.stateId
    }));
    setActiveLookup(null);
    setLocationOptions([]);
  };

  const lookupLocations = async (params: Parameters<typeof registrationApi.locationLookup>[0], source: "city" | "pincode" | "state", shouldAutofillFirst = false) => {
    setActiveLookup(source);
    setLocationLoading(true);
    try {
      const items = await registrationApi.locationLookup(params);
      setLocationOptions(items);
      if (shouldAutofillFirst && items[0]) {
        applyLocation(items[0]);
      }
    } catch {
      setLocationOptions([]);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCityChange = (city: string) => {
    setProfile((current) => ({ ...current, city, cityId: null, pincodeId: null, stateId: null }));
    if (city.trim().length >= 2) {
      lookupLocations({ city: city.trim() }, "city");
    } else {
      setActiveLookup(null);
      setLocationOptions([]);
    }
  };

  const handlePincodeChange = (nextPincode: string) => {
    const pincode = nextPincode.replace(/\D/g, "").slice(0, 6);
    setProfile((current) => ({ ...current, pincode, cityId: null, pincodeId: null, stateId: null }));
    if (pincode.length === 6) {
      lookupLocations({ pincode }, "pincode", true);
    } else if (activeLookup === "pincode") {
      setLocationOptions([]);
    }
  };

  const handleStateTextChange = (state: string) => {
    setProfile((current) => ({ ...current, state, cityId: null, pincodeId: null, stateId: null }));
    setActiveLookup("state");
    setLocationOptions([]);
  };

  const handleStateSelect = (state: MasterOption) => {
    setProfile((current) => ({ ...current, state: state.name, stateId: state.id }));
    lookupLocations({ state_id: state.id }, "state");
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await profileApi.update(profile);
      setProfile(updated);
      setEditing(false);
      setActiveLookup(null);
      setLocationOptions([]);
      showToast("Profile updated successfully", "success");
    } catch {
      showToast("Unable to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await signOut();
    go("Login");
  };

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={screenStyles.safe}>
        <View style={screenStyles.loadingWrap}><ActivityIndicator color={colors.primary} /><Text style={screenStyles.loadingText}>Loading profile</Text></View>
      </SafeAreaView>
    );
  }

  if (failed) return <EmptyScreen title="Profile unavailable" message="Unable to load profile details." onBack={() => go("Home")} />;

  return (
    <SafeAreaView edges={["left", "right"]} style={screenStyles.safe}>
      <StatusBar style="light" />
      <View style={[screenStyles.phone, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={screenStyles.header}>
          <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Pressable onPress={() => go("Home")} style={screenStyles.headerButton}><Text style={screenStyles.headerButtonText}>←</Text></Pressable>
          <Pressable onPress={() => setEditing((value) => !value)} style={[screenStyles.headerButton, screenStyles.editButton]}><Text style={screenStyles.headerButtonText}>{editing ? "×" : "✎"}</Text></Pressable>
          <Text style={screenStyles.headerTitle}>MY PROFILE</Text>
          <View style={screenStyles.avatarWrap}>
            <Text style={screenStyles.avatarText}>{initials(profile.ownerName || profile.firmName)}</Text>
          </View>
          <Text numberOfLines={1} style={screenStyles.profileName}>{profile.ownerName || "Retailer"}</Text>
          <Text numberOfLines={1} style={screenStyles.profileMeta}>{[profile.firmName, profile.customerType].filter(Boolean).join(" · ") || "KSB Loyalty Member"}</Text>
        </View>

        <ScrollView style={screenStyles.scroll} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={screenStyles.content}>
          <View style={screenStyles.statusRow}>
            <InfoPill label="Mobile" value={profile.mobile || "-"} />
            <InfoPill label="KYC" value={kycStatus} tone={kycStatus === "Approved" ? "green" : undefined} />
          </View>

          <Pressable onPress={() => go("Kyc")} style={screenStyles.kycCard}>
            <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={screenStyles.kycGradient}>
              <View style={screenStyles.kycIcon}><Text style={screenStyles.kycIconText}>✓</Text></View>
              <View style={screenStyles.kycCopy}>
                <Text style={screenStyles.kycTitle}>KYC Verification</Text>
                <Text style={screenStyles.kycSub}>View document status and update attachments</Text>
              </View>
              <Text style={screenStyles.kycArrow}>→</Text>
            </LinearGradient>
          </Pressable>

          <Section title="Business Details">
            <ProfileField label="Owner Name" value={profile.ownerName} editable={editing} onChangeText={(value) => update("ownerName", value)} />
            <ProfileField label="Firm Name" value={profile.firmName} editable={editing} onChangeText={(value) => update("firmName", value)} />
            <ProfileField label="Mobile" value={profile.mobile} editable={editing} keyboardType="number-pad" maxLength={10} onChangeText={(value) => update("mobile", value.replace(/\D/g, "").slice(0, 10))} />
            <ProfileField label="Email" value={profile.email} editable={editing} keyboardType="email-address" onChangeText={(value) => update("email", value)} />
            <ProfileField label="GST Number" value={profile.gstNumber} editable={editing} autoCapitalize="characters" onChangeText={(value) => update("gstNumber", value.toUpperCase())} />
          </Section>

          <Section title="Address">
            <ProfileField label="Address" value={profile.address} editable={editing} multiline onChangeText={(value) => update("address", value)} />
            <View style={screenStyles.twoCol}>
              <ProfileField label="City" value={profile.city} editable={editing} wrapStyle={screenStyles.col} onChangeText={handleCityChange} />
              <ProfileField label="Pincode" value={profile.pincode} editable={editing} wrapStyle={screenStyles.col} keyboardType="number-pad" onChangeText={handlePincodeChange} />
            </View>
            {editing && (activeLookup === "city" || activeLookup === "pincode") ? (
              <LocationLookupList
                loading={locationLoading}
                locations={locationOptions}
                emptyText={activeLookup === "pincode" ? "No locations found for this pincode." : "No matching cities found."}
                onSelect={applyLocation}
              />
            ) : null}
            <ProfileField label="State" value={profile.state} editable={editing} onChangeText={handleStateTextChange} />
            {editing ? (
              <StateLookupList
                states={stateOptions}
                query={profile.state}
                selectedId={profile.stateId}
                onSelect={handleStateSelect}
              />
            ) : null}
            {editing && activeLookup === "state" ? (
              <LocationLookupList
                loading={locationLoading}
                locations={locationOptions}
                emptyText="No cities found for this state."
                onSelect={applyLocation}
              />
            ) : null}
          </Section>

          {editing ? (
            <Pressable disabled={saving} onPress={save} style={screenStyles.saveWrap}>
              <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={screenStyles.saveButton}>
                {saving ? <ActivityIndicator color={colors.white} /> : <Text style={screenStyles.saveText}>SAVE PROFILE  →</Text>}
              </LinearGradient>
            </Pressable>
          ) : null}

          <Pressable onPress={logout} style={screenStyles.logoutButton}>
            <Text style={screenStyles.logoutText}>LOGOUT</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={screenStyles.section}>
      <Text style={screenStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ProfileField({ label, value, editable, wrapStyle, ...props }: React.ComponentProps<typeof TextInput> & { label: string; value: string; editable: boolean; wrapStyle?: any }) {
  return (
    <View style={[screenStyles.fieldWrap, wrapStyle]}>
      <Text style={screenStyles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        editable={editable}
        placeholder="-"
        placeholderTextColor="#9aa6b3"
        style={[screenStyles.input, !editable && screenStyles.inputReadonly, props.multiline && screenStyles.inputMultiline]}
        {...props}
      />
    </View>
  );
}

function InfoPill({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <View style={[screenStyles.infoPill, tone === "green" && screenStyles.infoPillGreen]}>
      <Text style={screenStyles.infoPillLabel}>{label}</Text>
      <Text numberOfLines={1} style={screenStyles.infoPillValue}>{value}</Text>
    </View>
  );
}

function StateLookupList({
  states,
  query,
  selectedId,
  onSelect
}: {
  states: MasterOption[];
  query: string;
  selectedId?: number | null;
  onSelect: (state: MasterOption) => void;
}) {
  const matchingStates = states
    .filter((state) => !query || state.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);
  if (!matchingStates.length) {
    return <Text style={screenStyles.lookupEmpty}>{states.length ? "No matching states." : "Loading states..."}</Text>;
  }
  return (
    <View style={screenStyles.optionPanel}>
      {matchingStates.map((state) => (
        <Pressable key={state.id} onPress={() => onSelect(state)} style={[screenStyles.stateOption, selectedId === state.id && screenStyles.stateOptionActive]}>
          <Text style={[screenStyles.stateOptionText, selectedId === state.id && screenStyles.stateOptionTextActive]}>{state.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function LocationLookupList({
  loading,
  locations,
  emptyText,
  onSelect
}: {
  loading: boolean;
  locations: LocationOption[];
  emptyText: string;
  onSelect: (location: LocationOption) => void;
}) {
  if (loading) {
    return <Text style={screenStyles.lookupLoading}>Finding matching locations...</Text>;
  }
  if (!locations.length) {
    return <Text style={screenStyles.lookupEmpty}>{emptyText}</Text>;
  }
  return (
    <View style={screenStyles.locationPanel}>
      <Text style={screenStyles.optionPanelTitle}>Matching locations</Text>
      {locations.slice(0, 8).map((location, index) => (
        <Pressable key={locationKey(location, index)} onPress={() => onSelect(location)} style={screenStyles.locationRow}>
          <Text style={screenStyles.locationCity}>{location.city || "City not provided"}</Text>
          <Text style={screenStyles.locationMeta}>{[location.state, location.pincode].filter(Boolean).join(" · ") || "Tap to select"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "K";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function getProfileKycStatus(documents: { statusLabel?: string; status?: string }[]) {
  const requiredCount = 4;
  const approvedCount = documents.filter((doc) => String(doc.statusLabel || doc.status || "").toLowerCase().includes("approve")).length;
  return documents.length >= requiredCount && approvedCount >= requiredCount ? "Approved" : "Pending";
}

function normalizeProfileKycStatus(status: string) {
  return String(status || "").toLowerCase().includes("approve") ? "Approved" : "Pending";
}

function locationKey(location: LocationOption, index: number) {
  return `${location.cityId || location.city}-${location.stateId || location.state}-${location.pincodeId || location.pincode}-${index}`;
}

const screenStyles = StyleSheet.create({
  safe: { flex: 1 },
  phone: { flex: 1 },
  scroll: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 13 },
  header: { height: 196, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16, overflow: "hidden", alignItems: "center" },
  headerButton: { position: "absolute", left: 22, top: 14, width: 40, height: 40, borderRadius: 15, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.42)", backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  editButton: { left: undefined, right: 22 },
  headerButtonText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 21, marginTop: -2 },
  headerTitle: { marginTop: 10, textAlign: "center", fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13, letterSpacing: 5 },
  avatarWrap: { marginTop: 12, width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  avatarText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 30 },
  profileName: { marginTop: 7, maxWidth: 300, fontFamily: jakarta.extraBold, color: colors.white, fontSize: 19, zIndex: 2 },
  profileMeta: { marginTop: 3, maxWidth: 310, fontFamily: jakarta.bold, color: "rgba(255,255,255,0.82)", fontSize: 11.5, zIndex: 2 },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34 },
  statusRow: { flexDirection: "row", gap: 12 },
  infoPill: { flex: 1, minHeight: 60, borderRadius: 16, borderWidth: 1, borderColor: "#dfe6ee", backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 11 },
  infoPillGreen: { borderColor: "#dcb877", backgroundColor: "#faf0dd" },
  infoPillLabel: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 10, letterSpacing: 1.8 },
  infoPillValue: { marginTop: 4, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 15 },
  kycCard: { marginTop: 18, borderRadius: 22, overflow: "hidden", shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  kycGradient: { minHeight: 96, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 18, flexDirection: "row", alignItems: "center", gap: 15 },
  kycIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1.2, borderColor: "rgba(255,255,255,0.36)", alignItems: "center", justifyContent: "center" },
  kycIconText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 28 },
  kycCopy: { flex: 1, minWidth: 0 },
  kycTitle: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 19 },
  kycSub: { marginTop: 4, fontFamily: jakarta.bold, color: "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 18 },
  kycArrow: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 24 },
  section: { marginTop: 22, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: "#dfe6ee", padding: 18, shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  sectionTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 18, marginBottom: 2 },
  fieldWrap: { marginTop: 14 },
  fieldLabel: { marginBottom: 8, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 11, letterSpacing: 1.8 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: "#fdf9f1", paddingHorizontal: 14, paddingVertical: 0, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14 },
  inputReadonly: { color: colors.navy, backgroundColor: "#fbfcfd" },
  inputMultiline: { minHeight: 78, paddingTop: 12, paddingBottom: 12, textAlignVertical: "top" },
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  lookupLoading: { marginTop: 10, fontFamily: jakarta.bold, color: colors.primary, fontSize: 11 },
  lookupEmpty: { marginTop: 10, fontFamily: jakarta.bold, color: "#9aa6b3", fontSize: 11 },
  optionPanel: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stateOption: { minHeight: 34, borderRadius: 999, borderWidth: 1, borderColor: "#dfe6ee", backgroundColor: "#fdf9f1", paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center" },
  stateOptionActive: { borderColor: "#dcb877", backgroundColor: "#faf0dd" },
  stateOptionText: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 11 },
  stateOptionTextActive: { color: colors.primary },
  locationPanel: { marginTop: 10, borderRadius: 15, borderWidth: 1, borderColor: "#d6e8f6", backgroundColor: "#fdf8ee", overflow: "hidden" },
  optionPanelTitle: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 10, letterSpacing: 1.4 },
  locationRow: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#edf2f6" },
  locationCity: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 12.5 },
  locationMeta: { marginTop: 2, fontFamily: jakarta.bold, color: colors.muted, fontSize: 10.5 },
  saveWrap: { marginTop: 24, borderRadius: 18, overflow: "hidden" },
  saveButton: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 14, letterSpacing: 2.2 },
  logoutButton: { marginTop: 14, height: 52, borderRadius: 17, borderWidth: 1.2, borderColor: "#ffc3c3", backgroundColor: "#fff4f2", alignItems: "center", justifyContent: "center" },
  logoutText: { fontFamily: jakarta.extraBold, color: colors.danger, fontSize: 13, letterSpacing: 2.2 }
});
