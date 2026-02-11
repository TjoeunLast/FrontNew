export type LocalShipperOrderStatus = "MATCHING" | "DRIVING" | "DONE";

export type LocalShipperOrderItem = {
  id: string;
  status: LocalShipperOrderStatus;
  from: string;
  to: string;
  distanceKm: number;
  cargoSummary: string;
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
