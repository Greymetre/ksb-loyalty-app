import { Platform } from "react-native";

import { apiClient } from "@/services/apiClient";
import { DEVICE_NAME, INSTALLED_APP_VERSION, getDeviceId } from "./appVersion";
import { saveToken, saveUser } from "@/services/storage";

export type RegistrationPayload = {
  mobile: string;
  email: string;
  password: string;
  customerType: string;
  customerTypeId?: number | null;
  fullName: string;
  firmName: string;
  gstNumber?: string;
  address: string;
  city: string;
  cityId?: number | null;
  pincode: string;
  pincodeId?: number | null;
  state: string;
  stateId?: number | null;
  dealerId?: number | null;
};

export type MasterOption = {
  id: number;
  name: string;
};

export type LocationLookupParams = {
  pincode?: string;
  city?: string;
  state_id?: number | null;
};

export type LocationOption = {
  city: string;
  cityId?: number | null;
  state: string;
  stateId?: number | null;
  pincode: string;
  pincodeId?: number | null;
};

const normalizeOptions = (value: any): MasterOption[] => {
  const list = Array.isArray(value?.data)
    ? value.data
    : Array.isArray(value?.states)
      ? value.states
      : Array.isArray(value?.items)
        ? value.items
        : Array.isArray(value)
          ? value
          : [];
  return list
    .map((item: any) => ({
      id: Number(item?.id ?? item?.value ?? item?.customer_type ?? item?.customerType ?? item?.state_id ?? item?.stateId),
      name: String(item?.name ?? item?.label ?? item?.title ?? item?.customer_type_name ?? item?.customerTypeName ?? item?.state_name ?? item?.stateName ?? "").trim()
    }))
    .filter((item: MasterOption) => Number.isFinite(item.id) && item.name.length > 0);
};

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

const normalizeLocations = (value: any): LocationOption[] => {
  const list = Array.isArray(value?.data)
    ? value.data
    : Array.isArray(value?.locations)
      ? value.locations
      : Array.isArray(value?.items)
        ? value.items
        : Array.isArray(value)
          ? value
          : [];
  const seen = new Set<string>();
  return list
    .flatMap((item: any) => {
      const city = textValue(item?.city_name, item?.cityName, item?.city?.city_name, item?.city?.cityName, item?.city?.name, item?.city, item?.name);
      const state = textValue(item?.state_name, item?.stateName, item?.state?.state_name, item?.state?.stateName, item?.state?.name, item?.state);
      const cityId = maybeNumber(item?.city_id ?? item?.cityId ?? item?.city?.id);
      const stateId = maybeNumber(item?.state_id ?? item?.stateId ?? item?.state?.id ?? item?.city?.state_id);
      const pincodes = Array.isArray(item?.pincodes) ? item.pincodes : [];
      const flatPincode = textValue(item?.pincode, item?.pin_code, item?.pinCode, item?.postal_code, item?.pincode?.pincode, item?.pincode?.code);
      const flatPincodeId = maybeNumber(item?.pincode_id ?? item?.pincodeId ?? item?.pin_code_id ?? item?.pinCodeId ?? item?.pincode?.id);

      if (pincodes.length) {
        return pincodes.map((pin: any) => ({
          city,
          cityId: cityId ?? maybeNumber(pin?.city_id ?? pin?.cityId),
          state,
          stateId,
          pincode: textValue(pin?.pincode, pin?.pin_code, pin?.pinCode, pin?.postal_code, pin?.code),
          pincodeId: maybeNumber(pin?.id ?? pin?.pincode_id ?? pin?.pincodeId ?? pin?.pin_code_id ?? pin?.pinCodeId)
        }));
      }

      return [{
        city,
        cityId,
        state,
        stateId,
        pincode: flatPincode,
        pincodeId: flatPincodeId
      }];
    })
    .filter((item: LocationOption) => item.city || item.state || item.pincode)
    .filter((item: LocationOption) => {
      const key = `${item.cityId || item.city}|${item.stateId || item.state}|${item.pincodeId || item.pincode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const registrationApi = {
  async dealers(type: "agri" | "domestic", search = "") {
    const { data } = await apiClient.get(`/dealers?search=${encodeURIComponent(search)}`);
    return normalizeOptions(data?.data || data);
  },
  async register(payload: RegistrationPayload) {
    const typeName = payload.customerType.toLowerCase();
    const isInfluencer = typeName.includes("plumber") || typeName.includes("sub");
    const { data } = await apiClient.post("/retailer/register", {
      app_type: isInfluencer ? "influencer" : "retailer",
      customer_type: payload.customerTypeId,
      owner_name: payload.fullName,
      shop_name: payload.firmName,
      mobile: payload.mobile,
      email: payload.email,
      password: payload.password,
      address: payload.address,
      state_id: payload.stateId || Number(payload.state) || undefined,
      city_id: payload.cityId || Number(payload.city) || undefined,
      pincode: payload.pincode,
      pincode_id: payload.pincodeId || undefined,
      dealer_id: payload.dealerId || undefined,
      profession: isInfluencer ? payload.customerType : undefined,
      gst_number: payload.gstNumber,
      device_type: Platform.OS,
      device_name: DEVICE_NAME || "KSB-VRiDDHi",
      unique_id: (await getDeviceId()) || undefined,
      app_version: INSTALLED_APP_VERSION || undefined
    });
    const token = data?.access_token || data?.token || data?.data?.access_token || data?.data?.token;
    if (token) {
      await saveToken(token);
    }
    const user = data?.user || data?.retailer || data?.customer || data?.data?.user || data?.data?.retailer || data?.data?.customer;
    if (user) {
      await saveUser(user);
    }
    return data;
  },
  async customerTypes() {
    const { data } = await apiClient.get("/masters/customer-types");
    return normalizeOptions(data?.data || data);
  },
  async states(search = "") {
    const { data } = await apiClient.get("/masters/states", { params: search ? { search } : undefined });
    return normalizeOptions(data?.data || data);
  },
  async locationLookup(params: LocationLookupParams) {
    const { data } = await apiClient.get("/masters/location-lookup", { params });
    return normalizeLocations(data?.data || data);
  }
};
