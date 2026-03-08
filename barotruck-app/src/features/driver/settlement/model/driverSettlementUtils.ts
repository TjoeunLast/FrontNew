import { normalizeTransportPaymentStatus } from "@/shared/api/paymentService";
import type { OrderResponse } from "@/shared/models/order";
import type {
  TransportPaymentStatus,
  PaymentDisputeReason,
} from "@/shared/models/payment";
import {
  calcOrderAmount,
  toSettlementStatusFromSettlement,
} from "@/features/common/settlement/lib/settlementHelpers";
import {
  isShipperActivePaymentMethod,
  isDeferredPayment,
  isTossPayment,
  toPaymentMethodLabel,
} from "@/features/common/payment/lib/paymentMethods";

export type SettlementFilter = "ALL" | "PENDING" | "PAID";
export type SettlementStatus = "UNPAID" | "PENDING" | "PAID" | "TAX_INVOICE";

export type SettlementItem = {
  id: string;
  orderId: number;
  scheduledAt: Date;
  dateLabel: string;
  status: SettlementStatus;
  from: string;
  to: string;
  amount: number;
  payMethodLabel: string;
  isToss: boolean;
  paymentStatus?: TransportPaymentStatus;
  supportsDriverConfirm: boolean;
  canConfirmByDriver: boolean;
  canDispute: boolean;
};

export const DISPUTE_REASON_OPTIONS: Array<{
  value: PaymentDisputeReason;
  label: string;
  hint: string;
}> = [
  {
    value: "RECEIVED_AMOUNT_MISMATCH",
    label: "미수령/금액불일치",
    hint: "화주가 결제완료 처리했지만 실제 입금이 확인되지 않았습니다.",
  },
  {
    value: "PRICE_MISMATCH",
    label: "청구 금액 불일치",
    hint: "합의한 운임/추가금과 결제 금액이 다릅니다.",
  },
  {
    value: "PROOF_MISSING",
    label: "증빙 누락",
    hint: "입금 증빙 또는 정산 자료가 부족합니다.",
  },
  {
    value: "FRAUD_SUSPECTED",
    label: "이상 거래 의심",
    hint: "허위 처리나 비정상 결제 정황이 있습니다.",
  },
  { value: "OTHER", label: "기타", hint: "기타 사유를 상세히 적어 주세요." },
];

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function addMonth(d: Date, diff: number) {
  return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}
export function compareMonth(a: Date, b: Date) {
  if (a.getFullYear() !== b.getFullYear())
    return a.getFullYear() - b.getFullYear();
  return a.getMonth() - b.getMonth();
}
export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
export function toMonthLabel(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export function toShortPlace(v?: string) {
  if (!v) return "-";
  const parts = v.trim().split(/\s+/).filter(Boolean);
  return parts.length <= 1 ? parts[0] || "-" : `${parts[0]} ${parts[1]}`;
}

export function parseDate(v?: string) {
  if (!v) return null;
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateLabel(d: Date) {
  const w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}.${d.getDate()} (${w})`;
}

export function toDriverSettlementStatus(
  paymentStatus?: TransportPaymentStatus,
): SettlementStatus {
  if (
    paymentStatus === "PAID" ||
    paymentStatus === "DISPUTED" ||
    paymentStatus === "ADMIN_HOLD" ||
    paymentStatus === "ADMIN_REJECTED"
  )
    return "PENDING";
  if (
    paymentStatus === "CONFIRMED" ||
    paymentStatus === "ADMIN_FORCE_CONFIRMED"
  )
    return "PAID";
  return "UNPAID";
}

export function toDriverActionLabel(
  item: Pick<SettlementItem, "isToss" | "paymentStatus" | "canConfirmByDriver">,
) {
  if (item.canConfirmByDriver)
    return item.isToss ? "토스 결제확인" : "착불 결제확인";
  if (
    item.paymentStatus === "DISPUTED" ||
    item.paymentStatus === "ADMIN_HOLD" ||
    item.paymentStatus === "ADMIN_REJECTED"
  )
    return "이의 처리중";
  return "화주 결제 대기";
}

export function resolveDriverPaymentStatus(
  order: OrderResponse,
): TransportPaymentStatus | undefined {
  const direct = normalizeTransportPaymentStatus(order.paymentSummary?.status);
  const fallback = toSettlementStatusFromSettlement(order.settlementStatus);
  const fromSettlement =
    fallback === "PENDING"
      ? "PAID"
      : fallback === "PAID"
        ? "CONFIRMED"
        : fallback === "UNPAID"
          ? "READY"
          : undefined;
  if (
    direct === "DISPUTED" ||
    direct === "ADMIN_HOLD" ||
    direct === "ADMIN_REJECTED"
  )
    return direct;
  if (fromSettlement === "CONFIRMED") return fromSettlement;
  if (fromSettlement === "PAID" && (!direct || direct === "READY"))
    return fromSettlement;
  return direct ?? fromSettlement;
}

export function mapOrderToSettlement(
  order: OrderResponse,
): SettlementItem | null {
  if (order.status !== "COMPLETED") {
    return null;
  }

  const supportsDriverConfirm =
    isTossPayment(order.payMethod) || isDeferredPayment(order.payMethod);
  if (
    !isShipperActivePaymentMethod(order.payMethod) ||
    !supportsDriverConfirm
  ) {
    return null;
  }

  const scheduledAt =
    parseDate(order.endSchedule) ||
    parseDate(order.startSchedule) ||
    parseDate(order.updated) ||
    parseDate(order.createdAt);

  if (!scheduledAt) return null;

  const paymentStatus = resolveDriverPaymentStatus(order);
  const status = toDriverSettlementStatus(paymentStatus);
  return {
    id: String(order.orderId),
    orderId: Number(order.orderId),
    scheduledAt,
    dateLabel: toDateLabel(scheduledAt),
    status,
    from: toShortPlace(order.startAddr || order.startPlace),
    to: toShortPlace(order.endAddr || order.endPlace),
    amount: calcOrderAmount(order),
    payMethodLabel: toPaymentMethodLabel(order.payMethod),
    isToss: isTossPayment(order.payMethod),
    paymentStatus,
    supportsDriverConfirm,
    canConfirmByDriver: paymentStatus === "PAID",
    canDispute:
      paymentStatus === "PAID" ||
      paymentStatus === "DISPUTED" ||
      paymentStatus === "ADMIN_HOLD" ||
      paymentStatus === "ADMIN_REJECTED",
  };
}
