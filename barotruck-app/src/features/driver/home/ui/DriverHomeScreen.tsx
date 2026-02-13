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

// 프로젝트 공통 UI 및 API 서비스, 타입 임포트
import { DrOrderCard } from "@/features/driver/shard/ui/DrOrderCard";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

// 분리한 로직(Model) 임포트
import { useDriverHome } from "../model/useDriverHome";

export default function DriverHomeScreen() {
  // 1. 테마 및 라우터 설정
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();

  // 2. 커스텀 훅에서 데이터와 기능 가져오기
  const {
    orders,
    recommendedOrders,
    income,
    statusCounts,
    isRefreshing,
    onRefresh,
  } = useDriverHome();

  return (
    <View style={[styles.container, { backgroundColor: c.bg.canvas }]}>
      {/* --- 상단 헤더 영역 --- */}
      <View style={styles.header}>
        <Text style={styles.logoText}>BARO</Text>
        <View style={styles.headerIcons}>
          {/* 3. 채팅 아이콘 클릭 시 이동 로직 추가 */}
          <Pressable onPress={() => router.push("/(chat)")}>
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color={c.text.primary}
            />
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

      {/* --- 스크롤 가능한 메인 콘텐츠 영역 --- */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* 수익 요약 카드 (클릭 시 정산 탭으로 이동) */}
        <Pressable
          onPress={() => router.push("/(driver)/(tabs)/sales")}
          style={[
            styles.incomeCard,
            { backgroundColor: c.brand.primary, overflow: "hidden" },
          ]}
        >
          <View style={styles.bgPatternContainer}>
            <View style={[styles.bgShape, styles.shapeCircleBig]} />
            <View style={[styles.bgShape, styles.shapeSquareRotated]} />
            <View style={[styles.bgShape, styles.shapeCircleSmall]} />
          </View>
          <View style={{ zIndex: 1 }}>
            <View style={styles.incomeHeader}>
              <Text style={styles.incomeTitle}>{income.month}월 예상 수익</Text>
              <View style={styles.incomeBadge}>
                <Text style={styles.incomeBadgeText}>
                  +{income.growthRate}%
                </Text>
              </View>
            </View>

            <Text style={styles.incomeAmount}>
              {income.amount.toLocaleString()}원
            </Text>
            <Text style={styles.incomeSub}>
              목표 달성까지 {income.targetDiff.toLocaleString()}원 남았어요!
            </Text>
          </View>
        </Pressable>

        {/* --- 운송 현황 대시보드 --- */}
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
            {/* 1. 배차대기 */}
            <View style={[styles.statItem, { backgroundColor: c.bg.surface }]}>
              <View style={[styles.iconCircle, { backgroundColor: "#E0E7FF" }]}>
                <Ionicons name="cube" size={20} color="#3730A3" />
              </View>
              <Text style={[styles.statLabel, { color: "#3730A3" }]}>
                배차대기
              </Text>
              <Text style={[styles.statValue, { color: "#3730A3" }]}>
                {statusCounts.pending}
              </Text>
            </View>

            {/* 2. 배차확정  */}
            <View style={[styles.statItem, { backgroundColor: c.bg.surface }]}>
              <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="clipboard-outline" size={20} color="#166534" />
                {statusCounts.confirmed > 0 && <View style={styles.redDot} />}
              </View>
              <Text style={[styles.statLabel, { color: "#166534" }]}>
                배차확정
              </Text>
              <Text style={[styles.statValue, { color: "#166534" }]}>
                {statusCounts.confirmed}
              </Text>
            </View>

            {/* 3. 운송중 */}
            <View style={[styles.statItem, { backgroundColor: c.bg.surface }]}>
              <View style={[styles.iconCircle, { backgroundColor: "#E0F2FE" }]}>
                <MaterialCommunityIcons
                  name="truck-delivery"
                  size={20}
                  color="#075985"
                />
              </View>
              <Text style={[styles.statLabel, { color: "#075985" }]}>
                운송중
              </Text>
              <Text style={[styles.statValue, { color: "#075985" }]}>
                {statusCounts.shipping}
              </Text>
            </View>

            {/* 4. 운송완료 */}
            <View style={[styles.statItem, { backgroundColor: c.bg.surface }]}>
              <View style={[styles.iconCircle, { backgroundColor: "#F1F5F9" }]}>
                <Ionicons name="checkmark-circle" size={20} color="#334155" />
              </View>
              <Text style={styles.statLabel}>운송완료</Text>
              <Text style={[styles.statValue, { color: "#334155" }]}>
                {statusCounts.completed}
              </Text>
            </View>
          </View>
        </View>

        {/* --- 추천 오더 리스트 영역 --- */}
        <View style={styles.orderList}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>
              맞춤 추천 오더
            </Text>
            <Pressable
              onPress={() => router.push("/(driver)/(tabs)/orders")}
            ></Pressable>
          </View>

          {/* 맞춤 추천 오더 데이터 렌더링*/}
          {recommendedOrders.map((order) => (
            <DrOrderCard key={order.orderId} {...(order as any)} />
          ))}
          {/* 추천 오더가 없을 경우 */}
          {recommendedOrders.length === 0 && (
            <Text
              style={{ textAlign: "center", color: "#94A3B8", marginTop: 20 }}
            >
              현재 대기 중인 추천 오더가 없습니다.
            </Text>
          )}

          {/* Model에서 가져온 오더 데이터 렌더링 */}
          {/* {orders.map((order) => (
            <DrOrderCard key={order.orderId} {...(order as any)} />
          ))} */}
        </View>
      </ScrollView>
    </View>
  );
}

// 스타일 정의
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#fff",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#4E46E5",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 15,
  },
  bgPatternContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
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
    transform: [{ rotate: "35deg" }], // 35도 회전
  },
  shapeCircleSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    top: "40%",
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)", // 더 연하게
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  incomeCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    elevation: 8,
    shadowColor: "#4E46E5",
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
  incomeTitle: {
    color: "#FFF",
    opacity: 0.9,
    fontSize: 14,
    fontWeight: "500",
  },
  incomeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  incomeBadgeText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  incomeAmount: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  incomeSub: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "500",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // marginBottom: 16,
  },
  orderList: {
    gap: 16,
  },
  dashboardContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statItem: {
    flex: 1, // 모든 카드가 동일한 너비를 가집니다.
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
    color: "#64748B",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  redDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
});
