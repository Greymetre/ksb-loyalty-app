import { apiClient } from "@/services/apiClient";

export type KycDocKey = "gst" | "pan" | "aadhar" | "bank";

export type KycFile = {
  uri: string;
  name: string;
  type?: string;
};

export type KycDocumentDetail = {
  key: string;
  label: string;
  value: string;
};

export type KycDocument = {
  key: KycDocKey;
  title: string;
  numberLabel: string;
  number: string;
  details: KycDocumentDetail[];
  attachmentUrl?: string;
  attachmentName?: string;
  status: string;
  statusLabel: string;
  remark?: string;
  actionBy?: string;
  actionAt?: string;
};

export type KycSummary = {
  uploaded: number;
  approved: number;
  status: string;
  statusLabel: string;
};

export type KycDetails = {
  customerId?: number;
  summary: KycSummary;
  gstNumber: string;
  panNumber: string;
  aadharNo: string;
  bankAccountType: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  documents: KycDocument[];
};

export type KycUpdatePayload = KycDetails & {
  files?: Partial<Record<KycDocKey, KycFile>>;
};

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

const sourceOf = (raw: any) => raw?.data?.kyc || raw?.data || raw?.kyc || raw || {};

const statusLabel = (value: any) => {
  const status = String(value || "pending").toLowerCase();
  if (status.includes("approve") || status === "verified") return "Approved";
  if (status.includes("reject")) return "Rejected";
  if (status.includes("hold")) return "Hold";
  return "Pending";
};

const fileName = (url?: string) => {
  if (!url) return "";
  return url.split("?")[0].split("/").pop() || "Attachment";
};

