import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getLocalShipperOrders } from "@/features/shipper/home/model/localShipperOrders";
import { MOCK_SHIPPER_ORDERS, type ShipperMockOrder } from "@/features/shipper/home/model/mockShipperOrders";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse, OrderStatus } from "@/shared/models/order";
import { Button } from "@/shared/ui/base/Button";
import { Card } from "@/shared/ui/base/Card";
import { IconButton } from "@/shared/ui/base/IconButton";

// --- Types & Helpers (Existing Logic) ---

type SummaryItem = {
  key: "matching" | "driving" | "done";
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
};

type LiveOrderItem = ShipperMockOrder & {
  drivingStageLabel?: "상차 완료" | "배달 중" | "하차 직전";
};

const FORCE_MOCK_HOME_DATA = true;

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

function mapLocalToLiveItem(): LiveOrderItem[] {
  return getLocalShipperOrders().map((item) => {
    const status: LiveOrderItem["status"] = item.status === "CONFIRMED" ? "DISPATCHED" : item.status;
    return {
      id: item.id,
      status,
      isInstantDispatch: item.dispatchMode === "instant",
      pickupTypeLabel: item.pickupTypeLabel,
      dropoffTypeLabel: item.dropoffTypeLabel,
      from: item.from,
      to: item.to,
      distanceKm: item.distanceKm,
      cargoSummary: item.cargoSummary,
      loadMethodShort: toLoadMethodShort(item.loadMethod),
      workToolShort: toWorkToolShort(item.workTool),
      priceWon: item.priceWon,
      updatedAtLabel: item.updatedAtLabel,
      updatedAtMs: parseLabelToMs(item.updatedAtLabel),
      pickupTimeHHmm: item.pickupTimeHHmm,
      dropoffTimeHHmm: item.dropoffTimeHHmm,
      drivingStageLabel: status === "DRIVING" ? "배달 중" : undefined,
    };
  });
}

// --- Components ---

// 2번 사진 스타일의 미니 카드 컴포넌트
const HomeRecentOrderCard = ({ item, onPress }: { item: LiveOrderItem; onPress: () => void }) => {
  const t = useAppTheme();
  const c = t.colors;

  const badgeBg = "#E8F0FE";
  const badgeText = "#2563EB";
  const drivingStage =
    item.drivingStageLabel || (item.status === "DRIVING" ? "배달 중" : item.status === "DISPATCHED" ? "상차 완료" : "대기");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.orderCard,
        {
          backgroundColor: c.bg.surface,
          borderColor: c.border.default,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Header: Badge & Time */}
      <View style={s.cardHeader}>
        <View style={[s.badge, { backgroundColor: badgeBg }]}>
          <Text style={[s.badgeText, { color: badgeText }]}>운송</Text>
        </View>
        <Text style={[s.timeText, { color: c.text.secondary }]}>도착 예정 {item.dropoffTimeHHmm || "--:--"}</Text>
      </View>

      <View style={s.progressRow}>
        <Text style={[s.progressLabel, { color: c.text.secondary }]}>운송 현황</Text>
        <Text style={[s.progressValue, { color: c.text.primary }]}>{drivingStage}</Text>
      </View>

      {/* Route Info */}
      <View style={s.routeRow}>
        <View style={s.routeItem}>
          <Text style={[s.routeMetaLabel, { color: c.text.secondary }]}>상차지</Text>
          <Text style={[s.routeLabel, { color: c.text.primary }]}>{item.from}</Text>
        </View>
        
        {/* 화살표 및 거리 */}
        <View style={s.routeArrowWrap}>
          <View style={[s.distBadge, { backgroundColor: c.bg.canvas }]}>
             <Text style={[s.distText, { color: c.text.secondary }]}>{item.distanceKm}km</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={c.text.secondary} style={{marginTop: 4}} />
        </View>

        <View style={[s.routeItem, { alignItems: "flex-end" }]}>
          <Text style={[s.routeMetaLabel, { color: c.text.secondary }]}>하차지</Text>
          <Text style={[s.routeLabel, { color: c.text.primary }]}>{item.to}</Text>
        </View>
      </View>

    </Pressable>
  );
};

// --- Main Screen ---

