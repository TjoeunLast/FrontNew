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

export const DEFAULT_PHOTOS = [{ id: "p1", name: "IMG_01" }];

export const DISTANCE_KM = 340;

function normalizeDistrictKey(addr: string) {
  const parts = addr.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.slice(0, 2).join(" ");
}

function hashSeed(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

function between(min: number, max: number, seed: number) {
  const span = Math.max(1, max - min + 1);
  return min + (seed % span);
}

export function getEstimatedDistanceKm(startAddr: string, endAddr: string) {
  const from = normalizeDistrictKey(startAddr);
  const to = normalizeDistrictKey(endAddr);
  if (!from || !to) return DISTANCE_KM;
  if (from === to) return 12;

  const fromCity = from.split(" ")[0];
  const toCity = to.split(" ")[0];
  const seed = hashSeed(`${from}|${to}`);

  if (fromCity === toCity) return between(18, 55, seed);
  return between(70, 380, seed);
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
