import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyScreen from "@/screens/common/EmptyScreen";
import { colors, gradients } from "@/constants/colors";
import { Route } from "@/navigation/routes";
import { KycDetails, KycDocKey, KycDocument, KycFile, kycApi } from "@/services/kycApi";
import InvoiceAttachmentViewer from "@/components/InvoiceAttachmentViewer";
import { showToast } from "@/services/toast";
import { jakarta } from "@/styles/appStyles";

const emptyKyc: KycDetails = {
  summary: { uploaded: 0, approved: 0, status: "pending", statusLabel: "Pending" },
  gstNumber: "",
  panNumber: "",
  aadharNo: "",
  bankAccountType: "",
  bankName: "",
  bankAccountNumber: "",
  ifscCode: "",
  accountHolderName: "",
  documents: []
};

// The dealer login reuses this screen for a retailer assigned to it: pass the
// retailer's id and name and it reads and writes that retailer's KYC instead of
// the signed-in retailer's own. Everything else - fields, attachments, validation
// and the submit flow - stays identical for both logins.
export default function KycScreen({
  go,
  retailerId,
  retailerName,
  onBack,
  bottomInset
}: {
  go?: (route: Route) => void;
  retailerId?: number;
  retailerName?: string;
  onBack?: () => void;
  // The dealer login keeps its tab bar floating over this screen, so the submit
  // button needs room to clear it.
  bottomInset?: number;
}) {
  const insets = useSafeAreaInsets();
  const goBack = () => (onBack ? onBack() : go?.("Profile"));
  // Opened from the dealer's retailer list this screen sits inside the dealer shell,
  // which already applies the top safe-area inset and paints the strip behind the
  // clock in the light background every other dealer module uses. Applying the inset
  // again left a band of empty cream, and forcing a light status bar made the clock
  // and battery vanish into it.
  const embedded = Boolean(retailerId);
  const [kyc, setKyc] = useState<KycDetails>(emptyKyc);
  const [files, setFiles] = useState<Partial<Record<KycDocKey, KycFile>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pickingKey, setPickingKey] = useState<KycDocKey | null>(null);
  // The document being looked at, shown in the app's own viewer.
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    kycApi.get(retailerId)
      .then((data) => {
        setKyc(data);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [retailerId]);

  const update = (key: keyof KycDetails, value: string) => setKyc((current) => ({ ...current, [key]: value }));

  const saveFile = (key: KycDocKey, asset: ImagePicker.ImagePickerAsset) => {
    setFiles((current) => ({
      ...current,
      [key]: {
        uri: asset.uri,
        name: asset.fileName || asset.uri.split("/").pop() || `${key}.jpg`,
        type: asset.mimeType || "image/jpeg"
      }
    }));
  };

  const pickCamera = async (key: KycDocKey) => {
    if (pickingKey) return;
    setPickingKey(key);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Camera permission needed", "Please allow camera access to capture this KYC document.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.back,
        quality: 0.82
      });
      if (!result.canceled && result.assets[0]) saveFile(key, result.assets[0]);
    } catch (error) {
      Alert.alert("Camera unavailable", pickerErrorMessage(error, "camera"));
    } finally {
      setPickingKey(null);
    }
  };

  const pickGallery = async (key: KycDocKey) => {
    if (pickingKey) return;
    setPickingKey(key);
    try {
      // No permission is asked for, and none is declared. The system photo picker
      // hands back only the one image the user chose, which is all this screen needs -
      // and it keeps the app out of Google Play's broad photo-permission declaration.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.82
      });
      if (!result.canceled && result.assets[0]) saveFile(key, result.assets[0]);
    } catch (error) {
      Alert.alert("Gallery unavailable", pickerErrorMessage(error, "gallery"));
    } finally {
      setPickingKey(null);
    }
  };

  const validateKyc = () => {
    const requiredFields: Array<[keyof KycDetails, string]> = [
      ["gstNumber", "GST Number"],
      ["panNumber", "PAN Number"],
      ["aadharNo", "Aadhaar Number"],
      ["accountHolderName", "Account Holder"],
      ["bankName", "Bank Name"],
      ["bankAccountType", "Account Type"],
      ["bankAccountNumber", "Account Number"],
      ["ifscCode", "IFSC Code"]
    ];
    const missingField = requiredFields.find(([key]) => !String(kyc[key] ?? "").trim());
    if (missingField) {
      showToast(`${missingField[1]} is required`, "error");
      return false;
    }

    const requiredDocKeys: KycDocKey[] = ["gst", "pan", "aadhar", "bank"];
    const missingDocKey = requiredDocKeys.find((key) => !files[key]?.uri && !kyc.documents.some((doc) => doc.key === key && doc.attachmentUrl));
    if (missingDocKey) {
      showToast(`${kycDocumentTitle(missingDocKey)} attachment is required`, "error");
      return false;
    }

    return true;
  };

  const submit = async () => {
    if (!validateKyc()) return;
    setSaving(true);
    try {
      const updated = await kycApi.update({ ...kyc, files }, retailerId);
      setKyc(updated);
      setFiles({});
      showToast("KYC details submitted for review", "success");
    } catch {
      showToast("Unable to update KYC details", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={screenStyles.safe}>
        <View style={screenStyles.loadingWrap}><ActivityIndicator color={colors.primary} /><Text style={screenStyles.loadingText}>Loading KYC</Text></View>
      </SafeAreaView>
    );
  }

  if (failed) return <EmptyScreen title="KYC unavailable" message="Unable to load KYC details." onBack={goBack} />;

  return (
    <SafeAreaView edges={["left", "right"]} style={screenStyles.safe}>
      <StatusBar style={embedded ? "dark" : "light"} />
      <View style={[screenStyles.phone, { paddingTop: embedded ? 0 : Math.max(insets.top, 12) }]}>
        <View style={screenStyles.header}>
          <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Pressable onPress={goBack} style={screenStyles.headerButton}><Text style={screenStyles.headerButtonText}>←</Text></Pressable>
          <Text style={screenStyles.headerTitle}>KYC DETAILS</Text>
          <Text numberOfLines={1} style={screenStyles.headerBig}>{retailerName || "Verify documents"}</Text>
          <Text style={screenStyles.headerSub}>{retailerName
            ? "Update this retailer's details and attachments for GST, PAN, Aadhaar and bank proof"
            : "Update details and attachments for GST, PAN, Aadhaar and bank proof"}</Text>
        </View>

        <ScrollView style={screenStyles.scroll} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[screenStyles.content, bottomInset ? { paddingBottom: bottomInset } : null]}>
          <View style={screenStyles.summaryCard}>
            <View>
              <Text style={screenStyles.summaryLabel}>KYC STATUS</Text>
              <Text style={screenStyles.summaryStatus}>{kyc.summary.statusLabel}</Text>
            </View>
            <View style={screenStyles.summaryStats}>
              <View style={screenStyles.summaryStat}>
                <Text style={screenStyles.summaryNumber}>{kyc.summary.uploaded}</Text>
                <Text style={screenStyles.summaryCaption}>Uploaded</Text>
              </View>
              <View style={screenStyles.summaryStat}>
                <Text style={screenStyles.summaryNumber}>{kyc.summary.approved}</Text>
                <Text style={screenStyles.summaryCaption}>Approved</Text>
              </View>
            </View>
          </View>

          <View style={screenStyles.statusGrid}>
            {kyc.documents.map((doc) => <DocStatus key={doc.key} doc={doc} />)}
          </View>

          {/* One block per document: its attachment first, then the numbers that
              belong to it - so Aadhaar's photo and Aadhaar's number are read and
              filled together instead of living in two distant sections. */}
          {kyc.documents.map((doc) => {
            const locked = isApprovedDocument(doc);
            return (
              <AttachmentCard
                key={doc.key}
                onPreview={setPreviewUri}
                doc={doc}
                locked={locked}
                selectedFile={files[doc.key]}
                picking={pickingKey === doc.key}
                onCamera={() => pickCamera(doc.key)}
                onGallery={() => pickGallery(doc.key)}
              >
                {documentFields[doc.key].map((field) => (
                  <KycField
                    key={field.key}
                    label={field.label}
                    value={String(kyc[field.key] ?? "")}
                    editable={!locked}
                    style={[screenStyles.input, locked && screenStyles.inputLocked]}
                    keyboardType={field.keyboardType}
                    autoCapitalize={field.autoCapitalize}
                    onChangeText={(value) => update(field.key, field.clean ? field.clean(value) : value)}
                  />
                ))}
              </AttachmentCard>
            );
          })}

          <Pressable disabled={saving} onPress={submit} style={screenStyles.submitWrap}>
            <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={screenStyles.submitButton}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={screenStyles.submitText}>SUBMIT KYC  →</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </View>
      <InvoiceAttachmentViewer uri={previewUri} onClose={() => setPreviewUri(null)} />
    </SafeAreaView>
  );
}

