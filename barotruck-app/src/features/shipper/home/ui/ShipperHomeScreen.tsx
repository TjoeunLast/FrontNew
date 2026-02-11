import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderApi } from "@/shared/api/orderService";
import type { OrderResponse, OrderStatus } from "@/shared/models/order";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { Card } from "@/shared/ui/base/Card";
import { Divider } from "@/shared/ui/base/Divider";
import { IconButton } from "@/shared/ui/base/IconButton";
import { Badge } from "@/shared/ui/feedback/Badge";
import {
  getCurrentUserSnapshot,
  saveCurrentUserSnapshot,
} from "@/shared/utils/currentUserStorage";

type SummaryItem = {
  key: "matching" | "driving" | "done";
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
};

type LiveOrderItem = {
  id: string;
  status: "MATCHING" | "DRIVING" | "DONE";
  from: string;
  to: string;
  distanceKm: number;
  cargoSummary: string;
  priceWon: number;
  updatedAtLabel: string;
};
type StatusFilter = "ALL" | LiveOrderItem["status"];

function mapStatus(status: OrderStatus): LiveOrderItem["status"] {
  if (status === "COMPLETED") return "DONE";
  if (status === "REQUESTED" || status === "PENDING") return "MATCHING";
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

function mapOrderToLiveItem(o: OrderResponse): LiveOrderItem {
  return {
    id: String(o.orderId),
    status: mapStatus(o.status),
    from: o.startAddr || o.startPlace || "-",
    to: o.endAddr || o.endPlace || "-",
    distanceKm: Math.round(o.distance ?? 0),
    cargoSummary: `${o.reqTonnage ?? ""} ${o.reqCarType ?? ""}`.trim() || o.cargoContent || "-",
    priceWon: o.basePrice ?? 0,
    updatedAtLabel: toRelativeLabel(o.updated ?? o.createdAt),
  };
}

function formatWon(v: number) {
  const s = Math.round(v).toString();
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

function toneByStatus(s: LiveOrderItem["status"]) {
  if (s === "MATCHING") return "warning" as const;
  if (s === "DRIVING") return "info" as const;
  return "complete" as const;
}

function labelByStatus(s: LiveOrderItem["status"]) {
  if (s === "MATCHING") return "배차 대기";
  if (s === "DRIVING") return "운송중";
  return "완료";
}

export function ShipperHomeScreen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState("화주");
  const [liveOrders, setLiveOrders] = useState<LiveOrderItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showAll, setShowAll] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void (async () => {
        try {
          const me = await UserService.getMyInfo();
          if (!active) return;
          setDisplayName(me.nickname || "화주");
          await saveCurrentUserSnapshot({
            email: me.email,
            nickname: me.nickname,
            role: me.role,
          });
        } catch {
          const cached = await getCurrentUserSnapshot();
          if (!active) return;
          if (cached?.nickname) setDisplayName(cached.nickname);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void (async () => {
        try {
          const rows = await OrderApi.getAvailableOrders();
          if (!active) return;
          setLiveOrders(rows.map(mapOrderToLiveItem).slice(0, 50));
        } catch {
          if (!active) return;
          setLiveOrders([]);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const summary: SummaryItem[] = useMemo(() => {
    const matching = liveOrders.filter((x) => x.status === "MATCHING").length;
    const driving = liveOrders.filter((x) => x.status === "DRIVING").length;
    const done = liveOrders.filter((x) => x.status === "DONE").length;
    return [
      { key: "matching", label: "배차대기", value: matching, icon: "time-outline" },
      { key: "driving", label: "운송중", value: driving, icon: "car-outline" },
      { key: "done", label: "완료", value: done, icon: "checkmark-circle-outline" },
    ];
  }, [liveOrders]);

  const goCreateOrder = () => router.push("/(shipper)/create-order/step1-route" as any);

  const goNotificationsTab = () => router.push("/(shipper)/(tabs)/notifications" as any);

  const goOrderDetail = (id: string) => {
    router.push(`/(common)/orders/${id}` as any);
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return liveOrders;
    return liveOrders.filter((x) => x.status === statusFilter);
  }, [liveOrders, statusFilter]);

  const visibleOrders = useMemo(() => {
    if (showAll) return filteredOrders;
    return filteredOrders.slice(0, 3);
  }, [filteredOrders, showAll]);

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: Math.max(18, insets.top + 10) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topRow}>
          <Text style={[s.brandText, { color: c.brand.primary }]}>Baro Truck</Text>

          <View style={s.topActions}>
            <IconButton onPress={() => {}} variant="ghost">
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={c.text.primary} />
            </IconButton>

            <IconButton onPress={goNotificationsTab} variant="ghost">
              <Ionicons name="notifications-outline" size={18} color={c.text.primary} />
            </IconButton>
          </View>
        </View>

        <View style={s.hello}>
          <Text style={[s.helloSmall, { color: c.text.secondary }]}>오늘도 안전운송 하세요! 🚚</Text>
          <Text style={[s.helloName, { color: c.brand.primary }]}>{displayName}님,</Text>
          <Text style={[s.helloTitle, { color: c.text.primary }]}>화물 등록 하시나요?</Text>
        </View>

        <View style={s.summaryRow}>
          {summary.map((it) => {
            const iconBg =
              it.key === "matching"
                ? c.status.warningSoft
                : it.key === "driving"
                ? c.status.infoSoft
                : c.status.successSoft;

            const iconColor =
              it.key === "matching"
                ? c.status.warning
                : it.key === "driving"
                ? c.status.info
                : c.status.success;

            return (
              <Card
                key={it.key}
                padding={14}
                onPress={() => {
                  const next = it.key === "matching" ? "MATCHING" : it.key === "driving" ? "DRIVING" : "DONE";
                  setStatusFilter(next);
                  setShowAll(true);
                }}
                style={[
                  s.summaryCard,
                  {
                    backgroundColor: c.bg.surface,
                    borderColor:
                      (it.key === "matching" && statusFilter === "MATCHING") ||
                      (it.key === "driving" && statusFilter === "DRIVING") ||
                      (it.key === "done" && statusFilter === "DONE")
                        ? c.brand.primary
                        : c.border.default,
                  },
                ]}
              >
                <View style={s.summaryCenter}>
                  <View style={[s.summaryIconWrap, { backgroundColor: iconBg }]}>
                    <Ionicons name={it.icon} size={18} color={iconColor} />
                  </View>

                  <Text style={[s.summaryValue, { color: c.text.primary }]}>{it.value}</Text>
                  <Text style={[s.summaryLabel, { color: c.text.secondary }]}>{it.label}</Text>
                </View>
              </Card>
            );
          })}
        </View>

        <View style={s.ctaWrap}>
          <Button title="화물 등록하기" onPress={goCreateOrder} fullWidth />
        </View>

        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>실시간 운송 현황</Text>
          <Text
            style={[s.sectionLink, { color: c.text.secondary }]}
            onPress={() => setShowAll((v) => !v)}
          >
            {showAll ? "간단보기" : "전체보기"}
          </Text>
        </View>

        {statusFilter !== "ALL" ? (
          <Text
            style={[s.sectionLink, { color: c.brand.primary, marginBottom: 8 }]}
            onPress={() => setStatusFilter("ALL")}
          >
            필터 해제
          </Text>
        ) : null}

        {visibleOrders.map((o) => (
          <Card key={o.id} padding={16} style={s.orderCard} onPress={() => goOrderDetail(String(o.id))}>
            <View style={s.orderTopRow}>
              <Badge label={labelByStatus(o.status)} tone={toneByStatus(o.status)} />
              <View style={s.timeRow}>
                <Ionicons name="time-outline" size={12} color={c.text.secondary} />
                <Text style={[s.updatedAt, { color: c.text.secondary }]}>{o.updatedAtLabel}</Text>
              </View>
            </View>

            <View style={s.routeRow}>
              <Text style={[s.placeText, { color: c.text.primary }]}>{o.from}</Text>
              <Text style={[s.routeArrow, { color: c.text.secondary }]}>→</Text>
              <Text style={[s.placeText, { color: c.text.primary }]}>{o.to}</Text>

              <View style={[s.distancePill, { backgroundColor: c.brand.primarySoft }]}>
                <Text style={[s.distanceText, { color: c.brand.primary }]}>{o.distanceKm}km</Text>
              </View>
            </View>

            <Divider />

            <View style={s.metaRow}>
              <Text style={[s.cargo, { color: c.text.secondary }]}>{o.cargoSummary}</Text>
              <Text style={[s.price, { color: c.text.primary }]}>{formatWon(o.priceWon)}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  container: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  brandText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },

  hello: { marginBottom: 16 },
  helloSmall: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  helloName: { fontSize: 18, fontWeight: "900", marginBottom: 4 },
  helloTitle: { fontSize: 20, fontWeight: "900" },

  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 16, marginBottom: 0 },

  summaryCenter: { alignItems: "center", justifyContent: "center" },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryValue: { fontSize: 20, fontWeight: "900", marginBottom: 2 },
  summaryLabel: { fontSize: 12, fontWeight: "800" },

  ctaWrap: { marginBottom: 22 },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "900" },
  sectionLink: { fontSize: 12, fontWeight: "800" },

  orderCard: { borderRadius: 16, marginBottom: 12 },
  orderTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  updatedAt: { fontSize: 11, fontWeight: "800" },

  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  placeText: { fontSize: 14, fontWeight: "900" },
  routeArrow: { fontSize: 12, fontWeight: "900" },
  distancePill: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  distanceText: { fontSize: 11, fontWeight: "900" },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  cargo: { fontSize: 12, fontWeight: "800" },
  price: { fontSize: 16, fontWeight: "900" },
});
