import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderService } from "@/shared/api/orderService";
import { normalizeTransportPaymentStatus, PaymentService } from "@/shared/api/paymentService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import type { PaymentDisputeReason, TransportPaymentStatus } from "@/shared/models/payment";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import {
  calcOrderAmount,
  statusText,
  toSettlementStatusFromSettlement,
  toWon,
} from "@/features/common/settlement/lib/settlementHelpers";
import {
  isShipperActivePaymentMethod,
  isDeferredPayment,
  isTossPayment,
  toPaymentMethodLabel,
} from "@/features/common/payment/lib/paymentMethods";
import { SalesSummaryCard } from "@/features/driver/shard/ui/SalesSummaryCard";

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
  paymentStatus?: TransportPaymentStatus;
  supportsDriverConfirm: boolean;
  canConfirmByDriver: boolean;
  canDispute: boolean;
};

const DISPUTE_REASON_OPTIONS: Array<{
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
  {
    value: "OTHER",
    label: "기타",
    hint: "기타 사유를 상세히 적어 주세요.",
  },
];

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

function toDriverSettlementStatus(paymentStatus?: TransportPaymentStatus): SettlementStatus {
  if (
    paymentStatus === "PAID" ||
    paymentStatus === "DISPUTED" ||
    paymentStatus === "ADMIN_HOLD" ||
    paymentStatus === "ADMIN_REJECTED"
  ) {
    return "PENDING";
  }
  if (paymentStatus === "CONFIRMED" || paymentStatus === "ADMIN_FORCE_CONFIRMED") {
    return "PAID";
  }
  return "UNPAID";
}

function toDriverActionLabel(item: Pick<SettlementItem, "isToss" | "paymentStatus" | "canConfirmByDriver">) {
  if (item.canConfirmByDriver) {
    return item.isToss ? "토스 결제확인" : "착불 결제확인";
  }
  if (
    item.paymentStatus === "DISPUTED" ||
    item.paymentStatus === "ADMIN_HOLD" ||
    item.paymentStatus === "ADMIN_REJECTED"
  ) {
    return "이의 처리중";
  }
  return "화주 결제 대기";
}

function resolveDriverPaymentStatus(order: OrderResponse): TransportPaymentStatus | undefined {
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
  ) {
    return direct;
  }
  if (fromSettlement === "CONFIRMED") return fromSettlement;
  if (fromSettlement === "PAID" && (!direct || direct === "READY")) {
    return fromSettlement;
  }
  return direct ?? fromSettlement;
}

function mapOrderToSettlement(order: OrderResponse): SettlementItem | null {
  if (order.status === "CANCELLED" || order.status === "REQUESTED" || order.status === "PENDING") {
    return null;
  }

  const supportsDriverConfirm =
    isTossPayment(order.payMethod) || isDeferredPayment(order.payMethod);
  if (!isShipperActivePaymentMethod(order.payMethod) || !supportsDriverConfirm) {
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
  const canConfirmByDriver = paymentStatus === "PAID";
  const canDispute =
    paymentStatus === "PAID" ||
    paymentStatus === "DISPUTED" ||
    paymentStatus === "ADMIN_HOLD" ||
    paymentStatus === "ADMIN_REJECTED";

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
    canConfirmByDriver,
    canDispute,
  };
}

