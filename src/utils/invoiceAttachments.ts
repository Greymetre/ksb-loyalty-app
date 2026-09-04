import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/**
 * Picking and shrinking invoice attachments.
 *
 * The limits mirror Api/Services/InvoiceAttachmentStore.cs. Compressing here rather than
 * on the server means an oversized photo never leaves the phone on a field connection,
 * and the person sees the problem while they can still retake the shot.
 */
export const MAX_INVOICE_ATTACHMENTS = 10;
export const MAX_INVOICE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_INVOICE_PDF_BYTES = 10 * 1024 * 1024;

export type InvoiceAsset = { uri: string; name: string; type: string; size: number };

const megabytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);

export const isPdfAttachment = (file: { type?: string | null; name?: string | null }) =>
  String(file.type || "").toLowerCase() === "application/pdf" || /\.pdf$/i.test(String(file.name || ""));

/** Thrown when a file cannot be brought under the limit; the message is user-facing. */
export class AttachmentTooLargeError extends Error {}

const fileSize = async (uri: string): Promise<number> => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && "size" in info ? (info.size as number) : 0;
  } catch {
    return 0;
  }
};

/**
 * Returns the file unchanged when it already fits, otherwise re-encodes it smaller and
 * smaller until it does. Throws {@link AttachmentTooLargeError} when even the smallest
 * pass is still too big - the API would refuse it anyway.
 */
export async function compressInvoiceAsset(asset: InvoiceAsset): Promise<InvoiceAsset> {
  if (isPdfAttachment(asset)) {
    if (asset.size > MAX_INVOICE_PDF_BYTES) {
      throw new AttachmentTooLargeError(
        `"${asset.name}" is ${megabytes(asset.size)} MB. A PDF must be ${megabytes(MAX_INVOICE_PDF_BYTES)} MB or less.`,
      );
    }
    return asset;
  }

  if (asset.size > 0 && asset.size <= MAX_INVOICE_IMAGE_BYTES) return asset;

  // Step the width and the JPEG quality down together; the first pass that fits wins, so
  // a barely-oversized photo stays close to its original quality.
  for (const [width, compress] of [[2560, 0.8], [2048, 0.7], [1600, 0.6], [1280, 0.5], [1024, 0.4]] as const) {
    try {
      const context = ImageManipulator.ImageManipulator.manipulate(asset.uri).resize({ width });
      const image = await context.renderAsync();
      const result = await image.saveAsync({ compress, format: ImageManipulator.SaveFormat.JPEG });
      const size = await fileSize(result.uri);
      if (size > 0 && size <= MAX_INVOICE_IMAGE_BYTES) {
        return { uri: result.uri, name: asset.name.replace(/\.[^.]+$/, "") + ".jpg", type: "image/jpeg", size };
      }
    } catch {
      // A pass can fail on an odd encoding; the next, smaller one usually succeeds.
    }
  }

  throw new AttachmentTooLargeError(
    `After compression the attachment is greater than ${megabytes(MAX_INVOICE_IMAGE_BYTES)} MB. "${asset.name}" could not be reduced - please attach a smaller file.`,
  );
}

/** Camera, gallery or files - whichever the person chose - as a list of raw assets. */
export async function pickInvoiceAssets(
  source: "camera" | "gallery" | "file",
  limit: number,
): Promise<InvoiceAsset[]> {
  if (source === "file") {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return [];
    return result.assets.slice(0, limit).map((file, index) => ({
      uri: file.uri,
      name: file.name || `invoice-${Date.now()}-${index}`,
      type: file.mimeType || "application/octet-stream",
      size: file.size || 0,
    }));
  }

  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Please allow camera access to continue.");
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.9,
          allowsMultipleSelection: true,
          selectionLimit: limit,
        });

  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((file, index) => ({
    uri: file.uri,
    name: file.fileName || `invoice-${Date.now()}-${index}.jpg`,
    type: file.mimeType || "image/jpeg",
    size: file.fileSize || 0,
  }));
}

/** The three-way source sheet the invoice screen shows. */
export function chooseAttachmentSource(onPick: (source: "camera" | "gallery" | "file") => void) {
  Alert.alert("Add attachment", "Choose a source", [
    { text: "Camera", onPress: () => onPick("camera") },
    { text: "Gallery", onPress: () => onPick("gallery") },
    { text: "Files (PDF)", onPress: () => onPick("file") },
    { text: "Cancel", style: "cancel" },
  ]);
}
