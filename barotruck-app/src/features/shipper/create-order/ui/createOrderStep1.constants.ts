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
  "지게차 상하차",
  "수작업 없음",
  "도착 전 연락",
  "비오면 안됨",
  "취급주의",
  "세워서 적재",
  "파손주의",
  "시간 엄수",
  "냉장/냉동",
  "상하차 대기 없음",
  "주차 공간 협소",
  "야간 상차/하차",
];

export const DEFAULT_SELECTED_REQUEST_TAGS: string[] = [
  "지게차 상하차",
  "수작업 없음",
  "도착 전 연락",
  "비오면 안됨",
];

export const DEFAULT_PHOTOS = [{ id: "p1", name: "IMG_01" }];

export const DISTANCE_KM = 340;
export const AI_FARE = 320000;
