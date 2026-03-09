import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { OrderApi } from "@/shared/api/orderService";
import { PaymentService } from "@/shared/api/paymentService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

// 컴포넌트 및 유틸 임포트
import { ShipperSummaryCard } from "./components/ShipperSummaryCard";
import { ShipperSettlementItem } from "./components/ShipperSettlementItem";
import { ReceiptModal } from "./components/ReceiptModal";
import { TossCheckoutModal } from "../../payment/ui/TossCheckoutModal";
import {
  SettlementFilter,
  SettlementItem,
  TossCheckoutSession,
  addMonth,
  buildTossCheckoutHtml,
  compareMonth,
  isSameMonth,
  isUrlMatched,
  isWebViewInternalUrl,
  loadPendingSettlementOrderIds,
  mapOrderToSettlement,
  parseQueryValue,
  savePendingSettlementOrderIds,
  startOfMonth,
  toActionLabel,
  toMonthLabel,
} from "../model/shipperSettlementUtils";

type PaymentMethodFilter = "ALL" | "TOSS" | "DEFERRED";

export default function ShipperSettlementScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();
  const currentMonth = startOfMonth(new Date());

  // 상태 관리
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

  // 데이터 페칭 로직
  const fetchItems = useCallback(async () => {
    const pendingOrderIds = await loadPendingSettlementOrderIds();
    const rows = await OrderApi.getMyShipperOrders();
    const mapped = rows
      .filter((row) => row.status === "COMPLETED")
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

  // 화면 포커스 시 데이터 로드
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);
      void (async () => {
        try {
          const mapped = await fetchItems();
          if (active) setItems(mapped);
        } catch (error) {
          console.warn("조회 실패:", error);
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

  // 메모이제이션 계산값
  const isNextDisabled = compareMonth(viewMonth, currentMonth) >= 0;
  const viewMonthLabel = toMonthLabel(viewMonth);
  const viewMonthNumber = viewMonth.getMonth() + 1;
  const monthItems = useMemo(
    () =>
      items.filter(
        (x) => x.isTransportCompleted && isSameMonth(x.scheduledAt, viewMonth),
      ),
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
  const summaryUnpaid = useMemo(
    () =>
      monthItems
        .filter((x) => x.status === "UNPAID")
        .reduce((acc, cur) => acc + cur.amount, 0),
    [monthItems],
  );
  const summaryPaid = summaryTotal - summaryUnpaid;

  // 토스 결제 핸들러 (원본 유지)
  const closeTossCheckout = useCallback(() => {
    if (tossConfirming) return;
    handledTossResultUrlRef.current = null;
    setTossCheckout(null);
    setSubmittingOrderId(null);
  }, [tossConfirming]);

  const handleTossSuccessUrl = useCallback(
    async (url: string) => {
      if (!tossCheckout) return;
      const paymentKey = parseQueryValue(url, "paymentKey");
      const pgOrderId = parseQueryValue(url, "orderId");
      const amount = Number(parseQueryValue(url, "amount"));
      if (!paymentKey) {
        setTossCheckout(null);
        return Alert.alert("결제 오류", "결제 키를 확인할 수 없습니다.");
      }
      try {
        setTossConfirming(true);
        await PaymentService.confirmTossPayment(tossCheckout.orderId, {
          paymentKey,
          pgOrderId: pgOrderId || undefined,
          amount: Number.isFinite(amount) ? amount : undefined,
        });
        const pendingOrderIds = await loadPendingSettlementOrderIds();
        if (pendingOrderIds.delete(tossCheckout.orderId))
          await savePendingSettlementOrderIds(pendingOrderIds);
        const refreshed = await fetchItems().catch(() => null);
        setItems(refreshed || items);
        setTossCheckout(null);
        Alert.alert("완료", "결제가 완료되었습니다.");
      } catch (error: any) {
        Alert.alert("오류", String(error?.message || "결제 확정 실패"));
      } finally {
        setTossConfirming(false);
        setSubmittingOrderId(null);
      }
    },
    [fetchItems, tossCheckout, items],
  );

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
        setTossCheckout(null);
        setSubmittingOrderId(null);
        return true;
      }
      return false;
    },
    [handleTossSuccessUrl, tossCheckout],
  );

  // 정산 액션 핸들러 (원본 유지)
  const onPressAction = async (item: SettlementItem) => {
    if (submittingOrderId === item.orderId) return;
    if (item.status === "PAID") return setReceiptItem(item);
    if (item.status === "UNPAID" && !item.isTransportCompleted)
      return Alert.alert("안내", "운송 완료 후 결제 가능합니다.");
    if (item.isToss)
      return router.push({
        pathname: "/(shipper)/payment-checkout",
        params: { orderId: String(item.orderId) },
      } as any);

    try {
      setSubmittingOrderId(item.orderId);
      await PaymentService.markPaid(item.orderId, {
        method: "CASH",
        paymentTiming: "POSTPAID",
      });
      const refreshed = await fetchItems().catch(() => null);
      setItems(refreshed || items);
      Alert.alert("안내", "결제 요청이 완료되었습니다.");
    } catch (error: any) {
      Alert.alert("오류", "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmittingOrderId(null);
    }
  };

  const s = getStyles(c);

  return (
    <View style={s.page}>
      {/* 헤더 영역 */}
      <ShipperScreenHeader title="정산 내역" hideBackButton />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 월 선택 영역 */}
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
            onPress={() => setViewMonth((prev) => addMonth(prev, 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isNextDisabled ? "#CBD5E1" : c.text.primary}
            />
          </Pressable>
        </View>

        {/* 요약 카드 영역 */}
        <ShipperSummaryCard
          monthNumber={viewMonthNumber}
          totalAmount={summaryTotal}
          paidAmount={summaryPaid}
          unpaidAmount={summaryUnpaid}
          style={{ marginTop: 14, marginHorizontal: 16 }}
        />

        {/* 필터 및 건수 영역 */}
        <View style={s.section}>
          <View style={s.filterAndCountRow}>
            {!loading && (
              <Text style={s.countText}>총 {filtered.length}건</Text>
            )}
            <View style={s.filterGroup}>
              {[
                ["ALL", "전체"],
                ["UNPAID", "미결제"],
                ["TAX", "세금계산서"],
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
              <Text style={s.emptyText}>불러오는 중...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>정산 내역이 없습니다.</Text>
            </View>
          ) : (
            <View style={s.listWrap}>
              {filtered.map((item) => (
                <ShipperSettlementItem
                  key={item.id}
                  item={item}
                  isSubmitting={submittingOrderId === item.orderId}
                  onPressAction={onPressAction}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 모달 영역 */}
      <TossCheckoutModal
        checkoutSession={tossCheckout}
        isConfirming={tossConfirming}
        onClose={closeTossCheckout}
        onShouldStartLoadWithRequest={(req) => {
          if (handleTossResultUrl(req.url)) return false;
          if (!isWebViewInternalUrl(req.url)) {
            Linking.openURL(req.url);
            return false;
          }
          return true;
        }}
        onNavigationStateChange={(nav) => handleTossResultUrl(nav.url)}
        onMessage={() => {}}
      />
      <ReceiptModal item={receiptItem} onClose={() => setReceiptItem(null)} />
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
