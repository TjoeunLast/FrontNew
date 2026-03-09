import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
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
import {
  calcOrderAmount,
  statusText,
  toSettlementStatus,
  toWon,
} from "@/features/common/settlement/lib/settlementHelpers";
import { OrderApi } from "@/shared/api/orderService";
import { PaymentService } from "@/shared/api/paymentService";
import { SettlementService } from "@/shared/api/settlementService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

type SettlementFilter = "ALL" | "UNPAID" | "TAX";
type SettlementStatus = "UNPAID" | "PENDING" | "PAID" | "TAX_INVOICE";

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
  actionLabel: string;
  vehicleInfo: string;
  payMethodLabel: string;
  isToss: boolean;
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
    // noop
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

function isWebViewInternalUrl(url: string) {
  const lower = String(url || "").toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("about:blank") ||
    lower.startsWith("data:")
  );
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
          failUrl: "${failUrl}"
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

function toActionLabel(status: SettlementStatus, isTransportCompleted = true) {
  if (status === "UNPAID")
    return isTransportCompleted ? "결제하기" : "운송완료 후 결제";
  if (status === "PENDING") return "결제대기";
  if (status === "PAID") return "영수증 확인";
  return "계산서 보기";
}

function mapOrderToSettlement(
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

  const scheduledAt =
    parseDate(order.endSchedule) ||
    parseDate(order.startSchedule) ||
    parseDate(order.updated) ||
    parseDate(order.createdAt);
  if (!scheduledAt) return null;

  if (!isShipperActivePaymentMethod(order.payMethod)) return null;

  const amount = calcOrderAmount(order);
  const normalizedOrderStatus = String(order.status ?? "")
    .trim()
    .toUpperCase();
  // 일부 레거시 응답은 settlementStatus가 READY여도 order.status에 결제완료 상태가 들어옴.
  // 이 경우 결제완료 건이 다시 UNPAID로 보이지 않도록 보정.
  const paidByOrderStatus =
    normalizedOrderStatus === "PAID" ||
    normalizedOrderStatus === "CONFIRMED" ||
    normalizedOrderStatus === "ADMIN_FORCE_CONFIRMED";
  const rawBaseStatus = toSettlementStatus(order);
  const baseStatus =
    rawBaseStatus === "UNPAID" && paidByOrderStatus ? "PAID" : rawBaseStatus;
  const status =
    baseStatus === "UNPAID" && pendingOrderIds?.has(Number(order.orderId))
      ? "PENDING"
      : baseStatus;
  const isTransportCompleted = order.status === "COMPLETED";
  if (__DEV__) {
    console.log("[settlement-map]", {
      orderId: order.orderId,
      settlementStatus: order.settlementStatus,
      payMethod: order.payMethod,
      resolvedStatus: status,
    });
  }
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

type PaymentMethodFilter = "ALL" | "TOSS" | "DEFERRED";

export default function ShipperSettlementScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentMonth = startOfMonth(new Date());

  const [filter, setFilter] = useState<SettlementFilter>("ALL");
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
    const pendingOrderIds = await loadPendingSettlementOrderIds();
    const rows = await OrderApi.getMyShipperOrders();
    const mapped = rows
      .map((row) => mapOrderToSettlement(row, pendingOrderIds))
      .filter((x): x is SettlementItem => x !== null)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

    const paidIds = mapped
      .filter((x) => x.status === "PAID")
      .map((x) => x.orderId);
    let dirty = false;
    paidIds.forEach((id) => {
      if (pendingOrderIds.delete(id)) dirty = true;
    });
    if (dirty) await savePendingSettlementOrderIds(pendingOrderIds);

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
    if (filter === "UNPAID")
      return methodFiltered.filter((x) => x.status === "UNPAID");
    return methodFiltered.filter((x) => x.status === "TAX_INVOICE");
  }, [filter, monthItems, paymentFilter]);

  const summaryTotal = useMemo(
    () => monthItems.reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems],
  );
  const summaryDoneCount = monthItems.length;
  const summaryUnpaid = useMemo(
    () =>
      monthItems
        .filter((x) => x.status === "UNPAID")
        .reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems],
  );

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
                    status: "PAID",
                    actionLabel: toActionLabel(
                      "PAID",
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
                ? { ...row, status: "PAID", actionLabel: toActionLabel("PAID") }
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
        void Linking.openURL(url).catch(() => {
          Alert.alert(
            "결제 안내",
            "외부 결제 앱을 열 수 없습니다. 카드/은행 앱 설치 여부를 확인해 주세요.",
          );
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
      // noop
    }
  }, []);

  const onPressAction = async (item: SettlementItem) => {
    if (submittingOrderId === item.orderId) return;
    if (item.status === "PAID") {
      setReceiptItem(item);
      return;
    }

    if (item.status === "TAX_INVOICE") {
      Alert.alert("안내", "계산서 보기 기능은 준비 중입니다.");
      return;
    }
    if (item.status === "PENDING") {
      Alert.alert("안내", "결제 요청 처리 중입니다.");
      return;
    }
    if (item.status === "UNPAID" && !item.isTransportCompleted) {
      // 백엔드 정책: 운송 완료(COMPLETED) 이후에만 결제 시작 가능.
      Alert.alert("안내", "운송 완료 후 결제할 수 있습니다.");
      return;
    }

    if (item.isToss) {
      // 토스 결제는 정산 화면 인라인 모달이 아니라 전용 라우트 화면에서 처리.
      router.push({
        pathname: "/(shipper)/payment-checkout",
        params: { orderId: String(item.orderId) },
      } as any);
      return;
    }

    try {
      setSubmittingOrderId(item.orderId);
      await SettlementService.initSettlement({
        orderId: item.orderId,
        couponDiscount: 0,
        levelDiscount: 0,
      });
      const pendingOrderIds = await loadPendingSettlementOrderIds();
      pendingOrderIds.add(item.orderId);
      await savePendingSettlementOrderIds(pendingOrderIds);
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
                }
              : row,
          ),
        );
      }
      Alert.alert("결제 요청", "결제 요청이 생성되었습니다.");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "결제 요청 중 오류가 발생했습니다.";
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

      if (isAlreadyPaid) {
        const pendingOrderIds = await loadPendingSettlementOrderIds();
        if (pendingOrderIds.delete(item.orderId)) {
          await savePendingSettlementOrderIds(pendingOrderIds);
        }
        const refreshed = await fetchItems().catch(() => null);
        if (refreshed) {
          setItems(refreshed);
        } else {
          setItems((prev) =>
            prev.map((row) =>
              row.id === item.id
                ? { ...row, status: "PAID", actionLabel: toActionLabel("PAID") }
                : row,
            ),
          );
        }
        Alert.alert("안내", "이미 결제완료된 건입니다.");
        return;
      }

      if (isDuplicate) {
        const pendingOrderIds = await loadPendingSettlementOrderIds();
        pendingOrderIds.add(item.orderId);
        await savePendingSettlementOrderIds(pendingOrderIds);
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
                  }
                : row,
            ),
          );
        }
        Alert.alert("안내", "이미 결제 요청된 건입니다.");
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
        scrollContent: { paddingBottom: 22 } as ViewStyle,
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
          borderRadius: 18,
          paddingHorizontal: 18,
          paddingVertical: 16,
          backgroundColor: "#4E46E5",
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
        section: {
          marginTop: 16,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: c.border.default,
        } as ViewStyle,
        filterRow: {
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 16,
        } as ViewStyle,
        filterBtn: {
          borderRadius: 18,
          paddingHorizontal: 14,
          height: 38,
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
          marginTop: 10,
          paddingHorizontal: 16,
          gap: 10,
        } as ViewStyle,
        itemCard: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#D9DEE7",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 14,
          paddingVertical: 12,
        } as ViewStyle,
        unpaidCard: { borderColor: "#E05A55" } as ViewStyle,
        itemTop: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        } as ViewStyle,
        dateRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        } as ViewStyle,
        dateText: {
          fontSize: 13,
          fontWeight: "700",
          color: "#64748B",
        } as TextStyle,
        statusBadge: {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
        } as ViewStyle,
        statusText: { fontSize: 12, fontWeight: "800" } as TextStyle,
        amountText: {
          fontSize: 16,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        amountUnpaid: { color: "#E05A55" } as TextStyle,
        routeText: {
          marginTop: 10,
          fontSize: 14,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        payMethodText: {
          marginTop: 6,
          fontSize: 12,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        arrowText: { color: "#94A3B8" } as TextStyle,
        actionRow: {
          marginTop: 8,
          flexDirection: "row",
          justifyContent: "flex-end",
        } as ViewStyle,
        actionBtn: {
          height: 34,
          paddingHorizontal: 12,
          borderRadius: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          backgroundColor: "#EEF2FF",
        } as ViewStyle,
        actionBtnNeutral: { backgroundColor: "#EEF2F7" } as ViewStyle,
        actionText: {
          fontSize: 13,
          fontWeight: "800",
          color: "#4E46E5",
        } as TextStyle,
        actionTextNeutral: { color: "#64748B" } as TextStyle,
        emptyCard: {
          marginHorizontal: 16,
          marginTop: 10,
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

        <View style={s.summaryCard}>
          <Text style={s.summaryCaption}>{viewMonthNumber}월 총 지출 예정</Text>
          <Text style={s.summaryAmount}>{toWon(summaryTotal)}</Text>
          <View style={s.summaryDivider} />
          <View style={s.summaryBottomRow}>
            <View style={s.summaryCol}>
              <Text style={s.summaryBig}>{summaryDoneCount}건</Text>
              <Text style={s.summarySmall}>완료</Text>
            </View>
            <View style={s.summaryColDivider} />
            <View style={s.summaryCol}>
              <Text style={[s.summaryBig, s.summaryBigRight]}>
                {toWon(summaryUnpaid)}
              </Text>
              <Text style={[s.summarySmall, s.summarySmallRight]}>미결제</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.filterRow}>
            {[
              ["ALL", "전체"],
              ["UNPAID", "미결제"],
              ["TAX", "세금계산서"],
            ].map(([key, label]) => {
              const active = filter === key;
              return (
                <Pressable
                  key={key}
                  style={[s.filterBtn, active && s.filterBtnActive]}
                  onPress={() => setFilter(key as SettlementFilter)}
                >
                  <Text style={[s.filterText, active && s.filterTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.paymentFilterRow}>
            {[
              ["ALL", "결제 전체"],
              ["TOSS", "토스"],
              ["DEFERRED", "착불"],
            ].map(([key, label]) => {
              const active = paymentFilter === key;
              return (
                <Pressable
                  key={key}
                  style={[s.categoryBtn, active && s.categoryBtnActive]}
                  onPress={() => setPaymentFilter(key as PaymentMethodFilter)}
                >
                  <Text style={[s.categoryText, active && s.categoryTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 목록 영역 */}
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
                return (
                  <View
                    key={item.id}
                    style={[s.itemCard, isUnpaid && s.unpaidCard]}
                  >
                    <View style={s.itemTop}>
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
                                      : "#2E6DA4",
                              },
                            ]}
                          >
                            {statusText(item.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[s.amountText, isUnpaid && s.amountUnpaid]}>
                        {toWon(item.amount)}
                      </Text>
                    </View>

                    <Text style={s.routeText}>
                      {item.from} <Text style={s.arrowText}>→</Text> {item.to}
                    </Text>
                    <Text style={s.payMethodText}>
                      결제 방식: {item.payMethodLabel}
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
                              (!isUnpaid || paymentBlocked) &&
                                s.actionBtnNeutral,
                            ]}
                            disabled={
                              isSubmitting || isPending || paymentBlocked
                            }
                            onPress={() => void onPressAction(item)}
                          >
                            <MaterialCommunityIcons
                              name={
                                paymentBlocked
                                  ? "lock-outline"
                                  : item.status === "PAID"
                                    ? "file-document-outline"
                                    : item.status === "PENDING"
                                      ? "timer-sand"
                                      : item.status === "TAX_INVOICE"
                                        ? "file-outline"
                                        : "credit-card-outline"
                              }
                              size={14}
                              color={
                                paymentBlocked
                                  ? "#94A3B8"
                                  : isUnpaid
                                    ? "#4E46E5"
                                    : isPending
                                      ? "#A16207"
                                      : "#64748B"
                              }
                            />
                            <Text
                              style={[
                                s.actionText,
                                (!isUnpaid || paymentBlocked) &&
                                  s.actionTextNeutral,
                              ]}
                            >
                              {isSubmitting ? "요청중..." : item.actionLabel}
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
              <Text style={s.modalTitle}>운송 영수증</Text>
              <Pressable onPress={() => setReceiptItem(null)}>
                <Ionicons name="close" size={28} color={c.text.primary} />
              </Pressable>
            </View>

            <View style={s.receiptCard}>
              <Text style={s.receiptAmount}>
                {receiptItem ? receiptItem.amount.toLocaleString("ko-KR") : "0"}
              </Text>
              <Text style={s.receiptPaid}>결제완료</Text>
              <View style={s.receiptDash} />

              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>운송일시</Text>
                <Text style={s.receiptVal}>
                  {receiptItem
                    ? `${receiptItem.scheduledAt.getFullYear()}.${String(receiptItem.scheduledAt.getMonth() + 1).padStart(2, "0")}.${String(receiptItem.scheduledAt.getDate()).padStart(2, "0")} ${String(receiptItem.scheduledAt.getHours()).padStart(2, "0")}:${String(receiptItem.scheduledAt.getMinutes()).padStart(2, "0")}`
                    : "-"}
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

              <View style={s.receiptBlockGap} />

              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>공급가액</Text>
                <Text style={s.receiptVal}>
                  {receiptItem
                    ? receiptItem.amount.toLocaleString("ko-KR")
                    : "0"}
                </Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>세액</Text>
                <Text style={s.receiptVal}>0원</Text>
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
    // 월 선택 스타일
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
    // 필터 및 건수 일렬 배치 스타일
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
    // 차주 오더목록 스타일 카테고리 버튼
    categoryBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 99,
      backgroundColor: "#F1F5F9",
    },
    categoryBtnActive: { backgroundColor: "#1E293B" },
    categoryText: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
    categoryTextActive: { color: "#FFF" },
    // 리스트 공통 스타일
    listWrap: { paddingHorizontal: 16, gap: 12 },
    emptyCard: {
      marginHorizontal: 16,
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  });
