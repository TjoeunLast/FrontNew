import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import {
  isShipperActivePaymentMethod,
  isTossPayment,
  toPaymentMethodLabel,
} from "@/features/common/payment/lib/paymentMethods";
import { calcOrderAmount, toWon } from "@/features/common/settlement/lib/settlementHelpers";
import { OrderApi } from "@/shared/api/orderService";
import { PaymentService } from "@/shared/api/paymentService";
import { SettlementService } from "@/shared/api/settlementService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import type { SettlementResponse } from "@/shared/models/Settlement";
import {
  APP_DEEP_LINK_PREFIX,
  isWebViewInternalUrl,
  openExternalCheckoutUrl,
} from "@/shared/utils/payment/externalCheckoutLinking";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { SalesSummaryCard } from "@/features/driver/shard/ui/SalesSummaryCard";

type SettlementFilter = "ALL" | "UNPAID" | "PENDING" | "PAID";
type SettlementStatus = "UNPAID" | "PENDING" | "PAID" | "ISSUE" | "TAX_INVOICE";

type SettlementItem = {
  id: string;
  orderId: number;
  scheduledAt: Date;
  dateLabel: string;
  status: SettlementStatus;
  isTransportCompleted: boolean;
  from: string;
  to: string;
  amount: number;
  billedSubtotal: number;
  shipperFeeAmount: number;
  actionLabel: string;
  vehicleInfo: string;
  payMethodLabel: string;
  isToss: boolean;
  paymentStatus?: string | null;
  settlementStatus?: string | null;
  paidAt?: string | null;
  confirmedAt?: string | null;
};

type TossCheckoutSession = {
  orderId: number;
  successUrl: string;
  failUrl: string;
  html: string;
};

const PENDING_SETTLEMENT_STORAGE_KEY = "shipper_pending_settlement_order_ids";