export function ShipperHomeScreen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState("화주");
  const [liveOrders, setLiveOrders] = useState<LiveOrderItem[]>([]);

  // Data Fetching Logic (Same as original)
  useFocusEffect(
    React.useCallback(() => {
      if (FORCE_MOCK_HOME_DATA) {
        setDisplayName("화주");
        return;
      }
      void (async () => {
        try {
          const me = await UserService.getMyInfo();
          setDisplayName(me.nickname || "화주");
        } catch {}
      })();
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (FORCE_MOCK_HOME_DATA) {
        setLiveOrders([...mapLocalToLiveItem(), ...MOCK_SHIPPER_ORDERS]);
        return;
      }
      // ... API logic
    }, [])
  );

  const summary: SummaryItem[] = useMemo(() => {
    const matching = liveOrders.filter((x) => x.status === "MATCHING").length;
    const driving = liveOrders.filter((x) => x.status === "DISPATCHED" || x.status === "DRIVING").length;
    const done = liveOrders.filter((x) => x.status === "DONE").length;
    return [
      { key: "matching", label: "배차대기", value: matching, icon: "notifications-outline" },
      { key: "driving", label: "운송중", value: driving, icon: "navigate-outline" },
      { key: "done", label: "완료", value: done, icon: "flag-outline" },
    ];
  }, [liveOrders]);

  const goCreateOrder = () => router.push("/(shipper)/create-order/step1-route" as any);
  const goNotificationsTab = () => router.push("/(shipper)/(tabs)/notifications" as any);
  const goDispatchTab = (targetTab: "WAITING" | "PROGRESS" | "DONE") => {
    router.push({ pathname: "/(shipper)/(tabs)/orders", params: { tab: targetTab } } as any);
  };

  const recentOrders = useMemo(() => {
    return sortLiveOrdersByLatest(liveOrders)
      .filter((o) => o.status === "DRIVING")
      .slice(0, 2);
  }, [liveOrders]);
  const matchingCount = liveOrders.filter((o) => o.status === "MATCHING").length;
  const confirmedCount = liveOrders.filter((o) => o.status === "DISPATCHED").length;

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: Math.max(18, insets.top + 10) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topRow}>
          <Text style={s.brandText}>BAROTRUCK</Text>
          <View style={s.topActions}>
            <IconButton onPress={() => {}} variant="ghost">
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={c.text.primary} />
            </IconButton>
            <IconButton onPress={goNotificationsTab} variant="ghost">
              <Ionicons name="notifications-outline" size={20} color={c.text.primary} />
            </IconButton>
          </View>
        </View>
        <View style={s.summaryRow}>
          {summary.map((it) => {
            const iconColor =
              it.key === "matching" ? "#4F46E5" : it.key === "driving" ? "#0E7490" : "#64748B";
            const iconBg =
              it.key === "matching" ? "#EDE9FE" : it.key === "driving" ? "#E0F2FE" : "#F1F5F9";

            return (
              <Card
                key={it.key}
                padding={12}
                onPress={() => {
                   const nextTab = it.key === "matching" ? "WAITING" : it.key === "driving" ? "PROGRESS" : "DONE";
                   goDispatchTab(nextTab);
                }}
                style={[
                  s.summaryCard,
                  {
                    backgroundColor: c.bg.surface,
                    borderColor: c.border.default,
                    borderWidth: 1,
                  },
                ]}
              >
                <View style={s.summaryContent}>
                  <View style={[s.summaryIconCircle, { backgroundColor: iconBg }]}>
                    <Ionicons name={it.icon} size={20} color={iconColor} style={{ opacity: 0.95 }} />
                  </View>
                  <Text style={[s.summaryLabel, { color: c.text.secondary }]}>{it.label}</Text>
                  <View style={s.summaryValueRow}>
                     <Text style={[s.summaryValue, { color: c.text.primary }]}>{it.value}</Text>
                     <Text style={{fontSize:12, color: c.text.secondary, marginLeft: 2}}>건</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        <View style={s.ctaWrap}>
          <Button 
            title={`${displayName}님 화물 등록하기`} 
            onPress={goCreateOrder} 
            fullWidth
          />
        </View>

        {/* Recent Orders List (Replaced the text list) */}
        <View style={s.sectionHeader}>
           <Text style={[s.sectionTitle, { color: c.text.primary }]}>최근 배차 현황</Text>
           <Pressable onPress={() => goDispatchTab("WAITING")}>
             <Text style={{ color: c.text.secondary, fontSize: 13 }}>더보기</Text>
           </Pressable>
        </View>

        {recentOrders.length > 0 ? (
          <View style={{ gap: 12 }}>
            {recentOrders.map((item) => (
              <HomeRecentOrderCard 
                key={item.id} 
                item={item} 
                onPress={() => goDispatchTab("PROGRESS")}
              />
            ))}
          </View>
        ) : (
          <View style={[s.emptyState, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
             <Ionicons name="clipboard-outline" size={32} color={c.text.secondary} />
             <Text style={[s.emptyText, { color: c.text.secondary }]}>최근 배차 건이 없어요</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  brandText: { fontSize: 16, fontWeight: "900", color: "#4F46E5", letterSpacing: -0.2 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroCard: {
    borderRadius: 24,
    backgroundColor: "#5B61F6",
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 16, fontWeight: "900", color: "#FFFFFF", marginBottom: 6 },
  heroSub: { fontSize: 12, fontWeight: "700", color: "#E0E7FF" },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: { 
    flex: 1, 
    borderRadius: 16, 
    marginBottom: 0,
    alignItems: "center",
  },
  summaryContent: { alignItems: "center", justifyContent: "center", gap: 4 },
  summaryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  summaryLabel: { fontSize: 12, fontWeight: "700" },
  summaryValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  summaryValue: { fontSize: 24, fontWeight: "900", lineHeight: 26 },

  ctaWrap: { marginBottom: 18 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "900", lineHeight: 19 },

  // New Card Styles
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  progressLabel: { fontSize: 11, fontWeight: "700" },
  progressValue: { fontSize: 14, fontWeight: "900" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  timeText: { fontSize: 12, fontWeight: "700" },

  routeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  routeItem: { flex: 1 },
  routeMetaLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  routeLabel: { fontSize: 17, fontWeight: "900", marginBottom: 2 },
  routeSub: { fontSize: 11 },
  
  routeArrowWrap: { alignItems: 'center', justifyContent: 'center', width: 60 },
  distBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 2 },
  distText: { fontSize: 10, fontWeight: "600" },

  emptyState: { 
      padding: 30, alignItems: 'center', justifyContent: 'center', 
      borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, gap: 8 
  },
  emptyText: { fontSize: 14 }
});
