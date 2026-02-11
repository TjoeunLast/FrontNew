import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { Card } from "@/shared/ui/base/Card";
import { Divider } from "@/shared/ui/base/Divider";
import { IconButton } from "@/shared/ui/base/IconButton";
import { Badge } from "@/shared/ui/feedback/Badge";

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

  const name = "김화주"; // TODO: authStore 연결 시 교체

  const summary: SummaryItem[] = useMemo(
    () => [
      { key: "matching", label: "배차대기", value: 1, icon: "time-outline" },
      { key: "driving", label: "운송중", value: 2, icon: "car-outline" },
      { key: "done", label: "완료", value: 15, icon: "checkmark-circle-outline" },
    ],
    []
  );

  const liveOrders: LiveOrderItem[] = useMemo(
    () => [
      {
        id: "o1",
        status: "MATCHING",
        from: "서울 강남",
        to: "부산 해운대",
        distanceKm: 340,
        cargoSummary: "11톤 윙바디 · 독차",
        priceWon: 350000,
        updatedAtLabel: "10분 전",
      },
      {
        id: "o2",
        status: "DRIVING",
        from: "인천 남동",
        to: "대전 유성",
        distanceKm: 120,
        cargoSummary: "5톤 카고 · 혼적",
        priceWon: 180000,
        updatedAtLabel: "1일 전",
      },
      {
        id: "o3",
        status: "DRIVING",
        from: "경기 수원",
        to: "서울 종로",
        distanceKm: 45,
        cargoSummary: "1톤 카고 · 독차",
        priceWon: 60000,
        updatedAtLabel: "1일 전",
      },
    ],
    []
  );

  const goCreateOrder = () => router.push("/(shipper)/create-order/step1-route");
  const goOrdersTab = () => router.push("/(shipper)/(tabs)/orders");
  const goNotificationsTab = () => router.push("/(shipper)/(tabs)/notifications");

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Top Row */}
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

        {/* Greeting */}
        <View style={s.hello}>
          <Text style={[s.helloSmall, { color: c.text.secondary }]}>오늘도 안전운송 하세요! 🚚</Text>
          <Text style={[s.helloName, { color: c.brand.primary }]}>{name}님,</Text>
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
              <Card key={it.key} padding={14} style={[s.summaryCard, { backgroundColor: c.bg.surface }]}>
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

        {/* CTA */}
        <View style={s.ctaWrap}>
          <Button title="화물 등록하기" onPress={goCreateOrder} fullWidth />
        </View>

        {/* Section Header */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>실시간 운송 현황</Text>
          <Text style={[s.sectionLink, { color: c.text.secondary }]} onPress={goOrdersTab}>
            전체보기
          </Text>
        </View>

        {/* Live Cards */}
        {liveOrders.slice(0, 3).map((o) => (
          <Card
            key={o.id}
            padding={16}
            style={s.orderCard}
            onPress={() => router.push(`/(common)/orders/${String(o.id)}`)}
          >
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
