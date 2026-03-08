import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderService } from "@/shared/api/orderService";
import { PaymentService } from "@/shared/api/paymentService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { SalesSummaryCard } from "@/features/driver/shard/ui/SalesSummaryCard";

// 분리한 컴포넌트 및 유틸 임포트
import {
  SettlementFilter,
  SettlementItem,
  addMonth,
  compareMonth,
  isSameMonth,
  mapOrderToSettlement,
  startOfMonth,
  toMonthLabel,
} from "../model/driverSettlementUtils";
import { DriverSettlementItem } from "./components/DriverSettlementItem";
import { DisputeModal } from "./components/DisputeModal";
import type { PaymentDisputeReason } from "@/shared/models/payment";

export default function DriverSettlementScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentMonth = startOfMonth(new Date());

  // 상태 관리
  const [filter, setFilter] = useState<SettlementFilter>("ALL");
  const [viewMonth, setViewMonth] = useState<Date>(currentMonth);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingOrderId, setSubmittingOrderId] = useState<number | null>(
    null,
  );
  const [disputeTarget, setDisputeTarget] = useState<SettlementItem | null>(
    null,
  );
  const [disputeReason, setDisputeReason] = useState<PaymentDisputeReason>(
    "RECEIVED_AMOUNT_MISMATCH",
  );
  const [disputeDescription, setDisputeDescription] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  // 데이터 가져오기
  const fetchItems = useCallback(async () => {
    const rows = await OrderService.getMyDrivingOrders();
    return rows
      .filter((row) => row.status === "COMPLETED")
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
          if (active) setItems(next);
        } catch (error) {
          setItems([]);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [fetchItems]),
  );

  // 계산값
  const isNextDisabled = compareMonth(viewMonth, currentMonth) >= 0;
  const monthItems = useMemo(
    () => items.filter((x) => isSameMonth(x.scheduledAt, viewMonth)),
    [items, viewMonth],
  );
  const filtered = useMemo(() => {
    if (filter === "ALL") return monthItems;
    if (filter === "PENDING")
      return monthItems.filter((x) => x.status !== "PAID");
    return monthItems.filter((x) => x.status === "PAID");
  }, [filter, monthItems]);

  const summaryTotal = useMemo(
    () => monthItems.reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems],
  );
  const summaryPaid = useMemo(
    () =>
      monthItems
        .filter((x) => x.status === "PAID")
        .reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems],
  );
  const summaryPending = Math.max(0, summaryTotal - summaryPaid);

  // 로직: 결제 확인 (원본 보존)
  const onPressConfirm = async (item: SettlementItem) => {
    if (submittingOrderId === item.orderId) return;
    try {
      setSubmittingOrderId(item.orderId);
      await PaymentService.confirmByDriver(item.orderId);
      const refreshed = await fetchItems();
      setItems(refreshed);
      Alert.alert("완료", "결제 확인이 완료되었습니다.");
    } catch (e) {
      Alert.alert("오류", "처리에 실패했습니다.");
    } finally {
      setSubmittingOrderId(null);
    }
  };

  // 로직: 이의제기 접수 (원본 보존)
  const submitDispute = async () => {
    if (!disputeTarget) return;
    try {
      setIsSubmittingDispute(true);
      await PaymentService.createDispute(disputeTarget.orderId, {
        reasonCode: disputeReason,
        description: disputeDescription.trim(),
      });
      const refreshed = await fetchItems();
      setItems(refreshed);
      Alert.alert("완료", "이의제기가 접수되었습니다.");
      setDisputeTarget(null);
    } catch (e) {
      Alert.alert("오류", "접수 실패");
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const s = getStyles(c);

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="차주 정산" hideBackButton />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 월 선택부 */}
        <View style={s.monthRow}>
          <Pressable onPress={() => setViewMonth((prev) => addMonth(prev, -1))}>
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
          </Pressable>
          <Text style={s.monthText}>{toMonthLabel(viewMonth)}</Text>
          <Pressable
            disabled={isNextDisabled}
            onPress={() => setViewMonth((prev) => addMonth(prev, 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isNextDisabled ? "#CBD5E1" : "#1E293B"}
            />
          </Pressable>
        </View>

        <SalesSummaryCard
          monthNumber={viewMonth.getMonth() + 1}
          totalAmount={summaryTotal}
          settledAmount={summaryPaid}
          pendingAmount={summaryPending}
          style={{ marginTop: 14, marginHorizontal: 16 }}
        />

        {/* 필터 및 건수 영역 (디자인 통일) */}
        <View style={s.section}>
          <View style={s.filterAndCountRow}>
            {!loading && (
              <Text style={s.countText}>총 {filtered.length}건</Text>
            )}
            <View style={s.filterGroup}>
              {[
                ["ALL", "전체"],
                ["PENDING", "미확인"],
                ["PAID", "완료"],
              ].map(([key, label]) => {
                const active = filter === key;
                return (
                  <Pressable
                    key={key}
                    style={[s.categoryBtn, active && s.categoryBtnActive]}
                    onPress={() => setFilter(key as SettlementFilter)}
                  >
                    <Text
                      style={[s.categoryText, active && s.categoryTextActive]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 목록부 */}
          {loading ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>불러오는 중...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>정산 내역이 없습니다.</Text>
            </View>
          ) : (
            <View style={s.listWrap}>
              {filtered.map((item) => (
                <DriverSettlementItem
                  key={item.id}
                  item={item}
                  isSubmitting={submittingOrderId === item.orderId}
                  isSubmittingDispute={isSubmittingDispute}
                  onPressConfirm={onPressConfirm}
                  openDisputeModal={setDisputeTarget}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <DisputeModal
        disputeTarget={disputeTarget}
        disputeReason={disputeReason}
        disputeDescription={disputeDescription}
        isSubmittingDispute={isSubmittingDispute}
        setDisputeReason={setDisputeReason}
        setDisputeDescription={setDisputeDescription}
        closeDisputeModal={() => setDisputeTarget(null)}
        submitDispute={submitDispute}
      />
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
