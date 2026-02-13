import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalShipperOrderStatus = "MATCHING" | "CONFIRMED" | "DRIVING" | "DONE";
export type LocalDispatchMode = "instant" | "direct";

export type LocalShipperOrderItem = {
  id: string;
  status: LocalShipperOrderStatus;
  dispatchMode?: LocalDispatchMode;
  pickupTypeLabel?: string;
  dropoffTypeLabel?: string;
  from: string;
  to: string;
  pickupTimeHHmm?: string;
  dropoffTimeHHmm?: string;
  distanceKm: number;
  cargoSummary: string;
  loadMethod?: string;
  workTool?: string;
  priceWon: number;
  updatedAtLabel: string;
};

const localShipperOrders: LocalShipperOrderItem[] = [];
const STORAGE_KEY = "baro_local_shipper_orders_v1";
let hydrated = false;

function isLocalOrderItem(v: any): v is LocalShipperOrderItem {
  return (
    v &&
    typeof v === "object" &&
    typeof v.id === "string" &&
    typeof v.status === "string" &&
    typeof v.from === "string" &&
    typeof v.to === "string" &&
    typeof v.distanceKm === "number" &&
    typeof v.cargoSummary === "string" &&
    typeof v.priceWon === "number" &&
    typeof v.updatedAtLabel === "string"
  );
}

async function persistLocalShipperOrders() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localShipperOrders));
  } catch {
    // ignore persistence failure
  }
}

export async function hydrateLocalShipperOrders() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const rows = parsed.filter(isLocalOrderItem);
    localShipperOrders.splice(0, localShipperOrders.length, ...rows);
  } catch {
    // ignore hydration failure
  }
}

export function getLocalShipperOrders() {
  return [...localShipperOrders];
}

export function addLocalShipperOrder(order: LocalShipperOrderItem) {
  localShipperOrders.unshift(order);
  void persistLocalShipperOrders();
}
