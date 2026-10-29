import React, { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CalendarDatePicker } from "../../components/CalendarDatePicker";
import { colors } from "../../constants/colors";
import { DealerInvoiceAttachment, DealerInvoiceItem, DealerInvoiceItemLine, DealerQuantityPreview, DealerRetailer, DealerScheme, DealerSchemeProduct, dealerInvoiceApi } from "../../services/dealerInvoiceApi";
import {
  AttachmentTooLargeError,
  InvoiceAsset,
  MAX_INVOICE_ATTACHMENTS,
  chooseAttachmentSource,
  compressInvoiceAsset,
  isPdfAttachment,
  pickInvoiceAssets,
} from "../../utils/invoiceAttachments";
import { showToast } from "../../services/toast";
import { jakarta } from "../../styles/appStyles";
import InvoiceAttachmentViewer from "@/components/InvoiceAttachmentViewer";

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export default function DealerNewInvoiceScreen({ onBack, onCreated, invoice: initialInvoice }: { onBack: () => void; onCreated: () => void; invoice?: DealerInvoiceItem | null }) {
  const insets = useSafeAreaInsets();
  const editing = Boolean(initialInvoice);
  const [retailers, setRetailers] = useState<DealerRetailer[]>([]); const [retailer, setRetailer] = useState<DealerRetailer | null>(initialInvoice ? { id: initialInvoice.retailerId, code: initialInvoice.retailerCode, name: initialInvoice.ownerName || initialInvoice.retailerName, ownerName: initialInvoice.ownerName || initialInvoice.retailerName, shopName: initialInvoice.shopName || initialInvoice.retailerName, mobile: initialInvoice.mobile } : null);
  const [schemes, setSchemes] = useState<DealerScheme[]>([]); const [scheme, setScheme] = useState<DealerScheme | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoice?.invoiceNumber || ""); const [invoiceDate, setInvoiceDate] = useState(initialInvoice?.invoiceDate || today()); const [amount, setAmount] = useState(initialInvoice ? String(initialInvoice.amount) : "");
  // Files staged on this screen, plus the ones already saved on an invoice being edited.
  const [assets, setAssets] = useState<InvoiceAsset[]>([]);
  const [saved, setSaved] = useState<DealerInvoiceAttachment[]>(initialInvoice?.attachments || []);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [picker, setPicker] = useState<"retailer" | "scheme" | "product" | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [calendar, setCalendar] = useState(false); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(true);
  // Quantity Slab: the product/quantity/price rows and the live points preview.
  type QRow = { productId: number | null; productName: string; quantity: string; price: string };
  const [schemeProducts, setSchemeProducts] = useState<DealerSchemeProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productPickerRow, setProductPickerRow] = useState<number | null>(null);
  const [preview, setPreview] = useState<DealerQuantityPreview | null>(null);
  const [quantityRows, setQuantityRows] = useState<QRow[]>(
    initialInvoice?.items?.length
      ? initialInvoice.items.map(it => ({ productId: it.productId, productName: it.productName, quantity: String(it.quantity), price: String(it.price) }))
      : [{ productId: null, productName: "", quantity: "", price: "" }],
  );
  const isQuantityScheme = scheme?.schemeType === "Quantity";
  useEffect(() => { dealerInvoiceApi.retailers().then((rows: DealerRetailer[]) => { setRetailers(rows); if (initialInvoice) setRetailer(current => rows.find((x: DealerRetailer) => x.id === initialInvoice.retailerId) || current); }).catch(() => showToast("Unable to load assigned retailers.")).finally(() => setLoading(false)); }, [initialInvoice]);
  useEffect(() => {
    if (picker !== "retailer") return;
    const timer = setTimeout(() => {
      dealerInvoiceApi.retailers(search)
        .then((rows: DealerRetailer[]) => setRetailers(rows))
        .catch(() => showToast("Unable to search retailers."));
    }, 300);
    return () => clearTimeout(timer);
  }, [picker, search]);
  useEffect(() => { setScheme(null); setSchemes([]); if (!retailer || !invoiceDate) return; dealerInvoiceApi.schemes(retailer.id, invoiceDate).then((rows: DealerScheme[]) => { setSchemes(rows); if (initialInvoice?.schemeId) setScheme(rows.find((x: DealerScheme) => x.id === initialInvoice.schemeId) || null); }).catch(() => showToast("Unable to load schemes.")); }, [retailer, invoiceDate, initialInvoice?.schemeId]);
  // A Quantity Slab scheme brings a product/quantity table; load its products and keep a row.
  useEffect(() => {
    if (scheme?.schemeType === "Quantity") {
      setProductsLoading(true);
      dealerInvoiceApi.schemeProducts(scheme.id)
        .then((rows: DealerSchemeProduct[]) => setSchemeProducts(rows))
        .catch(() => showToast("Unable to load products."))
        .finally(() => setProductsLoading(false));
      setQuantityRows(rows => (rows.length ? rows : [{ productId: null, productName: "", quantity: "", price: "" }]));
    } else {
      setSchemeProducts([]); setQuantityRows([{ productId: null, productName: "", quantity: "", price: "" }]); setPreview(null);
    }
  }, [scheme]);
  // Live preview: what the quantities earn, on the product's cumulative period quantity.
  useEffect(() => {
    if (!isQuantityScheme || !scheme || !retailer) { setPreview(null); return; }
    const lines = quantityRows.filter(r => r.productId && Number(r.quantity) > 0).map(r => ({ product_id: r.productId as number, quantity: Number(r.quantity) }));
    if (lines.length === 0) { setPreview(null); return; }
    let active = true;
    const timer = setTimeout(() => {
      dealerInvoiceApi.quantityPoints(scheme.id, retailer.id, invoiceDate, lines, initialInvoice ? Number(initialInvoice.id) : null)
        .then(result => { if (active) setPreview(result); })
        .catch(() => { if (active) setPreview(null); });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [quantityRows, scheme, retailer, invoiceDate]);
  const setRowQty = (i: number, v: string) => setQuantityRows(rows => rows.map((r, idx) => (idx === i ? { ...r, quantity: v.replace(/[^0-9.]/g, "") } : r)));
  const setRowPrice = (i: number, v: string) => setQuantityRows(rows => rows.map((r, idx) => (idx === i ? { ...r, price: v.replace(/[^0-9.]/g, "") } : r)));
  const addRow = () => setQuantityRows(rows => [...rows, { productId: null, productName: "", quantity: "", price: "" }]);
  const removeRow = (i: number) => setQuantityRows(rows => (rows.length <= 1 ? [{ productId: null, productName: "", quantity: "", price: "" }] : rows.filter((_, idx) => idx !== i)));
  const pickProduct = (p: DealerSchemeProduct) => { setQuantityRows(rows => rows.map((r, idx) => (idx === productPickerRow ? { ...r, productId: p.id, productName: p.name } : r))); setProductPickerRow(null); setPicker(null); };
  const rowPoints = (r: QRow) => preview?.lines.find(l => l.productId === r.productId)?.points ?? 0;
  const rowHint = (r: QRow) => preview?.lines.find(l => l.productId === r.productId)?.hint ?? null;
  const productOptions = useMemo(() => { const q = search.trim().toLowerCase(); return q ? schemeProducts.filter(p => p.name.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q)) : schemeProducts; }, [schemeProducts, search]);

  const filtered = useMemo(() => retailers.filter(x => `${x.code} ${x.name} ${x.shopName} ${x.mobile}`.toLowerCase().includes(search.toLowerCase())), [retailers, search]);
  const attachmentCount = saved.length + assets.length;
  const addAttachments = async (source: "camera" | "gallery" | "file") => {
    const room = MAX_INVOICE_ATTACHMENTS - attachmentCount;
    if (room <= 0) return showToast(`At most ${MAX_INVOICE_ATTACHMENTS} attachments.`);
    setProcessing(true);
    try {
      for (const file of await pickInvoiceAssets(source, room)) {
        try {
          // Anything over the limit is shrunk here, so a big photo never leaves the
          // phone; only a file that stays too big afterwards is refused.
          const ready = await compressInvoiceAsset(file);
          setAssets(old => [...old, ready]);
        } catch (error) {
          showToast(error instanceof AttachmentTooLargeError ? error.message : "Could not process that file.");
        }
      }
    } catch (error: any) {
      showToast(error?.message || "Unable to select the attachment.");
    } finally {
      setProcessing(false);
    }
  };
  const chooseAttachment = () => chooseAttachmentSource(addAttachments);
  const removeStaged = (index: number) => setAssets(old => old.filter((_, position) => position !== index));
  const removeSaved = (file: DealerInvoiceAttachment) => {
    setSaved(old => old.filter(item => item !== file));
    // Id 0 is the legacy single-attachment column - there is no row for the API to drop.
    if (file.id > 0) setRemovedIds(old => [...old, file.id]);
  };
  const submit = async () => {
    if (!retailer) return showToast("Please select a retailer."); if (!invoiceNumber.trim()) return showToast("Invoice number is required.");
    if (!invoiceDate) return showToast("Invoice date is required."); if (!scheme) return showToast("Please select a scheme.");
    let items: DealerInvoiceItemLine[] | undefined;
    if (isQuantityScheme) {
      items = quantityRows.filter(r => r.productId && Number(r.quantity) > 0).map(r => ({ product_id: r.productId as number, quantity: Number(r.quantity), price: Number(r.price) || 0 }));
      if (items.length === 0) return showToast("Add at least one product line with a quantity.");
    } else if (!(Number(amount) > 0)) {
      return showToast("Amount must be greater than 0.");
    }
    if (processing) return showToast("Attachments are still being processed.");
    if (attachmentCount === 0) return showToast("Invoice attachment is required.");
    setSaving(true); try {
      const payload = { retailerId: retailer.id, schemeId: scheme.id, invoiceNumber: invoiceNumber.trim(), invoiceDate, amount: isQuantityScheme ? 0 : Number(amount), items };
      if (editing && initialInvoice) await dealerInvoiceApi.update(initialInvoice.id, { ...payload, attachments: assets, removedAttachmentIds: removedIds });
      else await dealerInvoiceApi.create({ ...payload, attachments: assets });
      showToast(editing ? "Invoice updated successfully." : "Invoice successfully submit ho gaya.", "success"); onCreated();
    } catch {} finally { setSaving(false); }
  };
  return <View style={s.root}><View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>←</Text></Pressable><Text style={s.title}>{editing ? "Edit invoice" : "New invoice"}</Text><View style={s.back} /></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>SELECT RETAILER <Text style={s.req}>*</Text></Text><Pressable style={s.input} onPress={() => setPicker("retailer")}><Text style={retailer ? s.inputText : s.placeholder}>{retailer ? `${retailer.code} · ${retailer.shopName}` : loading ? "Loading retailers..." : "Select assigned retailer"}</Text><Text>⌄</Text></Pressable>
      <Text style={s.label}>INVOICE NUMBER <Text style={s.req}>*</Text></Text><TextInput value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="Enter invoice number" style={s.input} />
      <View style={s.row}><View style={s.half}><Text style={s.label}>INVOICE DATE <Text style={s.req}>*</Text></Text><Pressable style={[s.input,s.compactInput]} onPress={() => setCalendar(true)}><Text style={s.inputText}>{invoiceDate}</Text><Text style={s.calendarIcon}>▦</Text></Pressable></View>{!isQuantityScheme ? <View style={s.half}><Text style={s.label}>PRE-GST AMOUNT <Text style={s.req}>*</Text></Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="₹ 0" style={[s.input,s.compactInput]} /></View> : <View style={s.half} />}</View>
      {!isQuantityScheme ? <Text style={s.gstHint}>Enter the pre-GST invoice amount only. Do not include GST.</Text> : null}
      <Text style={s.label}>SCHEME <Text style={s.req}>*</Text></Text><Pressable style={s.input} onPress={() => retailer && setPicker("scheme")}><Text style={scheme ? s.inputText : s.placeholder}>{!retailer ? "First select retailer" : scheme ? `${scheme.code} · ${scheme.name}` : schemes.length ? "Select eligible scheme" : "No eligible scheme"}</Text><Text>⌄</Text></Pressable>
      {isQuantityScheme ? <View>
        <Text style={s.label}>PRODUCTS & QUANTITY <Text style={s.req}>*</Text></Text>
        <Text style={s.gstHint}>Points are earned on quantity. Price is your own figure, to cross-check the invoice photo.</Text>
        {quantityRows.map((row, i) => <View key={`qr-${i}`} style={{ borderWidth: 1, borderColor: "#d5e0eb", borderRadius: 14, padding: 10, marginTop: 10 }}>
          <Pressable style={s.input} onPress={() => { setProductPickerRow(i); setPicker("product"); setSearch(""); }}><Text style={row.productId ? s.inputText : s.placeholder}>{productsLoading ? "Loading products..." : row.productId ? row.productName : "Select product"}</Text><Text>⌄</Text></Pressable>
          <View style={[s.row, { marginTop: 8 }]}>
            <View style={s.half}><TextInput value={row.quantity} onChangeText={v => setRowQty(i, v)} keyboardType="decimal-pad" placeholder="Quantity" style={[s.input, s.compactInput]} /></View>
            <View style={s.half}><TextInput value={row.price} onChangeText={v => setRowPrice(i, v)} keyboardType="decimal-pad" placeholder="Price" style={[s.input, s.compactInput]} /></View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <Text style={[s.optionMeta, { color: colors.primary }]}>Expected: {rowPoints(row)}</Text>
            {quantityRows.length > 1 ? <Pressable onPress={() => removeRow(i)}><Text style={[s.optionMeta, { color: colors.danger }]}>Remove</Text></Pressable> : null}
          </View>
          {rowHint(row) ? <Text style={[s.gstHint, { marginTop: 4 }]}>{rowHint(row)}</Text> : null}
        </View>)}
        <Pressable style={[s.input, { marginTop: 10, justifyContent: "center" }]} onPress={addRow}><Text style={[s.inputText, { color: colors.primary }]}>+ Add Product</Text></Pressable>
      </View> : null}
      <Text style={s.label}>INVOICE ATTACHMENTS <Text style={s.req}>*</Text></Text>
      {attachmentCount ? <View style={s.attachmentGrid}>
        {saved.map(file => <View key={`saved-${file.id}-${file.url}`} style={s.attachmentTile}>
          {isPdfAttachment({ type: file.mimeType, name: file.fileName || file.url })
            ? <Pressable style={s.attachmentDoc} onPress={() => setPreviewAttachment(file.url)}><Text style={s.attachmentDocIcon}>📄</Text><Text style={s.attachmentDocText}>PDF</Text></Pressable>
            : <Pressable onPress={() => setPreviewAttachment(file.url)}><Image source={{ uri: file.url }} resizeMode="cover" style={s.attachmentImage} /></Pressable>}
          <Pressable style={s.attachmentRemove} hitSlop={8} onPress={() => removeSaved(file)}><Text style={s.attachmentRemoveText}>×</Text></Pressable>
        </View>)}
        {assets.map((file, index) => <View key={`new-${file.uri}-${index}`} style={s.attachmentTile}>
          {isPdfAttachment(file)
            ? <View style={s.attachmentDoc}><Text style={s.attachmentDocIcon}>📄</Text><Text style={s.attachmentDocText}>PDF</Text></View>
            : <Pressable onPress={() => setPreviewAttachment(file.uri)}><Image source={{ uri: file.uri }} resizeMode="cover" style={s.attachmentImage} /></Pressable>}
          <Pressable style={s.attachmentRemove} hitSlop={8} onPress={() => removeStaged(index)}><Text style={s.attachmentRemoveText}>×</Text></Pressable>
        </View>)}
        {attachmentCount < MAX_INVOICE_ATTACHMENTS ? <Pressable style={s.attachmentAdd} disabled={processing} onPress={chooseAttachment}><Text style={s.attachmentAddIcon}>+</Text><Text style={s.attachmentAddText}>Add</Text></Pressable> : null}
      </View> : <Pressable style={s.upload} disabled={processing} onPress={chooseAttachment}><Text style={s.uploadIcon}>📎</Text><Text style={s.uploadTitle}>Add invoice attachment</Text><Text style={s.uploadText}>Camera, gallery or a PDF from Files</Text></Pressable>}
      <Text style={s.attachmentHint}>{processing ? "Processing attachment..." : `${attachmentCount} of ${MAX_INVOICE_ATTACHMENTS} added. Images are compressed to 5 MB, PDFs must be 10 MB or less.`}</Text>
      <View style={s.estimate}><View><Text style={s.estimateTitle}>ESTIMATED REWARD</Text><Text style={s.estimateText}>Final reward approval calculation par milega</Text></View><Text style={s.points}>{isQuantityScheme && preview ? String(preview.totalPoints) : "—"}</Text></View>
      <Pressable style={[s.submit, saving && s.disabled]} disabled={saving} onPress={submit}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{editing ? "UPDATE INVOICE" : "SUBMIT INVOICE"}</Text>}</Pressable>
    </ScrollView>
    <CalendarDatePicker asSheet visible={calendar} title="Invoice date" value={invoiceDate} maxDate={today()} onSelect={v => { setInvoiceDate(v); setCalendar(false); }} onClose={() => setCalendar(false)} />
    <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}><Pressable style={s.overlay} onPress={() => setPicker(null)}><Pressable style={[s.sheet, { paddingBottom: 20 + insets.bottom }]}>
      <View style={s.sheetHead}><Text style={s.sheetTitle}>{picker === "retailer" ? "Select retailer" : picker === "product" ? "Select product" : "Select scheme"}</Text><Pressable onPress={() => setPicker(null)}><Text style={s.close}>×</Text></Pressable></View>
      {picker === "retailer" || picker === "product" ? <TextInput value={search} onChangeText={setSearch} placeholder={picker === "product" ? "Search product name or code" : "Search name, shop, code or mobile"} style={s.search} /> : null}
      <ScrollView keyboardShouldPersistTaps="handled">{(picker === "retailer" ? filtered : picker === "product" ? productOptions : schemes).map((x: any) => <Pressable key={x.id} style={s.option} onPress={() => { if (picker === "retailer") { setRetailer(x); setPicker(null); setSearch(""); } else if (picker === "product") { pickProduct(x); setSearch(""); } else { setScheme(x); setPicker(null); setSearch(""); } }}><Text style={s.optionTitle}>{picker === "retailer" ? x.shopName : x.name}</Text><Text style={s.optionMeta}>{picker === "retailer" ? `${x.code} · ${x.name} · ${x.mobile}` : x.code}</Text></Pressable>)}</ScrollView>
    </Pressable></Pressable></Modal>
    <InvoiceAttachmentViewer uri={previewAttachment} onClose={() => setPreviewAttachment(null)} />
  </View>;
}

