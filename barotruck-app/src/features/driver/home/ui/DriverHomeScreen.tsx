import React from "react";
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

import { DrOrderCard } from "@/features/driver/shard/ui/DrOrderCard";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useDriverHome } from "@/features/driver/home/model/useDriverHome";

export default function DriverHomeScreen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();

  // 홈 화면 데이터 공급
  const {
    recommendedOrders,
    income,
    statusCounts,
    isRefreshing,
    myLocation,
    onRefresh,
  } = useDriverHome();

  // 대시보드 클릭 시 운행 탭 이동
  const handleStatusPress = (tabName: "READY" | "ONGOING" | "DONE") => {
    router.push({
      pathname: "/(driver)/(tabs)/driving",
      params: { initialTab: tabName },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg.canvas }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: c.bg.surface }]}>
        <Text style={[styles.logoText, { color: c.brand.primary }]}>BARO</Text>
        <View style={styles.headerIcons}>
          {/* 채팅 */}
          <Pressable onPress={() => router.push("/(chat)")}>
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color={c.text.primary}
            />
          </Pressable>

          {/* 알림 */}
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
          // 화면 새로고침
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* 정산 카드  */}
        <Pressable
          onPress={() => router.push("/(driver)/(tabs)/sales")}
          style={[
            styles.incomeCard,
            { backgroundColor: c.brand.primary, overflow: "hidden" },
          ]}
        >
          {/* 카드 배경 장식 패턴 */}
          <View style={styles.bgPatternContainer}>
            <View style={(styles.bgShape, styles.shapeCircleBig)} />
            <View style={(styles.bgShape, styles.shapeSquareRotated)} />
            <View style={(styles.bgShape, styles.shapeCircleSmall)} />
          </View>

          <View style={{ zIndex: 1 }}>
            <View style={styles.incomeHeader}>
              <Text style={styles.incomeTitle}>{income.month}월 예상 수익</Text>
              <View
                style={[
                  styles.incomeBadge,
                  { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                ]}
              >
                <Text
                  style={[styles.incomeBadgeText, { color: c.text.inverse }]}
                >
                  +{income.growthRate}%
                </Text>
              </View>
            </View>

            <Text style={[styles.incomeAmount, { color: c.text.inverse }]}>
              {income.amount.toLocaleString()}원
            </Text>
            <Text
              style={[
                styles.incomeSub,
                { color: c.text.inverse, opacity: 0.9 },
              ]}
            >
              목표 달성까지 {income.targetDiff.toLocaleString()}원 남았어요!
            </Text>
          </View>
        </Pressable>

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

        {/* 맞춤 추천 오더) */}
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
              <DrOrderCard order={order} myLocation={myLocation} />
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
  bgPatternContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  bgShape: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  shapeCircleBig: {
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -40,
    right: -30,
  },
  shapeSquareRotated: {
    width: 100,
    height: 100,
    borderRadius: 16,
    bottom: -30,
    left: -20,
    transform: [{ rotate: "35deg" }],
  },
  shapeCircleSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    top: "40%",
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  incomeCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    elevation: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  incomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  incomeTitle: { opacity: 0.9, fontSize: 14, fontWeight: "500" },
  incomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  incomeBadgeText: { fontSize: 13, fontWeight: "700" },
  incomeAmount: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  incomeSub: {
    fontSize: 13,
    fontWeight: "500",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
