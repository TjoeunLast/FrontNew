import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getLocalShipperOrders, hydrateLocalShipperOrders } from "@/features/shipper/home/model/localShipperOrders";
import { MOCK_SHIPPER_ORDERS } from "@/features/shipper/mock";
import { OrderApi } from "@/shared/api/orderService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse, OrderStatus } from "@/shared/models/order";
import { Button } from "@/shared/ui/base/Button";
import { IconButton } from "@/shared/ui/base/IconButton";
import { RecommendedOrderCard } from "@/shared/ui/business/RecommendedOrderCard";

// --- Types & Helpers (Existing Logic) ---

type SummaryItem = {
  key: "matching" | "driving" | "done";
  label: string;
  value: number;
};

type LiveOrderItem = {
  id: string;
  status: "MATCHING" | "DISPATCHED" | "DRIVING" | "DONE";
  applicantsCount?: number;
  isInstantDispatch?: boolean;
  pickupTypeLabel?: string;
  dropoffTypeLabel?: string;
  from: string;
  to: string;
  distanceKm: number;
  cargoSummary: string;
  loadMethodShort?: string;
  workToolShort?: string;
  priceWon: number;
  updatedAtLabel: string;
  updatedAtMs?: number;
  pickupTimeHHmm?: string;
  dropoffTimeHHmm?: string;
  drivingStageLabel?: "상차 완료" | "배달 중" | "하차 직전";
};

const FORCE_MOCK_HOME_DATA =
  ["1", "true", "yes", "on"].includes(String(process.env.EXPO_PUBLIC_USE_SHIPPER_MOCK ?? "").trim().toLowerCase()) ||
  ["1", "true", "yes", "on"].includes(String(process.env.EXPO_PUBLIC_USE_MOCK ?? "").trim().toLowerCase());

function toLoadMethodShort(v?: string) {
  if (!v) return "-";
  if (v.includes("혼")) return "혼";
  return "독";
}

function toWorkToolShort(v?: string) {
  if (!v) return "-";
  if (v.includes("지")) return "지";
  if (v.includes("수")) return "수";
  if (v.includes("크")) return "크";
  if (v.includes("호")) return "호";
  return "-";
}

function mapStatus(status: OrderStatus): LiveOrderItem["status"] {
  if (status === "COMPLETED") return "DONE";
  if (status === "REQUESTED" || status === "PENDING") return "MATCHING";
  if (status === "ACCEPTED") return "DISPATCHED";
  return "DRIVING";
}

function toRelativeLabel(iso?: string) {
  if (!iso) return "방금 전";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "방금 전";
  const diffMin = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function toTimestampMs(iso?: string) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function isWithinNextHour(hhmm?: string) {
  if (!hhmm) return false;
  const m = hhmm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return false;
  const now = new Date();
  const target = new Date(now);
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  let diffMin = Math.floor((target.getTime() - now.getTime()) / 60000);
  if (diffMin < 0) diffMin += 24 * 60;
  return diffMin >= 0 && diffMin <= 60;
}

function minutesUntilHHmm(hhmm?: string) {
  if (!hhmm) return Number.POSITIVE_INFINITY;
  const m = hhmm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return Number.POSITIVE_INFINITY;
  const now = new Date();
  const target = new Date(now);
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  let diffMin = Math.floor((target.getTime() - now.getTime()) / 60000);
  if (diffMin < 0) diffMin += 24 * 60;
  return diffMin;
}

function parseLabelToMs(label: string) {
  const now = new Date();
  if (label.includes("방금")) return now.getTime();

  const minMatch = label.match(/(\d+)\s*분\s*전/);
  if (minMatch) return now.getTime() - Number(minMatch[1]) * 60_000;

  const hourMatch = label.match(/(\d+)\s*시간\s*전/);
  if (hourMatch) return now.getTime() - Number(hourMatch[1]) * 3_600_000;

  const dayMatch = label.match(/(\d+)\s*일\s*전/);
  if (dayMatch) return now.getTime() - Number(dayMatch[1]) * 86_400_000;

  const weekMatch = label.match(/(\d+)\s*주\s*전/);
  if (weekMatch) return now.getTime() - Number(weekMatch[1]) * 7 * 86_400_000;

  if (label.includes("어제")) return now.getTime() - 86_400_000;

  const todayTimeMatch = label.match(/오늘\s*(\d{1,2}):(\d{2})/);
  if (todayTimeMatch) {
    const d = new Date(now);
    d.setHours(Number(todayTimeMatch[1]), Number(todayTimeMatch[2]), 0, 0);
    return d.getTime();
  }

  return 0;
}

function sortLiveOrdersByLatest(items: LiveOrderItem[]) {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ta = a.item.updatedAtMs ?? parseLabelToMs(a.item.updatedAtLabel);
      const tb = b.item.updatedAtMs ?? parseLabelToMs(b.item.updatedAtLabel);
      if (tb !== ta) return tb - ta;
      return a.index - b.index;
    })
    .map((x) => x.item);
}

