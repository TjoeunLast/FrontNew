import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderService } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

type SettlementRow = {
  id: string;
  orderId: number;
  scheduledAt: Date;
  dateLabel: string;
  from: string;
  to: string;
  amount: number;
  isSettled: boolean;
  vehicleInfo: string;
  payMethodLabel: string;
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

function toWon(v: number) {
  return `${v.toLocaleString("ko-KR")}원`;
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

function getAmount(order: OrderResponse) {
  return (
    Number(order.basePrice ?? 0) +
    Number(order.laborFee ?? 0) +
    Number(order.packagingPrice ?? 0) +
    Number(order.insuranceFee ?? 0)
  );
}

function toPayMethodLabel(raw?: string) {
  const text = String(raw ?? "").trim();
  const v = text.toLowerCase();
  if (!text) return "-";
  if (v.includes("card") || v.includes("토스") || v.includes("카드")) return "토스 결제";
  if (v.includes("prepaid") || text.includes("선/착불")) return "선/착불";
  if (v.includes("receipt") || text.includes("인수증")) return "인수증 (30일)";
  if (v.includes("month") || text.includes("익월말")) return "익월말";
  return text;
}

function mapRow(order: OrderResponse): SettlementRow | null {
  if (order.status === "CANCELLED" || order.status === "REQUESTED" || order.status === "PENDING") return null;

  const scheduledAt =
    parseDate(order.endSchedule) || parseDate(order.startSchedule) || parseDate(order.updated) || parseDate(order.createdAt);
  if (!scheduledAt) return null;

  return {
    id: String(order.orderId),
    orderId: Number(order.orderId),
    scheduledAt,
    dateLabel: toDateLabel(scheduledAt),
    from: toShortPlace(order.startAddr || order.startPlace),
    to: toShortPlace(order.endAddr || order.endPlace),
    amount: getAmount(order),
    isSettled: String(order.settlementStatus ?? "").toUpperCase() === "COMPLETED",
    vehicleInfo: `${order.reqCarType || "차량"} ${order.reqTonnage || ""}`.trim() || "-",
    payMethodLabel: toPayMethodLabel(order.payMethod),
  };
}

export default function SalesDashboard() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentMonth = startOfMonth(new Date());

  const [viewMonth, setViewMonth] = useState<Date>(currentMonth);
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptItem, setReceiptItem] = useState<SettlementRow | null>(null);

  const fetchRows = useCallback(async (targetMonth: Date) => {
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth() + 1;

    try {
      const revenue = await OrderService.getMyRevenue(year, month);
      const mapped = Array.isArray(revenue?.orders)
        ? revenue.orders
            .map((o) => mapRow(o))
            .filter((x): x is SettlementRow => x !== null)
            .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
        : [];
      return mapped;
    } catch {
      const fallbackRaw = await OrderService.getMyDrivingOrders().catch(() => []);
      const fallback = Array.isArray(fallbackRaw) ? fallbackRaw : [];
      return fallback
        .map((o) => mapRow(o))
        .filter((x): x is SettlementRow => x !== null)
        .filter((x) => isSameMonth(x.scheduledAt, targetMonth))
        .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);

      void (async () => {
        try {
          const next = await fetchRows(viewMonth);
          if (!active) return;
          setRows(next);
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [fetchRows, viewMonth])
  );

  const isNextDisabled = compareMonth(viewMonth, currentMonth) >= 0;
  const viewMonthNumber = viewMonth.getMonth() + 1;
  const settledAmount = useMemo(() => rows.filter((x) => x.isSettled).reduce((acc, cur) => acc + cur.amount, 0), [rows]);
  const totalAmount = useMemo(() => rows.reduce((acc, cur) => acc + cur.amount, 0), [rows]);
  const pendingAmount = Math.max(0, totalAmount - settledAmount);

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="매출/정산" hideBackButton />

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(16, insets.bottom + 10) }]}>
        <View style={[s.monthRow, { borderBottomColor: c.border.default, backgroundColor: c.bg.surface }]}>
          <Pressable style={s.monthNavBtn} onPress={() => setViewMonth((prev) => addMonth(prev, -1))}>
            <Ionicons name="chevron-back" size={24} color={c.text.primary} />
          </Pressable>
          <Text style={s.monthText}>{toMonthLabel(viewMonth)}</Text>
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
          <Text style={s.summaryCaption}>{viewMonthNumber}월 총 운송 매출</Text>
          <Text style={s.summaryAmount}>{toWon(totalAmount)}</Text>
          <View style={s.summaryDivider} />
          <View style={s.summaryBottomRow}>
            <View style={s.summaryCol}>
              <Text style={s.summarySmall}>입금 완료</Text>
              <Text style={s.summaryGreen}>{toWon(settledAmount)}</Text>
            </View>
            <View style={s.summaryColDivider} />
            <View style={s.summaryCol}>
              <Text style={[s.summarySmall, s.summaryRight]}>입금 예정</Text>
              <Text style={[s.summaryWhite, s.summaryRight]}>{toWon(pendingAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>상세 내역 ({rows.length}건)</Text>
        </View>

        {loading ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>정산 내역을 불러오는 중입니다.</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>선택한 월의 정산 내역이 없습니다.</Text>
          </View>
        ) : (
          <View style={s.listWrap}>
            {rows.map((item) => (
              <View key={item.id} style={s.itemCard}>
                <View style={s.itemTop}>
                  <View style={s.dateRow}>
                    <Text style={s.dateText}>{item.dateLabel}</Text>
                    <View style={[s.badge, item.isSettled ? s.badgeDone : s.badgePending]}>
                      <Text style={[s.badgeText, item.isSettled ? s.badgeDoneText : s.badgePendingText]}>
                        {item.isSettled ? "입금완료" : "정산예정"}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.amountText}>{toWon(item.amount)}</Text>
                </View>

                <Text style={s.routeText}>
                  {item.from} <Text style={s.arrowText}>→</Text> {item.to}
                </Text>

                <View style={s.actionRow}>
                  <Pressable style={s.actionBtn} onPress={() => setReceiptItem(item)}>
                    <MaterialCommunityIcons name="file-document-outline" size={14} color="#6B7280" />
                    <Text style={s.actionText}>영수증 확인</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
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
              <View style={s.receiptRow}>
                <Text style={s.receiptKey}>결제 방식</Text>
                <Text style={s.receiptVal}>{receiptItem?.payMethodLabel ?? "-"}</Text>
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

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F5F6FA" },
  content: { paddingBottom: 20 },
  monthRow: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    borderBottomWidth: 1,
  },
  monthNavBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  monthText: { fontSize: 17, fontWeight: "900", color: "#111827" },
  summaryCard: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "#4E46E5",
  },
  summaryCaption: { fontSize: 12, fontWeight: "700", color: "#DCD9FF" },
  summaryAmount: { marginTop: 8, fontSize: 21, fontWeight: "900", color: "#FFFFFF" },
  summaryDivider: {
    marginTop: 14,
    marginBottom: 12,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  summaryBottomRow: { flexDirection: "row", alignItems: "center" },
  summaryCol: { flex: 1 },
  summaryColDivider: { width: 1, height: 44, backgroundColor: "rgba(255,255,255,0.3)" },
  summarySmall: { fontSize: 12, fontWeight: "700", color: "#DCD9FF" },
  summaryGreen: { marginTop: 4, fontSize: 16, fontWeight: "900", color: "#74D39E" },
  summaryWhite: { marginTop: 4, fontSize: 16, fontWeight: "900", color: "#FFFFFF" },
  summaryRight: { textAlign: "right" },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  listWrap: { paddingHorizontal: 16, gap: 10 },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DEE3ED",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "800" },
  badgeDone: { backgroundColor: "#E2F5E8" },
  badgePending: { backgroundColor: "#EDF0F5" },
  badgeDoneText: { color: "#2E8B57" },
  badgePendingText: { color: "#6B7280" },
  amountText: { fontSize: 16, fontWeight: "900", color: "#111827" },
  routeText: { marginTop: 10, fontSize: 15, fontWeight: "900", color: "#111827", letterSpacing: -0.1 },
  arrowText: { color: "#B8C1D1" },
  actionRow: { marginTop: 10, alignItems: "flex-end" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    height: 36,
  },
  actionText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  receiptCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5EAF1",
    backgroundColor: "#FAFBFD",
    padding: 14,
  },
  receiptAmount: { fontSize: 20, fontWeight: "900", textAlign: "center", color: "#111827" },
  receiptPaid: { fontSize: 12, fontWeight: "700", textAlign: "center", color: "#64748B", marginTop: 2 },
  receiptDash: {
    height: 1,
    borderStyle: "dashed",
    borderTopWidth: 2,
    borderColor: "#D9E0EA",
    marginTop: 14,
    marginBottom: 10,
  },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  receiptKey: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  receiptVal: { fontSize: 13, fontWeight: "900", color: "#111827" },
  receiptBlockGap: { height: 8 },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9DEE7",
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    alignItems: "center",
  },
  emptyText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
});