// Each document now carries its own fields, so the old shared Section wrapper went
// away with the "Document Details" and "Bank Proof" blocks it used to hold.
type KycFieldKey = "gstNumber" | "panNumber" | "aadharNo" | "accountHolderName" | "bankName" | "bankAccountType" | "bankAccountNumber" | "ifscCode";

type KycFieldSpec = {
  key: KycFieldKey;
  label: string;
  keyboardType?: "number-pad";
  autoCapitalize?: "characters";
  clean?: (value: string) => string;
};

const digitsOnly = (value: string) => value.replace(/\D/g, "");

// Which numbers belong under which document. The bank proof carries five, the
// other three carry one each.
const documentFields: Record<KycDocKey, KycFieldSpec[]> = {
  gst: [{ key: "gstNumber", label: "GST Number", autoCapitalize: "characters", clean: (value) => value.toUpperCase() }],
  pan: [{ key: "panNumber", label: "PAN Number", autoCapitalize: "characters", clean: (value) => value.toUpperCase() }],
  aadhar: [{ key: "aadharNo", label: "Aadhaar Number", keyboardType: "number-pad", clean: (value) => digitsOnly(value).slice(0, 12) }],
  bank: [
    { key: "accountHolderName", label: "Account Holder" },
    { key: "bankName", label: "Bank Name" },
    { key: "bankAccountType", label: "Account Type" },
    { key: "bankAccountNumber", label: "Account Number", keyboardType: "number-pad", clean: digitsOnly },
    { key: "ifscCode", label: "IFSC Code", autoCapitalize: "characters", clean: (value) => value.toUpperCase() }
  ]
};

