import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CalendarDatePicker } from "../../components/CalendarDatePicker";
import { colors } from "../../constants/colors";
import { DealerInvoiceItem, DealerRetailer, DealerScheme, UploadAsset, dealerInvoiceApi } from "../../services/dealerInvoiceApi";
import { showToast } from "../../services/toast";
import { jakarta } from "../../styles/appStyles";
import InvoiceAttachmentViewer from "@/components/InvoiceAttachmentViewer";

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export default function DealerNewInvoiceScreen({ onBack, onCreated, invoice: initialInvoice }: { onBack: () => void; onCreated: () => void; invoice?: DealerInvoiceItem | null }) {
  const editing = Boolean(initialInvoice);
  const [retailers, setRetailers] = useState<DealerRetailer[]>([]); const [retailer, setRetailer] = useState<DealerRetailer | null>(initialInvoice ? { id: initialInvoice.retailerId, code: initialInvoice.retailerCode, name: initialInvoice.ownerName || initialInvoice.retailerName, ownerName: initialInvoice.ownerName || initialInvoice.retailerName, shopName: initialInvoice.shopName || initialInvoice.retailerName, mobile: initialInvoice.mobile } : null);
  const [schemes, setSchemes] = useState<DealerScheme[]>([]); const [scheme, setScheme] = useState<DealerScheme | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoice?.invoiceNumber || ""); const [invoiceDate, setInvoiceDate] = useState(initialInvoice?.invoiceDate || today()); const [amount, setAmount] = useState(initialInvoice ? String(initialInvoice.amount) : "");
  const [asset, setAsset] = useState<UploadAsset | null>(null); const [picker, setPicker] = useState<"retailer" | "scheme" | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [calendar, setCalendar] = useState(false); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(true);
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
  const filtered = useMemo(() => retailers.filter(x => `${x.code} ${x.name} ${x.shopName} ${x.mobile}`.toLowerCase().includes(search.toLowerCase())), [retailers, search]);
  const pick = async (camera: boolean) => {
    try {
      if (camera) { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) return Alert.alert("Permission required", "Please allow camera access to continue."); }
      const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: .8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: .8 });
      if (!result.canceled && result.assets[0]) { const x = result.assets[0]; setAsset({ uri: x.uri, name: x.fileName || `invoice-${Date.now()}.jpg`, mimeType: x.mimeType || "image/jpeg" }); }
    } catch { showToast("Unable to select the invoice photo."); }
  };
  const chooseAttachment = () => Alert.alert("Invoice attachment", "Choose a source", [
    { text: "Camera", onPress: () => pick(true) },
    { text: "Gallery", onPress: () => pick(false) },
    { text: "Cancel", style: "cancel" },
  ]);
  const displayedAttachment = asset?.uri || initialInvoice?.attachment || "";
  const submit = async () => {
    if (!retailer) return showToast("Please select a retailer."); if (!invoiceNumber.trim()) return showToast("Invoice number is required.");
    if (!invoiceDate) return showToast("Invoice date is required."); if (!scheme) return showToast("Please select a scheme.");
    if (!(Number(amount) > 0)) return showToast("Amount must be greater than 0."); if (!asset && !editing) return showToast("Invoice attachment is required.");
    setSaving(true); try {
      const payload = { retailerId: retailer.id, schemeId: scheme.id, invoiceNumber: invoiceNumber.trim(), invoiceDate, amount: Number(amount) };
      if (editing && initialInvoice) await dealerInvoiceApi.update(initialInvoice.id, { ...payload, attachment: asset });
      else await dealerInvoiceApi.create({ ...payload, attachment: asset! });
      showToast(editing ? "Invoice updated successfully." : "Invoice successfully submit ho gaya.", "success"); onCreated();
    } catch {} finally { setSaving(false); }
  };
  return <View style={s.root}><View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>←</Text></Pressable><Text style={s.title}>{editing ? "Edit invoice" : "New invoice"}</Text><View style={s.back} /></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>SELECT RETAILER <Text style={s.req}>*</Text></Text><Pressable style={s.input} onPress={() => setPicker("retailer")}><Text style={retailer ? s.inputText : s.placeholder}>{retailer ? `${retailer.code} · ${retailer.shopName}` : loading ? "Loading retailers..." : "Select assigned retailer"}</Text><Text>⌄</Text></Pressable>
      <Text style={s.label}>INVOICE NUMBER <Text style={s.req}>*</Text></Text><TextInput value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="Enter invoice number" style={s.input} />
      <View style={s.row}><View style={s.half}><Text style={s.label}>INVOICE DATE <Text style={s.req}>*</Text></Text><Pressable style={[s.input,s.compactInput]} onPress={() => setCalendar(true)}><Text style={s.inputText}>{invoiceDate}</Text><Text style={s.calendarIcon}>▦</Text></Pressable></View><View style={s.half}><Text style={s.label}>AMOUNT (₹) <Text style={s.req}>*</Text></Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" style={[s.input,s.compactInput]} /></View></View>
      <Text style={s.label}>SCHEME <Text style={s.req}>*</Text></Text><Pressable style={s.input} onPress={() => retailer && setPicker("scheme")}><Text style={scheme ? s.inputText : s.placeholder}>{!retailer ? "First select retailer" : scheme ? `${scheme.code} · ${scheme.name}` : schemes.length ? "Select eligible scheme" : "No eligible scheme"}</Text><Text>⌄</Text></Pressable>
      <Text style={s.label}>INVOICE ATTACHMENT <Text style={s.req}>*</Text></Text>
      {displayedAttachment ? <View style={s.uploadWithPreview}>
        <Pressable style={s.currentPreviewWrap} onPress={() => setPreviewAttachment(displayedAttachment)}>
          <Image source={{ uri: displayedAttachment }} resizeMode="cover" style={s.currentPreview} />
          <View style={s.viewBadge}><Text style={s.viewBadgeText}>Tap to view</Text></View>
        </Pressable>
        <View style={s.attachmentCopy}>
          <Text style={s.uploadTitle}>{asset ? "New invoice attachment" : "Current invoice attachment"}</Text>
          <Text style={s.uploadText} numberOfLines={1}>{asset?.name || "Attachment saved"}</Text>
          <Pressable style={s.changeButton} onPress={chooseAttachment}><Text style={s.changeButtonText}>Change attachment</Text></Pressable>
        </View>
      </View> : <Pressable style={s.upload} onPress={chooseAttachment}><Text style={s.uploadIcon}>📷</Text><Text style={s.uploadTitle}>Add invoice photo</Text><Text style={s.uploadText}>Select from camera or gallery</Text></Pressable>}
      <View style={s.estimate}><View><Text style={s.estimateTitle}>ESTIMATED REWARD</Text><Text style={s.estimateText}>Final reward approval calculation par milega</Text></View><Text style={s.points}>—</Text></View>
      <Pressable style={[s.submit, saving && s.disabled]} disabled={saving} onPress={submit}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{editing ? "UPDATE INVOICE" : "SUBMIT INVOICE"}</Text>}</Pressable>
    </ScrollView>
    <CalendarDatePicker visible={calendar} title="Invoice date" value={invoiceDate} maxDate={today()} onSelect={v => { setInvoiceDate(v); setCalendar(false); }} onClose={() => setCalendar(false)} />
    <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}><Pressable style={s.overlay} onPress={() => setPicker(null)}><Pressable style={s.sheet}>
      <View style={s.sheetHead}><Text style={s.sheetTitle}>{picker === "retailer" ? "Select retailer" : "Select scheme"}</Text><Pressable onPress={() => setPicker(null)}><Text style={s.close}>×</Text></Pressable></View>
      {picker === "retailer" ? <TextInput value={search} onChangeText={setSearch} placeholder="Search name, shop, code or mobile" style={s.search} /> : null}
      <ScrollView keyboardShouldPersistTaps="handled">{(picker === "retailer" ? filtered : schemes).map((x: any) => <Pressable key={x.id} style={s.option} onPress={() => { if (picker === "retailer") setRetailer(x); else setScheme(x); setPicker(null); setSearch(""); }}><Text style={s.optionTitle}>{picker === "retailer" ? x.shopName : x.name}</Text><Text style={s.optionMeta}>{picker === "retailer" ? `${x.code} · ${x.name} · ${x.mobile}` : x.code}</Text></Pressable>)}</ScrollView>
    </Pressable></Pressable></Modal>
    <InvoiceAttachmentViewer uri={previewAttachment} onClose={() => setPreviewAttachment(null)} />
  </View>;
}

