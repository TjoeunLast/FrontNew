import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderApi } from "@/shared/api/orderService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { IconButton } from "@/shared/ui/base/IconButton";
import { RecommendedOrderCard } from "@/shared/ui/business/RecommendedOrderCard";
import {
  isWithinNextHour,
  mapOrderToLiveItem,
  sortLiveOrdersByLatest,
  type LiveOrderItem,
  type SummaryItem,
} from "./ShipperHomeScreen~tool";



// --- Main Screen ---

export function ShipperHomeScreen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState("화주");
  const [liveOrders, setLiveOrders] = useState<LiveOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. 사용자 닉네임 조회
  useFocusEffect(
    React.useCallback(() => {
      void (async () => {
        try {
          const me = await UserService.getMyInfo();
          setDisplayName(me.nickname || "화주");
        } catch (error) {
          console.error("사용자 정보 로드 실패:", error);
        }
      })();
    }, [])
  );

  // 2. 서버에서 실시간 화주 오더 목록 로드
useFocusEffect(
  React.useCallback(() => {
    let active = true;
    setIsLoading(true);

    void (async () => {
      try {
        const data = await OrderApi.getMyShipperOrders();

        if (active) {
          const mapped = data.map((row) => mapOrderToLiveItem(row));
          setLiveOrders(sortLiveOrdersByLatest(mapped)); // 정렬까지 추천
        }
      } catch (error) {
        console.error("오더 목록 로드 실패:", (error as any)?.response?.data ?? error);
        if (active) setLiveOrders([]);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [])
);


  // 페이지 이동 함수들
  const goCreateOrder = () => router.push("/(shipper)/create-order/step1-route" as any);
  const goNotificationsTab = () => router.push("/(shipper)/(tabs)/notifications" as any);
  const goDispatchTab = (targetTab: "WAITING" | "PROGRESS" | "DONE") => {
    router.push({ pathname: "/(shipper)/(tabs)/orders", params: { tab: targetTab } } as any);
  };

  // 상단 운송 현황 요약 데이터 계산
  const summary: SummaryItem[] = useMemo(() => {
    // 배차관리 탭 기준과 동일하게 집계:
    // 배차(WAITING)=MATCHING+DISPATCHED, 운송중(PROGRESS)=DRIVING, 완료(DONE)=DONE
    const matching = liveOrders.filter((x) => x.status === "MATCHING" || x.status === "DISPATCHED").length;
    const driving = liveOrders.filter((x) => x.status === "DRIVING").length;
    const done = liveOrders.filter((x) => x.status === "DONE").length;
    return [
      { key: "matching", label: "배차", value: matching },
      { key: "driving", label: "운송중", value: driving },
      { key: "done", label: "완료", value: done },
    ];
  }, [liveOrders]);

  // 배차 대기 중인 오더에 기사 신청이 있는지 확인 (빨간 점 표시용)
  const hasApplicantRequest = useMemo(
    () => liveOrders.some((x) => x.status === "MATCHING" && (x.applicantsCount ?? 0) > 0),
    [liveOrders]
  );

  // 최근 등록 오더 (최대 3개)
  const recentOrders = useMemo(() => {
    return liveOrders.slice(0, 3);
  }, [liveOrders]);

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: Math.max(18, insets.top + 10) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topRow}>
          <Text style={s.brandText}>BARO</Text>
          <View style={s.topActions}>
            <IconButton onPress={() => {}} variant="ghost">
              <Ionicons name="chatbubble-outline" size={22} color={c.text.primary} />
            </IconButton>
            <IconButton onPress={goNotificationsTab} variant="ghost">
              <Ionicons name="notifications-outline" size={22} color={c.text.primary} />
            </IconButton>
          </View>
        </View>

        <View style={s.dashboardContainer}>
          <Text style={[s.dashboardTitle, { color: c.text.primary }]}>운송 현황</Text>
          <View style={s.summaryRow}>
            {summary.map((it) => {
              const iconColor =
                it.key === "matching" ? "#4F46E5" : it.key === "driving" ? "#0E7490" : "#64748B";
              const iconBg =
                it.key === "matching" ? "#EDE9FE" : it.key === "driving" ? "#E0F2FE" : "#F1F5F9";
              const nextTab = it.key === "matching" ? "WAITING" : it.key === "driving" ? "PROGRESS" : "DONE";
              return (
                <Pressable
                  key={it.key}
                  onPress={() => goDispatchTab(nextTab)}
                  style={({ pressed }) => [
                    s.summaryCard,
                    {
                      backgroundColor: c.bg.surface,
                      borderColor: c.border.default,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={[s.summaryIconCircle, { backgroundColor: iconBg }]}>
                    {it.key === "driving" ? (
                      <MaterialCommunityIcons name="truck-delivery" size={20} color={iconColor} />
                    ) : (
                      <Ionicons
                        name={it.key === "matching" ? "cube" : "checkmark-circle"}
                        size={20}
                        color={iconColor}
                      />
                    )}
                    {it.key === "matching" && hasApplicantRequest ? <View style={s.redDot} /> : null}
                  </View>
                  <Text style={[s.summaryLabel, { color: c.text.secondary }]}>{it.label}</Text>
                  <View style={s.summaryValueRow}>
                    <Text style={[s.summaryValue, { color: c.text.primary }]}>{it.value}</Text>
                    <Text style={{ fontSize: 12, color: c.text.secondary, marginLeft: 2 }}>건</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.ctaWrap}>
          <Button 
            title={`화물 등록하기`}
            onPress={goCreateOrder} 
            fullWidth
          />
        </View>

         <View style={s.sectionHeader}>
           <Text style={[s.sectionTitle, { color: c.text.primary }]}>최신 운송현황</Text>
           <Pressable onPress={() => goDispatchTab("WAITING")}>
             <Text style={{ color: c.text.secondary, fontSize: 13 }}>더보기</Text>
           </Pressable>
         </View>

        {recentOrders.length > 0 ? (
          <View style={{ gap: 12 }}>
            {recentOrders.map((item) => (
              <RecommendedOrderCard
                key={item.id}
                statusKey={item.status}
                from={item.from}
                to={item.to}
                fromDetail={item.fromDetail}
                toDetail={item.toDetail}
                distanceKm={item.distanceKm}
                statusLabel={
                  item.status === "DRIVING" && isWithinNextHour(item.dropoffTimeHHmm)
                    ? "곧 도착"
                    : (item.drivingStageLabel ||
                      (item.status === "DRIVING" ? "배달 중" : item.status === "DISPATCHED" ? "상차 완료" : "대기"))
                }
                etaHHmm={item.dropoffTimeHHmm}
                isEtaUrgent={isWithinNextHour(item.dropoffTimeHHmm)}
                onPress={() =>
                  goDispatchTab(
                    item.status === "DONE"
                      ? "DONE"
                      : item.status === "DRIVING" || item.status === "DISPATCHED"
                        ? "PROGRESS"
                        : "WAITING"
                  )
                }
              />
            ))}
          </View>
        ) : (
          <View style={[s.emptyState, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
             <Ionicons name="clipboard-outline" size={32} color={c.text.secondary} />
             <Text style={[s.emptyText, { color: c.text.secondary }]}>운송 현황이 없어요 화물을 등록해보세요</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  brandText: { fontSize: 22, fontWeight: "900", color: "#4F46E5", letterSpacing: -0.4 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },

  dashboardContainer: { marginBottom: 14 },
  dashboardTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  summaryIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    position: "relative",
  },
  redDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  summaryLabel: { fontSize: 12, fontWeight: "700" },
  summaryValueRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4 },
  summaryValue: { fontSize: 20, fontWeight: "900", lineHeight: 24 },

  ctaWrap: { marginBottom: 18 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "900", lineHeight: 19 },

  emptyState: { 
      padding: 30, alignItems: 'center', justifyContent: 'center', 
      borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, gap: 8 
  },
  emptyText: { fontSize: 14 }
});
