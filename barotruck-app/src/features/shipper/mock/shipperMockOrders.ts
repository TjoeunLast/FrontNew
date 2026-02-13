export type ShipperMockOrder = {
  id: string;
  status: "MATCHING" | "DISPATCHED" | "DRIVING" | "DONE";
  isInstantDispatch?: boolean;
  pickupTypeLabel?: string;
  dropoffTypeLabel?: string;
  from: string;
  to: string;
  distanceKm: number;
  cargoSummary: string;
  loadMethodShort: string;
  workToolShort: string;
  priceWon: number;
  updatedAtLabel: string;
  updatedAtMs?: number;
  pickupTimeHHmm?: string;
  dropoffTimeHHmm?: string;
};

function toHHmmFromNow(offsetMinutes: number) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export const MOCK_SHIPPER_ORDERS: ShipperMockOrder[] = [
  {
    id: "wm1",
    status: "MATCHING",
    from: "서울 강남구",
    to: "인천 연수구",
    distanceKm: 38,
    cargoSummary: "2.5톤 카고",
    loadMethodShort: "혼",
    workToolShort: "수",
    priceWon: 98000,
    updatedAtLabel: "5분 전",
    pickupTimeHHmm: "10:00",
    dropoffTimeHHmm: "12:00",
  },
  {
    id: "wm2",
    status: "MATCHING",
    from: "경기 화성시",
    to: "충북 청주시",
    distanceKm: 95,
    cargoSummary: "5톤 윙바디",
    loadMethodShort: "독",
    workToolShort: "지",
    priceWon: 185000,
    updatedAtLabel: "12분 전",
    pickupTimeHHmm: "11:00",
    dropoffTimeHHmm: "14:00",
  },
  {
    id: "wd1",
    status: "DISPATCHED",
    isInstantDispatch: true,
    from: "서울 구로구",
    to: "경기 수원시",
    distanceKm: 45,
    cargoSummary: "1톤 용달",
    loadMethodShort: "혼",
    workToolShort: "수",
    priceWon: 82000,
    updatedAtLabel: "오늘 09:30 상차",
    pickupTimeHHmm: "09:30",
    dropoffTimeHHmm: "11:30",
  },
  {
    id: "wd2",
    status: "DISPATCHED",
    from: "인천 남동구",
    to: "대전 유성구",
    distanceKm: 120,
    cargoSummary: "5톤 카고",
    loadMethodShort: "독",
    workToolShort: "크",
    priceWon: 210000,
    updatedAtLabel: "오늘 13:00 상차",
    pickupTimeHHmm: "13:00",
    dropoffTimeHHmm: "16:30",
  },
    {
    id: "wp1",
    status: "DRIVING",
    from: "경기 고양시",
    to: "강원 원주시",
    distanceKm: 114,
    cargoSummary: "11톤 윙바디",
    loadMethodShort: "독",
    workToolShort: "지",
    priceWon: 265000,
    updatedAtLabel: "방금 전",
    updatedAtMs: Date.now() + 60_000,
    pickupTimeHHmm: toHHmmFromNow(-70),
    dropoffTimeHHmm: toHHmmFromNow(50),
  },
  {
    id: "wp2",
    status: "DRIVING",
    from: "울산 남구",
    to: "경남 창원시",
    distanceKm: 54,
    cargoSummary: "3.5톤 윙바디",
    loadMethodShort: "혼",
    workToolShort: "수",
    priceWon: 120000,
    updatedAtLabel: "오늘 10:20 상차",
    pickupTimeHHmm: "10:20",
    dropoffTimeHHmm: "12:10",
  },
  {
    id: "wc1",
    status: "DONE",
    from: "부산 사상구",
    to: "경남 김해시",
    distanceKm: 19,
    cargoSummary: "1톤 탑차",
    loadMethodShort: "혼",
    workToolShort: "수",
    priceWon: 52000,
    updatedAtLabel: "어제 완료",
    pickupTimeHHmm: "09:00",
    dropoffTimeHHmm: "10:20",
  },
  {
    id: "wc2",
    status: "DONE",
    from: "대구 달서구",
    to: "경북 구미시",
    distanceKm: 34,
    cargoSummary: "2.5톤 카고",
    loadMethodShort: "혼",
    workToolShort: "수",
    priceWon: 90000,
    updatedAtLabel: "2일 전 완료",
    pickupTimeHHmm: "08:30",
    dropoffTimeHHmm: "10:30",
  },
];