// An approved document is finished. Its number and its file are read-only from here
// on; the server refuses changes to it as well, so this only saves a wasted trip.
const isApprovedDocument = (doc: KycDocument) =>
  String(doc.status || "").toLowerCase().includes("approve")
  || String(doc.status || "").toLowerCase() === "verified"
  || doc.statusLabel.toLowerCase() === "approved";

function KycField(props: React.ComponentProps<typeof TextInput> & { label: string; value: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={screenStyles.fieldWrap}>
      <Text style={screenStyles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#9aa6b3" style={screenStyles.input} {...inputProps} />
    </View>
  );
}

function DocStatus({ doc }: { doc: KycDocument }) {
  const tone = doc.statusLabel.toLowerCase();
  return (
    <View style={[screenStyles.docStatus, tone.includes("approved") && screenStyles.docApproved, tone.includes("reject") && screenStyles.docRejected]}>
      <Text style={screenStyles.docStatusTitle}>{doc.title}</Text>
      <Text style={[screenStyles.docStatusText, tone.includes("approved") && screenStyles.docStatusApprovedText, tone.includes("reject") && screenStyles.docStatusRejectedText]}>{doc.statusLabel}</Text>
    </View>
  );
}

function kycDocumentTitle(key: KycDocKey) {
  const titles: Record<KycDocKey, string> = {
    gst: "GST Certificate",
    pan: "PAN Card",
    aadhar: "Aadhaar Card",
    bank: "Bank Proof"
  };
  return titles[key];
}

function pickerErrorMessage(error: unknown, source: "camera" | "gallery") {
  const detail = error instanceof Error ? error.message : String(error || "");
  const fallback = source === "camera" ? "Unable to open the camera on this device." : "Unable to open the gallery on this device.";
  return detail ? `${fallback}\n\n${detail}` : fallback;
}

function AttachmentCard({
  doc,
  selectedFile,
  picking,
  locked,
  children,
  onCamera,
  onGallery,
  onPreview
}: {
  doc: KycDocument;
  selectedFile?: KycFile;
  picking?: boolean;
  locked?: boolean;
  children?: React.ReactNode;
  onCamera: () => void;
  onGallery: () => void;
  onPreview: (uri: string) => void;
}) {
  const previewUri = selectedFile?.uri || doc.attachmentUrl;
  // Opened in the app's own viewer. Handing the URL to the browser took the person out
  // of the app to look at their own document, and left them to find their way back.
  const openAttachment = () => {
    if (!previewUri) {
      showToast("No attachment available", "info");
      return;
    }
    onPreview(previewUri);
  };

  return (
    <View style={screenStyles.attachmentCard}>
      <View style={screenStyles.attachmentTop}>
        <Pressable onPress={openAttachment} style={screenStyles.previewBox}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} resizeMode="cover" style={screenStyles.previewImage} />
          ) : (
            <View style={screenStyles.previewEmpty}><Text style={screenStyles.previewEmptyText}>No file</Text></View>
          )}
        </Pressable>
        <View style={screenStyles.attachmentCopy}>
          <View style={screenStyles.attachmentTitleRow}>
            <Text style={screenStyles.attachmentTitle}>{doc.title}</Text>
            <Text style={screenStyles.requiredBadge}>{doc.statusLabel}</Text>
          </View>
          {/* The numbers used to be repeated here as read-only rows. They now sit
              under this card as their own inputs, so repeating them only added noise. */}
          {doc.actionBy || doc.actionAt ? <Text style={screenStyles.actionMeta}>{[doc.actionBy, doc.actionAt ? new Date(doc.actionAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""].filter(Boolean).join(" / ")}</Text> : null}
          {doc.attachmentUrl ? <Pressable onPress={openAttachment}><Text numberOfLines={1} style={screenStyles.viewAttachment}>View current · {doc.attachmentName || "Attachment"}</Text></Pressable> : null}
          {selectedFile ? <Text numberOfLines={1} style={screenStyles.selectedFile}>✓ New file: {selectedFile.name}</Text> : null}
          {doc.remark ? <Text style={screenStyles.remarkText}>{doc.remark}</Text> : null}
        </View>
      </View>
      <View style={screenStyles.attachmentActions}>
        <Pressable onPress={openAttachment} style={screenStyles.viewButton}><Text style={screenStyles.viewButtonText}>View</Text></Pressable>
        {locked ? (
          <View style={screenStyles.lockedNote}><Text style={screenStyles.lockedNoteText}>Approved · cannot be changed</Text></View>
        ) : (
          <>
            <Pressable disabled={picking} onPress={onCamera} style={[screenStyles.cameraButton, picking && screenStyles.pickerButtonDisabled]}><Text style={screenStyles.cameraText}>{picking ? "Opening..." : "📷  Camera"}</Text></Pressable>
            <Pressable disabled={picking} onPress={onGallery} style={[screenStyles.galleryButton, picking && screenStyles.pickerButtonDisabled]}><Text style={screenStyles.galleryText}>{picking ? "Opening..." : "▣  Gallery"}</Text></Pressable>
          </>
        )}
      </View>
      {children}
    </View>
  );
}

