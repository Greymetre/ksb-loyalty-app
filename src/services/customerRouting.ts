import { Route } from "@/navigation/routes";

const text = (value: unknown) => String(value ?? "").trim().toLowerCase();

export const customerLandingRoute = (user: any): Route => {
  const customFields = user?.custom_fields || user?.customFields || {};
  const typeId = Number(
    user?.customer_type ??
      user?.customerType ??
      user?.customertype ??
      customFields?.customer_type ??
      customFields?.customerType
  );
  const typeName = text(
    user?.customer_type_name ??
      user?.customerTypeName ??
      user?.customertype_name ??
      customFields?.customer_type_name ??
      customFields?.customerTypeName
  );

  return typeId === 1 || typeName.includes("dealer") || typeName.includes("distributor")
    ? "DealerHome"
    : "Home";
};

export const authResponseUser = (response: any) =>
  response?.user ||
  response?.retailer ||
  response?.customer ||
  response?.data?.user ||
  response?.data?.retailer ||
  response?.data?.customer ||
  null;
