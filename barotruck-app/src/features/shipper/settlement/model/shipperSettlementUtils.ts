import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isShipperActivePaymentMethod,
  isTossPayment,
  toPaymentMethodLabel,
} from "@/features/common/payment/lib/paymentMethods";
import {
  calcOrderAmount,
  toSettlementStatus,
} from "@/features/common/settlement/lib/settlementHelpers";
import type { OrderResponse } from "@/shared/models/order";

export type SettlementFilter = "ALL" | "UNPAID" | "TAX";
export type SettlementStatus = "UNPAID" | "PENDING" | "PAID" | "TAX_INVOICE";

export type SettlementItem = {
  id: string;
  orderId: number;
  scheduledAt: Date;
  dateLabel: string;
  status: SettlementStatus;
  isTransportCompleted: boolean;
  from: string;
  to: string;
  amount: number;
  actionLabel: string;
  vehicleInfo: string;
  payMethodLabel: string;
  isToss: boolean;
};

export type TossCheckoutSession = {
  orderId: number;
  successUrl: string;
  failUrl: string;
  html: string;
};

const PENDING_SETTLEMENT_STORAGE_KEY = "shipper_pending_settlement_order_ids";

export async function loadPendingSettlementOrderIds() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SETTLEMENT_STORAGE_KEY);
    if (!raw) return new Set<number>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<number>();
    return new Set(
      parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x)),
    );
  } catch {
    return new Set<number>();
  }
}

export async function savePendingSettlementOrderIds(ids: Set<number>) {
  try {
    const arr = Array.from(ids.values()).filter((x) => Number.isFinite(x));
    await AsyncStorage.setItem(
      PENDING_SETTLEMENT_STORAGE_KEY,
      JSON.stringify(arr),
    );
  } catch {}
}

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
  if (parts.length <= 1) return parts[0] || "-";
  return `${parts[0]} ${parts[1]}`;
}

export function parseDate(v?: string) {
  if (!v) return null;
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function toDateLabel(d: Date) {
  const w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}.${d.getDate()} (${w})`;
}

export function escapeHtmlValue(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function parseQueryValue(url: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`[?&]${escaped}=([^&#]*)`);
  const match = url.match(regex);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch {
    return match[1];
  }
}

export function isUrlMatched(targetUrl: string, expectedBaseUrl: string) {
  if (!targetUrl || !expectedBaseUrl) return false;
  return targetUrl.startsWith(expectedBaseUrl);
}

export function isWebViewInternalUrl(url: string) {
  const lower = String(url || "").toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("about:blank") ||
    lower.startsWith("data:")
  );
}

export function buildTossCheckoutHtml(input: {
  clientKey: string;
  amount: number;
  pgOrderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
}) {
  const clientKey = escapeHtmlValue(input.clientKey);
  const amount = Number(input.amount) || 0;
  const pgOrderId = escapeHtmlValue(input.pgOrderId);
  const orderName = escapeHtmlValue(input.orderName);
  const successUrl = escapeHtmlValue(input.successUrl);
  const failUrl = escapeHtmlValue(input.failUrl);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>Toss Payment</title>
  <script src="https://js.tosspayments.com/v1/payment"></script>
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .wrap { min-height: 100%; display: flex; align-items: center; justify-content: center; color: #334155; }
    #payBtn { border: 0; border-radius: 12px; height: 48px; padding: 0 18px; background: #2563eb; color: #fff; font-size: 16px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="wrap"><button id="payBtn">토스 결제 진행</button></div>
  <script>
    (function () {
      var started = false;
      function startPayment() {
        if (started) return;
        started = true;
        try {
          var tossPayments = TossPayments("${clientKey}");
          tossPayments.requestPayment("카드", { amount: ${amount}, orderId: "${pgOrderId}", orderName: "${orderName}", successUrl: "${successUrl}", failUrl: "${failUrl}" })
          .catch(function (error) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: "REQUEST_ERROR", message: String(error && error.message ? error.message : error) }));
            started = false;
          });
        } catch (e) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: "SCRIPT_ERROR", message: String(e && e.message ? e.message : e) }));
          started = false;
        }
      }
      var payBtn = document.getElementById("payBtn");
      if (payBtn) payBtn.addEventListener("click", startPayment);
      setTimeout(startPayment, 120);
    })();
  </script>
</body>
</html>`;
}

export function toActionLabel(
  status: SettlementStatus,
  isTransportCompleted = true,
) {
  if (status === "UNPAID")
    return isTransportCompleted ? "결제하기" : "운송완료 후 결제";
  if (status === "PENDING") return "차주 확인 대기";
  if (status === "PAID") return "영수증 확인";
  return "계산서 보기";
}

export function mapOrderToSettlement(
  order: OrderResponse,
  pendingOrderIds?: Set<number>,
): SettlementItem | null {
  if (
    order.status === "CANCELLED" ||
    order.status === "REQUESTED" ||
    order.status === "PENDING" ||
    order.status === "APPLIED"
  )
    return null;
  if (order.status !== "COMPLETED") return null;

  const scheduledAt =
    parseDate(order.endSchedule) ||
    parseDate(order.startSchedule) ||
    parseDate(order.updated) ||
    parseDate(order.createdAt);
  if (!scheduledAt) return null;

  if (!isShipperActivePaymentMethod(order.payMethod)) return null;

  const amount = calcOrderAmount(order);
  const rawBaseStatus = toSettlementStatus(order);
  const status =
    rawBaseStatus === "UNPAID" && pendingOrderIds?.has(Number(order.orderId))
      ? "PENDING"
      : rawBaseStatus;
  const isTransportCompleted = order.status === "COMPLETED";
  const vehicleInfo =
    `${order.reqCarType || "차량"} ${order.reqTonnage || ""}`.trim();

  return {
    id: String(order.orderId),
    orderId: Number(order.orderId),
    scheduledAt,
    dateLabel: toDateLabel(scheduledAt),
    status,
    isTransportCompleted,
    from: toShortPlace(order.startAddr || order.startPlace),
    to: toShortPlace(order.endAddr || order.endPlace),
    amount,
    actionLabel: toActionLabel(status, isTransportCompleted),
    vehicleInfo: vehicleInfo || "-",
    payMethodLabel: toPaymentMethodLabel(order.payMethod),
    isToss: isTossPayment(order.payMethod),
  };
}
