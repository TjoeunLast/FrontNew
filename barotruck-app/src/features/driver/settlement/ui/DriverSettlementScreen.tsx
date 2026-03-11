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

import { normalizePaymentMethod, toPaymentMethodLabel } from "@/features/common/payment/lib/paymentMethods";
import {
  calcOrderAmount,
  isDriverSettlementEligibleOrder,
  toWon,
} from "@/features/common/settlement/lib/settlementHelpers";
import { SalesSummaryCard } from "@/features/driver/shard/ui/SalesSummaryCard";
import apiClient from "@/shared/api/apiClient";
import { OrderService } from "@/shared/api/orderService";
import { PaymentService } from "@/shared/api/paymentService";
import { SettlementService } from "@/shared/api/settlementService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import type { SettlementResponse } from "@/shared/models/Settlement";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

type SettlementFilter = "UNPAID" | "AWAITING_CONFIRM" | "PAID";
type PaymentMethodFilter = "TOSS" | "DEFERRED";
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
  paymentMethodCode?: string | null;
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

type SettlementAccountSnapshot = {
  bankName?: string | null;
  accountNum?: string | null;
};

function isDriverConfirmPending(item: Pick<DriverSettlementItem, "paymentStatus" | "paymentMethodCode">) {
  const paymentStatus = String(item.paymentStatus ?? "").toUpperCase();
  const confirmableMethod =
    item.paymentMethodCode === "card" || item.paymentMethodCode === "prepaid";
  return confirmableMethod && paymentStatus === "PAID";
}

function getDriverConfirmActionLabel(
  item: Pick<DriverSettlementItem, "status" | "paymentMethodCode">,
) {
  if (item.status === "PAID") return "완료";
  if (item.paymentMethodCode === "card") return "토스 결제확인";
  if (item.paymentMethodCode === "prepaid") return "착불 결제확인";
  return "결제 확인";
}

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

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
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
  return { label: "미결제", backgroundColor: "#FEE2E2", color: "#D44B46" };
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

