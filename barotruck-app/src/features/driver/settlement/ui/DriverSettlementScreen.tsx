import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toPaymentMethodLabel } from "@/features/common/payment/lib/paymentMethods";
import {
  calcOrderAmount,
  isDriverSettlementEligibleOrder,
  toWon,
} from "@/features/common/settlement/lib/settlementHelpers";
import { OrderService } from "@/shared/api/orderService";
import { PaymentService } from "@/shared/api/paymentService";
import { SettlementService } from "@/shared/api/settlementService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import type { SettlementResponse } from "@/shared/models/Settlement";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

type SettlementFilter = "ALL" | "UNPAID" | "AWAITING_CONFIRM" | "PAID";
type DriverSettlementStatus = "UNPAID" | "AWAITING_CONFIRM" | "PAID";

type DriverSettlementItem = {
  id: string;
  orderId: number;
  scheduledAt: Date;
  dateLabel: string;
  status: DriverSettlementStatus;
  from: string;
  to: string;
  paymentMethodLabel: string;
  baseAmount: number;
  driverFeeAmount: number;
  driverFeeRate: number | null;
  driverPromoApplied: boolean | null;
  driverPayoutAmount: number;
  hasSettlementSnapshot: boolean;
  hasDriverBreakdown: boolean;
  paymentStatus?: string | null;
  settlementStatus?: string | null;
  payoutStatus?: string | null;
  payoutFailureReason?: string | null;
  paidAt?: string | null;
  confirmedAt?: string | null;
  feeDate?: string | null;
  feeCompleteDate?: string | null;
  payoutRequestedAt?: string | null;
  payoutCompletedAt?: string | null;
  bankName?: string | null;
  accountNum?: string | null;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonth(d: Date, diff: number) {
  return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}

function compareMonth(a: Date, b: Date) {
  if (a.getFullYear() !== b.getFullYear()) {
    return a.getFullYear() - b.getFullYear();
  }
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

function parseDate(v?: string | null) {
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

function toFiniteNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function maskAccount(v?: string | null) {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (!digits) return "-";
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 3)}*****${digits.slice(-3)}`;
}

function resolveDriverSettlementStatus(
  order?: OrderResponse,
  settlement?: SettlementResponse,
): DriverSettlementStatus {
  const paymentStatus = String(
    settlement?.paymentStatus ?? order?.paymentStatus ?? "",
  ).toUpperCase();
  const settlementStatus = String(
    settlement?.status ?? order?.settlementStatus ?? "",
  ).toUpperCase();

  if (
    paymentStatus === "CONFIRMED" ||
    paymentStatus === "ADMIN_FORCE_CONFIRMED" ||
    settlementStatus === "COMPLETED"
  ) {
    return "PAID";
  }

  if (
    paymentStatus === "PAID" ||
    paymentStatus === "DISPUTED" ||
    paymentStatus === "ADMIN_HOLD" ||
    paymentStatus === "ADMIN_REJECTED" ||
    settlementStatus === "WAIT"
  ) {
    return "AWAITING_CONFIRM";
  }

  return "UNPAID";
}

function getStatusBadge(status: DriverSettlementStatus) {
  if (status === "PAID") {
    return { label: "완료", backgroundColor: "#DCFCE7", color: "#15803D" };
  }
  if (status === "AWAITING_CONFIRM") {
    return {
      label: "결제 확인 대기",
      backgroundColor: "#FEF3C7",
      color: "#B45309",
    };
  }
  return { label: "미확인", backgroundColor: "#F1F5F9", color: "#64748B" };
}

function getPayoutStatusLabel(item: DriverSettlementItem) {
  const status = String(item.payoutStatus ?? "").toUpperCase();
  if (status === "COMPLETED") return "입금 완료";
  if (status === "REQUESTED") return "지급 요청됨";
  if (status === "FAILED") return "지급 실패";
  if (status === "RETRYING") return "재시도 중";
  if (status === "READY") return "지급 준비";
  if (item.status === "PAID") return "지급 준비";
  if (item.status === "AWAITING_CONFIRM") return "차주 확인 전";
  return "화주 결제 전";
}

function getStatusDescription(item: DriverSettlementItem) {
  const paymentStatus = String(item.paymentStatus ?? "").toUpperCase();
  const settlementStatus = String(item.settlementStatus ?? "").toUpperCase();

  if (paymentStatus === "DISPUTED" || paymentStatus === "ADMIN_HOLD" || settlementStatus === "WAIT") {
    return "정산이 잠시 보류된 건입니다. 관리자 확인 후 지급 단계가 이어집니다.";
  }
  if (item.status === "UNPAID") {
    return "화주 결제가 끝나면 차주 기준 정산 금액과 지급 단계가 확정됩니다.";
  }
  if (item.status === "AWAITING_CONFIRM") {
    return "화주 결제는 완료되었습니다. 차주가 확인하면 정산 완료로 넘어갑니다.";
  }
  if (String(item.payoutStatus ?? "").toUpperCase() === "COMPLETED") {
    return "정산 계좌로 입금이 완료되었습니다.";
  }
  if (String(item.payoutStatus ?? "").toUpperCase() === "FAILED") {
    return "지급 실패 사유를 확인하고 정산 계좌 정보를 점검해 주세요.";
  }
  if (String(item.payoutStatus ?? "").toUpperCase() === "REQUESTED") {
    return "차주 확인이 끝났고 지급 요청이 접수되었습니다.";
  }
  return "차주 확인이 끝났습니다. 정산 일정에 따라 지급이 진행됩니다.";
}

function getPrimaryAmountLabel(item: DriverSettlementItem) {
  if (String(item.payoutStatus ?? "").toUpperCase() === "COMPLETED") {
    return "실제 수령 금액";
  }
  if (!item.hasSettlementSnapshot) {
    return "예상 수령 금액";
  }
  return "최종 수령 예정 금액";
}

function getPromoLabel(item: DriverSettlementItem) {
  if (item.driverPromoApplied === true) return "적용";
  if (item.driverPromoApplied === false) return "미적용";
  if (!item.hasSettlementSnapshot) return "정산 생성 후 표시";
  return "분리값 없음";
}

function getDriverFeeLabel(item: DriverSettlementItem) {
  if (!item.hasSettlementSnapshot) return "정산 생성 후 표시";
  if (item.driverFeeAmount <= 0) return "0원";
  return `-${toWon(item.driverFeeAmount)}`;
}

function formatRateLabel(rate?: number | null) {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return "-";
  const rounded = Math.round(rate * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function mapOrderToSettlementItem(
  order: OrderResponse,
  settlement?: SettlementResponse,
): DriverSettlementItem | null {
  if (!isDriverSettlementEligibleOrder(order)) {
    return null;
  }

  const scheduledAt =
    parseDate(order.endSchedule) ||
    parseDate(order.startSchedule) ||
    parseDate(settlement?.feeDate) ||
    parseDate(order.updated) ||
    parseDate(order.createdAt);

  if (!scheduledAt) return null;

  const baseAmount =
    toFiniteNumber(settlement?.baseAmount) ??
    toFiniteNumber(settlement?.totalPrice) ??
    calcOrderAmount(order);

  const driverPayoutAmount =
    toFiniteNumber(settlement?.driverPayoutAmount) ??
    toFiniteNumber(settlement?.paymentNetAmount) ??
    baseAmount;

  const explicitDriverFeeAmount = toFiniteNumber(settlement?.driverFeeAmount);
  const driverFeeAmount =
    explicitDriverFeeAmount ??
    Math.max(0, Math.round(baseAmount - driverPayoutAmount));

  const hasDriverBreakdown = Boolean(
    settlement &&
      (
        settlement.baseAmount !== undefined ||
        settlement.driverFeeAmount !== undefined ||
        settlement.driverFeeRate !== undefined ||
        settlement.driverPromoApplied !== undefined ||
        settlement.driverPayoutAmount !== undefined
      ),
  );

  const derivedDriverFeeRate =
    baseAmount > 0 ? Math.round((driverFeeAmount / baseAmount) * 1000) / 10 : null;

  return {
    id: String(order.orderId),
    orderId: Number(order.orderId),
    scheduledAt,
    dateLabel: toDateLabel(scheduledAt),
    status: resolveDriverSettlementStatus(order, settlement),
    from: toShortPlace(order.startAddr || order.startPlace),
    to: toShortPlace(order.endAddr || order.endPlace),
    paymentMethodLabel: toPaymentMethodLabel(
      settlement?.paymentMethod ?? order.payMethod,
    ),
    baseAmount,
    driverFeeAmount,
    driverFeeRate: toFiniteNumber(settlement?.driverFeeRate) ?? (hasDriverBreakdown ? derivedDriverFeeRate : null),
    driverPromoApplied: settlement?.driverPromoApplied ?? null,
    driverPayoutAmount,
    hasSettlementSnapshot: Boolean(settlement),
    hasDriverBreakdown,
    paymentStatus: settlement?.paymentStatus ?? order.paymentStatus ?? null,
    settlementStatus: settlement?.status ?? order.settlementStatus ?? null,
    payoutStatus: settlement?.payoutStatus ?? null,
    payoutFailureReason: settlement?.payoutFailureReason ?? null,
    paidAt: settlement?.paidAt ?? null,
    confirmedAt: settlement?.confirmedAt ?? null,
    feeDate: settlement?.feeDate ?? null,
    feeCompleteDate: settlement?.feeCompleteDate ?? null,
    payoutRequestedAt: settlement?.payoutRequestedAt ?? null,
    payoutCompletedAt: settlement?.payoutCompletedAt ?? null,
    bankName: settlement?.bankName ?? null,
    accountNum: settlement?.accountNum ?? null,
  };
}

export default function DriverSettlementScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentMonth = startOfMonth(new Date());

  const [filter, setFilter] = React.useState<SettlementFilter>("ALL");
  const [viewMonth, setViewMonth] = React.useState<Date>(currentMonth);
  const [items, setItems] = React.useState<DriverSettlementItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submittingOrderId, setSubmittingOrderId] = React.useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = React.useState<number | null>(null);

  const fetchItems = React.useCallback(async () => {
    const [orders, settlements] = await Promise.all([
      OrderService.getMyDrivingOrders(),
      SettlementService.getMySettlements().catch((error) => {
        console.warn("차주 정산 snapshot 조회 실패:", error);
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

    return orders
      .map((order) =>
        mapOrderToSettlementItem(order, settlementMap.get(Number(order.orderId))),
      )
      .filter((item): item is DriverSettlementItem => item !== null)
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
          console.warn("차주 정산 내역 조회 실패:", error);
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

  const monthItems = React.useMemo(
    () => items.filter((item) => isSameMonth(item.scheduledAt, viewMonth)),
    [items, viewMonth],
  );

  const filtered = React.useMemo(() => {
    if (filter === "ALL") return monthItems;
    return monthItems.filter((item) => item.status === filter);
  }, [filter, monthItems]);

  const summaryExpectedAmount = React.useMemo(
    () => monthItems.reduce((acc, item) => acc + item.driverPayoutAmount, 0),
    [monthItems],
  );
  const summaryCompletedAmount = React.useMemo(
    () =>
      monthItems
        .filter((item) => item.status === "PAID")
        .reduce((acc, item) => acc + item.driverPayoutAmount, 0),
    [monthItems],
  );
  const summaryPayoutCompletedAmount = React.useMemo(
    () =>
      monthItems
        .filter((item) => String(item.payoutStatus ?? "").toUpperCase() === "COMPLETED")
        .reduce((acc, item) => acc + item.driverPayoutAmount, 0),
    [monthItems],
  );
  const hasBreakdownGap = React.useMemo(
    () =>
      monthItems.some(
        (item) => item.hasSettlementSnapshot && !item.hasDriverBreakdown,
      ),
    [monthItems],
  );

  const accountSnapshot = React.useMemo(
    () =>
      items.find((item) => String(item.bankName ?? "").trim() || String(item.accountNum ?? "").trim()) ??
      null,
    [items],
  );

  const onPressConfirm = React.useCallback(
    async (item: DriverSettlementItem) => {
      if (item.status === "PAID") {
        Alert.alert("안내", `주문 #${item.orderId}는 이미 정산 완료되었습니다.`);
        return;
      }
      if (item.status !== "AWAITING_CONFIRM") {
        Alert.alert("안내", "화주 결제가 완료된 뒤에 차주 확인을 진행할 수 있습니다.");
        return;
      }
      if (submittingOrderId === item.orderId) return;

      try {
        setSubmittingOrderId(item.orderId);
        await PaymentService.confirmByDriver(item.orderId);
        const refreshed = await fetchItems();
        setItems(refreshed);
        Alert.alert("완료", `주문 #${item.orderId} 결제 확인이 완료되었습니다.`);
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "결제 확인 처리에 실패했습니다. 다시 시도해 주세요.";
        Alert.alert("오류", String(message));
      } finally {
        setSubmittingOrderId((prev) => (prev === item.orderId ? null : prev));
      }
    },
    [fetchItems, submittingOrderId],
  );

  const s = React.useMemo(
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
        monthText: { fontSize: 17, fontWeight: "900", color: c.text.primary } as TextStyle,
        monthNavBtn: {
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        contentWrap: { paddingHorizontal: 16, paddingTop: 14, gap: 12 } as ViewStyle,
        summaryCard: {
          marginTop: 14,
          marginHorizontal: 16,
          borderRadius: 24,
          backgroundColor: "#0F172A",
          paddingHorizontal: 18,
          paddingVertical: 18,
          overflow: "hidden",
        } as ViewStyle,
        summaryCaption: {
          fontSize: 13,
          fontWeight: "800",
          color: "rgba(255,255,255,0.72)",
        } as TextStyle,
        summaryAmount: {
          marginTop: 8,
          fontSize: 30,
          fontWeight: "900",
          color: "#FFFFFF",
        } as TextStyle,
        summaryDivider: {
          height: 1,
          marginVertical: 16,
          backgroundColor: "rgba(255,255,255,0.12)",
        } as ViewStyle,
        summaryBottomRow: { flexDirection: "row", alignItems: "center" } as ViewStyle,
        summaryCol: { flex: 1 } as ViewStyle,
        summaryColDivider: {
          width: 1,
          height: 36,
          marginHorizontal: 16,
          backgroundColor: "rgba(255,255,255,0.16)",
        } as ViewStyle,
        summarySmall: {
          fontSize: 12,
          fontWeight: "700",
          color: "rgba(255,255,255,0.66)",
        } as TextStyle,
        summaryValue: {
          marginTop: 6,
          fontSize: 17,
          fontWeight: "900",
          color: "#FFFFFF",
        } as TextStyle,
        topCard: {
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 8,
        } as ViewStyle,
        topCardTitle: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
        topCardBody: {
          fontSize: 13,
          lineHeight: 20,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        accountRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        } as ViewStyle,
        accountValue: { flex: 1, fontSize: 13, fontWeight: "900", color: c.text.primary } as TextStyle,
        accountBtn: {
          minWidth: 88,
          height: 34,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#EEF2FF",
        } as ViewStyle,
        accountBtnText: { fontSize: 12, fontWeight: "900", color: "#4338CA" } as TextStyle,
        noticeCard: {
          borderRadius: 18,
          padding: 14,
          backgroundColor: "#FFF7ED",
          borderWidth: 1,
          borderColor: "#FED7AA",
        } as ViewStyle,
        noticeTitle: { fontSize: 14, fontWeight: "900", color: "#C2410C" } as TextStyle,
        noticeText: {
          marginTop: 6,
          fontSize: 12,
          lineHeight: 18,
          fontWeight: "700",
          color: "#7C2D12",
        } as TextStyle,
        filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as ViewStyle,
        filterBtn: {
          borderRadius: 18,
          paddingHorizontal: 14,
          height: 36,
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#D4D9E3",
          backgroundColor: "#FFFFFF",
        } as ViewStyle,
        filterBtnActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" } as ViewStyle,
        filterText: { fontSize: 13, fontWeight: "800", color: "#667085" } as TextStyle,
        filterTextActive: { color: "#FFFFFF" } as TextStyle,
        emptyCard: {
          marginTop: 8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          paddingVertical: 18,
          alignItems: "center",
        } as ViewStyle,
        emptyText: { fontSize: 13, fontWeight: "700", color: c.text.secondary } as TextStyle,
        listWrap: { gap: 12 } as ViewStyle,
        itemCard: {
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#DEE3ED",
          backgroundColor: "#FFFFFF",
          padding: 14,
          gap: 12,
        } as ViewStyle,
        itemTop: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        } as ViewStyle,
        dateText: { fontSize: 12, fontWeight: "700", color: "#64748B" } as TextStyle,
        routeText: { marginTop: 4, fontSize: 16, fontWeight: "900", color: c.text.primary } as TextStyle,
        arrowText: { color: "#94A3B8" } as TextStyle,
        statusBadge: {
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6,
        } as ViewStyle,
        statusText: { fontSize: 12, fontWeight: "900" } as TextStyle,
        heroWrap: {
          borderRadius: 16,
          backgroundColor: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#E5EAF1",
          padding: 14,
          gap: 4,
        } as ViewStyle,
        heroLabel: { fontSize: 12, fontWeight: "800", color: "#64748B" } as TextStyle,
        heroAmount: { fontSize: 24, fontWeight: "900", color: c.text.primary } as TextStyle,
        heroSub: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        breakdownGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 } as ViewStyle,
        breakdownCard: {
          width: "48.5%",
          minHeight: 72,
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#EDF2F7",
          padding: 12,
          gap: 6,
        } as ViewStyle,
        breakdownLabel: { fontSize: 11, fontWeight: "800", color: "#94A3B8" } as TextStyle,
        breakdownValue: { fontSize: 14, fontWeight: "900", color: c.text.primary } as TextStyle,
        breakdownMeta: { fontSize: 11, fontWeight: "700", color: "#64748B" } as TextStyle,
        detailBox: {
          borderTopWidth: 1,
          borderTopColor: "#EEF2F7",
          paddingTop: 12,
          gap: 10,
        } as ViewStyle,
        detailRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        } as ViewStyle,
        detailKey: { fontSize: 12, fontWeight: "700", color: "#64748B" } as TextStyle,
        detailValue: {
          flex: 1,
          fontSize: 12,
          lineHeight: 18,
          fontWeight: "800",
          textAlign: "right",
          color: c.text.primary,
        } as TextStyle,
        detailError: { color: "#B91C1C" } as TextStyle,
        actionRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        } as ViewStyle,
        toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4 } as ViewStyle,
        toggleText: { fontSize: 12, fontWeight: "800", color: "#475569" } as TextStyle,
        actionBtn: {
          height: 36,
          paddingHorizontal: 14,
          borderRadius: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: "#4338CA",
        } as ViewStyle,
        actionBtnDisabled: { backgroundColor: "#E2E8F0" } as ViewStyle,
        actionText: { fontSize: 12, fontWeight: "900", color: "#FFFFFF" } as TextStyle,
        actionTextDisabled: { color: "#64748B" } as TextStyle,
      }),
    [c, insets.bottom],
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="차주 정산"
        subtitle="받는 금액 기준으로 정산 상태와 지급 흐름을 확인합니다."
        hideBackButton
      />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.monthRow}>
          <Pressable style={s.monthNavBtn} onPress={() => setViewMonth((prev) => addMonth(prev, -1))}>
            <Ionicons name="chevron-back" size={24} color={c.text.primary} />
          </Pressable>
          <Text style={s.monthText}>{viewMonthLabel}</Text>
          <Pressable
            style={s.monthNavBtn}
            disabled={isNextDisabled}
            onPress={() =>
              setViewMonth((prev) =>
                compareMonth(prev, currentMonth) >= 0 ? prev : addMonth(prev, 1),
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
          <Text style={s.summaryCaption}>{viewMonthNumber}월 최종 수령 예정 금액</Text>
          <Text style={s.summaryAmount}>{toWon(summaryExpectedAmount)}</Text>
          <View style={s.summaryDivider} />
          <View style={s.summaryBottomRow}>
            <View style={s.summaryCol}>
              <Text style={s.summarySmall}>정산 완료</Text>
              <Text style={s.summaryValue}>{toWon(summaryCompletedAmount)}</Text>
            </View>
            <View style={s.summaryColDivider} />
            <View style={s.summaryCol}>
              <Text style={s.summarySmall}>입금 완료</Text>
              <Text style={s.summaryValue}>{toWon(summaryPayoutCompletedAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={s.contentWrap}>
          <View style={s.topCard}>
            <Text style={s.topCardTitle}>정산 흐름</Text>
            <Text style={s.topCardBody}>
              운송 완료 후 화주 결제가 먼저 끝나고, 차주 확인이 끝나면 정산 완료로
              바뀝니다. 그다음 지급 요청과 입금 완료가 정산 계좌 기준으로 이어집니다.
            </Text>
          </View>

          <View style={s.topCard}>
            <Text style={s.topCardTitle}>정산 계좌</Text>
            <View style={s.accountRow}>
              <Text style={s.accountValue}>
                {accountSnapshot?.bankName
                  ? `${accountSnapshot.bankName} ${maskAccount(accountSnapshot.accountNum)}`
                  : "등록된 정산 계좌가 없습니다."}
              </Text>
              <Pressable
                style={s.accountBtn}
                onPress={() => router.push("/(common)/settings/driver/account" as any)}
              >
                <Text style={s.accountBtnText}>계좌 관리</Text>
              </Pressable>
            </View>
          </View>

          {hasBreakdownGap ? (
            <View style={s.noticeCard}>
              <Text style={s.noticeTitle}>분리 정산값이 없는 건이 있습니다.</Text>
              <Text style={s.noticeText}>
                일부 정산 건은 차주 side fee와 프로모션 스냅샷이 아직 분리 저장되지 않아
                최종 수령 금액 중심으로 안내됩니다.
              </Text>
            </View>
          ) : null}

          <View style={s.filterRow}>
            {[
              ["ALL", "전체"],
              ["UNPAID", "미확인"],
              ["AWAITING_CONFIRM", "결제 확인 대기"],
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
              <Text style={s.emptyText}>정산 내역을 불러오는 중입니다.</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>선택한 월의 정산 내역이 없습니다.</Text>
            </View>
          ) : (
            <View style={s.listWrap}>
              {filtered.map((item) => {
                const badge = getStatusBadge(item.status);
                const isExpanded = expandedOrderId === item.orderId;
                const isSubmitting = submittingOrderId === item.orderId;
                const showConfirmButton = item.status === "AWAITING_CONFIRM";

                return (
                  <View key={item.id} style={s.itemCard}>
                    <View style={s.itemTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.dateText}>{item.dateLabel}</Text>
                        <Text style={s.routeText}>
                          {item.from} <Text style={s.arrowText}>→</Text> {item.to}
                        </Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: badge.backgroundColor }]}>
                        <Text style={[s.statusText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>

                    <View style={s.heroWrap}>
                      <Text style={s.heroLabel}>{getPrimaryAmountLabel(item)}</Text>
                      <Text style={s.heroAmount}>{toWon(item.driverPayoutAmount)}</Text>
                      <Text style={s.heroSub}>{getStatusDescription(item)}</Text>
                    </View>

                    <View style={s.breakdownGrid}>
                      <View style={s.breakdownCard}>
                        <Text style={s.breakdownLabel}>기본 운임</Text>
                        <Text style={s.breakdownValue}>{toWon(item.baseAmount)}</Text>
                      </View>

                      <View style={s.breakdownCard}>
                        <Text style={s.breakdownLabel}>차주 side fee</Text>
                        <Text style={s.breakdownValue}>{getDriverFeeLabel(item)}</Text>
                        <Text style={s.breakdownMeta}>
                          {item.driverFeeRate !== null ? `적용 rate ${formatRateLabel(item.driverFeeRate)}` : "rate 분리값 없음"}
                        </Text>
                      </View>

                      <View style={s.breakdownCard}>
                        <Text style={s.breakdownLabel}>프로모션</Text>
                        <Text style={s.breakdownValue}>{getPromoLabel(item)}</Text>
                      </View>

                      <View style={s.breakdownCard}>
                        <Text style={s.breakdownLabel}>지급 상태</Text>
                        <Text style={s.breakdownValue}>{getPayoutStatusLabel(item)}</Text>
                        <Text style={s.breakdownMeta}>계좌 {item.bankName ? `${item.bankName} ${maskAccount(item.accountNum)}` : "미등록"}</Text>
                      </View>
                    </View>

                    {isExpanded ? (
                      <View style={s.detailBox}>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>결제 방식</Text>
                          <Text style={s.detailValue}>{item.paymentMethodLabel}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>결제 완료 시각</Text>
                          <Text style={s.detailValue}>{formatDateTime(item.paidAt)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>차주 확인 시각</Text>
                          <Text style={s.detailValue}>{formatDateTime(item.confirmedAt ?? item.feeCompleteDate)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>지급 요청 시각</Text>
                          <Text style={s.detailValue}>{formatDateTime(item.payoutRequestedAt)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>입금 완료 시각</Text>
                          <Text style={s.detailValue}>{formatDateTime(item.payoutCompletedAt)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>정산 계좌</Text>
                          <Text style={s.detailValue}>
                            {item.bankName ? `${item.bankName} ${maskAccount(item.accountNum)}` : "등록된 계좌 없음"}
                          </Text>
                        </View>
                        {item.payoutFailureReason ? (
                          <View style={s.detailRow}>
                            <Text style={s.detailKey}>지급 실패 사유</Text>
                            <Text style={[s.detailValue, s.detailError]}>{item.payoutFailureReason}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={s.actionRow}>
                      <Pressable
                        style={s.toggleBtn}
                        onPress={() =>
                          setExpandedOrderId((prev) =>
                            prev === item.orderId ? null : item.orderId,
                          )
                        }
                      >
                        <Text style={s.toggleText}>{isExpanded ? "상세 닫기" : "상세 보기"}</Text>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="#475569"
                        />
                      </Pressable>

                      {showConfirmButton ? (
                        <Pressable
                          style={[s.actionBtn, isSubmitting && s.actionBtnDisabled]}
                          disabled={isSubmitting}
                          onPress={() => void onPressConfirm(item)}
                        >
                          <MaterialCommunityIcons
                            name="clipboard-check-multiple-outline"
                            size={14}
                            color={isSubmitting ? "#64748B" : "#FFFFFF"}
                          />
                          <Text style={[s.actionText, isSubmitting && s.actionTextDisabled]}>
                            {isSubmitting ? "처리중..." : "결제 확인"}
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