async function loadPendingSettlementOrderIds() {
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

async function savePendingSettlementOrderIds(ids: Set<number>) {
  try {
    const arr = Array.from(ids.values()).filter((x) => Number.isFinite(x));
    await AsyncStorage.setItem(
      PENDING_SETTLEMENT_STORAGE_KEY,
      JSON.stringify(arr),
    );
  } catch {
  }
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonth(d: Date, diff: number) {
  return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}

function compareMonth(a: Date, b: Date) {
  if (a.getFullYear() !== b.getFullYear())
    return a.getFullYear() - b.getFullYear();
  return a.getMonth() - b.getMonth();
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function toMonthLabel(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

function toShortPlace(v?: string) {
  if (!v) return "-";
  const parts = v.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "-";
  return `${parts[0]} ${parts[1]}`;
}

function parseDate(v?: string) {
  if (!v) return null;
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toDateLabel(d: Date) {
  const w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}.${d.getDate()} (${w})`;
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toAmount(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function escapeHtmlValue(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseQueryValue(url: string, key: string) {
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

function isUrlMatched(targetUrl: string, expectedBaseUrl: string) {
  if (!targetUrl || !expectedBaseUrl) return false;
  return targetUrl.startsWith(expectedBaseUrl);
}

function buildTossCheckoutHtml(input: {
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
    #payBtn {
      border: 0;
      border-radius: 12px;
      height: 48px;
      padding: 0 18px;
      background: #2563eb;
      color: #fff;
      font-size: 16px;
      font-weight: 700;
    }
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
        tossPayments.requestPayment("카드", {
          amount: ${amount},
          orderId: "${pgOrderId}",
          orderName: "${orderName}",
          successUrl: "${successUrl}",
          failUrl: "${failUrl}",
          appScheme: "${APP_DEEP_LINK_PREFIX}"
        }).catch(function (error) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "REQUEST_ERROR",
            message: String(error && error.message ? error.message : error)
          }));
          started = false;
        });
      } catch (e) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "SCRIPT_ERROR",
          message: String(e && e.message ? e.message : e)
        }));
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

function getStatusLabel(status: SettlementStatus) {
  if (status === "UNPAID") return "결제 필요";
  if (status === "PENDING") return "차주 확인 대기";
  if (status === "PAID") return "정산 완료";
  if (status === "ISSUE") return "이슈";
  return "계산서";
}

function toActionLabel(status: SettlementStatus, isTransportCompleted = true) {
  if (status === "UNPAID") {
    return isTransportCompleted ? "결제하기" : "운송완료 후 결제";
  }
  if (status === "ISSUE") return "상태 확인";
  if (status === "TAX_INVOICE") return "계산서 보기";
  return "영수증 보기";
}

function resolveItemStatus(
  order: OrderResponse,
  settlement?: SettlementResponse,
): SettlementStatus {
  const paymentStatus = String(
    settlement?.paymentStatus ?? order.paymentStatus ?? "",
  ).toUpperCase();
  const settlementStatus = String(
    settlement?.status ?? order.settlementStatus ?? "",
  ).toUpperCase();

  if (
    paymentStatus === "CONFIRMED" ||
    paymentStatus === "ADMIN_FORCE_CONFIRMED" ||
    settlementStatus === "COMPLETED"
  ) {
    return "PAID";
  }

  if (
    paymentStatus === "DISPUTED" ||
    paymentStatus === "ADMIN_HOLD" ||
    paymentStatus === "ADMIN_REJECTED" ||
    settlementStatus === "WAIT"
  ) {
    return "ISSUE";
  }

  if (
    paymentStatus === "PAID" ||
    (!!settlement && settlementStatus === "READY")
  ) {
    return "PENDING";
  }

  return "UNPAID";
}

function mapOrderToSettlement(
  order: OrderResponse,
  settlement?: SettlementResponse,
): SettlementItem | null {
  if (order.status !== "COMPLETED") return null;

  const scheduledAt =
    parseDate(order.endSchedule) ||
    parseDate(order.startSchedule) ||
    parseDate(order.updated) ||
    parseDate(order.createdAt);
  if (!scheduledAt) return null;

  if (!isShipperActivePaymentMethod(order.payMethod)) return null;

  const billedSubtotal = toAmount(settlement?.totalPrice) || calcOrderAmount(order);
  const chargedTotal = toAmount(settlement?.paymentAmount) || billedSubtotal;
  const shipperFeeAmount =
    toAmount(settlement?.paymentFeeAmount) ||
    Math.max(0, chargedTotal - billedSubtotal);
  const status = resolveItemStatus(order, settlement);
  const isTransportCompleted = true;
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
    amount: chargedTotal,
    billedSubtotal,
    shipperFeeAmount,
    actionLabel: toActionLabel(status, isTransportCompleted),
    vehicleInfo: vehicleInfo || "-",
    payMethodLabel: toPaymentMethodLabel(order.payMethod),
    isToss: isTossPayment(order.payMethod),
    paymentStatus: settlement?.paymentStatus ?? order.paymentStatus ?? null,
    settlementStatus: settlement?.status ?? order.settlementStatus ?? null,
    paidAt: settlement?.paidAt ?? null,
    confirmedAt: settlement?.confirmedAt ?? null,
  };
}

type PaymentMethodFilter = "ALL" | "TOSS" | "DEFERRED";

export default function ShipperSettlementScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentMonth = startOfMonth(new Date());

  const [filter, setFilter] = useState<SettlementFilter>("ALL");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] =
    useState<PaymentMethodFilter>("ALL");
  const [viewMonth, setViewMonth] = useState<Date>(currentMonth);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptItem, setReceiptItem] = useState<SettlementItem | null>(null);
  const [submittingOrderId, setSubmittingOrderId] = useState<number | null>(
    null,
  );
  const [tossCheckout, setTossCheckout] = useState<TossCheckoutSession | null>(
    null,
  );
  const [tossConfirming, setTossConfirming] = useState(false);
  const handledTossResultUrlRef = useRef<string | null>(null);

  const fetchItems = useCallback(async () => {
    const [rows, settlements] = await Promise.all([
      OrderApi.getMyShipperOrders(),
      SettlementService.getMySettlements().catch((error) => {
        console.warn("정산 snapshot 조회 실패:", error);
        return [] as SettlementResponse[];
      }),
    ]);
    const settlementMap = new Map<number, SettlementResponse>();
    settlements.forEach((row) => {
      const orderId = Number(row.orderId);
      if (Number.isFinite(orderId)) {
        settlementMap.set(orderId, row);
      }
    });

    const mapped = rows
      .map((row) => mapOrderToSettlement(row, settlementMap.get(Number(row.orderId))))
      .filter((x): x is SettlementItem => x !== null)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

    return mapped;
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);

      void (async () => {
        try {
          const mapped = await fetchItems();

          if (!active) return;
          setItems(mapped);
        } catch (error) {
          console.warn("정산 내역 조회 실패:", error);
          if (active) setItems([]);
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [fetchItems]),
  );

  const isNextDisabled = compareMonth(viewMonth, currentMonth) >= 0;
  const viewMonthLabel = toMonthLabel(viewMonth);
  const viewMonthNumber = viewMonth.getMonth() + 1;

  const monthItems = useMemo(
    () => items.filter((x) => isSameMonth(x.scheduledAt, viewMonth)),
    [items, viewMonth],
  );

  const filtered = useMemo(() => {
    const methodFiltered =
      paymentFilter === "ALL"
        ? monthItems
        : monthItems.filter((x) =>
            paymentFilter === "TOSS" ? x.isToss : !x.isToss,
          );

    if (filter === "ALL") return methodFiltered;
    return methodFiltered.filter((x) => x.status === filter);
  }, [filter, monthItems, paymentFilter]);

  const summaryTotal = useMemo(
    () => monthItems.reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems],
  );
  const summaryCompletedAmount = useMemo(
    () =>
      monthItems
        .filter((x) => x.status === "PAID")
        .reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems],
  );
  const summaryNeedPaymentAmount = useMemo(
    () => Math.max(0, summaryTotal - summaryCompletedAmount),
    [summaryCompletedAmount, summaryTotal],
  );
  const statusDropdownOptions: Array<[SettlementFilter, string]> = [
    ["ALL", "결제 전체"],
    ["UNPAID", "결제 필요"],
    ["PENDING", "결제 확인 대기"],
    ["PAID", "완료"],
  ];
  const statusDropdownLabel = useMemo(() => {
    const found = statusDropdownOptions.find(([key]) => key === filter);
    return found?.[1] ?? "결제 전체";
  }, [filter]);

  const closeTossCheckout = useCallback(() => {
    if (tossConfirming) return;
    handledTossResultUrlRef.current = null;
    setTossCheckout(null);
    setSubmittingOrderId(null);
  }, [tossConfirming]);

  const openTossCheckout = useCallback(async (item: SettlementItem) => {
    const prepared = await PaymentService.prepareTossPayment(item.orderId, {
      method: "CARD",
      payChannel: "CARD",
    });

    setTossCheckout({
      orderId: item.orderId,
      successUrl: prepared.successUrl,
      failUrl: prepared.failUrl,
      html: buildTossCheckoutHtml({
        clientKey: prepared.clientKey,
        amount: prepared.amount,
        pgOrderId: prepared.pgOrderId,
        orderName: prepared.orderName || `운송 결제 #${item.orderId}`,
        successUrl: prepared.successUrl,
        failUrl: prepared.failUrl,
      }),
    });
    handledTossResultUrlRef.current = null;
  }, []);

  const handleTossSuccessUrl = useCallback(
    async (url: string) => {
      if (!tossCheckout) return;

      const paymentKey = parseQueryValue(url, "paymentKey");
      const pgOrderId = parseQueryValue(url, "orderId");
      const amountRaw = parseQueryValue(url, "amount");
      const amount = Number(amountRaw);

      if (!paymentKey) {
        handledTossResultUrlRef.current = null;
        setTossCheckout(null);
        setSubmittingOrderId(null);
        Alert.alert("결제 오류", "결제 키를 확인할 수 없습니다.");
        return;
      }

      try {
        setTossConfirming(true);
        await PaymentService.confirmTossPayment(tossCheckout.orderId, {
          paymentKey,
          pgOrderId: pgOrderId || undefined,
          amount: Number.isFinite(amount) ? amount : undefined,
        });

        const pendingOrderIds = await loadPendingSettlementOrderIds();
        if (pendingOrderIds.delete(tossCheckout.orderId)) {
          await savePendingSettlementOrderIds(pendingOrderIds);
        }

        const refreshed = await fetchItems().catch(() => null);
        if (refreshed) {
          setItems(
            refreshed.map((row) =>
              row.orderId === tossCheckout.orderId
                ? {
                    ...row,
                    status: "PENDING",
                    actionLabel: toActionLabel(
                      "PENDING",
                      row.isTransportCompleted,
                    ),
                  }
                : row,
            ),
          );
        } else {
          setItems((prev) =>
            prev.map((row) =>
              row.orderId === tossCheckout.orderId
                ? {
                    ...row,
                    status: "PENDING",
                    actionLabel: toActionLabel("PENDING"),
                  }
                : row,
            ),
          );
        }

        handledTossResultUrlRef.current = null;
        setTossCheckout(null);
        Alert.alert("결제 완료", "토스 결제가 완료되었습니다.");
      } catch (error: any) {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "토스 결제 확정 중 오류가 발생했습니다.";
        Alert.alert("결제 오류", String(msg));
      } finally {
        setTossConfirming(false);
        setSubmittingOrderId(null);
      }
    },
    [fetchItems, tossCheckout],
  );

  const handleTossFailUrl = useCallback((url: string) => {
    const code = parseQueryValue(url, "code");
    const message = parseQueryValue(url, "message");
    handledTossResultUrlRef.current = null;
    setTossCheckout(null);
    setSubmittingOrderId(null);
    Alert.alert(
      "결제 실패",
      message || code || "토스 결제가 취소되었거나 실패했습니다.",
    );
  }, []);

  const handleTossResultUrl = useCallback(
    (url: string) => {
      if (!tossCheckout) return false;
      if (isUrlMatched(url, tossCheckout.successUrl)) {
        if (handledTossResultUrlRef.current === url) return true;
        handledTossResultUrlRef.current = url;
        void handleTossSuccessUrl(url);
        return true;
      }
      if (isUrlMatched(url, tossCheckout.failUrl)) {
        if (handledTossResultUrlRef.current === url) return true;
        handledTossResultUrlRef.current = url;
        handleTossFailUrl(url);
        return true;
      }
      return false;
    },
    [handleTossFailUrl, handleTossSuccessUrl, tossCheckout],
  );

  const onTossShouldStartLoadWithRequest = useCallback(
    (request: { url: string }) => {
      const url = String(request.url ?? "");
      const handled = handleTossResultUrl(url);
      if (handled) return false;

      if (!isWebViewInternalUrl(url)) {
        void openExternalCheckoutUrl(url).then((opened) => {
          if (!opened) {
            Alert.alert(
              "결제 안내",
              "외부 결제 앱을 열 수 없습니다. 카드/은행 앱 설치 여부를 확인해 주세요.",
            );
          }
        });
        return false;
      }

      return true;
    },
    [handleTossResultUrl],
  );

  const onTossMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data ?? "{}");
      if (
        payload?.type === "REQUEST_ERROR" ||
        payload?.type === "SCRIPT_ERROR"
      ) {
        handledTossResultUrlRef.current = null;
        Alert.alert(
          "결제 오류",
          String(payload?.message || "토스 결제창을 열 수 없습니다."),
        );
        setTossCheckout(null);
        setSubmittingOrderId(null);
      }
    } catch {
    }
  }, []);

  const onPressAction = async (item: SettlementItem) => {
    if (submittingOrderId === item.orderId) return;
    if (item.status === "PAID" || item.status === "PENDING") {
      setReceiptItem(item);
      return;
    }

    if (item.status === "TAX_INVOICE") {
      Alert.alert("안내", "계산서 보기 기능은 준비 중입니다.");
      return;
    }
    if (item.status === "ISSUE") {
      Alert.alert("상태 확인", "관리자 확인이 필요한 정산 상태입니다.");
      return;
    }
    if (item.status === "UNPAID" && !item.isTransportCompleted) {
      Alert.alert("안내", "운송 완료 후 결제할 수 있습니다.");
      return;
    }

    if (item.isToss) {
      router.push({
        pathname: "/(shipper)/payment-checkout",
        params: { orderId: String(item.orderId) },
      } as any);
      return;
    }

    try {
      setSubmittingOrderId(item.orderId);
      await PaymentService.markPaid(item.orderId, {
        method: "CASH",
        paymentTiming: "POSTPAID",
      });
      const refreshed = await fetchItems().catch(() => null);
      if (refreshed) {
        setItems(refreshed);
      } else {
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  status: "PENDING",
                  actionLabel: toActionLabel("PENDING"),
                  paymentStatus: "PAID",
                  settlementStatus: "READY",
                }
              : row,
          ),
        );
      }
      Alert.alert(
        "결제 완료",
        "착불 결제가 완료되었습니다. 이제 차주 확인이 끝나면 정산 완료로 전환됩니다.",
      );
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "착불 결제 중 오류가 발생했습니다.";
      const msgText = String(msg);
      const msgLower = msgText.toLowerCase();
      const isAlreadyPaid =
        msgLower.includes("already paid") ||
        msgLower.includes("payment completed") ||
        msgText.includes("결제 완료") ||
        msgText.includes("이미 결제");
      const isDuplicate =
        msgText.includes("ORA-00001") ||
        msgLower.includes("unique") ||
        msgLower.includes("constraint") ||
        msgLower.includes("already");

      if (isAlreadyPaid || isDuplicate) {
        const refreshed = await fetchItems().catch(() => null);
        if (refreshed) {
          setItems(refreshed);
        } else {
          setItems((prev) =>
            prev.map((row) =>
              row.id === item.id
                ? {
                    ...row,
                    status: "PENDING",
                    actionLabel: toActionLabel("PENDING"),
                    paymentStatus: "PAID",
                    settlementStatus: "READY",
                  }
                : row,
            ),
          );
        }
        Alert.alert("안내", "이미 결제완료된 건입니다. 차주 확인 대기 상태일 수 있습니다.");
        return;
      }

      Alert.alert("오류", msg);
    } finally {
      setSubmittingOrderId((prev) => (prev === item.orderId ? null : prev));
    }
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: "#F5F6FA" } as ViewStyle,
        scrollContent: { paddingBottom: 24 + insets.bottom } as ViewStyle,
        monthRow: {
          height: 72,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          borderBottomWidth: 1,
          borderBottomColor: c.border.default,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        monthText: {
          fontSize: 17,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        monthNavBtn: {
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        summaryCard: {
          marginTop: 14,
          marginHorizontal: 16,
        } as ViewStyle,
        summaryCaption: {
          fontSize: 12,
          fontWeight: "700",
          color: "#DCD9FF",
        } as TextStyle,
        summaryAmount: {
          marginTop: 8,
          fontSize: 21,
          fontWeight: "900",
          color: "#FFFFFF",
        } as TextStyle,
        summaryDivider: {
          height: 1,
          backgroundColor: "rgba(255,255,255,0.2)",
          marginTop: 14,
          marginBottom: 12,
        } as ViewStyle,
        summaryBottomRow: {
          flexDirection: "row",
          alignItems: "center",
        } as ViewStyle,
        summaryCol: { flex: 1 } as ViewStyle,
        summaryColDivider: {
          width: 1,
          height: 44,
          backgroundColor: "rgba(255,255,255,0.3)",
        } as ViewStyle,
        summaryBig: {
          fontSize: 16,
          fontWeight: "900",
          color: "#FFFFFF",
        } as TextStyle,
        summarySmall: {
          fontSize: 12,
          fontWeight: "700",
          color: "#DCD9FF",
        } as TextStyle,
        summaryBigRight: { textAlign: "right" } as TextStyle,
        summarySmallRight: { textAlign: "right" } as TextStyle,
        contentWrap: { paddingHorizontal: 16, paddingTop: 14, gap: 12 } as ViewStyle,
        filterSection: {
          borderTopWidth: 1,
          borderTopColor: c.border.default,
          paddingTop: 12,
          gap: 10,
        } as ViewStyle,
        filterRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 20,
        } as ViewStyle,
        paymentFilterInlineRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        } as ViewStyle,
        dropdownWrap: {
          width: 170,
          position: "relative",
        } as ViewStyle,
        dropdownTrigger: {
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "#D4D9E3",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        } as ViewStyle,
        dropdownTriggerActive: {
          borderColor: c.brand.primary,
          backgroundColor: "#FFFFFF",
        } as ViewStyle,
        dropdownTriggerText: {
          flex: 1,
          fontSize: 13,
          fontWeight: "800",
          color: "#667085",
        } as TextStyle,
        dropdownTriggerTextActive: {
          color: c.brand.primary,
        } as TextStyle,
        dropdownMenu: {
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#DDE3F3",
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
          shadowColor: "#0F172A",
          shadowOpacity: 0.04,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        } as ViewStyle,
        dropdownItem: {
          minHeight: 38,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: "#EEF2F7",
        } as ViewStyle,
        dropdownItemLast: {
          borderBottomWidth: 0,
        } as ViewStyle,
        dropdownItemText: {
          fontSize: 13,
          fontWeight: "700",
          color: "#334155",
        } as TextStyle,
        dropdownItemTextActive: {
          color: c.brand.primary,
          fontWeight: "900",
        } as TextStyle,
        paymentTextBtn: {
          minHeight: 32,
          paddingHorizontal: 4,
          justifyContent: "center",
        } as ViewStyle,
        paymentText: {
          fontSize: 13,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        paymentTextActive: {
          color: c.brand.primary,
          fontWeight: "900",
        } as TextStyle,
        filterBtn: {
          borderRadius: 18,
          paddingHorizontal: 14,
          height: 36,
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#D4D9E3",
          backgroundColor: "#FFFFFF",
        } as ViewStyle,
        filterBtnActive: {
          backgroundColor: "#0F172A",
          borderColor: "#0F172A",
        } as ViewStyle,
        filterText: {
          fontSize: 13,
          fontWeight: "800",
          color: "#667085",
        } as TextStyle,
        filterTextActive: { color: "#FFFFFF" } as TextStyle,
        listWrap: {
          gap: 12,
        } as ViewStyle,
        itemCard: {
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#DEE3ED",
          backgroundColor: "#FFFFFF",
          padding: 14,
          gap: 12,
        } as ViewStyle,
        unpaidCard: { borderColor: "#E05A55" } as ViewStyle,
        itemTop: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        } as ViewStyle,
        itemTopLeft: { flex: 1 } as ViewStyle,
        dateRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        } as ViewStyle,
        dateText: {
          fontSize: 12,
          fontWeight: "700",
          color: "#64748B",
        } as TextStyle,
        statusBadge: {
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6,
        } as ViewStyle,
        statusText: { fontSize: 12, fontWeight: "900" } as TextStyle,
        amountWrap: { alignItems: "flex-end", gap: 6 } as ViewStyle,
        amountText: {
          fontSize: 18,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        amountUnpaid: { color: "#E05A55" } as TextStyle,
        unpaidIcon: { opacity: 0.95 } as TextStyle,
        routeText: {
          marginTop: 4,
          fontSize: 16,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        metaText: {
          fontSize: 12,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        arrowText: { color: "#94A3B8" } as TextStyle,
        actionRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
        } as ViewStyle,
        actionBtn: {
          height: 36,
          paddingHorizontal: 14,
          borderRadius: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: "#0F172A",
        } as ViewStyle,
        actionBtnNeutral: { backgroundColor: "#E2E8F0" } as ViewStyle,
        actionText: {
          fontSize: 12,
          fontWeight: "900",
          color: "#FFFFFF",
        } as TextStyle,
        actionTextNeutral: { color: "#64748B" } as TextStyle,
        emptyCard: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          paddingVertical: 18,
          alignItems: "center",
        } as ViewStyle,
        emptyText: {
          fontSize: 13,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        modalBackdrop: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.28)",
          justifyContent: "flex-end",
        } as ViewStyle,
        modalSheet: {
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(14, insets.bottom + 6),
        } as ViewStyle,
        modalHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,
        modalTitle: {
          fontSize: 18,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        tossSheet: {
          flex: 1,
          backgroundColor: "#FFFFFF",
          paddingTop: insets.top,
        } as ViewStyle,
        tossHeader: {
          height: 52,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.border.default,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,
        tossTitle: {
          fontSize: 16,
          fontWeight: "800",
          color: c.text.primary,
        } as TextStyle,
        tossCloseBtn: {
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        tossWebview: { flex: 1 } as ViewStyle,
        tossLoading: {
          position: "absolute",
          right: 12,
          top: 14,
          fontSize: 12,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        receiptCard: {
          marginTop: 10,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#E5EAF1",
          backgroundColor: "#FAFBFD",
          padding: 14,
        } as ViewStyle,
        receiptAmount: {
          fontSize: 20,
          fontWeight: "900",
          textAlign: "center",
          color: c.text.primary,
        } as TextStyle,
        receiptPaid: {
          fontSize: 12,
          fontWeight: "700",
          textAlign: "center",
          color: "#64748B",
          marginTop: 2,
        } as TextStyle,
        receiptDash: {
          height: 1,
          borderStyle: "dashed",
          borderTopWidth: 2,
          borderColor: "#D9E0EA",
          marginTop: 14,
          marginBottom: 10,
        } as ViewStyle,
        receiptRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        } as ViewStyle,
        receiptKey: {
          fontSize: 13,
          fontWeight: "700",
          color: "#64748B",
        } as TextStyle,
        receiptVal: {
          fontSize: 13,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        receiptBlockGap: { height: 8 } as ViewStyle,
      }),
    [c, insets.bottom, insets.top],
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="정산 내역" hideBackButton />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.monthRow}>
          <Pressable
            style={s.monthNavBtn}
            onPress={() => setViewMonth((prev) => addMonth(prev, -1))}
          >
            <Ionicons name="chevron-back" size={24} color={c.text.primary} />
          </Pressable>
          <Text style={s.monthText}>{viewMonthLabel}</Text>
          <Pressable
            style={s.monthNavBtn}
            disabled={isNextDisabled}
            onPress={() =>
              setViewMonth((prev) =>
                compareMonth(prev, currentMonth) >= 0
                  ? prev
                  : addMonth(prev, 1),
              )
            }
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isNextDisabled ? "#CBD5E1" : c.text.primary}
            />
          </Pressable>
        </View>

        <SalesSummaryCard
          title={`${viewMonthNumber}월 결제/정산 현황`}
          totalAmount={summaryTotal}
          settledAmount={summaryCompletedAmount}
          pendingAmount={summaryNeedPaymentAmount}
          settledLabel="결제 완료"
          pendingLabel="결제 필요"
          size="small"
          style={s.summaryCard}
        />

        <View style={s.contentWrap}>
          <View style={s.filterSection}>
            <View style={s.filterRow}>
              <View style={s.paymentFilterInlineRow}>
                {[
                  ["ALL", "결제 전체"],
                  ["TOSS", "토스"],
                  ["DEFERRED", "착불"],
                ].map(([key, label]) => {
                  const active = paymentFilter === key;
                  return (
                    <Pressable
                      key={key}
                      style={s.paymentTextBtn}
                      onPress={() => setPaymentFilter(key as PaymentMethodFilter)}
                    >
                      <Text style={[s.paymentText, active && s.paymentTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={s.dropdownWrap}>
                <Pressable
                  style={[s.dropdownTrigger, s.dropdownTriggerActive]}
                  onPress={() => setStatusDropdownOpen((prev) => !prev)}
                >
                  <Text
                    style={[s.dropdownTriggerText, s.dropdownTriggerTextActive]}
                    numberOfLines={1}
                  >
                    {statusDropdownLabel}
                  </Text>
                  <Ionicons
                    name={statusDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={c.brand.primary}
                  />
                </Pressable>

                {statusDropdownOpen ? (
                  <View style={s.dropdownMenu}>
                    {statusDropdownOptions.map(([key, label], idx) => {
                      const active = filter === key;
                      const isLast = idx === statusDropdownOptions.length - 1;
                      return (
                        <Pressable
                          key={key}
                          style={[s.dropdownItem, isLast && s.dropdownItemLast]}
                          onPress={() => {
                            setFilter(key);
                            setStatusDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              s.dropdownItemText,
                              active && s.dropdownItemTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                          {active ? (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color={c.brand.primary}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {loading ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>정산 내역을 불러오는 중입니다.</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>선택한 월의 정산 내역이 없습니다.</Text>
            </View>
          ) : (
            <View style={s.listWrap}>
              {filtered.map((item) => {
                const isUnpaid = item.status === "UNPAID";
                const isPending = item.status === "PENDING";
                const isPaid = item.status === "PAID";
                const isIssue = item.status === "ISSUE";
                return (
                  <View
                    key={item.id}
                    style={[
                      s.itemCard,
                      isUnpaid && s.unpaidCard,
                      isIssue && { borderColor: "#F59E0B" },
                    ]}
                  >
                    <View style={s.itemTop}>
                      <View style={s.itemTopLeft}>
                        <View style={s.dateRow}>
                          <Text style={s.dateText}>{item.dateLabel}</Text>
                          <View
                            style={[
                              s.statusBadge,
                              {
                                backgroundColor: isUnpaid
                                  ? "#FDE7E5"
                                  : isPending
                                    ? "#FEF9C3"
                                    : isPaid
                                      ? "#DCFCE7"
                                      : isIssue
                                        ? "#FEF3C7"
                                        : "#E0ECFF",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                s.statusText,
                                {
                                  color: isUnpaid
                                    ? "#D44B46"
                                    : isPending
                                      ? "#A16207"
                                      : isPaid
                                        ? "#15803D"
                                        : isIssue
                                          ? "#B45309"
                                          : "#2E6DA4",
                                },
                              ]}
                            >
                              {getStatusLabel(item.status)}
                            </Text>
                          </View>
                        </View>
                        <Text style={s.routeText}>
                          {item.from} <Text style={s.arrowText}>→</Text> {item.to}
                        </Text>
                      </View>
                      <View style={s.amountWrap}>
                        {isUnpaid ? (
                          <MaterialCommunityIcons
                            name="credit-card-outline"
                            size={18}
                            color="#D44B46"
                            style={s.unpaidIcon}
                          />
                        ) : null}
                        <Text style={[s.amountText, isUnpaid && s.amountUnpaid]}>
                          {toWon(item.amount)}
                        </Text>
                      </View>
                    </View>

                    <Text style={s.metaText}>결제 방식: {item.payMethodLabel}</Text>
                    <Text style={s.metaText}>
                      기본 운임+작업비 {toWon(item.billedSubtotal)} / 화주 수수료 {toWon(item.shipperFeeAmount)}
                    </Text>
                    <View style={s.actionRow}>
                      {(() => {
                        const isSubmitting = submittingOrderId === item.orderId;
                        const paymentBlocked =
                          isUnpaid && !item.isTransportCompleted;
                        return (
                          <Pressable
                            style={[
                              s.actionBtn,
                              ((item.status !== "UNPAID") || paymentBlocked) &&
                                s.actionBtnNeutral,
                            ]}
                            disabled={isSubmitting || paymentBlocked}
                            onPress={() => void onPressAction(item)}
                          >
                            <MaterialCommunityIcons
                              name={
                                paymentBlocked
                                  ? "lock-outline"
                                  : item.status === "PAID"
                                    ? "file-document-outline"
                                  : item.status === "PENDING"
                                      ? "clock-outline"
                                    : item.status === "ISSUE"
                                      ? "alert-circle-outline"
                                      : item.status === "TAX_INVOICE"
                                        ? "file-outline"
                                        : "credit-card-outline"
                              }
                              size={14}
                              color={
                                paymentBlocked || item.status !== "UNPAID"
                                  ? "#64748B"
                                  : "#FFFFFF"
                              }
                            />
                            <Text
                              style={[
                                s.actionText,
                                ((item.status !== "UNPAID") || paymentBlocked) &&
                                  s.actionTextNeutral,
                              ]}
                            >
                              {isSubmitting ? "처리중..." : item.actionLabel}
                            </Text>
                          </Pressable>
                        );
                      })()}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!tossCheckout}
        animationType="slide"
        onRequestClose={closeTossCheckout}
      >
        <View style={s.tossSheet}>
          <View style={s.tossHeader}>
            <Pressable
              style={s.tossCloseBtn}
              disabled={tossConfirming}
              onPress={closeTossCheckout}
            >
              <Ionicons
                name="close"
                size={24}
                color={tossConfirming ? "#CBD5E1" : c.text.primary}
              />
            </Pressable>
            <Text style={s.tossTitle}>토스 결제</Text>
            <View style={s.tossCloseBtn} />
            {tossConfirming ? (
              <Text style={s.tossLoading}>결제 확인 중...</Text>
            ) : null}
          </View>
          {tossCheckout ? (
            <WebView
              style={s.tossWebview}
              originWhitelist={["*"]}
              source={{ html: tossCheckout.html }}
              onShouldStartLoadWithRequest={onTossShouldStartLoadWithRequest}
              onNavigationStateChange={(navState) => {
                handleTossResultUrl(navState.url);
              }}
              onMessage={onTossMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
            />
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={!!receiptItem}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptItem(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setReceiptItem(null)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>화주 결제 상세</Text>
              <Pressable onPress={() => setReceiptItem(null)}>
                <Ionicons name="close" size={28} color={c.text.primary} />
              </Pressable>
            </View>

            <View style={s.receiptCard}>
              <Text style={s.receiptAmount}>
                {receiptItem ? toWon(receiptItem.amount) : "0원"}
              </Text>
              <Text style={s.receiptPaid}>
                {receiptItem ? getStatusLabel(receiptItem.status) : "-"}
              </Text>
              <View style={s.receiptDash} />

              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>운송일시</Text>
                <Text style={s.receiptVal}>
                  {receiptItem
                    ? formatDateTime(receiptItem.scheduledAt)
                    : "-"}
                </Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>결제 시각</Text>
                <Text style={s.receiptVal}>
                  {formatDateTime(receiptItem?.paidAt)}
                </Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>확인 완료 시각</Text>
                <Text style={s.receiptVal}>
                  {formatDateTime(receiptItem?.confirmedAt)}
                </Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>차량정보</Text>
                <Text style={s.receiptVal}>
                  {receiptItem?.vehicleInfo ?? "-"}
                </Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>결제 방식</Text>
                <Text style={s.receiptVal}>
                  {receiptItem?.payMethodLabel ?? "-"}
                </Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>상태 엔진</Text>
                <Text style={s.receiptVal}>
                  결제 {receiptItem?.paymentStatus ?? "-"} / 정산{" "}
                  {receiptItem?.settlementStatus ?? "-"}
                </Text>
              </View>

              <View style={s.receiptBlockGap} />

              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>기본 운임+작업비</Text>
                <Text style={s.receiptVal}>
                  {receiptItem ? toWon(receiptItem.billedSubtotal) : "0원"}
                </Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>화주 수수료</Text>
                <Text style={s.receiptVal}>
                  {receiptItem ? toWon(receiptItem.shipperFeeAmount) : "0원"}
                </Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>화주 프로모션</Text>
                <Text style={s.receiptVal}>
                  {receiptItem?.isToss ? "정산 스냅샷 미제공" : "해당 없음"}
                </Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>최종 화주 청구 금액</Text>
                <Text style={s.receiptVal}>
                  {receiptItem ? toWon(receiptItem.amount) : "0원"}
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (c: any) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: "#F5F6FA" },
    scrollContent: { paddingBottom: 30 },
    monthRow: {
      height: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      backgroundColor: "#FFF",
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9",
    },
    monthText: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
    monthNavBtn: { padding: 4 },
    section: { marginTop: 20 },
    filterAndCountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    paymentFilterRow: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    countText: { fontSize: 14, fontWeight: "800", color: "#475569" },
    filterGroup: { flexDirection: "row", gap: 6 },
    categoryBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 99,
      backgroundColor: "#F1F5F9",
    },
    categoryBtnActive: { backgroundColor: "#1E293B" },
    categoryText: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
    categoryTextActive: { color: "#FFF" },
    listWrap: { paddingHorizontal: 16, gap: 12 },
    emptyCard: {
      marginHorizontal: 16,
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  });