function getSnapshotLabel(item: DriverSettlementItem) {
  if (!item.hasSettlementSnapshot) return "정산 스냅샷 없음";
  if (!item.hasDriverBreakdown) return "차주 분리 정산값 없음";
  return "차주 분리 정산값 있음";
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
    paymentMethodCode:
      normalizePaymentMethod(settlement?.paymentMethod ?? order.payMethod) ??
      null,
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

  const [filter, setFilter] = React.useState<SettlementFilter>("UNPAID");
  const [statusDropdownOpen, setStatusDropdownOpen] = React.useState(false);
  const [paymentFilter, setPaymentFilter] =
    React.useState<PaymentMethodFilter>("TOSS");
  const [viewMonth, setViewMonth] = React.useState<Date>(currentMonth);
  const [items, setItems] = React.useState<DriverSettlementItem[]>([]);
  const [driverAccount, setDriverAccount] = React.useState<SettlementAccountSnapshot | null>(null);
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

  const fetchDriverAccount = React.useCallback(async (): Promise<SettlementAccountSnapshot | null> => {
    const [meRes, driverRes, cached] = await Promise.all([
      UserService.getMyInfo().catch(() => null),
      apiClient.get("/api/v1/drivers/me").catch(() => null),
      getCurrentUserSnapshot().catch(() => null),
    ]);

    const driver = driverRes?.data ?? null;
    const bankName = pickFirstText(
      driver?.bankName,
      driver?.driver?.bankName,
      driver?.bank_name,
      driver?.driver?.bank_name,
      meRes?.DriverInfo?.bankName,
      (meRes as any)?.DriverInfo?.bank_name,
      cached?.driverBankName,
    );
    const accountNum = onlyDigits(
      pickFirstText(
        driver?.accountNum,
        driver?.driver?.accountNum,
        driver?.account_num,
        driver?.driver?.account_num,
        meRes?.DriverInfo?.accountNum,
        (meRes as any)?.DriverInfo?.account_num,
        cached?.driverAccountNum,
      ),
    );

    if (!bankName && !accountNum) return null;
    return {
      bankName: bankName || null,
      accountNum: accountNum || null,
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);

      void (async () => {
        try {
          const [next, account] = await Promise.all([
            fetchItems(),
            fetchDriverAccount(),
          ]);
          if (!active) return;
          setItems(next);
          setDriverAccount(account);
        } catch (error) {
          console.warn("차주 정산 내역 조회 실패:", error);
          if (active) {
            setItems([]);
            setDriverAccount(null);
          }
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [fetchDriverAccount, fetchItems]),
  );

  const isNextDisabled = compareMonth(viewMonth, currentMonth) >= 0;
  const viewMonthLabel = toMonthLabel(viewMonth);
  const viewMonthNumber = viewMonth.getMonth() + 1;

  const monthItems = React.useMemo(
    () => items.filter((item) => isSameMonth(item.scheduledAt, viewMonth)),
    [items, viewMonth],
  );

  const filtered = React.useMemo(() => {
    const paymentFiltered = monthItems.filter((item) =>
      paymentFilter === "TOSS"
        ? item.paymentMethodCode === "card"
        : item.paymentMethodCode === "prepaid",
    );

    if (filter === "UNPAID") {
      return paymentFiltered.filter(
        (item) => item.status !== "PAID" && !isDriverConfirmPending(item),
      );
    }
    if (filter === "AWAITING_CONFIRM") {
      return paymentFiltered.filter(
        (item) => item.status !== "PAID" && isDriverConfirmPending(item),
      );
    }
    return paymentFiltered.filter((item) => item.status === "PAID");
  }, [filter, monthItems, paymentFilter]);
  const statusDropdownOptions = React.useMemo(
    () =>
      [
        ["UNPAID", "미결제"],
        ["AWAITING_CONFIRM", "결제 대기"],
        ["PAID", "완료"],
      ] as [SettlementFilter, string][],
    [],
  );
  const statusDropdownLabel = React.useMemo(() => {
    const found = statusDropdownOptions.find(([key]) => key === filter);
    return found?.[1] ?? "미결제";
  }, [filter, statusDropdownOptions]);

  const summaryExpectedAmount = React.useMemo(
    () => monthItems.reduce((acc, item) => acc + item.driverPayoutAmount, 0),
    [monthItems],
  );
  const summaryPayoutCompletedAmount = React.useMemo(
    () =>
      monthItems
        .filter((item) => String(item.payoutStatus ?? "").toUpperCase() === "COMPLETED")
        .reduce((acc, item) => acc + item.driverPayoutAmount, 0),
    [monthItems],
  );
  const summaryPendingAmount = React.useMemo(
    () => Math.max(0, summaryExpectedAmount - summaryPayoutCompletedAmount),
    [summaryExpectedAmount, summaryPayoutCompletedAmount],
  );
  const hasBreakdownGap = React.useMemo(
    () =>
      monthItems.some(
        (item) => item.hasSettlementSnapshot && !item.hasDriverBreakdown,
      ),
    [monthItems],
  );

  const accountSnapshot = React.useMemo(
    () => {
      if (driverAccount && (String(driverAccount.bankName ?? "").trim() || String(driverAccount.accountNum ?? "").trim())) {
        return driverAccount;
      }
      return (
        items.find((item) => String(item.bankName ?? "").trim() || String(item.accountNum ?? "").trim()) ??
        null
      );
    },
    [driverAccount, items],
  );
  const accountSummaryText = React.useMemo(() => {
    const bankName = String(accountSnapshot?.bankName ?? "").trim();
    const masked = maskAccount(accountSnapshot?.accountNum ?? null);
    if (bankName && masked !== "-") return `${bankName} ${masked}`;
    if (bankName) return bankName;
    if (masked !== "-") return masked;
    return "";
  }, [accountSnapshot]);
  const hasSettlementAccount = React.useMemo(
    () => String(accountSummaryText).trim().length > 0,
    [accountSummaryText],
  );

  const onPressConfirm = React.useCallback(
    async (item: DriverSettlementItem) => {
      if (item.status === "PAID") {
        Alert.alert("안내", `주문 #${item.orderId}는 이미 정산 완료되었습니다.`);
        return;
      }
      if (!isDriverConfirmPending(item)) {
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
        monthText: { fontSize: 17, fontWeight: "900", color: "#0F172A" } as TextStyle,
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
        summarySmallRight: { textAlign: "right" } as TextStyle,
        summaryValue: {
          marginTop: 6,
          fontSize: 17,
          fontWeight: "900",
          color: "#FFFFFF",
        } as TextStyle,
        summaryValueRight: { textAlign: "right" } as TextStyle,
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
          backgroundColor: "#F1F5F9",
        } as ViewStyle,
        accountBtnText: { fontSize: 12, fontWeight: "900", color: "#0F172A" } as TextStyle,
        noticeCard: {
          borderRadius: 18,
          padding: 14,
          backgroundColor: "#FFF7ED",
          borderWidth: 1,
          borderColor: "#FED7AA",
        } as ViewStyle,
        missingAccountNotice: {
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 13,
          backgroundColor: "#FEF2F2",
        } as ViewStyle,
        missingAccountRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        } as ViewStyle,
        missingAccountText: {
          flex: 1,
          fontSize: 14,
          lineHeight: 20,
          fontWeight: "700",
          color: "#DC2626",
        } as TextStyle,
        missingAccountBtn: {
          marginTop: 10,
          alignSelf: "flex-end",
          minWidth: 80,
          height: 30,
          borderRadius: 9,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FEE2E2",
        } as ViewStyle,
        missingAccountBtnText: {
          fontSize: 12,
          fontWeight: "900",
          color: "#B91C1C",
        } as TextStyle,
        noticeTitle: { fontSize: 14, fontWeight: "900", color: "#C2410C" } as TextStyle,
        noticeText: {
          marginTop: 6,
          fontSize: 12,
          lineHeight: 18,
          fontWeight: "700",
          color: "#7C2D12",
        } as TextStyle,
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
        unpaidCard: { borderColor: "#E05A55" } as ViewStyle,
        itemTop: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        } as ViewStyle,
        itemTopLeft: { flex: 1 } as ViewStyle,
        dateText: { fontSize: 12, fontWeight: "700", color: "#64748B" } as TextStyle,
        routeText: { marginTop: 4, fontSize: 16, fontWeight: "900", color: c.text.primary } as TextStyle,
        arrowText: { color: "#94A3B8" } as TextStyle,
        amountWrap: { alignItems: "flex-end", gap: 6 } as ViewStyle,
        amountText: { fontSize: 18, fontWeight: "900", color: c.text.primary } as TextStyle,
        amountUnpaid: { color: "#E05A55" } as TextStyle,
        unpaidIcon: { opacity: 0.95 } as TextStyle,
        statusBadge: {
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6,
        } as ViewStyle,
        statusText: { fontSize: 12, fontWeight: "900" } as TextStyle,
        metaText: {
          fontSize: 12,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        hintText: {
          fontSize: 12,
          lineHeight: 18,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
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
          backgroundColor: "#0F172A",
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
        title="정산 내역"
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

        <SalesSummaryCard
          title={`${viewMonthNumber}월 최종 수령 예정 금액`}
          totalAmount={summaryExpectedAmount}
          settledAmount={summaryPayoutCompletedAmount}
          pendingAmount={summaryPendingAmount}
          size="small"
          style={s.summaryCard}
        />

        <View style={s.contentWrap}>
          {!hasSettlementAccount ? (
            <View style={s.missingAccountNotice}>
              <View style={s.missingAccountRow}>
                <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                <Text style={s.missingAccountText}>
                  정산 계좌가 등록되지 않았습니다. 계좌 관리에서 등록해 주세요.
                </Text>
              </View>
              <Pressable
                style={s.missingAccountBtn}
                onPress={() => router.push("/(common)/settings/driver/account" as any)}
              >
                <Text style={s.missingAccountBtnText}>계좌 등록</Text>
              </Pressable>
            </View>
          ) : null}

          {hasBreakdownGap ? (
            <View style={s.noticeCard}>
              <Text style={s.noticeTitle}>분리 정산값이 없는 건이 있습니다.</Text>
              <Text style={s.noticeText}>
                일부 정산 건은 차주 수수료와 프로모션 스냅샷이 아직 분리 저장되지 않아
                최종 수령 금액 중심으로 안내됩니다.
              </Text>
            </View>
          ) : null}

          <View style={s.filterSection}>
            <View style={s.filterRow}>
              <View style={s.paymentFilterInlineRow}>
                {[
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
                  style={[
                    s.dropdownTrigger,
                    s.dropdownTriggerActive,
                  ]}
                  onPress={() => setStatusDropdownOpen((prev) => !prev)}
                >
                  <Text
                    style={[
                      s.dropdownTriggerText,
                      s.dropdownTriggerTextActive,
                    ]}
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
                const badge = getStatusBadge(item.status);
                const isUnpaid = item.status === "UNPAID";
                const isExpanded = expandedOrderId === item.orderId;
                const isSubmitting = submittingOrderId === item.orderId;
                const isPaid = item.status === "PAID";
                const confirmPending = isDriverConfirmPending(item);
                const confirmableMethod =
                  item.paymentMethodCode === "card" ||
                  item.paymentMethodCode === "prepaid";
                const showConfirmButton = confirmableMethod && (confirmPending || isPaid);
                const confirmButtonLabel = getDriverConfirmActionLabel(item);

                return (
                  <View key={item.id} style={[s.itemCard, isUnpaid && s.unpaidCard]}>
                    <View style={s.itemTop}>
                      <View style={s.itemTopLeft}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={s.dateText}>{item.dateLabel}</Text>
                          <View style={[s.statusBadge, { backgroundColor: badge.backgroundColor }]}>
                            <Text style={[s.statusText, { color: badge.color }]}>{badge.label}</Text>
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
                          {toWon(item.driverPayoutAmount)}
                        </Text>
                      </View>
                    </View>

                    <Text style={s.metaText}>결제 방식: {item.paymentMethodLabel}</Text>

                    {isExpanded ? (
                      <View style={s.detailBox}>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>주문 번호</Text>
                          <Text style={s.detailValue}>#{item.orderId}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>결제 방식</Text>
                          <Text style={s.detailValue}>{item.paymentMethodLabel}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>기본 운임</Text>
                          <Text style={s.detailValue}>{toWon(item.baseAmount)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>차주 수수료</Text>
                          <Text style={s.detailValue}>{getDriverFeeLabel(item)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>정산 생성 시각</Text>
                          <Text style={s.detailValue}>{formatDateTime(item.feeDate)}</Text>
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
                          <Text style={s.detailKey}>정산 완료 시각</Text>
                          <Text style={s.detailValue}>{formatDateTime(item.feeCompleteDate)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>상태 엔진</Text>
                          <Text style={s.detailValue}>
                            결제 {item.paymentStatus ?? "-"} / 정산 {item.settlementStatus ?? "-"}
                          </Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>차주 수수료율</Text>
                          <Text style={s.detailValue}>{formatRateLabel(item.driverFeeRate)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>프로모션 적용</Text>
                          <Text style={s.detailValue}>{getPromoLabel(item)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>정산 스냅샷</Text>
                          <Text style={s.detailValue}>{getSnapshotLabel(item)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>지급 상태</Text>
                          <Text style={s.detailValue}>{getPayoutStatusLabel(item)}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailKey}>상태 안내</Text>
                          <Text style={s.detailValue}>{getStatusDescription(item)}</Text>
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
                          style={[s.actionBtn, (isSubmitting || isPaid) && s.actionBtnDisabled]}
                          disabled={isSubmitting || isPaid}
                          onPress={() => void onPressConfirm(item)}
                        >
                          <MaterialCommunityIcons
                            name={isPaid ? "check-decagram-outline" : "clipboard-check-multiple-outline"}
                            size={14}
                            color={isSubmitting || isPaid ? "#64748B" : "#FFFFFF"}
                          />
                          <Text
                            style={[
                              s.actionText,
                              (isSubmitting || isPaid) && s.actionTextDisabled,
                            ]}
                          >
                            {isSubmitting ? "처리중..." : confirmButtonLabel}
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