export default function DriverSettlementScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentMonth = startOfMonth(new Date());

  const [filter, setFilter] = useState<SettlementFilter>("ALL");
  const [viewMonth, setViewMonth] = useState<Date>(currentMonth);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingOrderId, setSubmittingOrderId] = useState<number | null>(null);
  const [disputeTarget, setDisputeTarget] = useState<SettlementItem | null>(null);
  const [disputeReason, setDisputeReason] =
    useState<PaymentDisputeReason>("RECEIVED_AMOUNT_MISMATCH");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

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
    if (filter === "ALL") return monthItems;
    if (filter === "PENDING") return monthItems.filter((x) => x.status !== "PAID");
    return monthItems.filter((x) => x.status === "PAID");
  }, [filter, monthItems]);

  const summaryMonthTotal = useMemo(() => monthItems.reduce((acc, cur) => acc + cur.amount, 0), [monthItems]);
  const summaryPaid = useMemo(
    () => monthItems.filter((x) => x.status === "PAID").reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems],
  );
  const summaryPending = Math.max(0, summaryMonthTotal - summaryPaid);

  const onPressConfirm = async (item: SettlementItem) => {
    // 차주 결제확인 API 호출 후 목록을 다시 조회해 정산 상태를 즉시 동기화.
    if (!item.supportsDriverConfirm) {
      Alert.alert("확인 불가", "이 결제 방식은 차주 결제확인 대상이 아닙니다.");
      return;
    }
    if (item.paymentStatus === "CONFIRMED" || item.paymentStatus === "ADMIN_FORCE_CONFIRMED") {
      Alert.alert("안내", `주문 #${item.orderId}는 이미 정산 완료되었습니다.`);
      return;
    }
    if (!item.canConfirmByDriver) {
      const msg =
        item.paymentStatus === "DISPUTED" ||
        item.paymentStatus === "ADMIN_HOLD" ||
        item.paymentStatus === "ADMIN_REJECTED"
          ? "이의 처리 중인 결제는 차주 확인을 진행할 수 없습니다."
          : "화주 결제 완료 후 확인 가능합니다.";
      Alert.alert("확인 불가", msg);
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

  const openDisputeModal = (item: SettlementItem) => {
    if (isSubmittingDispute) return;
    setDisputeTarget(item);
    setDisputeReason("RECEIVED_AMOUNT_MISMATCH");
    setDisputeDescription("");
  };

  const closeDisputeModal = () => {
    if (isSubmittingDispute) return;
    setDisputeTarget(null);
    setDisputeReason("RECEIVED_AMOUNT_MISMATCH");
    setDisputeDescription("");
  };

  const submitDispute = async () => {
    if (!disputeTarget) return;
    const description = disputeDescription.trim();
    if (description.length < 5) {
      Alert.alert("입력 필요", "이의 사유를 5자 이상 입력해 주세요.");
      return;
    }

    try {
      setIsSubmittingDispute(true);
      await PaymentService.createDispute(disputeTarget.orderId, {
        reasonCode: disputeReason,
        description,
      });
      const refreshed = await fetchItems();
      setItems(refreshed);
      Alert.alert("접수 완료", `주문 #${disputeTarget.orderId} 이의제기가 접수되었습니다.`);
      setDisputeTarget(null);
      setDisputeReason("RECEIVED_AMOUNT_MISMATCH");
      setDisputeDescription("");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "이의제기 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.";
      Alert.alert("오류", String(msg));
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const selectedDisputeReasonHint =
    DISPUTE_REASON_OPTIONS.find((reason) => reason.value === disputeReason)?.hint ?? "";

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
      alignItems: "flex-end",
    },
    actionGroup: {
      flexDirection: "row",
      alignItems: "center",
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
    disputeBtn: {
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: "#E11D48",
      backgroundColor: "#FFFFFF",
    },
    disputeBtnDisabled: {
      borderColor: "#CBD5E1",
      backgroundColor: "#F8FAFC",
    },
    disputeText: { fontSize: 12, fontWeight: "800", color: "#E11D48" },
    disputeTextDisabled: { color: "#94A3B8" },
    disputeModalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.48)",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    disputeModalCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      backgroundColor: "#FFFFFF",
      padding: 16,
      gap: 10,
    },
    disputeModalTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: c.text.primary,
    },
    disputeModalSub: {
      fontSize: 12,
      fontWeight: "700",
      color: c.text.secondary,
    },
    disputeReasonWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 2,
    },
    disputeReasonChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "#CBD5E1",
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: "#FFFFFF",
    },
    disputeReasonChipActive: {
      borderColor: "#0F172A",
      backgroundColor: "#0F172A",
    },
    disputeReasonLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: "#475569",
    },
    disputeReasonLabelActive: {
      color: "#FFFFFF",
    },
    disputeHint: {
      fontSize: 12,
      fontWeight: "700",
      color: "#64748B",
      lineHeight: 18,
    },
    disputeInput: {
      minHeight: 110,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text.primary,
      textAlignVertical: "top",
    },
    disputeCounter: {
      alignItems: "flex-end",
    },
    disputeCounterText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#94A3B8",
    },
    disputeActionRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 2,
    },
    disputeCancelBtn: {
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    disputeCancelText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#64748B",
    },
    disputeSubmitBtn: {
      height: 36,
      borderRadius: 10,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#E11D48",
    },
    disputeSubmitBtnDisabled: {
      backgroundColor: "#FDA4AF",
    },
    disputeSubmitText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
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
                const statusColor = isPaid ? "#E8F5E9" : item.status === "PENDING" ? "#FEF9C3" : "#FEE2E2";
                const actionText = isPaid ? "결제완료" : toDriverActionLabel(item);
                const actionDisabled =
                  isPaid || !item.canConfirmByDriver || isSubmitting || isSubmittingDispute;
                const actionIconName = isPaid
                  ? "check-decagram-outline"
                  : item.canConfirmByDriver
                    ? "clipboard-check-multiple-outline"
                    : "lock-outline";
                const showDispute = !isPaid && item.canDispute;

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

                    <View style={s.actionRow}>
                      {item.supportsDriverConfirm ? (
                        <View style={s.actionGroup}>
                          <Pressable
                            style={[s.actionBtn, actionDisabled && s.actionBtnDisabled]}
                            disabled={actionDisabled}
                            onPress={() => void onPressConfirm(item)}
                          >
                            <MaterialCommunityIcons
                              name={actionIconName}
                              size={14}
                              color={actionDisabled ? "#64748B" : "#FFFFFF"}
                            />
                            <Text
                              style={[
                                s.actionText,
                                actionDisabled && s.actionTextDisabled,
                              ]}
                            >
                              {isSubmitting ? "처리중..." : actionText}
                            </Text>
                          </Pressable>
                          {showDispute ? (
                            <Pressable
                              style={[s.disputeBtn, (isSubmitting || isSubmittingDispute) && s.disputeBtnDisabled]}
                              disabled={isSubmitting || isSubmittingDispute}
                              onPress={() => openDisputeModal(item)}
                            >
                              <MaterialCommunityIcons
                                name="alert-circle-outline"
                                size={14}
                                color={isSubmitting || isSubmittingDispute ? "#94A3B8" : "#E11D48"}
                              />
                              <Text
                                style={[
                                  s.disputeText,
                                  (isSubmitting || isSubmittingDispute) && s.disputeTextDisabled,
                                ]}
                              >
                                이의제기
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!disputeTarget}
        transparent
        animationType="fade"
        onRequestClose={closeDisputeModal}
      >
        <Pressable style={s.disputeModalBackdrop} onPress={closeDisputeModal}>
          <Pressable style={s.disputeModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={s.disputeModalTitle}>결제 이의제기</Text>
            <Text style={s.disputeModalSub}>
              {disputeTarget
                ? `주문 #${disputeTarget.orderId} (${disputeTarget.payMethodLabel})`
                : "-"}
            </Text>

            <View style={s.disputeReasonWrap}>
              {DISPUTE_REASON_OPTIONS.map((reason) => {
                const active = disputeReason === reason.value;
                return (
                  <Pressable
                    key={reason.value}
                    style={[s.disputeReasonChip, active && s.disputeReasonChipActive]}
                    onPress={() => setDisputeReason(reason.value)}
                    disabled={isSubmittingDispute}
                  >
                    <Text
                      style={[s.disputeReasonLabel, active && s.disputeReasonLabelActive]}
                    >
                      {reason.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.disputeHint}>{selectedDisputeReasonHint}</Text>

            <TextInput
              style={s.disputeInput}
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              placeholder="예: 실제 입금 내역이 확인되지 않습니다. 거래내역 캡처는 별도 제출하겠습니다."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={300}
              editable={!isSubmittingDispute}
            />
            <View style={s.disputeCounter}>
              <Text style={s.disputeCounterText}>{disputeDescription.length}/300</Text>
            </View>

            <View style={s.disputeActionRow}>
              <Pressable
                style={s.disputeCancelBtn}
                onPress={closeDisputeModal}
                disabled={isSubmittingDispute}
              >
                <Text style={s.disputeCancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={[
                  s.disputeSubmitBtn,
                  (isSubmittingDispute || disputeDescription.trim().length < 5) &&
                    s.disputeSubmitBtnDisabled,
                ]}
                onPress={() => void submitDispute()}
                disabled={isSubmittingDispute || disputeDescription.trim().length < 5}
              >
                <Text style={s.disputeSubmitText}>
                  {isSubmittingDispute ? "접수중..." : "이의제기 접수"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
