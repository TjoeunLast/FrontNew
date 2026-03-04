import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { DrOrderCard } from "@/features/driver/shard/ui/DrOrderCard";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useDriverHome } from "@/features/driver/home/model/useDriverHome";
import { fetchMyUnreadChatCount } from "@/shared/api/chatApi";
import { OrderService } from "@/shared/api/orderService"; // 🚩 매출 데이터 호출용
import { SalesSummaryCard } from "../../shard/ui/SalesSummaryCard";

// 정산 로직을 위한 타입 및 유틸 함수 (정산 페이지와 동일)
function getAmount(order: any) {
  return (
    Number(order.basePrice ?? 0) +
    Number(order.laborFee ?? 0) +
    Number(order.packagingPrice ?? 0) +
    Number(order.insuranceFee ?? 0)
  );
}

export default function DriverHomeScreen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  // 매출 관련 상태 추가
  const [totalAmount, setTotalAmount] = useState(0);
  const [settledAmount, setSettledAmount] = useState(0);
  const pendingAmount = Math.max(0, totalAmount - settledAmount);

  const now = new Date();
  const currentMonthNumber = now.getMonth() + 1; // 이번 달

  const syncUnread = useCallback(async () => {
    try {
      const unreadCount = await fetchMyUnreadChatCount();
      setHasUnreadChat(unreadCount > 0);
    } catch (e) {
      console.log("채팅 알림 동기화 실패");
    }
  }, []);

  const fetchMonthlyRevenue = useCallback(async () => {
    try {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      const revenue = await OrderService.getMyRevenue(year, month);
      const orders = Array.isArray(revenue?.orders) ? revenue.orders : [];

      let total = 0;
      let settled = 0;

      orders.forEach((o) => {
        // 정산 페이지(SalesDashboard)와 완벽히 동일한 필터링 기준 적용
        if (
          o.status !== "CANCELLED" &&
          o.status !== "REQUESTED" &&
          o.status !== "PENDING"
        ) {
          const amt = getAmount(o);
          total += amt;

          // settlementStatus가 COMPLETED일 때만 입금 완료 처리
          if (String(o.settlementStatus ?? "").toUpperCase() === "COMPLETED") {
            settled += amt;
          }
        }
      });

      setTotalAmount(total);
      setSettledAmount(settled);
    } catch (error) {
      console.log("홈 화면 매출 데이터 처리 중단됨");
    }
  }, []);

  // 홈 화면 기본 데이터 공급
  const {
    recommendedOrders,
    statusCounts,
    isRefreshing,
    onRefresh: homeRefresh,
  } = useDriverHome();

  // 통합 새로고침 함수
  const handleRefresh = async () => {
    homeRefresh();
    await fetchMonthlyRevenue();
  };

  // 대시보드 클릭 시 운행 탭 이동
  const handleStatusPress = (tabName: "READY" | "ONGOING" | "DONE") => {
    router.push({
      pathname: "/(driver)/(tabs)/driving",
      params: { initialTab: tabName },
    });
  };

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setInterval> | null = null;

      void syncUnread();
      void fetchMonthlyRevenue(); // 화면 진입 시 매출액 업데이트

      timer = setInterval(() => {
        void syncUnread();
      }, 30000);

      return () => {
        if (timer) clearInterval(timer);
      };
    }, [syncUnread, fetchMonthlyRevenue]),
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg.canvas }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: c.bg.surface }]}>
        <Text style={[styles.logoText, { color: c.brand.primary }]}>BARO</Text>
        <View style={styles.headerIcons}>
          <Pressable
            onPress={() => router.push("/(chat)")}
            style={styles.chatIconWrap}
          >
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color={c.text.primary}
            />
            {hasUnreadChat && <View style={styles.chatUnreadDot} />}
          </Pressable>

          <Pressable onPress={() => console.log("알림 이동")}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={c.text.primary}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 공통 매출 카드 */}
        <SalesSummaryCard
          monthNumber={currentMonthNumber}
          totalAmount={totalAmount}
          settledAmount={settledAmount}
          pendingAmount={pendingAmount}
          style={{ marginBottom: 24 }} // 대시보드와의 간격
        />

        {/* 대시보드 (운송 현황 카운트)*/}
        <View style={styles.dashboardContainer}>
          <Text
            style={[
              styles.sectionTitle,
              { color: c.text.primary, marginBottom: 16 },
            ]}
          >
            운송 현황
          </Text>
          <View style={styles.statsGrid}>
            {/* 승인대기 */}
            <Pressable
              onPress={() => handleStatusPress("READY")}
              style={[
                styles.statItem,
                {
                  backgroundColor: c.bg.surface,
                  borderColor: c.border.default,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: c.status.warningSoft },
                ]}
              >
                <Ionicons name="cube" size={20} color={c.status.warning} />
              </View>
              <Text style={[styles.statLabel, { color: c.status.warning }]}>
                승인대기
              </Text>
              <Text style={[styles.statValue, { color: c.status.warning }]}>
                {statusCounts.pending}
              </Text>
            </Pressable>

            {/* 배차확정 */}
            <Pressable
              onPress={() => handleStatusPress("READY")}
              style={[
                styles.statItem,
                {
                  backgroundColor: c.bg.surface,
                  borderColor: c.border.default,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: c.brand.primarySoft },
                ]}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={20}
                  color={c.brand.primary}
                />
                {statusCounts.confirmed > 0 && (
                  <View
                    style={[
                      styles.redDot,
                      {
                        backgroundColor: c.status.danger,
                        borderColor: c.bg.surface,
                      },
                    ]}
                  />
                )}
              </View>
              <Text style={[styles.statLabel, { color: c.brand.primary }]}>
                배차확정
              </Text>
              <Text style={[styles.statValue, { color: c.brand.primary }]}>
                {statusCounts.confirmed}
              </Text>
            </Pressable>

            {/* 운송중 */}
            <Pressable
              onPress={() => handleStatusPress("ONGOING")}
              style={[
                styles.statItem,
                {
                  backgroundColor: c.bg.surface,
                  borderColor: c.border.default,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: c.status.successSoft },
                ]}
              >
                <MaterialCommunityIcons
                  name="truck-delivery"
                  size={20}
                  color={c.status.success}
                />
              </View>
              <Text style={[styles.statLabel, { color: c.status.success }]}>
                운송중
              </Text>
              <Text style={[styles.statValue, { color: c.status.success }]}>
                {statusCounts.shipping}
              </Text>
            </Pressable>

            {/* 운송완료 */}
            <Pressable
              onPress={() => handleStatusPress("DONE")}
              style={[
                styles.statItem,
                {
                  backgroundColor: c.bg.surface,
                  borderColor: c.border.default,
                },
              ]}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: c.bg.canvas }]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={c.text.secondary}
                />
              </View>
              <Text style={[styles.statLabel, { color: c.text.secondary }]}>
                완료
              </Text>
              <Text style={[styles.statValue, { color: c.text.secondary }]}>
                {statusCounts.completed}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 맞춤 추천 오더 */}
        <View style={styles.orderList}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>
              맞춤 추천 오더
            </Text>
            <Pressable onPress={() => router.push("/(driver)/(tabs)/orders")}>
              <Text style={{ color: c.text.secondary }}>전체보기 &gt;</Text>
            </Pressable>
          </View>

          {recommendedOrders.map((order) => (
            <Pressable
              key={order.orderId}
              onPress={() =>
                router.push(`/(driver)/order-detail/${order.orderId}`)
              }
            >
              <DrOrderCard order={order} hideDistance={true} />
            </Pressable>
          ))}

          {/* 데이터 부재 시 예외 처리 */}
          {recommendedOrders.length === 0 && (
            <Text
              style={{
                textAlign: "center",
                color: c.text.secondary,
                marginTop: 40,
              }}
            >
              현재 대기 중인 추천 오더가 없습니다.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoText: { fontSize: 22, fontWeight: "900" },
  headerIcons: { flexDirection: "row", gap: 15 },
  chatIconWrap: { position: "relative" },
  chatUnreadDot: {
    position: "absolute",
    top: -1,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderList: { gap: 16 },
  dashboardContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  statsGrid: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: { fontSize: 18, fontWeight: "800" },
  redDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },
});
