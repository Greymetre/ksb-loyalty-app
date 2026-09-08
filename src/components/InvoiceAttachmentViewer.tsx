import React, { useCallback, useEffect, useMemo, useState } from "react";
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
// expo-file-system 19 (SDK 54) replaced this API. The old one still ships, at
// /legacy - kept as is because this screen only writes a downloaded file to disk
// and hands it to the OS, which the legacy calls already do correctly.
import * as FileSystem from "expo-file-system/legacy";
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

const isRemote = (uri: string) => /^https?:\/\//i.test(uri);

const mimeTypeFor = (name: string) => {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.(heic|heif)$/i.test(name)) return "image/heic";
  return "image/jpeg";
};

// A cache name that cannot collide with another attachment, and cannot carry a
// stray character from the server's own file name into a filesystem path.
const cacheNameFor = (uri: string) => {
  let hash = 5381;
  for (let index = 0; index < uri.length; index += 1) hash = ((hash * 33) ^ uri.charCodeAt(index)) >>> 0;
  return `attachment-${hash.toString(16)}.pdf`;
};

const errorText = (error: unknown) => {
  const message = (error as Error)?.message ?? error;
  const text = message == null ? "" : String(message).trim();
  return text || "please try again";
};

/**
 * Shows an attachment inside the app and lets the customer keep a copy.
 *
 * A remote PDF is fetched to the cache first and the viewer is pointed at that
 * local file. react-native-pdf can fetch a URL itself, but it does so through
 * react-native-blob-util's own HTTP stack, and on the store build that fetch is
 * what fails - the very same file downloads fine through the call below. Handing
 * the viewer a file it only has to render keeps the network out of it entirely,
 * and anything that does still go wrong is now named on screen instead of hiding
 * behind "preview is not available".
 */
export default function InvoiceAttachmentViewer({
  uri,
  title = "Invoice attachment",
  onClose,
}: {
  uri: string | null;
  title?: string;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fileName = useMemo(() => (uri ? fileNameFrom(uri) : ""), [uri]);
  const pdf = Boolean(uri && isPdf(uri));

  // Fetch the PDF once per attachment. Images are left to <Image>, which loads
  // remote URLs perfectly well on both platforms.
  useEffect(() => {
    if (!uri || !pdf || !PdfView) return;
    if (!isRemote(uri)) {
      setLocalPath(uri);
      return;
    }

    let alive = true;
    setPreparing(true);
    setPdfError(null);
    setLocalPath(null);

    (async () => {
      try {
        const target = `${FileSystem.cacheDirectory}${cacheNameFor(uri)}`;
        const existing = await FileSystem.getInfoAsync(target);
        if (existing.exists && (existing.size ?? 0) > 0) {
          if (alive) setLocalPath(target);
          return;
        }
        const result = await FileSystem.downloadAsync(uri, target);
        if (result.status !== 200) throw new Error(`Server returned ${result.status}`);
        if (alive) setLocalPath(result.uri);
      } catch (error) {
        if (alive) setPdfError(errorText(error));
      } finally {
        if (alive) setPreparing(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [uri, pdf]);

  const download = useCallback(async () => {
    if (!uri || saving) return;
    setSaving(true);
    setMessage(null);

    // Fetching and then keeping the file are reported separately, so a share sheet
    // the customer dismissed never reads as a failed download.
    let downloadedUri: string;
    try {
      const target = `${FileSystem.documentDirectory}${fileName}`;
      const result = await FileSystem.downloadAsync(uri, target);
      if (result.status !== 200) throw new Error(`Server returned ${result.status}`);
      downloadedUri = result.uri;
    } catch (error) {
      setMessage(`Download failed: ${errorText(error)}`);
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

        const base64 = await FileSystem.readAsStringAsync(downloadedUri, {
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
      await Share.share({ url: downloadedUri });
      setMessage("Downloaded.");
    } catch (error) {
      setMessage(`Downloaded, but saving failed: ${errorText(error)}`);
    } finally {
      setSaving(false);
    }
  }, [uri, saving, fileName]);

  const close = () => {
    setMessage(null);
    setPdfError(null);
    setLocalPath(null);
    onClose();
  };

  const showViewer = Boolean(uri && pdf && PdfView && localPath && !pdfError);
  const showSpinner = Boolean(uri && pdf && PdfView && preparing && !pdfError);
  const showPdfCard = Boolean(uri && pdf && !showViewer && !showSpinner);

  return (
    <Modal visible={Boolean(uri)} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={close} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Pressable accessibilityLabel="Close attachment" onPress={close} style={styles.closeIcon}>
              <Text style={styles.closeIconText}>×</Text>
            </Pressable>
          </View>

          {uri && !pdf ? <Image source={{ uri }} resizeMode="contain" style={styles.image} /> : null}

          {showSpinner ? (
            <View style={[styles.image, styles.pdfCard]}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.pdfHint}>Opening document…</Text>
            </View>
          ) : null}

          {showViewer && PdfView ? (
            <PdfView
              source={{ uri: localPath as string, cache: false }}
              style={styles.image}
              // The file is already on the device, so nothing here reaches the
              // network and a certificate setting would have nothing to check.
              onError={(error: unknown) => setPdfError(errorText(error))}
            />
          ) : null}

          {showPdfCard ? (
            <View style={[styles.image, styles.pdfCard]}>
              <Text style={styles.pdfBadge}>PDF</Text>
              <Text style={styles.pdfName} numberOfLines={2}>
                {fileName}
              </Text>
              <Text style={styles.pdfHint}>
                {!PdfView
                  ? "This version of the app cannot preview PDFs. Download the file to open it."
                  : pdfError
                    ? `Preview failed: ${pdfError}`
                    : "Preview is not available. Download the file to open it."}
              </Text>
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
  title: { flex: 1, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 17 },
  closeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#edf3fb",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconText: { color: colors.navy, fontSize: 28, lineHeight: 30 },
  image: { width: "100%", height: 480, borderRadius: 16, backgroundColor: "#f3f6fa" },
  pdfCard: { height: 220, alignItems: "center", justifyContent: "center", gap: 9 },
  pdfBadge: {
    fontFamily: jakarta.extraBold,
    color: colors.primary,
    fontSize: 22,
    letterSpacing: 2,
  },
  pdfName: { fontFamily: jakarta.bold, color: colors.navy, fontSize: 13, paddingHorizontal: 20, textAlign: "center" },
  pdfHint: { fontFamily: jakarta.medium, color: "#8490a1", fontSize: 11, paddingHorizontal: 20, textAlign: "center" },
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
