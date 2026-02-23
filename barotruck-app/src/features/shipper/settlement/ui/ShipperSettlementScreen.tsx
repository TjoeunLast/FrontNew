import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
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

import { OrderApi } from "@/shared/api/orderService";
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
  from: string;
  to: string;
  amount: number;
  actionLabel: string;
  vehicleInfo: string;
};

const PENDING_SETTLEMENT_STORAGE_KEY = "shipper_pending_settlement_order_ids";

async function loadPendingSettlementOrderIds() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SETTLEMENT_STORAGE_KEY);
    if (!raw) return new Set<number>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<number>();
    return new Set(parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x)));
  } catch {
    return new Set<number>();
  }
}

async function savePendingSettlementOrderIds(ids: Set<number>) {
  try {
    const arr = Array.from(ids.values()).filter((x) => Number.isFinite(x));
    await AsyncStorage.setItem(PENDING_SETTLEMENT_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // noop
  }
}

function toWon(v: number) {
  return `${v.toLocaleString("ko-KR")}원`;
}

function statusLabel(status: SettlementStatus) {
  if (status === "UNPAID") return "미결제";
  if (status === "PENDING") return "결제대기";
  if (status === "PAID") return "결제완료";
  return "계산서 발행";
}

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
  const w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}.${d.getDate()} (${w})`;
}

function toSettlementStatus(order: OrderResponse): SettlementStatus {
  const payMethod = String(order.payMethod ?? "").toLowerCase();
  const settlementStatus = String(order.settlementStatus ?? "").toUpperCase();

  if (
    payMethod.includes("receipt") ||
    payMethod.includes("month") ||
    payMethod.includes("계산서") ||
    payMethod.includes("invoice")
  ) {
    return "TAX_INVOICE";
  }

  if (settlementStatus === "COMPLETED" || settlementStatus === "PAID" || settlementStatus === "CONFIRMED") return "PAID";
  if (settlementStatus === "WAIT" || settlementStatus === "DISPUTED") return "PENDING";
  if (settlementStatus === "READY" || settlementStatus === "CANCELLED") return "UNPAID";

  if (
    payMethod.includes("card") ||
    payMethod.includes("prepaid") ||
    payMethod.includes("카드") ||
    payMethod.includes("선결제")
  ) {
    return "PAID";
  }
  return "UNPAID";
}

function toActionLabel(status: SettlementStatus) {
  if (status === "UNPAID") return "결제하기";
  if (status === "PENDING") return "결제대기";
  if (status === "PAID") return "영수증 확인";
  return "계산서 보기";
}

function mapOrderToSettlement(order: OrderResponse, pendingOrderIds?: Set<number>): SettlementItem | null {
  if (order.status === "CANCELLED" || order.status === "REQUESTED" || order.status === "PENDING") return null;

  const scheduledAt =
    parseDate(order.endSchedule) || parseDate(order.startSchedule) || parseDate(order.updated) || parseDate(order.createdAt);
  if (!scheduledAt) return null;

  const amount =
    Number(order.basePrice ?? 0) +
    Number(order.laborFee ?? 0) +
    Number(order.packagingPrice ?? 0) +
    Number(order.insuranceFee ?? 0);

  const baseStatus = toSettlementStatus(order);
  const status = baseStatus === "UNPAID" && pendingOrderIds?.has(Number(order.orderId)) ? "PENDING" : baseStatus;
  if (__DEV__) {
    console.log("[settlement-map]", {
      orderId: order.orderId,
      settlementStatus: order.settlementStatus,
      payMethod: order.payMethod,
      resolvedStatus: status,
    });
  }
  const vehicleInfo = `${order.reqCarType || "차량"} ${order.reqTonnage || ""}`.trim();

  return {
    id: String(order.orderId),
    orderId: Number(order.orderId),
    scheduledAt,
    dateLabel: toDateLabel(scheduledAt),
    status,
    from: toShortPlace(order.startAddr || order.startPlace),
    to: toShortPlace(order.endAddr || order.endPlace),
    amount,
    actionLabel: toActionLabel(status),
    vehicleInfo: vehicleInfo || "-",
  };
}

export default function ShipperSettlementScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentMonth = startOfMonth(new Date());

  const [filter, setFilter] = useState<SettlementFilter>("ALL");
  const [viewMonth, setViewMonth] = useState<Date>(currentMonth);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptItem, setReceiptItem] = useState<SettlementItem | null>(null);
  const [submittingOrderId, setSubmittingOrderId] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    const pendingOrderIds = await loadPendingSettlementOrderIds();
    const rows = await OrderApi.getMyShipperOrders();
    const mapped = rows
      .map((row) => mapOrderToSettlement(row, pendingOrderIds))
      .filter((x): x is SettlementItem => x !== null)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

    const paidIds = mapped.filter((x) => x.status === "PAID").map((x) => x.orderId);
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
    }, [fetchItems])
  );

  const isNextDisabled = compareMonth(viewMonth, currentMonth) >= 0;
  const viewMonthLabel = toMonthLabel(viewMonth);
  const viewMonthNumber = viewMonth.getMonth() + 1;

  const monthItems = useMemo(
    () => items.filter((x) => isSameMonth(x.scheduledAt, viewMonth)),
    [items, viewMonth]
  );

  const filtered = useMemo(() => {
    if (filter === "ALL") return monthItems;
    if (filter === "UNPAID") return monthItems.filter((x) => x.status === "UNPAID");
    return monthItems.filter((x) => x.status === "TAX_INVOICE");
  }, [filter, monthItems]);

  const summaryTotal = useMemo(() => monthItems.reduce((acc, cur) => acc + cur.amount, 0), [monthItems]);
  const summaryDoneCount = monthItems.length;
  const summaryUnpaid = useMemo(
    () => monthItems.filter((x) => x.status === "UNPAID").reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems]
  );

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

    try {
      setSubmittingOrderId(item.orderId);
      await SettlementService.initSettlement({ orderId: item.orderId, couponDiscount: 0, levelDiscount: 0 });
      const pendingOrderIds = await loadPendingSettlementOrderIds();
      pendingOrderIds.add(item.orderId);
      await savePendingSettlementOrderIds(pendingOrderIds);
      const refreshed = await fetchItems().catch(() => null);
      if (refreshed) {
        setItems(refreshed);
      } else {
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, status: "PENDING", actionLabel: toActionLabel("PENDING") } : row
          )
        );
      }
      Alert.alert("결제 요청", "결제 요청이 생성되었습니다.");
    } catch (error: any) {
      const msg = error?.response?.data?.message || "결제 요청 중 오류가 발생했습니다.";
      const isDuplicate =
        String(msg).includes("ORA-00001") ||
        String(msg).toLowerCase().includes("unique") ||
        String(msg).toLowerCase().includes("constraint") ||
        String(msg).toLowerCase().includes("already");

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
              row.id === item.id ? { ...row, status: "PENDING", actionLabel: toActionLabel("PENDING") } : row
            )
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
        monthText: { fontSize: 17, fontWeight: "900", color: c.text.primary } as TextStyle,
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
        summaryCaption: { fontSize: 12, fontWeight: "700", color: "#DCD9FF" } as TextStyle,
        summaryAmount: { marginTop: 8, fontSize: 21, fontWeight: "900", color: "#FFFFFF" } as TextStyle,
        summaryDivider: {
          height: 1,
          backgroundColor: "rgba(255,255,255,0.2)",
          marginTop: 14,
          marginBottom: 12,
        } as ViewStyle,
        summaryBottomRow: { flexDirection: "row", alignItems: "center" } as ViewStyle,
        summaryCol: { flex: 1 } as ViewStyle,
        summaryColDivider: { width: 1, height: 44, backgroundColor: "rgba(255,255,255,0.3)" } as ViewStyle,
        summaryBig: { fontSize: 16, fontWeight: "900", color: "#FFFFFF" } as TextStyle,
        summarySmall: { fontSize: 12, fontWeight: "700", color: "#DCD9FF" } as TextStyle,
        summaryBigRight: { textAlign: "right" } as TextStyle,
        summarySmallRight: { textAlign: "right" } as TextStyle,
        section: {
          marginTop: 16,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: c.border.default,
        } as ViewStyle,
        filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16 } as ViewStyle,
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
        filterText: { fontSize: 13, fontWeight: "800", color: "#667085" } as TextStyle,
        filterTextActive: { color: "#FFFFFF" } as TextStyle,
        listWrap: { marginTop: 10, paddingHorizontal: 16, gap: 10 } as ViewStyle,
        itemCard: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#D9DEE7",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 14,
          paddingVertical: 12,
        } as ViewStyle,
        unpaidCard: { borderLeftWidth: 4, borderLeftColor: "#E05A55" } as ViewStyle,
        itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as ViewStyle,
        dateRow: { flexDirection: "row", alignItems: "center", gap: 6 } as ViewStyle,
        dateText: { fontSize: 13, fontWeight: "700", color: "#64748B" } as TextStyle,
        statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 } as ViewStyle,
        statusText: { fontSize: 12, fontWeight: "800" } as TextStyle,
        amountText: { fontSize: 16, fontWeight: "900", color: c.text.primary } as TextStyle,
        amountUnpaid: { color: "#E05A55" } as TextStyle,
        routeText: { marginTop: 10, fontSize: 14, fontWeight: "900", color: c.text.primary } as TextStyle,
        arrowText: { color: "#94A3B8" } as TextStyle,
        actionRow: { marginTop: 8, flexDirection: "row", justifyContent: "flex-end" } as ViewStyle,
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
        actionText: { fontSize: 13, fontWeight: "800", color: "#4E46E5" } as TextStyle,
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
        emptyText: { fontSize: 13, fontWeight: "700", color: c.text.secondary } as TextStyle,
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
        modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as ViewStyle,
        modalTitle: { fontSize: 18, fontWeight: "900", color: c.text.primary } as TextStyle,
        receiptCard: {
          marginTop: 10,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#E5EAF1",
          backgroundColor: "#FAFBFD",
          padding: 14,
        } as ViewStyle,
        receiptAmount: { fontSize: 20, fontWeight: "900", textAlign: "center", color: c.text.primary } as TextStyle,
        receiptPaid: { fontSize: 12, fontWeight: "700", textAlign: "center", color: "#64748B", marginTop: 2 } as TextStyle,
        receiptDash: {
          height: 1,
          borderStyle: "dashed",
          borderTopWidth: 2,
          borderColor: "#D9E0EA",
          marginTop: 14,
          marginBottom: 10,
        } as ViewStyle,
        receiptRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 } as ViewStyle,
        receiptKey: { fontSize: 13, fontWeight: "700", color: "#64748B" } as TextStyle,
        receiptVal: { fontSize: 13, fontWeight: "900", color: c.text.primary } as TextStyle,
        receiptBlockGap: { height: 8 } as ViewStyle,
      }),
    [c, insets.bottom, insets.top]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="정산 내역" hideBackButton />

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
              setViewMonth((prev) => (compareMonth(prev, currentMonth) >= 0 ? prev : addMonth(prev, 1)))
            }
          >
            <Ionicons name="chevron-forward" size={24} color={isNextDisabled ? "#CBD5E1" : c.text.primary} />
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
              <Text style={[s.summaryBig, s.summaryBigRight]}>{toWon(summaryUnpaid)}</Text>
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
                const isUnpaid = item.status === "UNPAID";
                const isPending = item.status === "PENDING";
                const isPaid = item.status === "PAID";
                return (
                  <View key={item.id} style={[s.itemCard, isUnpaid && s.unpaidCard]}>
                    <View style={s.itemTop}>
                      <View style={s.dateRow}>
                        <Text style={s.dateText}>{item.dateLabel}</Text>
                        <View
                          style={[
                            s.statusBadge,
                            {
                              backgroundColor: isUnpaid ? "#FDE7E5" : isPending ? "#FEF9C3" : isPaid ? "#DCFCE7" : "#E0ECFF",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.statusText,
                              { color: isUnpaid ? "#D44B46" : isPending ? "#A16207" : isPaid ? "#15803D" : "#2E6DA4" },
                            ]}
                          >
                            {statusLabel(item.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[s.amountText, isUnpaid && s.amountUnpaid]}>{toWon(item.amount)}</Text>
                    </View>

                    <Text style={s.routeText}>
                      {item.from} <Text style={s.arrowText}>→</Text> {item.to}
                    </Text>

                    <View style={s.actionRow}>
                      {(() => {
                        const isSubmitting = submittingOrderId === item.orderId;
                        return (
                      <Pressable
                        style={[s.actionBtn, !isUnpaid && s.actionBtnNeutral]}
                        disabled={isSubmitting || isPending}
                        onPress={() => void onPressAction(item)}
                      >
                        <MaterialCommunityIcons
                          name={
                            item.status === "PAID"
                              ? "file-document-outline"
                              : item.status === "PENDING"
                                ? "timer-sand"
                              : item.status === "TAX_INVOICE"
                                ? "file-outline"
                                : "credit-card-outline"
                          }
                          size={14}
                          color={isUnpaid ? "#4E46E5" : isPending ? "#A16207" : "#64748B"}
                        />
                        <Text style={[s.actionText, !isUnpaid && s.actionTextNeutral]}>
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

      <Modal visible={!!receiptItem} transparent animationType="fade" onRequestClose={() => setReceiptItem(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setReceiptItem(null)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>운송 영수증</Text>
              <Pressable onPress={() => setReceiptItem(null)}>
                <Ionicons name="close" size={28} color={c.text.primary} />
              </Pressable>
            </View>

            <View style={s.receiptCard}>
              <Text style={s.receiptAmount}>{receiptItem ? receiptItem.amount.toLocaleString("ko-KR") : "0"}</Text>
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
                <Text style={s.receiptVal}>{receiptItem?.vehicleInfo ?? "-"}</Text>
              </View>

              <View style={s.receiptBlockGap} />

              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>공급가액</Text>
                <Text style={s.receiptVal}>{receiptItem ? receiptItem.amount.toLocaleString("ko-KR") : "0"}</Text>
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
