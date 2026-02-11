export type LoadDayType = "당상(오늘)" | "익상(내일)" | "직접 지정";
export type ArriveType = "당착" | "익착" | "내착";
export type DispatchType = "instant" | "direct";
export type PayType = "card" | "prepaid" | "receipt30" | "monthEnd";

export type Option = { label: string; value: string };
export type PhotoItem = { id: string; name: string };

export const LOAD_DAY_OPTIONS: LoadDayType[] = ["당상(오늘)", "익상(내일)", "직접 지정"];
export const ARRIVE_OPTIONS: ArriveType[] = ["당착", "익착", "내착"];

export const PAYMENT_OPTIONS: { value: PayType; title: string; desc: string }[] = [
  { value: "card", title: "카드 결제", desc: "수수료 10%" },
  { value: "prepaid", title: "선/착불", desc: "상하차 시 지급" },
  { value: "receipt30", title: "인수증 (30일)", desc: "계산서 발행" },
  { value: "monthEnd", title: "익월말", desc: "회사 정기결제" },
];
