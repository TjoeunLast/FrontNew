export type ShipperOrderDetailMockItem = {
  status: "REQUESTED" | "ACCEPTED" | "IN_TRANSIT" | "COMPLETED";
  from: string;
  to: string;
  distanceKm: number;
  cargo: string;
  priceWon: number;
  loadMethod: string;
  workType: string;
  driverNickname?: string;
  driverPhone?: string;
  requestTags?: string[];
};

export function getShipperOrderMockTimesById(_id: string) {
  return { pickup: "09:00", dropoff: "15:00" };
}

export const SHIPPER_ORDER_DETAIL_MOCK_MAP: Record<string, ShipperOrderDetailMockItem> = {};