const absoluteUrl = (url?: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = String(apiClient.defaults.baseURL || "").replace(/\/api\/?$/i, "");
  if (!apiBase) return url;
  return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

const detailValue = (raw: any, key: string) => {
  const match = Array.isArray(raw?.details) ? raw.details.find((item: any) => item?.key === key) : null;
  return match?.value;
};

const detailLabel = (raw: any, key: string, fallback: string) => {
  const match = Array.isArray(raw?.details) ? raw.details.find((item: any) => item?.key === key) : null;
  return match?.label || fallback;
};

const normalizeDetails = (raw: any): KycDocumentDetail[] => {
  if (!Array.isArray(raw?.details)) return [];
  return raw.details
    .filter((item: any) => item?.key || item?.label)
    .map((item: any) => ({
      key: String(item?.key || item?.label || ""),
      label: String(item?.label || item?.key || ""),
      value: String(item?.value ?? "")
    }));
};

const normalizeDoc = (key: KycDocKey, raw: any, fallbackNumber = ""): KycDocument => {
  const titles: Record<KycDocKey, string> = { gst: "GST Certificate", pan: "PAN Card", aadhar: "Aadhaar Card", bank: "Bank Proof" };
  const labels: Record<KycDocKey, string> = { gst: "GST Number", pan: "PAN Number", aadhar: "Aadhaar Number", bank: "Account Number" };
  const detailKeys: Record<KycDocKey, string> = { gst: "gst_number", pan: "pan_number", aadhar: "aadhar_no", bank: "bank_account_number" };
  const attachmentUrl = absoluteUrl(raw?.attachment_url ?? raw?.attachmentUrl ?? raw?.file_url ?? raw?.fileUrl ?? raw?.url ?? raw?.attachment);
  const status = String(raw?.status ?? raw?.verification_status ?? raw?.verificationStatus ?? "pending");
  return {
    key,
    title: raw?.label || titles[key],
    numberLabel: detailLabel(raw, detailKeys[key], labels[key]),
    number: String(detailValue(raw, detailKeys[key]) ?? raw?.number ?? raw?.value ?? raw?.document_number ?? raw?.documentNumber ?? fallbackNumber ?? ""),
    details: normalizeDetails(raw),
    attachmentUrl,
    attachmentName: raw?.attachment_name ?? raw?.attachmentName ?? fileName(attachmentUrl),
    status,
    statusLabel: raw?.status_label ?? raw?.statusLabel ?? statusLabel(status),
    remark: raw?.remark ?? raw?.remarks ?? raw?.rejection_reason ?? raw?.rejectionReason,
    actionBy: raw?.action_by ?? raw?.actionBy,
    actionAt: raw?.action_at ?? raw?.actionAt
  };
};

const findDoc = (docs: any, key: KycDocKey) => {
  if (Array.isArray(docs)) return docs.find((doc: any) => doc?.key === key) || {};
  return docs?.[key] || {};
};

const normalizeKyc = (raw: any): KycDetails => {
  const source = sourceOf(raw);
  const docs = source.documents || source.docs || {};
  const fields = source.fields || {};
  const gstDoc = findDoc(docs, "gst");
  const panDoc = findDoc(docs, "pan");
  const aadharDoc = findDoc(docs, "aadhar");
  const bankDoc = findDoc(docs, "bank");
  const bank = source.bank_account || source.bank || source.bank_details || source.bankDetails || bankDoc || {};
  const summary = source.summary || {};
  const gstNumber = String(fields.gst_number ?? source.gst_number ?? source.gstNumber ?? detailValue(gstDoc, "gst_number") ?? "");
  const panNumber = String(fields.pan_number ?? source.pan_number ?? source.panNumber ?? detailValue(panDoc, "pan_number") ?? "");
  const aadharNo = String(fields.aadhar_no ?? source.aadhar_no ?? source.aadharNo ?? source.aadhaar_no ?? source.aadhaarNo ?? detailValue(aadharDoc, "aadhar_no") ?? "");
  const bankAccountNumber = String(
    fields.bank_account_number ??
      source.bank_account_number ??
      source.bankAccountNumber ??
      bank.account_number ??
      bank.accountNumber ??
      detailValue(bankDoc, "bank_account_number") ??
      ""
  );
  return {
    ...emptyKyc,
    customerId: Number(source.customer_id ?? source.customerId) || undefined,
    summary: {
      uploaded: Number(summary.uploaded ?? 0),
      approved: Number(summary.approved ?? 0),
      status: String(summary.status ?? "pending"),
      statusLabel: statusLabel(summary.status)
    },
    gstNumber,
    panNumber,
    aadharNo,
    bankAccountType: String(fields.bank_account_type ?? source.bank_account_type ?? source.bankAccountType ?? bank.account_type ?? bank.accountType ?? detailValue(bankDoc, "bank_account_type") ?? ""),
    bankName: String(fields.bank_name ?? source.bank_name ?? source.bankName ?? bank.bank_name ?? bank.bankName ?? detailValue(bankDoc, "bank_name") ?? ""),
    bankAccountNumber,
    ifscCode: String(fields.ifsc_code ?? source.ifsc_code ?? source.ifscCode ?? bank.ifsc_code ?? bank.ifscCode ?? detailValue(bankDoc, "ifsc_code") ?? ""),
    accountHolderName: String(
      fields.account_holder_name ??
        source.account_holder_name ??
        source.accountHolderName ??
        bank.account_holder_name ??
        bank.accountHolderName ??
        detailValue(bankDoc, "account_holder_name") ??
        ""
    ),
    documents: [
      normalizeDoc("gst", gstDoc || source.gst || source.gst_document, gstNumber),
      normalizeDoc("pan", panDoc || source.pan || source.pan_document, panNumber),
      normalizeDoc("aadhar", aadharDoc || source.aadhar || source.aadhaar || source.aadhar_document, aadharNo),
      normalizeDoc("bank", bankDoc || source.bank_proof || source.bankProof || bank, bankAccountNumber)
    ]
  };
};

const appendFile = (form: FormData, key: string, file?: KycFile) => {
  if (!file?.uri) return;
  form.append(key, {
    uri: file.uri,
    name: file.name,
    type: file.type || "image/jpeg"
  } as any);
};

// A dealer opens the very same KYC screen for a retailer assigned to it. Only the
// path changes - payload and response are identical, so both logins share one
// implementation instead of drifting apart.
const kycPath = (retailerId?: number) => (retailerId ? `/dealer/retailers/${retailerId}/kyc` : "/retailer/kyc");

export const kycApi = {
  async get(retailerId?: number) {
    const { data } = await apiClient.get(kycPath(retailerId));
    return normalizeKyc(data);
  },
  async update(payload: KycUpdatePayload, retailerId?: number) {
    const form = new FormData();
    form.append("gst_number", payload.gstNumber);
    form.append("pan_number", payload.panNumber);
    form.append("aadhar_no", payload.aadharNo);
    form.append("bank_account_type", payload.bankAccountType);
    form.append("bank_name", payload.bankName);
    form.append("bank_account_number", payload.bankAccountNumber);
    form.append("ifsc_code", payload.ifscCode);
    form.append("account_holder_name", payload.accountHolderName);
    appendFile(form, "gst_attachment", payload.files?.gst);
    appendFile(form, "pan_attachment", payload.files?.pan);
    appendFile(form, "aadhar_attachment", payload.files?.aadhar);
    appendFile(form, "bank_proof", payload.files?.bank);

    const { data } = await apiClient.put(kycPath(retailerId), form, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return normalizeKyc(data);
  }
};
