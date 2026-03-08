import type { OrderResponse, OrderStatus } from "@/shared/models/order";

export type ActionButtonConfig = {
  text: string;
  icon:
    | "time-outline"
    | "people-outline"
    | "checkmark-done-circle-outline"
    | "star-outline"
    | "navigate-circle-outline";
  color: string;
  disabled?: boolean;
};

export type OrderStatusInfo = {
  label: string;
  tone: "warning" | "info" | "neutral";
};

export type OrderDetailStatusGroup =
  | "WAITING"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export function getOrderStatusInfo(status?: string): OrderStatusInfo {
  switch (String(status ?? "").toUpperCase()) {
    case "APPLIED":
      return { label: "승인 대기", tone: "warning" };
    case "ACCEPTED":
      return { label: "배차 확정", tone: "info" };
    case "LOADING":
      return { label: "상차 작업 중", tone: "neutral" };
    case "IN_TRANSIT":
      return { label: "이동 중", tone: "neutral" };
    case "UNLOADING":
      return { label: "하차 작업 중", tone: "neutral" };
    case "COMPLETED":
      return { label: "운송 완료", tone: "neutral" };
    case "CANCELLED":
      return { label: "취소", tone: "neutral" };
    default:
      return { label: "배차 대기", tone: "warning" };
  }
}

export function getOrderDetailStatusGroup(
  status?: OrderStatus | string,
): OrderDetailStatusGroup {
  if (isCancelledStatus(status)) return "CANCELLED";
  if (isCompletedStatus(status)) return "COMPLETED";
  if (isWaitingStatus(status)) return "WAITING";
  return "ACTIVE";
}

export function isWaitingStatus(status?: OrderStatus | string) {
  return status === "REQUESTED" || status === "PENDING" || status === "APPLIED";
}

export function isCompletedStatus(status?: OrderStatus | string) {
  return status === "COMPLETED";
}

export function isCancelledStatus(status?: OrderStatus | string) {
  return status === "CANCELLED";
}

export function getMainActionButtonConfig(params: {
  order: OrderResponse | null;
  reviewSubmitted: boolean;
  brandPrimary: string;
}): ActionButtonConfig | null {
  const { order, reviewSubmitted, brandPrimary } = params;
  if (!order) return null;

  if (isWaitingStatus(order.status)) {
    if (order.instant) {
      return {
        text: "배차 대기중",
        icon: "time-outline",
        color: "#94A3B8",
        disabled: true,
      };
    }
    return {
      text: "기사 선택",
      icon: "people-outline",
      color: brandPrimary,
      disabled: false,
    };
  }

  if (isCompletedStatus(order.status)) {
    if (reviewSubmitted) {
      return {
        text: "평점 완료",
        icon: "checkmark-done-circle-outline",
        color: "#94A3B8",
        disabled: true,
      };
    }
    return {
      text: "평점 남기기",
      icon: "star-outline",
      color: brandPrimary,
      disabled: false,
    };
  }

  return {
    text: "운송 현황",
    icon: "navigate-circle-outline",
    color: brandPrimary,
  };
}
