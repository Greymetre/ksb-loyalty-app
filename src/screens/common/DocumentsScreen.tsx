import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
// The legacy API is the one InvoiceAttachmentViewer already downloads with on the store build.
import * as FileSystem from "expo-file-system/legacy";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors, gradients } from "@/constants/colors";
import { AppDocument, appDocumentApi } from "@/services/appDocumentApi";
import { showToast } from "@/services/toast";
import { jakarta } from "@/styles/appStyles";

/** Native module, loaded defensively like the invoice viewer: a binary without it falls back
 *  to handing the file to the system instead of crashing. */
const PdfView: React.ComponentType<any> | null = (() => {
  try {
    return require("react-native-pdf").default;
  } catch {
    return null;
  }
})();

/** Used only for Android 10+'s Downloads folder, which expo-file-system cannot reach. */
const BlobUtil: any = (() => {
  try {
    return require("react-native-blob-util").default;
  } catch {
    return null;
  }
})();

const PDF_RED = "#D93A3A";

const sizeText = (bytes: number | null) => {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const dateText = (value: string | null) => {
  if (!value) return "";
  const text = String(value);
  // The API sends UTC without a zone marker.
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const errorText = (error: unknown) => {
  const message = (error as any)?.response?.data?.message ?? (error as Error)?.message ?? error;
  const text = message == null ? "" : String(message).trim();
  return text || "Please try again.";
};

/** A file name that is safe on disk and still tells the person what it is. */
const saveNameFor = (doc: AppDocument) =>
  `${doc.name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Document"}.pdf`;

const fetchToCache = async (doc: AppDocument): Promise<string> => {
  const target = `${FileSystem.cacheDirectory}app-document-${doc.id}-${doc.url.length}.pdf`;
  const existing = await FileSystem.getInfoAsync(target);
  if (existing.exists && (existing.size ?? 0) > 0) return target;
  const result = await FileSystem.downloadAsync(doc.url, target);
  if (result.status !== 200) throw new Error(`Server returned ${result.status}`);
  return result.uri;
};

/** Android 10+: straight into Downloads through MediaStore - no permission, no picker.
 *  Older Android: the folder picker the invoice viewer uses. iOS: the share sheet, which
 *  has Save to Files. Returns what to tell the person, or null when they backed out. */
const saveToDevice = async (doc: AppDocument): Promise<string | null> => {
  const cached = await fetchToCache(doc);
  const fileName = saveNameFor(doc);

  if (Platform.OS === "android") {
    if (Number(Platform.Version) >= 29 && BlobUtil?.MediaCollection) {
      await BlobUtil.MediaCollection.copyToMediaStore(
        { name: fileName, parentFolder: "", mimeType: "application/pdf" },
        "Download",
        cached.replace(/^file:\/\//, "")
      );
      return "Saved to Downloads.";
    }
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) return null;
    const base64 = await FileSystem.readAsStringAsync(cached, { encoding: FileSystem.EncodingType.Base64 });
    const saved = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, fileName, "application/pdf");
    await FileSystem.writeAsStringAsync(saved, base64, { encoding: FileSystem.EncodingType.Base64 });
    return "Saved to the selected folder.";
  }

  // A copy under the document's own name, so Save to Files keeps a readable name.
  const named = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.deleteAsync(named, { idempotent: true });
  await FileSystem.copyAsync({ from: cached, to: named });
  const result = await Share.share({ url: named, title: doc.name });
  return result.action === Share.dismissedAction ? null : "Document ready.";
};

export default function DocumentsScreen({ onBack }: { onBack: () => void }) {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<number[]>([]);
  const [viewing, setViewing] = useState<AppDocument | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setDocuments(await appDocumentApi.list());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(doc => doc.name.toLowerCase().includes(term) || doc.fileName.toLowerCase().includes(term));
  }, [documents, search]);

  /** Returns the message so the viewer can show it inside its own modal, where the app's
   *  toast would be hidden on iOS. */
  const download = async (doc: AppDocument, fromViewer = false): Promise<string | null> => {
    if (downloadingId) return null;
    setDownloadingId(doc.id);
    try {
      const message = await saveToDevice(doc);
      if (message) {
        setDownloadedIds(ids => (ids.includes(doc.id) ? ids : [...ids, doc.id]));
        if (!fromViewer) showToast(message, "success");
      }
      return message;
    } catch (e) {
      const message = `Download failed: ${errorText(e)}`;
      if (!fromViewer) showToast(message, "error");
      return message;
    } finally {
      setDownloadingId(null);
    }
  };

  const header = (
    <View>
      <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={local.hero}>
        <View style={local.heroRingOuter} />
        <View style={local.heroRingInner} />
        <View style={local.heroTop}>
          <Pressable onPress={onBack} style={local.backBtn} hitSlop={8}><Text style={local.backText}>←</Text></Pressable>
          <Text style={local.heroEyebrow}>DOCUMENTS</Text>
        </View>
        <View style={local.heroBody}>
          <View style={local.heroIcon}><FolderIcon color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={local.heroTitle}>Your documents</Text>
            <Text style={local.heroSub}>
              {loading ? "Loading..." : `${documents.length} ${documents.length === 1 ? "document" : "documents"} from KSB`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {documents.length > 0 ? (
        <View style={local.searchBox}>
          <SearchIcon />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search documents"
            placeholderTextColor="#98a2b3"
            style={local.searchInput}
            returnKeyType="search"
          />
          {search ? <Pressable hitSlop={10} onPress={() => setSearch("")}><Text style={local.clear}>×</Text></Pressable> : null}
        </View>
      ) : null}
    </View>
  );

  const empty = loading ? (
    <View style={local.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={local.centerHint}>Loading documents...</Text>
    </View>
  ) : error ? (
    <View style={local.center}>
      <View style={local.emptyIcon}><Text style={{ fontSize: 26 }}>⚠️</Text></View>
      <Text style={local.emptyTitle}>Couldn't load documents</Text>
      <Text style={local.emptyText}>{error}</Text>
      <Pressable style={local.retry} onPress={() => load()}><Text style={local.retryText}>Try again</Text></Pressable>
    </View>
  ) : (
    <View style={local.center}>
      <View style={local.emptyIcon}><FolderIcon color={colors.primary} /></View>
      <Text style={local.emptyTitle}>{search ? "No matching documents" : "No documents yet"}</Text>
      <Text style={local.emptyText}>{search ? "Try a different name." : "Documents shared by KSB will appear here."}</Text>
    </View>
  );

  return (
    <SafeAreaView style={local.safe} edges={["top"]}>
      <FlatList
        data={shown}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={local.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={({ item }) => {
          const busy = downloadingId === item.id;
          const done = downloadedIds.includes(item.id);
          const meta = ["PDF", sizeText(item.fileSize), dateText(item.updatedAt) && `Updated ${dateText(item.updatedAt)}`].filter(Boolean).join("  ·  ");
          return (
            <Pressable style={({ pressed }) => [local.card, pressed && local.pressed]} onPress={() => setViewing(item)}>
              <View style={local.cardTop}>
                <View style={local.pdfTile}><PdfFileIcon /></View>
                <View style={{ flex: 1 }}>
                  <Text style={local.cardTitle} numberOfLines={2}>{item.name}</Text>
                  <Text style={local.cardMeta} numberOfLines={1}>{meta}</Text>
                </View>
              </View>
              <View style={local.actions}>
                <Pressable style={({ pressed }) => [local.actionBtn, local.viewBtn, pressed && local.pressed]} onPress={() => setViewing(item)}>
                  <EyeIcon />
                  <Text style={local.viewText}>View</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [local.actionBtn, done ? local.doneBtn : local.downloadBtn, pressed && local.pressed]}
                  onPress={() => download(item)}
                  disabled={busy}
                >
                  {busy ? <ActivityIndicator size="small" color="#fff" /> : done ? <CheckIcon /> : <DownloadIcon />}
                  <Text style={local.downloadText}>{busy ? "Downloading..." : done ? "Downloaded" : "Download"}</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      <DocumentViewer
        document={viewing}
        downloading={viewing ? downloadingId === viewing.id : false}
        onDownload={() => (viewing ? download(viewing, true) : Promise.resolve(null))}
        onClose={() => setViewing(null)}
      />
    </SafeAreaView>
  );
}

function DocumentViewer({ document, downloading, onDownload, onClose }: {
  document: AppDocument | null;
  downloading: boolean;
  onDownload: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [path, setPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!document) return;
    let alive = true;
    setPath(null);
    setError(null);
    setNotice(null);
    setPage(1);
    setPages(0);
    fetchToCache(document)
      .then(local => { if (alive) setPath(local); })
      .catch(e => { if (alive) setError(errorText(e)); });
    return () => { alive = false; };
  }, [document]);

  const download = async () => {
    const message = await onDownload();
    if (message) {
      setNotice(message);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  return (
    <Modal visible={!!document} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" statusBarTranslucent>
      {/* A Modal is its own native window: without a provider of its own the safe-area
          insets read 0 there, and the bar slid under the status bar where iOS swallows
          the taps - the close button did nothing. */}
      <SafeAreaProvider>
      <View style={local.viewer}>
        <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View style={local.viewerBar}>
            <Pressable hitSlop={12} style={local.viewerBtn} onPress={onClose}><Text style={local.viewerClose}>×</Text></Pressable>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={local.viewerTitle} numberOfLines={1}>{document?.name}</Text>
              {pages > 0 ? <Text style={local.viewerPages}>Page {page} of {pages}</Text> : null}
            </View>
            <Pressable hitSlop={12} style={local.viewerBtn} onPress={download} disabled={downloading || !path}>
              {downloading ? <ActivityIndicator size="small" color="#fff" /> : <DownloadIcon />}
            </Pressable>
          </View>

          <View style={local.viewerBody}>
            {error ? (
              <View style={local.center}>
                <Text style={local.emptyTitle}>Couldn't open the document</Text>
                <Text style={local.emptyText}>{error}</Text>
              </View>
            ) : !path ? (
              <View style={local.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={local.centerHint}>Opening document...</Text>
              </View>
            ) : PdfView ? (
              <PdfView
                source={{ uri: path, cache: false }}
                style={local.pdf}
                trustAllCerts={false}
                onLoadComplete={(count: number) => setPages(count)}
                onPageChanged={(current: number, count: number) => { setPage(current); setPages(count); }}
                onError={(e: unknown) => setError(errorText(e))}
              />
            ) : (
              <View style={local.center}>
                <Text style={local.emptyText}>The in-app viewer is not available in this version. Use Download to open it.</Text>
              </View>
            )}
            {notice ? <View style={local.notice}><Text style={local.noticeText}>{notice}</Text></View> : null}
          </View>
        </SafeAreaView>
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const FolderIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2h7.4A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M8 13h8M8 16h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const PdfFileIcon = () => (
  <Svg width={30} height={34} viewBox="0 0 30 34" fill="none">
    <Path d="M4 3a3 3 0 0 1 3-3h13l8 8v23a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V3Z" fill="#FFFFFF" />
    <Path d="M20 0l8 8h-5a3 3 0 0 1-3-3V0Z" fill="#F7B5B5" />
    <Rect x={0} y={15} width={22} height={11} rx={2.5} fill={PDF_RED} />
    <Path d="M3.6 23.4v-5.8h2.1c1.3 0 2 .7 2 1.8s-.7 1.8-2 1.8h-1v2.2H3.6Zm1.1-3.1h.9c.6 0 .9-.3.9-.9s-.3-.9-.9-.9h-.9v1.8Zm4 3.1v-5.8h1.9c1.8 0 2.8 1.1 2.8 2.9s-1 2.9-2.8 2.9H8.7Zm1.1-1h.8c1.1 0 1.7-.7 1.7-1.9s-.6-1.9-1.7-1.9h-.8v3.8Zm4.2 1v-5.8h3.6v1h-2.5v1.4h2.3v1h-2.3v2.4H14Z" fill="#FFFFFF" />
  </Svg>
);

const EyeIcon = () => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" stroke={colors.primary} strokeWidth={2} strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={3} stroke={colors.primary} strokeWidth={2} />
  </Svg>
);

const DownloadIcon = () => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M4 19.5h16" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Path d="m5 12.5 4.5 4.5L19 7.5" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SearchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={6.5} stroke="#98a2b3" strokeWidth={2} />
    <Path d="m16 16 4 4" stroke="#98a2b3" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const local = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, flexGrow: 1 },
  hero: { borderRadius: 22, padding: 18, overflow: "hidden", marginBottom: 14 },
  heroRingOuter: { position: "absolute", right: -60, top: -70, width: 200, height: 200, borderRadius: 100, borderWidth: 28, borderColor: "rgba(255,255,255,.07)" },
  heroRingInner: { position: "absolute", right: 30, bottom: -60, width: 110, height: 110, borderRadius: 55, borderWidth: 16, borderColor: "rgba(255,255,255,.06)" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  backText: { color: "#fff", fontSize: 20, fontFamily: jakarta.bold, marginTop: -2 },
  heroEyebrow: { color: "#fff", fontFamily: jakarta.extraBold, fontSize: 13, letterSpacing: 1.4 },
  heroBody: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontFamily: jakarta.extraBold, fontSize: 21 },
  heroSub: { color: "rgba(255,255,255,.88)", fontFamily: jakarta.medium, fontSize: 13, marginTop: 3 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", marginBottom: 14 },
  searchInput: { flex: 1, fontFamily: jakarta.medium, fontSize: 14, color: colors.text, paddingVertical: 0 },
  clear: { color: "#98a2b3", fontSize: 20 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#eee4d2", shadowColor: "#3b2a0a", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  pressed: { opacity: 0.88 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  pdfTile: { width: 54, height: 58, borderRadius: 14, backgroundColor: "#fdecec", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: jakarta.bold, fontSize: 15, color: colors.navy },
  cardMeta: { fontFamily: jakarta.medium, fontSize: 12, color: colors.muted, marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, height: 42, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  viewBtn: { borderWidth: 1.2, borderColor: "#ead9b8", backgroundColor: colors.successSoft },
  viewText: { fontFamily: jakarta.bold, fontSize: 13, color: colors.primary },
  downloadBtn: { backgroundColor: colors.primary },
  doneBtn: { backgroundColor: "#15803d" },
  downloadText: { fontFamily: jakarta.bold, fontSize: 13, color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 28 },
  centerHint: { fontFamily: jakarta.semiBold, fontSize: 14, color: colors.primary, marginTop: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontFamily: jakarta.bold, fontSize: 16, color: colors.navy, textAlign: "center" },
  emptyText: { fontFamily: jakarta.medium, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 6 },
  retry: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11 },
  retryText: { fontFamily: jakarta.bold, fontSize: 14, color: "#fff" },
  viewer: { flex: 1 },
  viewerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  viewerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  viewerClose: { color: "#fff", fontSize: 26, lineHeight: 28 },
  viewerTitle: { fontFamily: jakarta.bold, fontSize: 16, color: "#fff" },
  viewerPages: { fontFamily: jakarta.medium, fontSize: 12, color: "rgba(255,255,255,.85)" },
  viewerBody: { flex: 1, backgroundColor: "#eef0f3" },
  pdf: { flex: 1, backgroundColor: "#eef0f3" },
  notice: { position: "absolute", left: 16, right: 16, bottom: 20, backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  noticeText: { fontFamily: jakarta.semiBold, fontSize: 13, color: "#fff", textAlign: "center" }
});
