import { apiClient, apiFileUrl } from "@/services/apiClient";

/** A document the office shared with the VRiDDHi app (Setting Management > App Document
 *  Settings in the CRM, ticked for VRiDDHi). Always a PDF. */
export type AppDocument = {
  id: number;
  name: string;
  fileName: string;
  fileSize: number | null;
  url: string;
  updatedAt: string | null;
};

const toDocument = (row: any): AppDocument => ({
  id: Number(row?.id ?? 0),
  name: String(row?.document_name ?? row?.documentName ?? "").trim() || "Document",
  fileName: String(row?.file_name ?? row?.fileName ?? "").trim(),
  fileSize: row?.file_size == null ? null : Number(row.file_size),
  url: apiFileUrl(row?.file_url ?? row?.fileUrl ?? row?.file_path ?? row?.filePath ?? ""),
  updatedAt: row?.updated_at ?? row?.updatedAt ?? null
});

export const appDocumentApi = {
  async list(): Promise<AppDocument[]> {
    const { data } = await apiClient.get("/retailer/app-documents");
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map(toDocument).filter((doc: AppDocument) => doc.url);
  }
};
