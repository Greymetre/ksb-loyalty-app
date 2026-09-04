import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { colors, gradients } from "@/constants/colors";
import { LocationOption, MasterOption, registrationApi } from "@/services/registrationApi";
import { jakarta } from "@/styles/appStyles";
import { customerTypeIcon } from "@/utils/rewards";

type RegisterForm = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  firmName: string;
  gstNumber: string;
  address: string;
  city: string;
  cityId: number | null;
  pincode: string;
  pincodeId: number | null;
  state: string;
  stateId: number | null;
};

type RegisterTextField = "email" | "password" | "confirmPassword" | "fullName" | "firmName" | "gstNumber" | "address" | "city" | "pincode" | "state";

type RegisterProps = {
  mobile: string;
  email: string;
  onDone: () => void;
};

type KycDocKey = "pan" | "aadhaar" | "cheque";

type KycSelection = {
  uri: string;
  name: string;
};

const fallbackCustomerTypes: MasterOption[] = [
  { id: -1, name: "Retailer" },
  { id: -2, name: "Sub-Dealer" },
  { id: -3, name: "Plumber" }
];

const defaultForm: RegisterForm = {
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  firmName: "",
  gstNumber: "",
  address: "",
  city: "",
  cityId: null,
  pincode: "",
  pincodeId: null,
  state: "",
  stateId: null
};

