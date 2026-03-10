import type { OrderResponse, OrderStatus } from "@/shared/models/order";

type ShipperOrderLike = Partial<OrderResponse> & {
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: string;
};

const WAITING_OR_DISPATCHED_STATUSES = new Set<OrderStatus>([
  "REQUESTED",
  "PENDING",
  "APPLIED",
  "ACCEPTED",
]);

export type ShipperOrderCancellationReason =
  | "EXPIRED"
  | "SHIPPER"
  | "ADMIN"
  | "UNKNOWN";

export function hasShipperOrderCancellationMeta(order?: ShipperOrderLike | null) {
  return Boolean(
    order?.cancellation?.cancelledAt ||
      order?.cancellation?.cancelReason ||
      order?.cancellation?.cancelledBy ||
      order?.cancelledAt ||
      order?.cancelReason ||
      order?.cancelledBy,
  );
}

export function parseShipperOrderSchedule(value?: string) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isShipperOrderExpired(
  order?: Pick<OrderResponse, "status" | "startSchedule" | "cancellation"> | null,
  now = new Date(),
) {
  if (!order || !WAITING_OR_DISPATCHED_STATUSES.has(order.status)) return false;
  const scheduledAt = parseShipperOrderSchedule(order.startSchedule);
  if (!scheduledAt) return false;
  return scheduledAt.getTime() < now.getTime();
}

export function isShipperOrderCancelledLike(
  order?: Pick<OrderResponse, "status" | "startSchedule" | "cancellation"> | null,
  now = new Date(),
) {
  const normalizedStatus = String(order?.status ?? "").toUpperCase();
  return (
    normalizedStatus === "CANCELLED" ||
    normalizedStatus === "CANCELED" ||
    normalizedStatus === "CANCEL" ||
    hasShipperOrderCancellationMeta(order) ||
    isShipperOrderExpired(order, now)
  );
}

export function resolveShipperOrderStatus(
  order?: Pick<OrderResponse, "status" | "startSchedule" | "cancellation"> | null,
  now = new Date(),
): OrderStatus | undefined {
  if (!order?.status) return undefined;
  return isShipperOrderCancelledLike(order, now) ? "CANCELLED" : order.status;
}

export function getShipperOrderCancellationReason(
  order?: Pick<OrderResponse, "status" | "startSchedule" | "cancellation"> | null,
  now = new Date(),
): ShipperOrderCancellationReason {
  const cancelledBy = String(order?.cancellation?.cancelledBy ?? "").trim().toUpperCase();
  const cancelReason = String(order?.cancellation?.cancelReason ?? "").trim().toUpperCase();

  if (cancelledBy.includes("ADMIN")) return "ADMIN";
  if (cancelReason.includes("ADMIN") || cancelReason.includes("관리자".toUpperCase())) return "ADMIN";
  if (cancelledBy.includes("SHIPPER") || cancelledBy.includes("USER")) return "SHIPPER";
  if (
    cancelReason.includes("화주".toUpperCase()) ||
    cancelReason.includes("직접".toUpperCase()) ||
    cancelReason.includes("사용자".toUpperCase())
  ) {
    return "SHIPPER";
  }
  if (isShipperOrderExpired(order, now) || cancelledBy.includes("SYSTEM")) return "EXPIRED";
  if (cancelReason.includes("기간".toUpperCase()) || cancelReason.includes("만료".toUpperCase())) return "EXPIRED";
  return "UNKNOWN";
}

export function getShipperOrderCancellationMessage(
  order?: Pick<OrderResponse, "status" | "startSchedule" | "cancellation"> | null,
  now = new Date(),
) {
  const reason = getShipperOrderCancellationReason(order, now);
  if (reason === "EXPIRED") {
    return "기간이 만료되어 자동으로 취소되었습니다.";
  }
  if (reason === "SHIPPER") {
    return "사용자가 직접 취소한 오더입니다.";
  }
  if (reason === "ADMIN") {
    return "관리자에 의해 취소된 오더입니다.";
  }
  return "취소된 오더입니다.";
}
