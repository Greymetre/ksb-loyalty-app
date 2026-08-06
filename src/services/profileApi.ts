import { apiClient } from "@/services/apiClient";
import { saveUser } from "@/services/storage";

export type ProfileData = {
  id?: number;
  customerId?: number;
  ownerName: string;
  firmName: string;
  mobile: string;
  email: string;
  gstNumber: string;
  address: string;
  city: string;
  cityId?: number | null;
  state: string;
  stateId?: number | null;
  pincode: string;
  pincodeId?: number | null;
  customerType: string;
  kycStatus: string;
};

const sourceOf = (raw: any) => raw?.data?.profile || raw?.data?.user || raw?.data?.retailer || raw?.data || raw?.profile || raw?.user || raw?.retailer || raw || {};

const maybeNumber = (value: any) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const textValue = (...values: any[]) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const next = String(value).trim();
    if (next) return next;
  }
  return "";
};

const normalizeProfile = (raw: any): ProfileData => {
  const source = sourceOf(raw);
  const customFields = source.custom_fields || source.customFields || {};
  return {
    id: Number(source.id || source.retailer_id || source.retailerId || source.customer_id || source.customerId) || undefined,
    customerId: Number(source.customer_id || source.customerId || source.retailer_id || source.retailerId || source.id) || undefined,
    ownerName: textValue(source.owner_name, source.ownerName, customFields.owner_name, customFields.ownerName, source.name, customFields.name, source.full_name, source.fullName),
    firmName: textValue(source.shop_name, source.shopName, customFields.shop_name, customFields.shopName, source.firm_name, source.firmName, source.business_name, source.businessName),
    mobile: textValue(source.mobile, customFields.mobile, source.phone, customFields.mobile_number, customFields.mobileNumber, customFields.contact_number, customFields.contactNumber),
    email: textValue(source.email, customFields.email),
    gstNumber: textValue(source.gst_number, source.gstNumber, customFields.gst_number, customFields.gstNumber),
    address: textValue(source.address, source.address_line, source.addressLine, customFields.address, customFields.address_line, customFields.addressLine),
    city: textValue(source.city, source.city_name, source.cityName, customFields.city, customFields.city_name, customFields.cityName),
    cityId: maybeNumber(source.city_id ?? source.cityId ?? source.city?.id ?? customFields.city_id ?? customFields.cityId),
    state: textValue(source.state, source.state_name, source.stateName, customFields.state, customFields.state_name, customFields.stateName),
    stateId: maybeNumber(source.state_id ?? source.stateId ?? source.state?.id ?? source.city?.state_id ?? customFields.state_id ?? customFields.stateId),
    pincode: textValue(source.pincode, source.pin_code, source.pinCode, customFields.pincode, customFields.pin_code, customFields.pinCode),
    pincodeId: maybeNumber(source.pincode_id ?? source.pincodeId ?? source.pin_code_id ?? source.pinCodeId ?? source.pincode?.id ?? customFields.pincode_id ?? customFields.pincodeId),
    customerType: textValue(source.customer_type_name, source.customerTypeName, source.customer_type, source.customerType, customFields.customer_type, customFields.customerType),
    kycStatus: textValue(source.kyc_status, source.kycStatus, source.kyc_status_label, source.kycStatusLabel, source.kyc?.status)
  };
};

const toPayload = (profile: ProfileData) => ({
  owner_name: profile.ownerName,
  shop_name: profile.firmName,
  mobile: profile.mobile,
  email: profile.email,
  gst_number: profile.gstNumber,
  address: profile.address,
  address_line: profile.address,
  city: profile.city,
  city_id: profile.cityId || undefined,
  state: profile.state,
  state_id: profile.stateId || undefined,
  pincode: profile.pincode,
  pincode_id: profile.pincodeId || undefined
});

export const profileApi = {
  async get() {
    const { data } = await apiClient.get("/profile");
    const profile = normalizeProfile(data);
    await saveUser(sourceOf(data));
    return profile;
  },
  async update(profile: ProfileData) {
    const { data } = await apiClient.put("/profile", toPayload(profile));
    const updated = normalizeProfile(data?.data || data);
    await saveUser(sourceOf(data));
    return updated;
  }
};