export default function RegisterScreen({ mobile, email, onDone }: RegisterProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [customerTypes, setCustomerTypes] = useState<MasterOption[]>([]);
  const [customerTypesLoading, setCustomerTypesLoading] = useState(true);
  const [customerTypeKey, setCustomerTypeKey] = useState<string | null>(null);
  const [dealers, setDealers] = useState<MasterOption[]>([]);
  const [dealersLoading, setDealersLoading] = useState(false);
  const [dealerId, setDealerId] = useState<number | null>(null);
  const [domesticDealerId, setDomesticDealerId] = useState<number | null>(null);
  const [form, setForm] = useState<RegisterForm>({ ...defaultForm, email });
  const [stateOptions, setStateOptions] = useState<MasterOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [activeLookup, setActiveLookup] = useState<"city" | "pincode" | "state" | null>(null);
  const [kycDocuments, setKycDocuments] = useState<Record<KycDocKey, KycSelection | null>>({
    pan: null,
    aadhaar: null,
    cheque: null
  });
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    registrationApi.customerTypes()
      .then((items) => {
        const nextItems = items.length ? items : fallbackCustomerTypes;
        setCustomerTypes(nextItems);
        setCustomerTypeKey(nextItems[0] ? optionKey(nextItems[0], 0) : null);
      })
      .catch(() => {
        setCustomerTypes(fallbackCustomerTypes);
        setCustomerTypeKey(optionKey(fallbackCustomerTypes[0], 0));
      })
      .finally(() => setCustomerTypesLoading(false));
  }, []);

  useEffect(() => {
    if (step !== 3 || dealers.length || dealersLoading) return;
    setDealersLoading(true);
    registrationApi.dealers("agri")
      .then((items) => {
        setDealers(items);
        setDealerId(items[0]?.id ?? null);
        setDomesticDealerId(items[1]?.id ?? items[0]?.id ?? null);
      })
      .catch(() => setDealers([]))
      .finally(() => setDealersLoading(false));
  }, [dealers.length, dealersLoading, step]);

  useEffect(() => {
    registrationApi.states()
      .then(setStateOptions)
      .catch(() => setStateOptions([]));
  }, []);

  const selectedCustomerType = customerTypes.find((item, index) => optionKey(item, index) === customerTypeKey);
  const selectedDealer = dealers.find((item) => item.id === dealerId);
  const selectedDomesticDealer = dealers.find((item) => item.id === domesticDealerId);

  const detailsComplete = useMemo(
    () => Boolean(form.email && form.password.length >= 6 && form.password === form.confirmPassword && form.fullName && form.firmName && form.address && form.city && form.pincode && form.state),
    [form]
  );
  const uploadedKycCount = Object.values(kycDocuments).filter(Boolean).length;
  const allKycDocumentsSelected = uploadedKycCount === 3;

  const submit = async (submitKyc = false) => {
    if (!selectedCustomerType || !dealerId) return;
    setLoading(true);
    try {
      await registrationApi.register({ mobile, customerType: selectedCustomerType.name, customerTypeId: selectedCustomerType.id, ...form, dealerId });
      setKycSubmitted(submitKyc);
      setStep(5);
    } catch {
      // The API interceptor already shows the backend message in a toast.
    } finally {
      setLoading(false);
    }
  };

  const applyLocation = (location: LocationOption) => {
    setForm((current) => ({
      ...current,
      city: location.city || current.city,
      cityId: location.city ? location.cityId ?? null : current.cityId,
      pincode: location.pincode || current.pincode,
      pincodeId: location.pincode ? location.pincodeId ?? null : current.pincodeId,
      state: location.state || current.state,
      stateId: location.state ? location.stateId ?? null : current.stateId
    }));
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
    setForm((current) => ({ ...current, city, cityId: null, pincodeId: null, stateId: null }));
    if (city.trim().length >= 2) {
      lookupLocations({ city: city.trim() }, "city");
    } else {
      setActiveLookup(null);
      setLocationOptions([]);
    }
  };

  const handlePincodeChange = (nextPincode: string) => {
    const pincode = nextPincode.replace(/\D/g, "").slice(0, 6);
    setForm((current) => ({ ...current, pincode, cityId: null, pincodeId: null, stateId: null }));
    if (pincode.length === 6) {
      lookupLocations({ pincode }, "pincode", true);
    } else if (activeLookup === "pincode") {
      setLocationOptions([]);
    }
  };

  const handleStateTextChange = (state: string) => {
    setForm((current) => ({ ...current, state, cityId: null, pincodeId: null, stateId: null }));
    setActiveLookup("state");
    setLocationOptions([]);
  };

  const handleStateSelect = (state: MasterOption) => {
    setForm((current) => ({ ...current, state: state.name, stateId: state.id }));
    lookupLocations({ state_id: state.id }, "state");
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const footerLabel = step === 3 ? "CONTINUE TO KYC" : step === 4 ? allKycDocumentsSelected ? "SUBMIT KYC" : "DO IT LATER" : "CONTINUE";
  const canContinue = step === 1 ? Boolean(customerTypeKey) : step === 2 ? detailsComplete : step === 3 ? Boolean(dealerId) : true;

  return (
    <SafeAreaView edges={["left", "right"]} style={screenStyles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={screenStyles.flex}>
        <View style={[screenStyles.phone, { paddingTop: Math.max(insets.top - 8, 0), paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
          {step < 5 ? (
            <>
              <RegistrationHeader step={step} onBack={goBack} onSkip={() => submit(false)} />
              <ScrollView style={screenStyles.flex} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={screenStyles.scrollContent}>
                <View style={screenStyles.card}>
                  {step === 1 ? (
                    <CustomerTypeStep
                      mobile={mobile}
                      loading={customerTypesLoading}
                      customerTypes={customerTypes}
                      customerTypeKey={customerTypeKey}
                      onSelect={setCustomerTypeKey}
                    />
                  ) : null}
                  {step === 2 ? (
                    <DetailsStep
                      form={form}
                      setForm={setForm}
                      states={stateOptions}
                      locationOptions={locationOptions}
                      locationLoading={locationLoading}
                      activeLookup={activeLookup}
                      onCityChange={handleCityChange}
                      onPincodeChange={handlePincodeChange}
                      onStateChange={handleStateTextChange}
                      onStateSelect={handleStateSelect}
                      onLocationSelect={applyLocation}
                    />
                  ) : null}
                  {step === 3 ? (
                    <DealerStep
                      loading={dealersLoading}
                      selectedDealer={selectedDealer}
                      selectedDomesticDealer={selectedDomesticDealer}
                      onSelectAgri={() => setDealerId(nextDealerId(dealers, dealerId))}
                      onSelectDomestic={() => setDomesticDealerId(nextDealerId(dealers, domesticDealerId))}
                    />
                  ) : null}
                  {step === 4 ? <KycStep documents={kycDocuments} setDocuments={setKycDocuments} /> : null}
                </View>
              </ScrollView>
              <View style={screenStyles.footer}>
                <Pressable disabled={!canContinue || loading} onPress={step === 4 ? () => submit(allKycDocumentsSelected) : () => setStep(step + 1)} style={screenStyles.footerButtonWrap}>
                  {step === 4 && !allKycDocumentsSelected ? (
                    <View style={screenStyles.footerButtonLight}>
                      {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={[screenStyles.footerText, screenStyles.footerTextLight]}>{footerLabel}  →</Text>}
                    </View>
                  ) : (
                    <LinearGradient
                      colors={canContinue ? gradients.main : ["#cbd5df", "#cbd5df"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[screenStyles.footerButton, !canContinue && screenStyles.footerButtonDisabled]}
                    >
                      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={screenStyles.footerText}>{footerLabel}  →</Text>}
                    </LinearGradient>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <CompleteStep kycSubmitted={kycSubmitted} onDone={onDone} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RegistrationHeader({ step, onBack, onSkip }: { step: number; onBack: () => void; onSkip: () => void }) {
  return (
    <View style={screenStyles.header}>
      <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={screenStyles.headerGradient} />
      <Pressable onPress={onBack} style={screenStyles.backButton}>
        <Text style={screenStyles.backText}>←</Text>
      </Pressable>
      {step === 4 ? (
        <Pressable onPress={onSkip} style={screenStyles.skipButton}>
          <Text style={screenStyles.skipText}>Skip</Text>
        </Pressable>
      ) : null}
      <View style={screenStyles.dots}>
        {[1, 2, 3, 4].map((item) => <View key={item} style={[screenStyles.dot, item === step && screenStyles.dotActive]} />)}
      </View>
      <View style={screenStyles.stepBadge}>
        <View style={screenStyles.stepBadgeDot} />
        <Text style={screenStyles.stepBadgeText}>STEP <Text style={screenStyles.stepBadgeNumber}>{step}</Text> OF 4</Text>
      </View>
    </View>
  );
}

function CustomerTypeStep({
  mobile,
  loading,
  customerTypes,
  customerTypeKey,
  onSelect
}: {
  mobile: string;
  loading: boolean;
  customerTypes: MasterOption[];
  customerTypeKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <>
      <TitleLine before="Let's get you" accent="registered" />
      <Text style={screenStyles.subtitle}>Tell us how you work with KSB products</Text>
      <View style={screenStyles.verifiedPill}><View style={screenStyles.pillDot} /><Text style={screenStyles.verifiedText}>+91 {formatMobile(mobile)} verified</Text></View>
      {loading ? <Text style={screenStyles.loadingText}>Loading customer types</Text> : null}
      <View style={screenStyles.customerList}>
        {customerTypes.map((type, index) => {
          const key = optionKey(type, index);
          const selected = customerTypeKey === key;
          return (
          <Pressable key={key} onPress={() => onSelect(key)} style={[screenStyles.customerCard, selected && screenStyles.customerCardActive]}>
            <View style={screenStyles.customerIconBox}><Text style={screenStyles.customerIcon}>{customerTypeIcon(type.name)}</Text></View>
            <View style={screenStyles.customerCopy}>
              <Text style={screenStyles.customerTitle}>{type.name}</Text>
              <Text style={screenStyles.customerDescription}>{customerDescription(type.name)}</Text>
            </View>
            <View style={[screenStyles.radio, selected && screenStyles.radioActive]}>{selected ? <View style={screenStyles.radioDot} /> : null}</View>
          </Pressable>
          );
        })}
      </View>
      <View style={screenStyles.tipBox}><Text style={screenStyles.tipIcon}>💡</Text><Text style={screenStyles.tipText}>Your customer type decides which scheme rewards and booster offers you're eligible for.</Text></View>
    </>
  );
}

function DetailsStep({
  form,
  setForm,
  states,
  locationOptions,
  locationLoading,
  activeLookup,
  onCityChange,
  onPincodeChange,
  onStateChange,
  onStateSelect,
  onLocationSelect
}: {
  form: RegisterForm;
  setForm: React.Dispatch<React.SetStateAction<RegisterForm>>;
  states: MasterOption[];
  locationOptions: LocationOption[];
  locationLoading: boolean;
  activeLookup: "city" | "pincode" | "state" | null;
  onCityChange: (city: string) => void;
  onPincodeChange: (pincode: string) => void;
  onStateChange: (state: string) => void;
  onStateSelect: (state: MasterOption) => void;
  onLocationSelect: (location: LocationOption) => void;
}) {
  const update = (key: RegisterTextField, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const matchingStates = states
    .filter((state) => !form.state || state.name.toLowerCase().includes(form.state.toLowerCase()))
    .slice(0, 8);
  return (
    <>
      <TitleLine before="Your" accent="details" />
      <Text style={screenStyles.subtitle}>Fill in your firm and business info</Text>
      <FormField label="EMAIL *" value={form.email} editable={false} placeholder="Email" />
      <FormField label="CREATE PASSWORD *" value={form.password} onChangeText={(value) => update("password", value)} placeholder="Minimum 6 characters" secureTextEntry />
      <FormField label="CONFIRM PASSWORD *" value={form.confirmPassword} onChangeText={(value) => update("confirmPassword", value)} placeholder="Enter password again" secureTextEntry />
      <FormField label="FULL NAME *" value={form.fullName} onChangeText={(value) => update("fullName", value)} placeholder="Rakesh Kumar" />
      <FormField label="FIRM / SHOP NAME *" value={form.firmName} onChangeText={(value) => update("firmName", value)} placeholder="Sharma Distributors" />
      <FormField label="GST NUMBER (OPTIONAL)" value={form.gstNumber} onChangeText={(value) => update("gstNumber", value.toUpperCase().slice(0, 15))} placeholder="22AAAAA0000A1Z5" helper="15-character GSTIN" autoCapitalize="characters" />
      <FormField label="ADDRESS *" value={form.address} onChangeText={(value) => update("address", value)} placeholder="Shop no., street, landmark" />
      <View style={screenStyles.twoCol}>
        <FormField label="CITY *" value={form.city} onChangeText={onCityChange} placeholder="Delhi" wrapStyle={screenStyles.colField} />
        <FormField label="PINCODE *" value={form.pincode} onChangeText={onPincodeChange} placeholder="110001" keyboardType="number-pad" wrapStyle={screenStyles.colField} />
      </View>
      {activeLookup === "city" || activeLookup === "pincode" ? (
        <LocationResults
          loading={locationLoading}
          locations={locationOptions}
          emptyText={activeLookup === "pincode" ? "No locations found for this pincode." : "No matching cities found."}
          onSelect={onLocationSelect}
        />
      ) : null}
      <FormField label="STATE *" value={form.state} onChangeText={onStateChange} placeholder="Delhi" />
      <OptionList
        title="State options"
        options={matchingStates}
        selectedId={form.stateId}
        onSelect={onStateSelect}
        emptyText={states.length ? "No matching states." : "Loading states..."}
      />
      {activeLookup === "state" ? (
        <LocationResults
          loading={locationLoading}
          locations={locationOptions}
          emptyText="No cities found for this state."
          onSelect={onLocationSelect}
        />
      ) : null}
    </>
  );
}

function OptionList({
  title,
  options,
  selectedId,
  emptyText,
  onSelect
}: {
  title: string;
  options: MasterOption[];
  selectedId?: number | null;
  emptyText: string;
  onSelect: (option: MasterOption) => void;
}) {
  return (
    <View style={screenStyles.optionPanel}>
      <Text style={screenStyles.optionPanelTitle}>{title}</Text>
      {options.length ? options.map((option) => (
        <Pressable key={`${option.id}-${option.name}`} onPress={() => onSelect(option)} style={[screenStyles.optionRow, selectedId === option.id && screenStyles.optionRowActive]}>
          <Text style={screenStyles.optionName}>{option.name}</Text>
          {selectedId === option.id ? <Text style={screenStyles.optionTick}>✓</Text> : null}
        </Pressable>
      )) : <Text style={screenStyles.optionEmpty}>{emptyText}</Text>}
    </View>
  );
}

function LocationResults({
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

function DealerStep({
  loading,
  selectedDealer,
  selectedDomesticDealer,
  onSelectAgri,
  onSelectDomestic
}: {
  loading: boolean;
  selectedDealer?: MasterOption;
  selectedDomesticDealer?: MasterOption;
  onSelectAgri: () => void;
  onSelectDomestic: () => void;
}) {
  return (
    <>
      <TitleLine before="Map your" accent="dealers" />
      <Text style={screenStyles.subtitle}>Choose the KSB dealers you buy from</Text>
      <View style={screenStyles.ruleBox}><Text style={screenStyles.ruleIcon}>🔒</Text><Text style={screenStyles.ruleText}>1:1 Mapping Rule — You'll be locked to ONE Agri and ONE Domestic dealer. Only invoices from these dealers count for rewards.</Text></View>
      {loading ? <Text style={screenStyles.loadingText}>Loading dealers</Text> : null}
      <SelectField label="AGRI DEALER *" value={selectedDealer?.name || "Select Agri dealer"} onPress={onSelectAgri} muted={!selectedDealer} />
      <SelectField label="DOMESTIC DEALER *" value={selectedDomesticDealer?.name || "Select Domestic dealer"} onPress={onSelectDomestic} muted={!selectedDomesticDealer} />
      <View style={screenStyles.infoBox}><Text style={screenStyles.infoIcon}>ℹ</Text><Text style={screenStyles.infoText}>Can't find your dealer? You can still continue — our team will help you map it after KYC review.</Text></View>
    </>
  );
}

function KycStep({
  documents,
  setDocuments
}: {
  documents: Record<KycDocKey, KycSelection | null>;
  setDocuments: React.Dispatch<React.SetStateAction<Record<KycDocKey, KycSelection | null>>>;
}) {
  const uploadedCount = Object.values(documents).filter(Boolean).length;

  const savePickedAsset = (docKey: KycDocKey, asset: ImagePicker.ImagePickerAsset) => {
    setDocuments((current) => ({
      ...current,
      [docKey]: {
        uri: asset.uri,
        name: asset.fileName || asset.uri.split("/").pop() || "Selected image"
      }
    }));
  };

  const pickFromCamera = async (docKey: KycDocKey) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission needed", "Please allow camera access to capture this KYC document.");
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.82
      });
      if (!result.canceled && result.assets[0]) {
        savePickedAsset(docKey, result.assets[0]);
      }
    } catch {
      Alert.alert("Camera unavailable", "Unable to open the camera on this device.");
    }
  };

  const pickFromGallery = async (docKey: KycDocKey) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery permission needed", "Please allow photo access to select this KYC document.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: false,
        quality: 0.82
      });
      if (!result.canceled && result.assets[0]) {
        savePickedAsset(docKey, result.assets[0]);
      }
    } catch {
      Alert.alert("Gallery unavailable", "Unable to open the gallery on this device.");
    }
  };

  return (
    <>
      <TitleLine before="KYC" accent="documents" />
      <Text style={screenStyles.subtitle}>Upload 3 documents to unlock redemptions</Text>
      <View style={screenStyles.tipBoxLarge}><Text style={screenStyles.tipIcon}>💡</Text><Text style={screenStyles.tipTextDark}>You can skip this for now and start earning rewards, but you'll need KYC approved before you can redeem to your bank.</Text></View>
      <View style={screenStyles.uploadMeta}>
        <Text style={screenStyles.uploadCount}>{uploadedCount}/3 uploaded</Text>
        <Text style={screenStyles.uploadFormat}>JPG / PNG / PDF · max 5MB</Text>
      </View>
      <DocumentCard
        icon="🪪"
        title="PAN Card"
        tone="green"
        description="Clear photo of your PAN card"
        selectedFile={documents.pan}
        onCamera={() => pickFromCamera("pan")}
        onGallery={() => pickFromGallery("pan")}
      />
      <DocumentCard
        icon="🆔"
        title="Aadhaar Card"
        tone="blue"
        description="Front side showing name, photo & number"
        selectedFile={documents.aadhaar}
        onCamera={() => pickFromCamera("aadhaar")}
        onGallery={() => pickFromGallery("aadhaar")}
      />
      <DocumentCard
        icon="🧾"
        title="Cancelled Cheque"
        tone="gold"
        description="For bank account verification"
        selectedFile={documents.cheque}
        onCamera={() => pickFromCamera("cheque")}
        onGallery={() => pickFromGallery("cheque")}
      />
    </>
  );
}

function CompleteStep({ kycSubmitted, onDone }: { kycSubmitted: boolean; onDone: () => void }) {
  return (
    <View style={screenStyles.completeWrap}>
      <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={screenStyles.completeTop} />
      <Svg width="100%" height={108} viewBox="0 0 390 108" preserveAspectRatio="none" style={screenStyles.completeTopWave}>
        <Path d="M0 45 C80 22 150 24 230 48 C296 68 344 58 390 23 L390 108 L0 108 Z" fill="#f8fafc" />
      </Svg>
      <ScrollView style={screenStyles.flex} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={screenStyles.completeContent}>
        <View style={screenStyles.doneGlow}>
          <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={screenStyles.doneCircle}>
            <Text style={screenStyles.doneCheck}>✓</Text>
          </LinearGradient>
        </View>
        <Text style={screenStyles.completeTitle}>Registration Done!</Text>
        <Text style={screenStyles.completeSubtitle}>{kycSubmitted ? "Your account is active. KYC documents are submitted for review so redemptions can be unlocked after approval." : "Your account is active. Start earning rewards — add KYC later to unlock redemptions."}</Text>
        <View style={screenStyles.statusCard}>
          <View style={screenStyles.statusHeader}>
            <Text style={screenStyles.statusTitle}>ACCOUNT STATUS</Text>
            <View style={screenStyles.activePill}><View style={screenStyles.pillDot} /><Text style={screenStyles.activeText}>Active</Text></View>
          </View>
          <StatusRow icon="📱" title="Phone verified" done />
          <StatusRow icon="👤" title="Profile created" done />
          <StatusRow icon="🔗" title="Dealers mapped" done />
          <View style={screenStyles.statusDivider} />
          <StatusRow icon="🪪" title="KYC submitted" done={kycSubmitted} trailing="Pending" />
        </View>
        <View style={[screenStyles.warningBox, kycSubmitted && screenStyles.reviewBox]}>
          <Text style={screenStyles.warningIcon}>{kycSubmitted ? "✓" : "⚠"}</Text>
          <Text style={[screenStyles.warningText, kycSubmitted && screenStyles.reviewText]}>{kycSubmitted ? "KYC is submitted and pending approval from the review team" : "Complete KYC later from Profile to unlock bank redemption"}</Text>
        </View>
      </ScrollView>
      <LinearGradient colors={gradients.main} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={screenStyles.completeBottom} />
      <Svg width="100%" height={62} viewBox="0 0 390 88" preserveAspectRatio="none" style={screenStyles.completeBottomWave}>
        <Path d="M0 17 C72 39 142 43 212 26 C282 10 333 15 390 33 L390 88 L0 88 Z" fill={colors.deepGreen} />
        <Path d="M0 55 C70 38 148 36 222 55 C288 72 343 70 390 52 L390 88 L0 88 Z" fill="rgba(26,157,184,0.58)" />
      </Svg>
      <View style={screenStyles.completeFooter}>
        <Pressable onPress={onDone} style={screenStyles.startButton}>
          <Text style={screenStyles.startButtonText}>🏠  START EARNING REWARDS  →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TitleLine({ before, accent }: { before: string; accent: string }) {
  return <Text style={screenStyles.title}>{before} <Text style={screenStyles.titleAccent}>{accent}</Text></Text>;
}

function FormField({
  label,
  helper,
  wrapStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; helper?: string; wrapStyle?: object }) {
  return (
    <View style={[screenStyles.fieldWrap, wrapStyle]}>
      <Text style={screenStyles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#767f88" style={screenStyles.input} {...props} />
      {helper ? <Text style={screenStyles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

function SelectField({ label, value, muted, onPress }: { label: string; value: string; muted?: boolean; onPress: () => void }) {
  return (
    <View style={screenStyles.fieldWrap}>
      <Text style={screenStyles.fieldLabel}>{label}</Text>
      <Pressable onPress={onPress} style={screenStyles.selectBox}>
        <Text numberOfLines={1} style={[screenStyles.selectText, muted && screenStyles.selectMuted]}>{value}</Text>
        <Text style={screenStyles.selectArrow}>▾</Text>
      </Pressable>
    </View>
  );
}

function DocumentCard({
  icon,
  title,
  description,
  tone,
  selectedFile,
  onCamera,
  onGallery
}: {
  icon: string;
  title: string;
  description: string;
  tone: "green" | "blue" | "gold";
  selectedFile: KycSelection | null;
  onCamera: () => void;
  onGallery: () => void;
}) {
  return (
    <View style={[screenStyles.documentCard, selectedFile && screenStyles.documentCardSelected]}>
      <View style={[screenStyles.documentIcon, tone === "blue" && screenStyles.documentIconBlue, tone === "gold" && screenStyles.documentIconGold]}><Text style={screenStyles.documentIconText}>{icon}</Text></View>
      <View style={screenStyles.documentCopy}>
        <View style={screenStyles.documentTitleRow}>
          <Text style={screenStyles.documentTitle}>{title}</Text>
          <Text style={[screenStyles.requiredBadge, tone === "blue" && screenStyles.requiredBlue, tone === "gold" && screenStyles.requiredGold]}>REQUIRED</Text>
        </View>
        <Text style={screenStyles.documentDescription}>{description}</Text>
        {selectedFile ? <Text numberOfLines={1} style={screenStyles.selectedFileText}>✓ {selectedFile.name}</Text> : null}
      </View>
      <View style={screenStyles.documentActions}>
        <Pressable onPress={onCamera} style={screenStyles.cameraButton}><Text style={screenStyles.cameraText}>📷  Camera</Text></Pressable>
        <Pressable onPress={onGallery} style={screenStyles.galleryButton}><Text style={screenStyles.galleryText}>▣  Gallery</Text></Pressable>
      </View>
    </View>
  );
}

function StatusRow({ icon, title, done, trailing }: { icon: string; title: string; done?: boolean; trailing?: string }) {
  return (
    <View style={screenStyles.statusRow}>
      <Text style={screenStyles.statusIcon}>{icon}</Text>
      <Text style={screenStyles.statusRowTitle}>{title}</Text>
      <Text style={[screenStyles.statusTrailing, done && screenStyles.statusDone]}>{done ? "✓" : trailing}</Text>
    </View>
  );
}

function nextDealerId(dealers: MasterOption[], currentId: number | null) {
  if (!dealers.length) return null;
  const currentIndex = dealers.findIndex((dealer) => dealer.id === currentId);
  return dealers[(currentIndex + 1) % dealers.length].id;
}

function optionKey(option: MasterOption, index: number) {
  return `${option.id}-${option.name}-${index}`;
}

function locationKey(location: LocationOption, index: number) {
  return `${location.cityId || location.city}-${location.stateId || location.state}-${location.pincodeId || location.pincode}-${index}`;
}

function customerDescription(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("plumber")) return "I install KSB pumps on customer sites";
  if (lower.includes("sub")) return "I distribute KSB products to local retailers";
  return "I run a retail shop selling KSB products";
}

function formatMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length !== 10) return mobile;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

const screenStyles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  phone: { flex: 1, overflow: "hidden" },
  header: { height: 150, position: "relative", zIndex: 2 },
  headerGradient: { ...StyleSheet.absoluteFillObject },
  backButton: { position: "absolute", left: 34, top: 34, width: 50, height: 50, borderRadius: 16, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.42)", backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center" },
  backText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 22, marginTop: -2 },
  skipButton: { position: "absolute", right: 34, top: 38, height: 38, paddingHorizontal: 22, borderRadius: 18, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.45)", backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  skipText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 14 },
  dots: { position: "absolute", top: 56, alignSelf: "center", flexDirection: "row", gap: 9, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.42)" },
  dotActive: { width: 28, backgroundColor: colors.white },
  stepBadge: { position: "absolute", bottom: 8, alignSelf: "center", height: 32, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.2, borderColor: "rgba(255,255,255,0.58)", backgroundColor: "rgba(255,255,255,0.25)", flexDirection: "row", alignItems: "center", gap: 10 },
  stepBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  stepBadgeText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13, letterSpacing: 3 },
  stepBadgeNumber: { color: colors.gold },
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingBottom: 96 },
  card: { minHeight: 570, marginTop: -8, borderRadius: 28, backgroundColor: colors.white, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 28, shadowColor: colors.navy, shadowOpacity: 0.09, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
  title: { fontFamily: jakarta.extraBold, color: "#071323", fontSize: 27, lineHeight: 34, letterSpacing: 0 },
  titleAccent: { color: colors.primary },
  subtitle: { marginTop: 4, fontFamily: jakarta.medium, color: colors.muted, fontSize: 14, lineHeight: 20 },
  verifiedPill: { marginTop: 28, alignSelf: "flex-start", height: 30, borderRadius: 999, paddingHorizontal: 14, borderWidth: 1.2, borderColor: "#e2c58c", backgroundColor: "#faf0dd", flexDirection: "row", alignItems: "center", gap: 8 },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  verifiedText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 12 },
  loadingText: { marginTop: 18, fontFamily: jakarta.bold, color: colors.muted, textAlign: "center" },
  customerList: { marginTop: 26, gap: 12 },
  customerCard: { minHeight: 88, borderRadius: 18, borderWidth: 1.8, borderColor: "#dfe6ee", backgroundColor: colors.white, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  customerCardActive: { borderColor: "#c9d4de" },
  customerIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#e1f3ed", alignItems: "center", justifyContent: "center" },
  customerIcon: { fontSize: 26 },
  customerCopy: { flex: 1, paddingHorizontal: 16 },
  customerTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 17 },
  customerDescription: { marginTop: 2, fontFamily: jakarta.bold, color: colors.muted, fontSize: 12, lineHeight: 16 },
  radio: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.8, borderColor: "#dfe6ee", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary },
  tipBox: { marginTop: 2, borderRadius: 16, borderWidth: 1.2, borderStyle: "dashed", borderColor: "#dcb877", backgroundColor: "#fdf6ea", padding: 14, flexDirection: "row", gap: 12, alignItems: "center" },
  tipBoxLarge: { marginTop: 28, borderRadius: 16, borderWidth: 1.2, borderStyle: "dashed", borderColor: "#dcb877", backgroundColor: "#fdf6ea", padding: 16, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  tipIcon: { fontSize: 20 },
  tipText: { flex: 1, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 12, lineHeight: 17 },
  tipTextDark: { flex: 1, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 13, lineHeight: 21 },
  fieldWrap: { marginTop: 18 },
  fieldLabel: { marginBottom: 9, fontFamily: jakarta.extraBold, color: "#566477", fontSize: 12, letterSpacing: 2.2 },
  input: { height: 51, borderRadius: 15, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: "#fdf9f1", paddingHorizontal: 17, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 15 },
  fieldHelper: { marginTop: 6, fontFamily: jakarta.bold, color: "#9ba6b3", fontSize: 10 },
  twoCol: { flexDirection: "row", gap: 14 },
  colField: { flex: 1 },
  optionPanel: { marginTop: 10, borderRadius: 15, borderWidth: 1, borderColor: "#dfe6ee", backgroundColor: "#fdf9f1", overflow: "hidden" },
  optionPanelTitle: { paddingHorizontal: 14, paddingTop: 11, paddingBottom: 6, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  optionRow: { minHeight: 42, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#edf2f6", flexDirection: "row", alignItems: "center", gap: 10 },
  optionRowActive: { backgroundColor: "#faf0dd" },
  optionName: { flex: 1, fontFamily: jakarta.bold, color: colors.navy, fontSize: 12 },
  optionTick: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 15 },
  optionEmpty: { paddingHorizontal: 14, paddingBottom: 12, fontFamily: jakarta.bold, color: "#9aa6b3", fontSize: 11 },
  lookupLoading: { marginTop: 10, fontFamily: jakarta.bold, color: colors.primary, fontSize: 11 },
  lookupEmpty: { marginTop: 10, fontFamily: jakarta.bold, color: "#9aa6b3", fontSize: 11 },
  locationPanel: { marginTop: 10, borderRadius: 15, borderWidth: 1, borderColor: "#d6e8f6", backgroundColor: "#fdf8ee", overflow: "hidden" },
  locationRow: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#edf2f6" },
  locationCity: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 12.5 },
  locationMeta: { marginTop: 2, fontFamily: jakarta.bold, color: colors.muted, fontSize: 10.5 },
  ruleBox: { marginTop: 26, borderRadius: 16, borderWidth: 1.2, borderColor: "#f0d28a", backgroundColor: "#fffbef", padding: 16, flexDirection: "row", gap: 14, alignItems: "flex-start" },
  ruleIcon: { fontSize: 19 },
  ruleText: { flex: 1, fontFamily: jakarta.extraBold, color: "#916a00", fontSize: 12.5, lineHeight: 21 },
  selectBox: { height: 56, borderRadius: 15, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: "#fdf9f1", paddingHorizontal: 17, flexDirection: "row", alignItems: "center" },
  selectText: { flex: 1, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 15 },
  selectMuted: { color: "#9aa6b3" },
  selectArrow: { color: colors.muted, fontSize: 18, marginLeft: 8 },
  infoBox: { marginTop: 28, borderRadius: 15, backgroundColor: "#f4f7fa", padding: 15, flexDirection: "row", gap: 12, alignItems: "center" },
  infoIcon: { fontSize: 18, color: colors.blue },
  infoText: { flex: 1, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 12, lineHeight: 17 },
  uploadMeta: { marginTop: 22, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  uploadCount: { minWidth: 104, height: 28, borderRadius: 999, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: "#fdf9f1", textAlign: "center", lineHeight: 28, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 12 },
  uploadFormat: { flex: 1, textAlign: "right", fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 11 },
  documentCard: { marginTop: 14, borderRadius: 17, borderWidth: 1.2, borderStyle: "dashed", borderColor: "#d8e3ec", backgroundColor: colors.white, padding: 14, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 14 },
  documentCardSelected: { borderColor: "#dcb877", backgroundColor: "#fdf8ee" },
  documentIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#e5f5f1", alignItems: "center", justifyContent: "center" },
  documentIconBlue: { backgroundColor: "#faf0dd" },
  documentIconGold: { backgroundColor: "#fff6d9" },
  documentIconText: { fontSize: 24 },
  documentCopy: { flex: 1, minWidth: 0 },
  documentTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  documentTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 16 },
  requiredBadge: { overflow: "hidden", borderRadius: 999, backgroundColor: "#e4f6ef", paddingHorizontal: 9, paddingVertical: 3, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 9 },
  requiredBlue: { backgroundColor: "#e4f0fb", color: colors.blue },
  requiredGold: { backgroundColor: "#f7efd6", color: "#a97900" },
  documentDescription: { marginTop: 3, fontFamily: jakarta.bold, color: colors.muted, fontSize: 12, lineHeight: 17 },
  selectedFileText: { marginTop: 6, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 11 },
  documentActions: { width: "100%", flexDirection: "row", gap: 10 },
  cameraButton: { flex: 1, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cameraText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13 },
  galleryButton: { flex: 1, height: 42, borderRadius: 14, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  galleryText: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 13 },
  footer: { position: "absolute", left: 26, right: 26, bottom: 22, zIndex: 6 },
  footerButtonWrap: { borderRadius: 18, overflow: "hidden", shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  footerButton: { height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  footerButtonLight: { height: 58, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  footerButtonDisabled: { opacity: 1 },
  footerText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 15, letterSpacing: 2.2 },
  footerTextLight: { color: colors.primary },
  completeWrap: { flex: 1 },
  completeTop: { position: "absolute", left: 0, right: 0, top: 0, height: 150 },
  completeTopWave: { position: "absolute", left: 0, right: 0, top: 92 },
  completeContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 184, paddingBottom: 162, alignItems: "center" },
  doneGlow: { position: "absolute", top: 104, width: 148, height: 148, borderRadius: 74, backgroundColor: "rgba(21,89,154,0.1)", alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  doneCircle: { width: 125, height: 125, borderRadius: 63, alignItems: "center", justifyContent: "center" },
  doneCheck: { color: "#02070c", fontFamily: jakarta.extraBold, fontSize: 58 },
  completeTitle: { marginTop: 75, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 30, textAlign: "center", letterSpacing: 0 },
  completeSubtitle: { marginTop: 12, maxWidth: 330, fontFamily: jakarta.medium, color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" },
  statusCard: { width: "100%", marginTop: 30, borderRadius: 22, backgroundColor: colors.white, padding: 18, borderWidth: 1, borderColor: "#dfe6ee", shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  statusHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  statusTitle: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 12, letterSpacing: 2.8 },
  activePill: { height: 28, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.2, borderColor: "#dcb877", backgroundColor: "#faf0dd", flexDirection: "row", alignItems: "center", gap: 8 },
  activeText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 12 },
  statusRow: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 12 },
  statusIcon: { width: 20, fontSize: 16, textAlign: "center" },
  statusRowTitle: { flex: 1, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14 },
  statusTrailing: { fontFamily: jakarta.extraBold, color: "#9aa6b3", fontSize: 12 },
  statusDone: { color: colors.primary, fontSize: 20 },
  statusDivider: { height: 1, borderStyle: "dashed", borderWidth: 1, borderColor: "#dfe6ee", marginVertical: 8 },
  warningBox: { width: "90%", marginTop: 24, borderRadius: 16, borderWidth: 1.2, borderStyle: "dashed", borderColor: "#f0d28a", backgroundColor: "#fffaf0", padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  reviewBox: { borderColor: "#dcb877", backgroundColor: "#fdf6ea" },
  warningIcon: { color: "#916a00", fontSize: 20 },
  warningText: { flex: 1, fontFamily: jakarta.extraBold, color: "#916a00", fontSize: 12, lineHeight: 18 },
  reviewText: { color: colors.primary },
  completeBottom: { position: "absolute", left: 0, right: 0, bottom: 0, height: 112 },
  completeBottomWave: { position: "absolute", left: 0, right: 0, bottom: 76 },
  completeFooter: { position: "absolute", left: 26, right: 26, bottom: 20 },
  startButton: { height: 56, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", shadowColor: colors.navy, shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  startButtonText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 14, letterSpacing: 2 }
});
