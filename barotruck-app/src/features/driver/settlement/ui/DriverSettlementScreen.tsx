import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  isCashPayment,
  isTossPayment,
  toPaymentMethodLabel,
} from "@/features/common/payment/lib/paymentMethods";
import {
  calcOrderAmount,
  isDriverSettlementEligibleOrder,
  statusText,
  toSettlementStatus,
  toWon,
} from "@/features/common/settlement/lib/settlementHelpers";
import { SalesSummaryCard } from "@/features/driver/shard/ui/SalesSummaryCard";
import { OrderService } from "@/shared/api/orderService";
import { PaymentService } from "@/shared/api/paymentService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import type { DriverPayoutItemStatusResponse } from "@/shared/models/payment";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

type SettlementFilter = "ALL" | "PENDING" | "PAID";
type SettlementStatus = "UNPAID" | "PENDING" | "PAID" | "TAX_INVOICE";

type SettlementItem = {
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
  isPrepaid: boolean;
  confirmByDriver: boolean;
};

type PayoutState = {
  loading: boolean;
  data: DriverPayoutItemStatusResponse | null;
  error: string | null;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonth(d: Date, diff: number) {
  return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}

function compareMonth(a: Date, b: Date) {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() - b.getFullYear();
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
  const w = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return `${d.getMonth() + 1}.${d.getDate()} (${w})`;
}

function isAwaitingDriverConfirm(paymentStatus?: string | null) {
  return String(paymentStatus ?? "").toUpperCase() === "PAID";
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const candidate = error as {
    message?: unknown;
    response?: { status?: number; data?: { message?: unknown } | string };
  };

  const status = Number(candidate?.response?.status ?? 0);
  if (status === 400 || status === 404) {
    return "아직 지급 요청 전입니다.";
  }

  const responseData = candidate?.response?.data;
  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }
  if (
    typeof responseData === "object" &&
    responseData !== null &&
    "message" in responseData &&
    typeof responseData.message === "string" &&
    responseData.message.trim()
  ) {
    return responseData.message;
  }

  return String(candidate?.message ?? fallback);
}

function getPayoutStatusLabel(status?: DriverPayoutItemStatusResponse["status"] | null) {
  switch (status) {
    case "READY":
      return "지급 준비";
    case "REQUESTED":
      return "지급 요청";
    case "COMPLETED":
      return "지급 완료";
    case "FAILED":
      return "지급 실패";
    case "RETRYING":
      return "재시도 중";
    default:
      return "상태 없음";
  }
}

function getPayoutStatusPalette(status?: DriverPayoutItemStatusResponse["status"] | null) {
  switch (status) {
    case "COMPLETED":
      return { backgroundColor: "#E8F5E9", textColor: "#15803D" };
    case "FAILED":
      return { backgroundColor: "#FEE2E2", textColor: "#BE123C" };
    case "REQUESTED":
    case "RETRYING":
      return { backgroundColor: "#E0F2FE", textColor: "#0369A1" };
    case "READY":
    default:
      return { backgroundColor: "#FEF3C7", textColor: "#B45309" };
  }
}

function formatPayoutTime(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapOrderToSettlement(order: OrderResponse): SettlementItem | null {
  if (!isDriverSettlementEligibleOrder(order)) {
    return null;
  }

  const scheduledAt =
    parseDate(order.endSchedule) ||
    parseDate(order.startSchedule) ||
    parseDate(order.updated) ||
    parseDate(order.createdAt);

  if (!scheduledAt) return null;

  const status = toSettlementStatus(order);
  const confirmByDriver =
    isAwaitingDriverConfirm(order.paymentStatus) &&
    (isTossPayment(order.payMethod) || isCashPayment(order.payMethod));

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
    isPrepaid: isCashPayment(order.payMethod),
    confirmByDriver,
  };
}

type PaymentMethodFilter = "ALL" | "TOSS" | "OTHER";

