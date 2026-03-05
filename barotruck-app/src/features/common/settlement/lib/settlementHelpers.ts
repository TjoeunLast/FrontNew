import type { OrderResponse } from "@/shared/models/order";

export type SettlementUiStatus = "UNPAID" | "PENDING" | "PAID" | "TAX_INVOICE";

export function toWon(v: number) {
  return `${Number(v).toLocaleString("ko-KR")}원`;
}

export function toSettlementStatusFromRaw(raw?: string | null): SettlementUiStatus {
  // 백엔드 정산 상태값을 화면 공통 상태(UNPAID/PENDING/PAID)로 매핑.
  const v = String(raw ?? "").toUpperCase();

  if (v === "COMPLETED" || v === "PAID" || v === "CONFIRMED") return "PAID";
  if (v === "WAIT" || v === "DISPUTED") return "PENDING";
  if (v === "READY" || v === "UNPAID" || v === "INIT") return "UNPAID";
  if (v.includes("WAIT")) return "PENDING";
  if (v.includes("COMPLETE") || v.includes("DONE") || v.includes("SUCCESS")) return "PAID";

  return "UNPAID";
}

export function toSettlementStatus(row: OrderResponse): SettlementUiStatus {
  // 영수증/월말 방식은 결제 버튼 대신 세금계산서 흐름으로 분기.
  const isTaxInvoice =
    String(row.payMethod ?? "").toLowerCase().includes("receipt") ||
    String(row.payMethod ?? "").includes("영수증");

  if (isTaxInvoice) return "TAX_INVOICE";

  return toSettlementStatusFromRaw(row.settlementStatus);
}

export function statusText(status: SettlementUiStatus) {
  if (status === "UNPAID") return "Unpaid";
  if (status === "PENDING") return "Waiting";
  if (status === "PAID") return "Paid";
  return "Tax Invoice";
}

export function calcOrderAmount(row: OrderResponse) {
  // 정산 금액은 기본 운임 + 인건비 + 포장비 + 보험료 합산으로 계산.
  return (
    Number(row.basePrice ?? 0) +
    Number(row.laborFee ?? 0) +
    Number(row.packagingPrice ?? 0) +
    Number(row.insuranceFee ?? 0)
  );
}