const s = StyleSheet.create({ root:{flex:1,backgroundColor:colors.background},header:{height:76,paddingHorizontal:20,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderColor:"rgba(20,101,47,0.12)"},back:{width:46,height:46,borderRadius:15,alignItems:"center",justifyContent:"center"},backText:{fontSize:30,color:colors.navy},title:{fontFamily:jakarta.extraBold,fontSize:20,color:colors.navy,textTransform:"uppercase"},content:{padding:20,paddingBottom:140},label:{fontFamily:jakarta.bold,fontSize:11,color:"#8493a7",letterSpacing:.8,marginTop:18,marginBottom:8},req:{color:colors.danger},input:{minHeight:58,borderRadius:17,borderWidth:1,borderColor:"#d5e0eb",backgroundColor:"#fff",paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",fontFamily:jakarta.semiBold,color:colors.navy},compactInput:{height:58,minHeight:58,maxHeight:58,paddingVertical:0},inputText:{fontFamily:jakarta.semiBold,color:colors.navy,flex:1},calendarIcon:{fontFamily:jakarta.bold,color:colors.primary,fontSize:17},placeholder:{fontFamily:jakarta.semiBold,color:"#8c99a8",flex:1},row:{flexDirection:"row",gap:12,alignItems:"flex-start"},half:{flex:1,minWidth:0},upload:{minHeight:145,borderRadius:22,borderWidth:1.5,borderStyle:"dashed",borderColor:"#a7c7e8",backgroundColor:"#f7fbff",alignItems:"center",justifyContent:"center",padding:14},uploadWithPreview:{minHeight:128,borderRadius:20,borderWidth:1,borderColor:"#cbdcec",backgroundColor:"#fff",padding:10,flexDirection:"row",alignItems:"center"},currentPreviewWrap:{width:108,height:108,borderRadius:15,overflow:"hidden",backgroundColor:"#eef3f8"},currentPreview:{width:"100%",height:"100%"},viewBadge:{position:"absolute",left:8,right:8,bottom:8,borderRadius:10,backgroundColor:"rgba(5,29,59,.76)",paddingVertical:5,alignItems:"center"},viewBadgeText:{fontFamily:jakarta.bold,color:"#fff",fontSize:9},attachmentCopy:{flex:1,paddingLeft:13,alignItems:"flex-start"},changeButton:{marginTop:12,borderRadius:12,backgroundColor:"#eaf4ff",paddingHorizontal:13,paddingVertical:9},changeButtonText:{fontFamily:jakarta.bold,color:colors.primary,fontSize:10},uploadIcon:{fontSize:30},attachmentGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},attachmentTile:{width:80,height:80,borderRadius:14,overflow:"hidden",backgroundColor:"#eef3f8"},attachmentImage:{width:80,height:80},attachmentDoc:{width:80,height:80,alignItems:"center",justifyContent:"center"},attachmentDocIcon:{fontSize:24},attachmentDocText:{fontFamily:jakarta.bold,color:colors.muted,fontSize:9,marginTop:2},attachmentRemove:{position:"absolute",top:4,right:4,width:20,height:20,borderRadius:10,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(5,29,59,.76)"},attachmentRemoveText:{color:"#fff",fontSize:13,lineHeight:15,fontFamily:jakarta.bold},attachmentAdd:{width:80,height:80,borderRadius:14,borderWidth:1.5,borderStyle:"dashed",borderColor:"#a7c7e8",backgroundColor:"#f7fbff",alignItems:"center",justifyContent:"center"},attachmentAddIcon:{fontSize:22,color:colors.primary},attachmentAddText:{fontFamily:jakarta.bold,color:colors.primary,fontSize:10},attachmentHint:{fontFamily:jakarta.medium,color:colors.muted,fontSize:10,marginTop:9},gstHint:{fontFamily:jakarta.medium,color:colors.muted,fontSize:10,marginTop:7},uploadTitle:{fontFamily:jakarta.bold,color:colors.primary,fontSize:13},uploadText:{fontFamily:jakarta.medium,color:colors.muted,fontSize:10,marginTop:5},estimate:{marginTop:22,padding:18,borderRadius:18,backgroundColor:"#eaf4ff",borderWidth:1,borderColor:"#c6def5",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},estimateTitle:{fontFamily:jakarta.bold,color:colors.primary,fontSize:12},estimateText:{fontFamily:jakarta.medium,color:colors.muted,fontSize:9,marginTop:3},points:{fontFamily:jakarta.extraBold,color:colors.primary,fontSize:26},submit:{height:62,borderRadius:19,backgroundColor:colors.primary,alignItems:"center",justifyContent:"center",marginTop:22},disabled:{opacity:.6},submitText:{fontFamily:jakarta.extraBold,color:"#fff",fontSize:15,letterSpacing:1.3},overlay:{flex:1,backgroundColor:"rgba(7,24,45,.5)",justifyContent:"flex-end"},sheet:{maxHeight:"72%",backgroundColor:"#fff",borderTopLeftRadius:28,borderTopRightRadius:28,padding:20},sheetHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:13},sheetTitle:{fontFamily:jakarta.extraBold,color:colors.navy,fontSize:20},close:{fontSize:30,color:colors.muted},search:{height:52,borderRadius:15,borderWidth:1,borderColor:colors.border,paddingHorizontal:15,marginBottom:10},option:{paddingVertical:14,borderBottomWidth:1,borderColor:colors.border},optionTitle:{fontFamily:jakarta.bold,color:colors.navy,fontSize:14},optionMeta:{fontFamily:jakarta.medium,color:colors.muted,fontSize:10,marginTop:3} });