export default function DriverSettlementScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentMonth = startOfMonth(new Date());

  const [filter, setFilter] = useState<SettlementFilter>("ALL");
  const [paymentFilter, setPaymentFilter] =
    useState<PaymentMethodFilter>("ALL");
  const [viewMonth, setViewMonth] = useState<Date>(currentMonth);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingOrderId, setSubmittingOrderId] = useState<number | null>(null);
  const [payoutStateByOrder, setPayoutStateByOrder] = useState<
    Record<number, PayoutState>
  >({});

  const fetchItems = useCallback(async () => {
    const rows = await OrderService.getMyDrivingOrders();
    return rows
      .map(mapOrderToSettlement)
      .filter((x): x is SettlementItem => x !== null)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);

      void (async () => {
        try {
          const next = await fetchItems();
          if (!active) return;
          setItems(next);
        } catch (error) {
          console.warn("Failed to load settlements", error);
          if (active) {
            setItems([]);
          }
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

  const monthItems = useMemo(() => items.filter((x) => isSameMonth(x.scheduledAt, viewMonth)), [items, viewMonth]);

  const filtered = useMemo(() => {
    const methodFiltered =
      paymentFilter === "ALL"
        ? monthItems
        : monthItems.filter((x) =>
            paymentFilter === "TOSS" ? x.isToss : !x.isToss,
          );

    if (filter === "ALL") return methodFiltered;
    if (filter === "PENDING")
      return methodFiltered.filter((x) => x.status !== "PAID");
    return methodFiltered.filter((x) => x.status === "PAID");
  }, [filter, monthItems, paymentFilter]);

  const summaryMonthTotal = useMemo(() => monthItems.reduce((acc, cur) => acc + cur.amount, 0), [monthItems]);
  const summaryPaid = useMemo(
    () => monthItems.filter((x) => x.status === "PAID").reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems],
  );
  const summaryPending = Math.max(0, summaryMonthTotal - summaryPaid);

  const onPressConfirm = async (item: SettlementItem) => {
    // 차주 결제확인 API 호출 후 목록을 다시 조회해 정산 상태를 즉시 동기화.
    if (!item.confirmByDriver) {
      Alert.alert("확인 불가", "이 결제 방식은 차주 결제확인 대상이 아닙니다.");
      return;
    }
    if (item.status === "PAID") {
      Alert.alert("안내", `주문 #${item.orderId}는 이미 정산 완료되었습니다.`);
      return;
    }
    if (submittingOrderId === item.orderId) return;

    try {
      setSubmittingOrderId(item.orderId);
      await PaymentService.confirmByDriver(item.orderId);
      const refreshed = await fetchItems();
      setItems(refreshed);
      Alert.alert("완료", `${item.orderId} 결제확인이 완료되었습니다.`);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "결제확인 처리에 실패했습니다. 다시 시도해 주세요.";
      Alert.alert("Error", String(msg));
    } finally {
      setSubmittingOrderId((prev) => (prev === item.orderId ? null : prev));
    }
  };

  const loadPayoutStatus = useCallback(async (orderId: number) => {
    setPayoutStateByOrder((prev) => ({
      ...prev,
      [orderId]: {
        loading: true,
        data: prev[orderId]?.data ?? null,
        error: null,
      },
    }));

    try {
      const payout = await PaymentService.getMyPayoutStatus(orderId);
      setPayoutStateByOrder((prev) => ({
        ...prev,
        [orderId]: {
          loading: false,
          data: payout,
          error: null,
        },
      }));
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "지급 상태를 불러오지 못했습니다."
      );
      setPayoutStateByOrder((prev) => ({
        ...prev,
        [orderId]: {
          loading: false,
          data: null,
          error: message,
        },
      }));
    }
  }, []);

  const s = StyleSheet.create({
    page: { flex: 1, backgroundColor: "#F5F6FA" },
    scrollContent: { paddingBottom: 24 + insets.bottom },
    monthRow: {
      height: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border.default,
      backgroundColor: c.bg.surface,
    },
    monthText: { fontSize: 17, fontWeight: "900", color: c.text.primary },
    monthNavBtn: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    contentWrap: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
    filterRow: { flexDirection: "row", gap: 8 },
    paymentFilterRow: { flexDirection: "row", gap: 8, marginTop: 2 },
    filterBtn: {
      borderRadius: 18,
      paddingHorizontal: 14,
      height: 36,
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#D4D9E3",
      backgroundColor: "#FFFFFF",
    },
    filterBtnActive: {
      backgroundColor: "#0F172A",
      borderColor: "#0F172A",
    },
    filterText: { fontSize: 13, fontWeight: "800", color: "#667085" },
    filterTextActive: { color: "#FFFFFF" },
    categoryBtn: {
      borderRadius: 16,
      paddingHorizontal: 12,
      height: 32,
      justifyContent: "center",
      backgroundColor: "#F1F5F9",
    },
    categoryBtnActive: {
      backgroundColor: "#0F172A",
    },
    categoryText: { fontSize: 12, fontWeight: "800", color: "#94A3B8" },
    categoryTextActive: { color: "#FFFFFF" },
    emptyCard: {
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border.default,
      backgroundColor: c.bg.surface,
      paddingVertical: 18,
      alignItems: "center",
    },
    emptyText: { fontSize: 13, fontWeight: "700", color: c.text.secondary },
    listWrap: { marginTop: 10, gap: 10 },
    itemCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#DEE3ED",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    itemTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    dateText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 12, fontWeight: "800" },
    amountText: { marginTop: 6, fontSize: 16, fontWeight: "900", color: c.text.primary },
    routeText: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: "900",
      color: c.text.primary,
    },
    payMethodText: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "700",
      color: c.text.secondary,
    },
    actionRow: {
      marginTop: 10,
      flexDirection: "row",
      justifyContent: "flex-end",
      flexWrap: "wrap",
      gap: 8,
    },
    actionBtn: {
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#4E46E5",
    },
    actionBtnDisabled: {
      backgroundColor: "#EEF2F7",
    },
    actionText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
    actionTextDisabled: { color: "#64748B" },
    payoutMetaText: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: "700",
      color: c.text.secondary,
    },
    flowGuideCard: {
      marginTop: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#D9E2F2",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    flowGuideTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: "#0F172A",
    },
    flowGuideText: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 18,
      color: "#64748B",
    },
    flowHintText: {
      marginTop: 6,
      fontSize: 11,
      fontWeight: "700",
      color: "#64748B",
    },
    payoutDetailCard: {
      marginTop: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      backgroundColor: "#F8FAFC",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    payoutDetailHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    payoutDetailTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: "#0F172A",
    },
    payoutDetailRow: {
      fontSize: 11,
      fontWeight: "700",
      color: "#475569",
      marginTop: 3,
    },
    payoutDetailError: {
      fontSize: 11,
      fontWeight: "700",
      color: "#BE123C",
      marginTop: 3,
    },
    payoutStatusBadge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    payoutStatusBadgeText: {
      fontSize: 11,
      fontWeight: "800",
    },
  });

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="차주 정산" hideBackButton />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.monthRow}>
          <Pressable style={s.monthNavBtn} onPress={() => setViewMonth((prev) => addMonth(prev, -1))}>
            <Ionicons name="chevron-back" size={24} color={c.text.primary} />
          </Pressable>
          <Text style={s.monthText}>{viewMonthLabel}</Text>
          <Pressable
            style={s.monthNavBtn}
            disabled={isNextDisabled}
            onPress={() => setViewMonth((prev) => (compareMonth(prev, currentMonth) >= 0 ? prev : addMonth(prev, 1)))}
          >
            <Ionicons name="chevron-forward" size={24} color={isNextDisabled ? "#CBD5E1" : c.text.primary} />
          </Pressable>
        </View>

        <SalesSummaryCard
          monthNumber={viewMonth.getMonth() + 1}
          totalAmount={summaryMonthTotal}
          settledAmount={summaryPaid}
          pendingAmount={summaryPending}
          style={{ marginTop: 14, marginHorizontal: 16 }}
        />

        <View style={s.flowGuideCard}>
          <Text style={s.flowGuideTitle}>정산 테스트 순서</Text>
          <Text style={s.flowGuideText}>
            1. 화주 앱에서 결제를 완료합니다.{"\n"}
            2. 차주 앱에서 `토스 결제확인` 또는 `착불 결제확인`을 누릅니다.{"\n"}
            3. 관리자에서 지급 요청을 실행합니다.{"\n"}
            4. 이 화면에서 `지급 상태`를 눌러 요청/완료/실패를 확인합니다.
          </Text>
        </View>

        <View style={s.contentWrap}>
          <View style={s.filterRow}>
            {[
              ["ALL", "전체"],
              ["PENDING", "미확인"],
              ["PAID", "완료"],
            ].map(([key, label]) => {
              const active = filter === key;
              return (
                <Pressable
                  key={key}
                  style={[s.filterBtn, active && s.filterBtnActive]}
                  onPress={() => setFilter(key as SettlementFilter)}
                >
                  <Text style={[s.filterText, active && s.filterTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.paymentFilterRow}>
              {[
                ["ALL", "결제 전체"],
                ["TOSS", "토스"],
                ["OTHER", "기타"],
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

          {/* 목록부 */}
          {loading ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>불러오는 중...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>선택한 월의 정산 내역이 없습니다.</Text>
            </View>
          ) : (
            <View style={s.listWrap}>
              {filtered.map((item) => {
                const isPaid = item.status === "PAID";
                const isSubmitting = submittingOrderId === item.orderId;
                const payoutState = payoutStateByOrder[item.orderId];
                const needsDriverConfirm = item.confirmByDriver && !isPaid;
                const showPayoutAction =
                  isPaid ||
                  Boolean(payoutState?.loading) ||
                  Boolean(payoutState?.data) ||
                  Boolean(payoutState?.error);
                const statusColor = isPaid ? "#E8F5E9" : item.status === "PENDING" ? "#FEF9C3" : "#FEE2E2";
                const actionText = isPaid
                  ? "결제완료"
                  : item.isToss
                    ? "토스 결제확인"
                    : "착불 결제확인";
                const payoutMeta = payoutState?.loading
                  ? "지급 상태 확인 중..."
                  : payoutState?.data
                    ? `${getPayoutStatusLabel(payoutState.data.status)} · ${
                        formatPayoutTime(
                          payoutState.data.completedAt ??
                            payoutState.data.requestedAt
                        ) ?? "-"
                      }`
                    : payoutState?.error ?? null;

                return (
                  <View key={item.id} style={s.itemCard}>
                    <View style={s.itemTop}>
                      <View style={s.dateRow}>
                        <Text style={s.dateText}>{item.dateLabel}</Text>
                        <View style={[s.statusBadge, { backgroundColor: statusColor }]}> 
                          <Text
                            style={[
                              s.statusText,
                              { color: isPaid ? "#15803D" : "#7C8591" },
                            ]}
                          >
                            {statusText(item.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.amountText}>{toWon(item.amount)}</Text>
                    </View>

                    <Text style={s.routeText}>
                      {item.from} <Text style={{ color: "#94A3B8" }}>→</Text> {item.to}
                    </Text>
                    <Text style={s.payMethodText}>결제 방식: {item.payMethodLabel}</Text>
                    {payoutMeta ? (
                      <Text style={s.payoutMetaText}>지급 상태: {payoutMeta}</Text>
                    ) : null}
                    <Text style={s.flowHintText}>
                      {needsDriverConfirm
                        ? "먼저 차주 결제확인을 완료해야 이후 지급 상태를 확인할 수 있습니다."
                        : "결제확인 완료 후 관리자 지급요청이 들어오면 이 영역이 `지급 요청` 또는 `지급 완료`로 바뀝니다."}
                    </Text>

                    {payoutState?.data ? (
                      <View style={s.payoutDetailCard}>
                        <View style={s.payoutDetailHeader}>
                          <Text style={s.payoutDetailTitle}>지급 상세</Text>
                          <View
                            style={[
                              s.payoutStatusBadge,
                              {
                                backgroundColor: getPayoutStatusPalette(
                                  payoutState.data.status,
                                ).backgroundColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                s.payoutStatusBadgeText,
                                {
                                  color: getPayoutStatusPalette(payoutState.data.status)
                                    .textColor,
                                },
                              ]}
                            >
                              {getPayoutStatusLabel(payoutState.data.status)}
                            </Text>
                          </View>
                        </View>
                        <Text style={s.payoutDetailRow}>
                          payoutRef: {payoutState.data.payoutRef || "-"}
                        </Text>
                        <Text style={s.payoutDetailRow}>
                          요청시각: {formatPayoutTime(payoutState.data.requestedAt) || "-"}
                        </Text>
                        <Text style={s.payoutDetailRow}>
                          완료시각: {formatPayoutTime(payoutState.data.completedAt) || "-"}
                        </Text>
                        <Text style={s.payoutDetailRow}>
                          webhook 상태: {payoutState.data.webhookStatus || "-"}
                        </Text>
                        {payoutState.data.failureReason ? (
                          <Text style={s.payoutDetailError}>
                            실패 사유: {payoutState.data.failureReason}
                          </Text>
                        ) : null}
                      </View>
                    ) : payoutState?.error ? (
                      <View style={s.payoutDetailCard}>
                        <Text style={s.payoutDetailTitle}>지급 상세</Text>
                        <Text style={s.payoutDetailError}>{payoutState.error}</Text>
                      </View>
                    ) : null}

                    <View style={s.actionRow}>
                      {needsDriverConfirm ? (
                        <Pressable
                          style={[s.actionBtn, (isPaid || isSubmitting) && s.actionBtnDisabled]}
                          disabled={isPaid || isSubmitting}
                          onPress={() => void onPressConfirm(item)}
                        >
                          <MaterialCommunityIcons
                            name={isPaid ? "check-decagram-outline" : "clipboard-check-multiple-outline"}
                            size={14}
                            color={isPaid || isSubmitting ? "#64748B" : "#FFFFFF"}
                          />
                          <Text style={[s.actionText, (isPaid || isSubmitting) && s.actionTextDisabled]}>
                            {isSubmitting ? "처리중..." : actionText}
                          </Text>
                        </Pressable>
                      ) : null}
                      {showPayoutAction ? (
                        <Pressable
                          style={[s.actionBtn, payoutState?.loading && s.actionBtnDisabled]}
                          disabled={Boolean(payoutState?.loading)}
                          onPress={() => void loadPayoutStatus(item.orderId)}
                        >
                          <MaterialCommunityIcons
                            name="bank-transfer-out"
                            size={14}
                            color={payoutState?.loading ? "#64748B" : "#FFFFFF"}
                          />
                          <Text
                            style={[
                              s.actionText,
                              payoutState?.loading && s.actionTextDisabled,
                            ]}
                          >
                            {payoutState?.loading ? "확인중..." : "지급 상태"}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (c: any) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: "#F5F6FA" },
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
    emptyCard: { padding: 40, alignItems: "center" },
    emptyText: { color: "#94A3B8", fontWeight: "600" },
  });
