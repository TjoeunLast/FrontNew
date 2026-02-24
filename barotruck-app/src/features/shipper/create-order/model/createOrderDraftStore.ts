export type CreateOrderDraft = {
  startSelected: string;
  startAddrDetail: string;
  startContact: string;
  loadDay: "당상" | "익상" | "직접 지정";
  loadDateISO: string;
  startTimeHHmm: string;

  endAddr: string;
  endAddrDetail: string;
  endContact: string;
  endTimeHHmm: string;
  arriveType: "당착" | "익착" | "내착";

  carType: { label: string; value: string };
  ton: { label: string; value: string };

  cargoDetail: string;
  weightTon: string;

  requestTags: string[];
  requestText: string;

  dispatch: "instant" | "direct";
  tripType: "oneWay" | "roundTrip";
  pay: "card" | "prepaid" | "receipt30" | "monthEnd";

  distanceKm: number;
  appliedFare: number;
};

let draft: CreateOrderDraft | null = null;

// ✅ 멀티스텝 폼 임시 저장소(메모리). 앱 재시작/리로드하면 초기화됨.
export function setCreateOrderDraft(next: CreateOrderDraft) {
  draft = next;
}
export function getCreateOrderDraft() {
  return draft;
}
export function clearCreateOrderDraft() {
  draft = null;
}

