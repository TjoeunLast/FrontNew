import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderApi } from "@/shared/api/orderService";
import type { OrderResponse } from "@/shared/models/order";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Card } from "@/shared/ui/base/Card";
import { Divider } from "@/shared/ui/base/Divider";
import { Badge } from "@/shared/ui/feedback/Badge";

function formatWon(v: number) {
  const s = Math.round(v).toString();
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

function toUiStatus(status: string) {
  if (status === "COMPLETED") return { label: "완료", tone: "complete" as const };
  if (status === "REQUESTED" || status === "PENDING") return { label: "배차 대기", tone: "warning" as const };
  return { label: "운송중", tone: "info" as const };
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

export default function Screen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
  const resolvedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const rows = await OrderApi.getAvailableOrders();
        if (!active) return;
        const found = rows.find((x) => String(x.orderId) === String(resolvedOrderId));
        setOrder(found ?? null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [resolvedOrderId]);

  const st = useMemo(() => (order ? toUiStatus(order.status) : null), [order]);

  if (loading) {
    return (
      <View style={[s.page, s.center, { backgroundColor: c.bg.canvas }]}>
        <Text style={[s.title, { color: c.text.primary }]}>불러오는 중...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[s.page, s.center, { backgroundColor: c.bg.canvas }]}>
        <Text style={[s.title, { color: c.text.primary }]}>주문을 찾을 수 없습니다.</Text>
        <Pressable onPress={() => router.back()} style={[s.backBtn, { borderColor: c.border.default }]}>
          <Text style={[s.backBtnText, { color: c.text.primary }]}>뒤로 가기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}> 
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topRow}>
          <Pressable onPress={() => router.back()} style={s.backIcon}>
            <Ionicons name="chevron-back" size={22} color={c.text.primary} />
          </Pressable>
          <Text style={[s.title, { color: c.text.primary }]}>운송 상세</Text>
          <View style={s.backIcon} />
        </View>

        <Card padding={16} style={[s.card, { backgroundColor: c.bg.surface }]}> 
          <View style={s.badgeRow}>
            <Badge label={st?.label ?? "-"} tone={st?.tone ?? "warning"} />
            <Text style={[s.updated, { color: c.text.secondary }]}>{toRelativeLabel(order.updated ?? order.createdAt)}</Text>
          </View>

          <View style={s.routeRow}>
            <Text style={[s.placeText, { color: c.text.primary }]}>{order.startAddr || order.startPlace || "-"}</Text>
            <Text style={[s.arrow, { color: c.text.secondary }]}>→</Text>
            <Text style={[s.placeText, { color: c.text.primary }]}>{order.endAddr || order.endPlace || "-"}</Text>
          </View>

          <Divider />

          <View style={s.metaRow}>
            <Text style={[s.metaLabel, { color: c.text.secondary }]}>거리</Text>
            <Text style={[s.metaValue, { color: c.text.primary }]}>{Math.round(order.distance ?? 0)}km</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={[s.metaLabel, { color: c.text.secondary }]}>화물</Text>
            <Text style={[s.metaValue, { color: c.text.primary }]}>
              {`${order.reqTonnage ?? ""} ${order.reqCarType ?? ""}`.trim() || order.cargoContent || "-"}
            </Text>
          </View>
          <View style={s.metaRow}>
            <Text style={[s.metaLabel, { color: c.text.secondary }]}>운임</Text>
            <Text style={[s.price, { color: c.text.primary }]}>{formatWon(order.basePrice ?? 0)}</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backIcon: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "900" },
  card: { borderRadius: 16 },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  updated: { fontSize: 12, fontWeight: "700" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  placeText: { fontSize: 16, fontWeight: "900" },
  arrow: { fontSize: 14, fontWeight: "900" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  metaLabel: { fontSize: 13, fontWeight: "700" },
  metaValue: { fontSize: 14, fontWeight: "900" },
  price: { fontSize: 18, fontWeight: "900" },
  backBtn: { marginTop: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  backBtnText: { fontSize: 13, fontWeight: "800" },
});
