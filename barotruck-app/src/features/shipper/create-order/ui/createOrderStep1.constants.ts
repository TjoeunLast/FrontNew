import type { Option } from "./createOrderStep1.types";

export const SP = {
  pageX: 16,
  sectionGap: 18,
  chipGap: 10,
};

export const CAR_TYPE_OPTIONS: Option[] = [
  { label: "카고", value: "CARGO" },
  { label: "윙바디", value: "WING" },
  { label: "탑차", value: "TOP" },
  { label: "냉동/냉장", value: "COLD" },
  { label: "리프트", value: "LIFT" },
];

export const TON_OPTIONS: Option[] = [
  { label: "1톤", value: "1T" },
  { label: "1.4톤", value: "1_4T" },
  { label: "2.5톤", value: "2_5T" },
  { label: "5톤", value: "5T" },
  { label: "11톤", value: "11T" },
];

export const RECENT_START_OPTIONS: Option[] = [
  { label: "서울 강남구 테헤란로 152 (역삼동)", value: "start_1" },
  { label: "경기 성남시 분당구 판교역로 235", value: "start_2" },
  { label: "인천 연수구 송도과학로 32", value: "start_3" },
  { label: "충남 천안시 서북구 직산읍 123-4", value: "start_4" },
  { label: "부산 강서구 녹산산업중로 45", value: "start_5" },
];

export const RECENT_ADDRESS_POOL: string[] = [
  ...RECENT_START_OPTIONS.map((x) => x.label),
  "서울 송파구 법원로 128",
  "대전 유성구 테크노중앙로 55",
  "광주 광산구 하남산단8번로 12",
  "경북 구미시 3공단로 110",
];

export const PRESET_REQUEST_TAGS: string[] = [
  "도착 전 연락",
  "취급주의",
  "세워서 적재",
  "파손주의",
  "시간 엄수",
  "주차 공간 협소",
  "야간 상차/하차",
];

export const DEFAULT_SELECTED_REQUEST_TAGS: string[] = [
];


export const DISTANCE_KM = 340;

function normalizeDistrictKey(addr: string) {
  const parts = addr.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.slice(0, 2).join(" ");
}

function normalizeProvince(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("서울")) return "서울";
  if (t.startsWith("부산")) return "부산";
  if (t.startsWith("대구")) return "대구";
  if (t.startsWith("인천")) return "인천";
  if (t.startsWith("광주")) return "광주";
  if (t.startsWith("대전")) return "대전";
  if (t.startsWith("울산")) return "울산";
  if (t.startsWith("세종")) return "세종";
  if (t.startsWith("경기")) return "경기";
  if (t.startsWith("강원")) return "강원";
  if (t.startsWith("충북")) return "충북";
  if (t.startsWith("충남")) return "충남";
  if (t.startsWith("전북")) return "전북";
  if (t.startsWith("전남")) return "전남";
  if (t.startsWith("경북")) return "경북";
  if (t.startsWith("경남")) return "경남";
  if (t.startsWith("제주")) return "제주";
  return "";
}

const PROVINCE_CENTROID: Record<string, { lat: number; lng: number }> = {
  서울: { lat: 37.5665, lng: 126.9780 },
  부산: { lat: 35.1796, lng: 129.0756 },
  대구: { lat: 35.8714, lng: 128.6014 },
  인천: { lat: 37.4563, lng: 126.7052 },
  광주: { lat: 35.1595, lng: 126.8526 },
  대전: { lat: 36.3504, lng: 127.3845 },
  울산: { lat: 35.5384, lng: 129.3114 },
  세종: { lat: 36.4800, lng: 127.2890 },
  경기: { lat: 37.2636, lng: 127.0286 },
  강원: { lat: 37.8813, lng: 127.7298 },
  충북: { lat: 36.6424, lng: 127.4890 },
  충남: { lat: 36.6588, lng: 126.6728 },
  전북: { lat: 35.8242, lng: 127.1480 },
  전남: { lat: 34.8161, lng: 126.4630 },
  경북: { lat: 36.5760, lng: 128.5057 },
  경남: { lat: 35.2285, lng: 128.6811 },
  제주: { lat: 33.4996, lng: 126.5312 },
};

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLng / 2);
  const x = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export function getEstimatedDistanceKm(startAddr: string, endAddr: string) {
  const from = normalizeDistrictKey(startAddr);
  const to = normalizeDistrictKey(endAddr);
  if (!from || !to) return 60;
  if (from === to) return 12;

  const fromParts = from.split(" ");
  const toParts = to.split(" ");
  const fromProvince = normalizeProvince(fromParts[0] ?? "");
  const toProvince = normalizeProvince(toParts[0] ?? "");
  const fromDistrict = fromParts[1] ?? "";
  const toDistrict = toParts[1] ?? "";

  if (fromProvince && toProvince && fromProvince === toProvince) {
    if (fromDistrict && toDistrict && fromDistrict === toDistrict) return 12;
    return 28;
  }

  const fromCenter = PROVINCE_CENTROID[fromProvince];
  const toCenter = PROVINCE_CENTROID[toProvince];
  if (!fromCenter || !toCenter) return 80;

  // 직선거리보다 도로거리가 길어지는 점을 반영해 보정
  const roadKm = haversineKm(fromCenter, toCenter) * 1.35;
  return Math.max(20, Math.min(420, Math.round(roadKm)));
}

function roundToThousand(v: number) {
  return Math.max(0, Math.round(v / 1000) * 1000);
}

export function getRecommendedFareByDistance(distanceKm: number) {
  // 거리 기반 기본 운임(목업): 기본요금 + km당 단가
  const baseFare = 45000;
  const perKmFare = 850;
  return roundToThousand(baseFare + Math.max(0, distanceKm) * perKmFare);
}