const screenStyles = StyleSheet.create({
  safe: { flex: 1 },
  phone: { flex: 1 },
  scroll: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 13 },
  // The header is fixed above the scroll area, so every point it takes is a point
  // the documents never get. Sized by its content instead of a fixed 238.
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, overflow: "hidden" },
  headerButton: { position: "absolute", left: 24, top: 12, width: 40, height: 40, borderRadius: 13, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.42)", backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  headerButtonText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 19, marginTop: -2 },
  headerTitle: { marginTop: 11, textAlign: "center", fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13, letterSpacing: 4.5 },
  headerBig: { marginTop: 18, fontFamily: jakarta.extraBold, color: colors.white, fontSize: 23 },
  headerSub: { marginTop: 5, maxWidth: 310, fontFamily: jakarta.bold, color: "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 17 },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34 },
  summaryCard: { marginBottom: 16, borderRadius: 22, borderWidth: 1, borderColor: "#e2c58c", backgroundColor: "#faf0dd", padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 10, letterSpacing: 2.1 },
  summaryStatus: { marginTop: 7, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 25 },
  summaryStats: { flexDirection: "row", gap: 10 },
  summaryStat: { minWidth: 64, borderRadius: 15, backgroundColor: colors.white, paddingVertical: 10, paddingHorizontal: 10, alignItems: "center" },
  summaryNumber: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 20 },
  summaryCaption: { marginTop: 2, fontFamily: jakarta.bold, color: colors.muted, fontSize: 9 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  docStatus: { width: "48.4%", minHeight: 66, borderRadius: 16, borderWidth: 1, borderColor: "#f3d486", backgroundColor: "#fff9e8", padding: 13 },
  docApproved: { borderColor: "#dcb877", backgroundColor: "#faf0dd" },
  docRejected: { borderColor: "#ffc3c3", backgroundColor: "#fff4f2" },
  docStatusTitle: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 10, letterSpacing: 1.6 },
  docStatusText: { marginTop: 7, fontFamily: jakarta.extraBold, color: "#a97900", fontSize: 15 },
  docStatusApprovedText: { color: colors.primary },
  docStatusRejectedText: { color: colors.danger },
  section: { marginTop: 22, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: "#dfe6ee", padding: 18, shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  sectionTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 18, marginBottom: 2 },
  fieldWrap: { marginTop: 14 },
  fieldLabel: { marginBottom: 8, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 11, letterSpacing: 1.8 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: "#fdf9f1", paddingHorizontal: 14, paddingVertical: 0, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14 },
  attachmentCard: { marginTop: 14, borderRadius: 17, borderWidth: 1.2, borderColor: "#9be8ba", backgroundColor: colors.white, padding: 14 },
  inputLocked: { backgroundColor: "#f1f4f8", color: colors.muted, borderColor: "#e3e9f0" },
  lockedNote: { flex: 1, height: 42, borderRadius: 14, borderWidth: 1.2, borderColor: "#e2c58c", backgroundColor: "#faf0dd", alignItems: "center", justifyContent: "center" },
  lockedNoteText: { fontFamily: jakarta.extraBold, color: "#a97900", fontSize: 12 },
  attachmentTop: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  previewBox: { width: 92, height: 82, borderRadius: 13, overflow: "hidden", borderWidth: 1, borderColor: "#dfe6ee", backgroundColor: "#f4f7fa" },
  previewImage: { width: "100%", height: "100%" },
  previewEmpty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  previewEmptyText: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 10 },
  attachmentCopy: { flex: 1, minWidth: 0 },
  attachmentTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  attachmentTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 15 },
  detailRow: { marginTop: 7, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  detailLabel: { flex: 0.9, fontFamily: jakarta.bold, color: colors.muted, fontSize: 11, lineHeight: 16 },
  detailValue: { flex: 1, textAlign: "right", fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 11, lineHeight: 16 },
  actionMeta: { marginTop: 8, fontFamily: jakarta.bold, color: colors.muted, fontSize: 11, lineHeight: 16 },
  viewAttachment: { marginTop: 5, fontFamily: jakarta.extraBold, color: colors.blue, fontSize: 11 },
  selectedFile: { marginTop: 5, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 11 },
  remarkText: { marginTop: 5, fontFamily: jakarta.bold, color: "#a97900", fontSize: 11, lineHeight: 16 },
  requiredBadge: { overflow: "hidden", borderRadius: 999, backgroundColor: "#e4f6ef", paddingHorizontal: 9, paddingVertical: 3, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 9 },
  attachmentActions: { marginTop: 13, flexDirection: "row", gap: 10 },
  viewButton: { width: 68, height: 42, borderRadius: 14, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  viewButtonText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13 },
  cameraButton: { flex: 1, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  cameraText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13 },
  galleryButton: { flex: 1, height: 42, borderRadius: 14, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  galleryText: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 13 },
  pickerButtonDisabled: { opacity: 0.62 },
  submitWrap: { marginTop: 24, borderRadius: 18, overflow: "hidden" },
  submitButton: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  submitText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 14, letterSpacing: 2.2 }
});
