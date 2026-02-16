const toBool = (v: string | undefined) =>
  ["1", "true", "yes", "on"].includes(String(v ?? "").trim().toLowerCase());

export const USE_SHIPPER_MOCK =
  toBool(process.env.EXPO_PUBLIC_USE_SHIPPER_MOCK) || toBool(process.env.EXPO_PUBLIC_USE_MOCK);