const s = StyleSheet.create({ root:{flex:1,backgroundColor:colors.background},header:{height:76,paddingHorizontal:20,flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:"#fff",borderBottomWidth:1,borderColor:colors.border},back:{width:46,height:46,borderRadius:15,alignItems:"center",justifyContent:"center"},backText:{fontSize:30,color:colors.navy},title:{fontFamily:jakarta.extraBold,fontSize:20,color:colors.navy,textTransform:"uppercase"},content:{padding:20,paddingBottom:140},label:{fontFamily:jakarta.bold,fontSize:11,color:"#8493a7",letterSpacing:.8,marginTop:18,marginBottom:8},req:{color:colors.danger},input:{minHeight:58,borderRadius:17,borderWidth:1,borderColor:"#d5e0eb",backgroundColor:"#fff",paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",fontFamily:jakarta.semiBold,color:colors.navy},compactInput:{height:58,minHeight:58,maxHeight:58,paddingVertical:0},inputText:{fontFamily:jakarta.semiBold,color:colors.navy,flex:1},calendarIcon:{fontFamily:jakarta.bold,color:colors.primary,fontSize:17},placeholder:{fontFamily:jakarta.semiBold,color:"#8c99a8",flex:1},row:{flexDirection:"row",gap:12,alignItems:"flex-start"},half:{flex:1,minWidth:0},upload:{minHeight:145,borderRadius:22,borderWidth:1.5,borderStyle:"dashed",borderColor:"#a7c7e8",backgroundColor:"#f7fbff",alignItems:"center",justifyContent:"center",padding:14},uploadWithPreview:{minHeight:128,borderRadius:20,borderWidth:1,borderColor:"#cbdcec",backgroundColor:"#fff",padding:10,flexDirection:"row",alignItems:"center"},currentPreviewWrap:{width:108,height:108,borderRadius:15,overflow:"hidden",backgroundColor:"#eef3f8"},currentPreview:{width:"100%",height:"100%"},viewBadge:{position:"absolute",left:8,right:8,bottom:8,borderRadius:10,backgroundColor:"rgba(5,29,59,.76)",paddingVertical:5,alignItems:"center"},viewBadgeText:{fontFamily:jakarta.bold,color:"#fff",fontSize:9},attachmentCopy:{flex:1,paddingLeft:13,alignItems:"flex-start"},changeButton:{marginTop:12,borderRadius:12,backgroundColor:"#eaf4ff",paddingHorizontal:13,paddingVertical:9},changeButtonText:{fontFamily:jakarta.bold,color:colors.primary,fontSize:10},uploadIcon:{fontSize:30},uploadTitle:{fontFamily:jakarta.bold,color:colors.primary,fontSize:13},uploadText:{fontFamily:jakarta.medium,color:colors.muted,fontSize:10,marginTop:5},estimate:{marginTop:22,padding:18,borderRadius:18,backgroundColor:"#eaf4ff",borderWidth:1,borderColor:"#c6def5",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},estimateTitle:{fontFamily:jakarta.bold,color:colors.primary,fontSize:12},estimateText:{fontFamily:jakarta.medium,color:colors.muted,fontSize:9,marginTop:3},points:{fontFamily:jakarta.extraBold,color:colors.primary,fontSize:26},submit:{height:62,borderRadius:19,backgroundColor:colors.primary,alignItems:"center",justifyContent:"center",marginTop:22},disabled:{opacity:.6},submitText:{fontFamily:jakarta.extraBold,color:"#fff",fontSize:15,letterSpacing:1.3},overlay:{flex:1,backgroundColor:"rgba(7,24,45,.5)",justifyContent:"flex-end"},sheet:{maxHeight:"72%",backgroundColor:"#fff",borderTopLeftRadius:28,borderTopRightRadius:28,padding:20},sheetHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:13},sheetTitle:{fontFamily:jakarta.extraBold,color:colors.navy,fontSize:20},close:{fontSize:30,color:colors.muted},search:{height:52,borderRadius:15,borderWidth:1,borderColor:colors.border,paddingHorizontal:15,marginBottom:10},option:{paddingVertical:14,borderBottomWidth:1,borderColor:colors.border},optionTitle:{fontFamily:jakarta.bold,color:colors.navy,fontSize:14},optionMeta:{fontFamily:jakarta.medium,color:colors.muted,fontSize:10,marginTop:3} });
