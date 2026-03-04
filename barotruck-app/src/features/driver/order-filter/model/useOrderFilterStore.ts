import { create } from "zustand";

interface FilterState {
  // 1. 지역 및 거리
  selectedRegions: string[];
  destRegions: string[]; // 하차지 필드 추가
  radius: number;

  // 2. 차량 및 화물
  carTypes: string[];
  tonnages: string[];
  loadMethod: string | null;

  // 3. 운행 및 작업 조건
  driveMode: string | null;
  isManualWork: boolean | null;
  uploadDate: string | null;

  // 4. 수익 및 결제
  minPrice: number;
  payMethods: string[];

  // 액션
  setFilter: (key: keyof FilterState, value: any) => void;
  resetFilters: () => void;
  getAppliedCount: () => number;
}

export const useOrderFilterStore = create<FilterState>((set, get) => ({
  // 초기값 설정
  selectedRegions: [],
  destRegions: [],
  radius: 999,
  carTypes: [],
  tonnages: [],
  loadMethod: null,
  driveMode: null,
  isManualWork: null,
  uploadDate: null,
  minPrice: 0,
  payMethods: [], // 초기값 추가

  // 값 변경 함수
  setFilter: (key, value) => set((state) => ({ ...state, [key]: value })),

  // 초기화 함수
  resetFilters: () =>
    set({
      selectedRegions: [],
      destRegions: [],
      radius: 999,
      carTypes: [],
      tonnages: [],
      loadMethod: null,
      driveMode: null,
      isManualWork: null,
      uploadDate: null,
      minPrice: 0,
      payMethods: [],
    }),

  // 적용된 필터 개수 계산 (배지용)
  getAppliedCount: () => {
    const state = get();
    let count = 0;

    // 다중 선택 배열 항목 개수 합산
    count += state.selectedRegions.length;
    count += state.destRegions?.length || 0;
    count += state.carTypes.length;
    count += state.tonnages.length;
    count += state.payMethods.length;

    // 단일 선택 항목 (기본값이 아닐 때만 +1)
    if (state.radius !== 999) count++;
    if (state.loadMethod !== null) count++;
    if (state.driveMode !== null) count++;
    if (state.isManualWork !== null) count++;
    if (state.uploadDate !== null) count++;
    if (state.minPrice > 0) count++;

    return count;
  },
}));
