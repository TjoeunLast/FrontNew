export type PaymentMethodCode = "card" | "prepaid" | "receipt30" | "monthEnd";

export type EnabledShipperPaymentMethod = Extract<PaymentMethodCode, "card" | "prepaid">;

// 화주 결제에서 실제로 활성화하는 방식은 토스(card), 착불(prepaid)만 사용.
export const ENABLED_SHIPPER_PAYMENT_OPTIONS: Array<{
  value: EnabledShipperPaymentMethod;
  title: string;
  desc: string;
}> = [
  {
    value: "card",
    title: "토스 결제",
    desc: "카드 결제(Toss)",
  },
  {
    value: "prepaid",
    title: "착불 결제",
    desc: "기사님 운송 완료 후 결제",
  },
];

const normalizeRaw = (raw?: string | null) => String(raw ?? "").trim().toLowerCase();

export function normalizePaymentMethod(raw?: string | null): PaymentMethodCode | undefined {
  // 백엔드/기존 데이터의 다양한 표기를 공통 결제 코드로 정규화.
  const value = normalizeRaw(raw);
  if (!value) return undefined;

  if (value.includes("card") || value.includes("toss") || value.includes("카드")) {
    return "card";
  }

  if (
    value.includes("prepaid") ||
    value.includes("cash") ||
    value.includes("현금") ||
    value.includes("선불") ||
    value.includes("착불") ||
    value.includes("postpaid")
  ) {
    return "prepaid";
  }

  if (value.includes("receipt") || value.includes("영수증") || value.includes("receipt30")) {
    return "receipt30";
  }

  if (value.includes("month") || value.includes("월말")) {
    return "monthEnd";
  }

  return undefined;
}

export function isShipperActivePaymentMethod(
  raw?: string | null,
): raw is EnabledShipperPaymentMethod {
  // 화주 화면에서는 card/prepaid만 노출 대상.
  const normalized = normalizePaymentMethod(raw);
  return normalized === "card" || normalized === "prepaid";
}

export function isTossPayment(raw?: string | null) {
  return normalizePaymentMethod(raw) === "card";
}

export function isCashPayment(raw?: string | null) {
  return normalizePaymentMethod(raw) === "prepaid";
}

export const isDeferredPayment = isCashPayment;
export function toPaymentMethodLabel(raw?: string | null) {
  // UI 표시는 정책 기준 라벨로 통일한다.
  const value = normalizePaymentMethod(raw);
  if (value === "card") return "토스 결제";
  if (value === "prepaid") return "착불 결제";
  if (value === "receipt30") return "Receipt (30 days)";
  if (value === "monthEnd") return "Month End Settlement";
  return (raw ?? "").trim() || "-";
}
