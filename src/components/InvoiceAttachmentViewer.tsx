import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { colors } from "../constants/colors";
import { jakarta } from "../styles/appStyles";

/**
 * The PDF viewer is a native module. On a binary built before it was added it is
 * missing, and importing it at module scope takes the whole app down, so it is
 * loaded defensively and the popup falls back to the download card without it.
 */
const PdfView: React.ComponentType<any> | null = (() => {
  try {
    return require("react-native-pdf").default;
  } catch {
    return null;
  }
})();

const fileNameFrom = (uri: string) => {
  const withoutQuery = uri.split("?")[0];
  const name = withoutQuery.substring(withoutQuery.lastIndexOf("/") + 1);
  return name || "invoice-attachment";
};

const isPdf = (uri: string) => /\.pdf$/i.test(uri.split("?")[0]);

const mimeTypeFor = (name: string) => {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.(heic|heif)$/i.test(name)) return "image/heic";
  return "image/jpeg";
};

/**
 * Shows an invoice attachment inside the app and lets the customer keep a copy.
 * The download saves through the platform's own picker, so the file lands
 * somewhere the customer chose rather than in the app's private storage.
 */
export default function InvoiceAttachmentViewer({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);

  const fileName = useMemo(() => (uri ? fileNameFrom(uri) : ""), [uri]);
  const pdf = Boolean(uri && isPdf(uri));

  const download = async () => {
    if (!uri || saving) return;
    setSaving(true);
    setMessage(null);

    // Fetching and then keeping the file are reported separately, so a share sheet
    // the customer dismissed never reads as a failed download.
    let localUri: string;
    try {
      const target = `${FileSystem.documentDirectory}${fileName}`;
      const result = await FileSystem.downloadAsync(uri, target);
      if (result.status !== 200) throw new Error(`Server returned ${result.status}`);
      localUri = result.uri;
    } catch (error) {
      setMessage(`Download failed: ${(error as Error)?.message ?? "please try again"}`);
      setSaving(false);
      return;
    }

    try {
      if (Platform.OS === "android") {
        const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted) {
          setMessage("Downloaded. Choose a folder to keep a copy.");
          return;
        }

        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const saved = await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          fileName,
          mimeTypeFor(fileName),
        );
        await FileSystem.writeAsStringAsync(saved, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setMessage("Saved to the selected folder.");
        return;
      }

      // iOS presents its own sheet over the app, with Save to Files and Photos.
      await Share.share({ url: localUri });
      setMessage("Downloaded.");
    } catch (error) {
      setMessage(`Downloaded, but saving failed: ${(error as Error)?.message ?? "please try again"}`);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    setMessage(null);
    setPdfFailed(false);
    onClose();
  };

  return (
    <Modal visible={Boolean(uri)} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={close} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Invoice attachment</Text>
            <Pressable accessibilityLabel="Close attachment" onPress={close} style={styles.closeIcon}>
              <Text style={styles.closeIconText}>×</Text>
            </Pressable>
          </View>

          {uri && !pdf ? <Image source={{ uri }} resizeMode="contain" style={styles.image} /> : null}

          {uri && pdf && PdfView && !pdfFailed ? (
            <PdfView
              source={{ uri, cache: true }}
              style={styles.image}
              trustAllCerts={false}
              onError={() => setPdfFailed(true)}
            />
          ) : null}

          {uri && pdf && (!PdfView || pdfFailed) ? (
            <View style={[styles.image, styles.pdfCard]}>
              <Text style={styles.pdfBadge}>PDF</Text>
              <Text style={styles.pdfName} numberOfLines={2}>
                {fileName}
              </Text>
              <Text style={styles.pdfHint}>Preview is not available. Download the file to open it.</Text>
            </View>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable style={styles.downloadButton} onPress={download} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.downloadText}>Download</Text>
            )}
          </Pressable>

          <Pressable style={styles.closeButton} onPress={close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 15, 31, .82)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  dismissArea: StyleSheet.absoluteFillObject,
  card: {
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 15,
    maxHeight: "88%",
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 5,
    marginBottom: 10,
  },
  title: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 17 },
  closeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#edf3fb",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconText: { color: colors.navy, fontSize: 28, lineHeight: 30 },
  image: { width: "100%", height: 480, maxHeight: "72%", borderRadius: 16, backgroundColor: "#f3f6fa" },
  pdfCard: { height: 220, alignItems: "center", justifyContent: "center", gap: 7 },
  pdfBadge: {
    fontFamily: jakarta.extraBold,
    color: colors.primary,
    fontSize: 22,
    letterSpacing: 2,
  },
  pdfName: { fontFamily: jakarta.bold, color: colors.navy, fontSize: 13, paddingHorizontal: 20, textAlign: "center" },
  pdfHint: { fontFamily: jakarta.medium, color: "#8490a1", fontSize: 11 },
  message: { fontFamily: jakarta.medium, color: "#64748b", fontSize: 12, marginTop: 11, textAlign: "center" },
  downloadButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  downloadText: {
    fontFamily: jakarta.extraBold,
    color: "#fff",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  closeButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: "#edf3fb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },
  closeText: {
    fontFamily: jakarta.extraBold,
    color: colors.primary,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
