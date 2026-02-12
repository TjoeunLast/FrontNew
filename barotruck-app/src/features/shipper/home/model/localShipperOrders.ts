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

export function getLocalShipperOrders() {
  return [...localShipperOrders];
}

export function addLocalShipperOrder(order: LocalShipperOrderItem) {
  localShipperOrders.unshift(order);
}