function mapOrderToLiveItem(o: OrderResponse): LiveOrderItem {
  const updatedIso = o.updated ?? o.createdAt;
  const toHHmm = (v?: string) => {
    if (!v) return undefined;
    const normalized = v.includes("T") ? v : v.replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return "00:00";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  return {
    id: String(o.orderId),
    status: mapStatus(o.status),
    applicantsCount: Math.max(0, Math.floor(Number((o as any).applicantCount ?? 0) || 0)),
    isInstantDispatch: o.driveMode === "instant",
    pickupTypeLabel: o.startType || "당상",
    dropoffTypeLabel: o.endType || "당착",
    from: o.startAddr || o.startPlace || "-",
    to: o.endAddr || o.endPlace || "-",
    distanceKm: Math.round(o.distance ?? 0),
    cargoSummary: `${o.reqTonnage ?? ""} ${o.reqCarType ?? ""}`.trim() || o.cargoContent || "-",
    loadMethodShort: toLoadMethodShort(o.loadMethod),
    workToolShort: toWorkToolShort(o.workType),
    priceWon: o.basePrice ?? 0,
    updatedAtLabel: toRelativeLabel(updatedIso),
    updatedAtMs: toTimestampMs(updatedIso),
    pickupTimeHHmm: toHHmm(o.startSchedule),
    dropoffTimeHHmm: toHHmm(o.endSchedule),
    drivingStageLabel:
      o.status === "LOADING" ? "상차 완료" : o.status === "UNLOADING" ? "하차 직전" : "배달 중",
  };
}



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
      if (FORCE_MOCK_HOME_DATA) {
        setDisplayName("김화주");
        return () => {};
      }
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

  // 2. 서버에서 실시간 화주 오더 목록 로드 (로컬/Mock 제거 버전)
  useFocusEffect(
    React.useCallback(() => {
      if (FORCE_MOCK_HOME_DATA) {
        let active = true;
        setIsLoading(true);
        void (async () => {
          await hydrateLocalShipperOrders();
          const localRows = getLocalShipperOrders().map((item) => ({
            id: item.id,
            status:
              item.status === "CONFIRMED"
                ? ("DISPATCHED" as const)
                : item.status === "MATCHING"
                  ? ("MATCHING" as const)
                  : item.status === "DRIVING"
                    ? ("DRIVING" as const)
                    : ("DONE" as const),
            from: item.from,
            to: item.to,
            distanceKm: item.distanceKm,
            cargoSummary: item.cargoSummary,
            loadMethodShort: item.loadMethod ?? "-",
            workToolShort: item.workTool ?? "-",
            priceWon: item.priceWon,
            updatedAtLabel: item.updatedAtLabel,
            pickupTypeLabel: item.pickupTypeLabel,
            dropoffTypeLabel: item.dropoffTypeLabel,
            pickupTimeHHmm: item.pickupTimeHHmm,
            dropoffTimeHHmm: item.dropoffTimeHHmm,
          }));
          const mockRows = MOCK_SHIPPER_ORDERS.map((item, index) => ({
            ...item,
            applicantsCount: item.status === "MATCHING" ? ((index % 2) + 1) * 2 : 0,
          }));
          const merged = sortLiveOrdersByLatest([...localRows, ...mockRows] as LiveOrderItem[]);
          if (active) setLiveOrders(merged);
          if (active) setIsLoading(false);
        })();

        return () => {
          active = false;
        };
      }

      let active = true;
      setIsLoading(true);

      void (async () => {
        try {
          // 백엔드 API 호출: GET /api/v1/orders/my-shipper
          const data = await OrderApi.getMyShipperOrders();

          if (active) {
            // 서버 데이터를 UI용 모델로 변환하여 상태 저장
            const mapped = data.map((row) => mapOrderToLiveItem(row));
            setLiveOrders(mapped);
          }
        } catch (error) {
          console.error("화주 오더 목록 로드 실패:", error);
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
    const matching = liveOrders.filter((x) => x.status === "MATCHING").length;
    const driving = liveOrders.filter((x) => x.status === "DISPATCHED" || x.status === "DRIVING").length;
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
