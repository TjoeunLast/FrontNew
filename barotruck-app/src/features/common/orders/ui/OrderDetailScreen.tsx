import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DispatchStatusBadge, type DispatchStatusKey } from "@/features/common/orders/ui/DispatchStatusBadge";
import { OrderApi } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import { Card } from "@/shared/ui/base/Card";

function formatWon(v?: number) {
  return `${Number(v ?? 0).toLocaleString()}원`;
}

function toHHmm(v?: string) {
  if (!v) return "-";
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const m = v.match(/(\d{2}:\d{2})/);
  return m ? m[1] : v;
}

function statusKeyOf(status?: string): DispatchStatusKey {
  if (status === "REQUESTED" || status === "PENDING") return "WAITING";
  if (status === "ACCEPTED") return "CONFIRMED";
  if (status === "COMPLETED") return "COMPLETED";
  return "DRIVING";
}

function shortAddr(addr?: string) {
  const parts = String(addr ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "-";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>();

  const resolvedOrderId = useMemo(() => {
    const raw = Array.isArray(orderId) ? orderId[0] : orderId;
    return String(raw ?? "").trim();
  }, [orderId]);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderResponse | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const idNum = Number(resolvedOrderId);
        if (!Number.isFinite(idNum)) {
          if (active) setOrder(null);
          return;
        }

        const myOrders = await OrderApi.getMyShipperOrders().catch(() => [] as OrderResponse[]);
        let found = myOrders.find((x) => Number(x.orderId) === idNum) ?? null;

        if (!found) {
          const available = await OrderApi.getAvailableOrders().catch(() => [] as OrderResponse[]);
          found = available.find((x) => Number(x.orderId) === idNum) ?? null;
        }

        if (active) setOrder(found);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [resolvedOrderId]);

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: c.border.default, backgroundColor: c.bg.surface }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: c.text.primary }]}>오더 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <Text style={{ color: c.text.secondary, fontWeight: "700" }}>불러오는 중...</Text>
        </View>
      ) : !order ? (
        <View style={s.center}>
          <Text style={{ color: c.text.primary, fontWeight: "800" }}>해당 오더를 찾을 수 없습니다.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }} showsVerticalScrollIndicator={false}>
          <Card style={s.mainCard}>
            <View style={s.mainTop}>
              <DispatchStatusBadge status={statusKeyOf(order.status)} />
              <Text style={[s.orderNo, { color: c.text.secondary }]}>#{order.orderId}</Text>
            </View>

            <View style={s.routeRow}>
              <View style={s.addrBlock}>
                <Text style={[s.addrLabel, { color: c.text.secondary }]}>상차지</Text>
                <Text style={[s.addrTitle, { color: c.text.primary }]}>{shortAddr(order.startAddr)}</Text>
                <Text style={[s.addrSub, { color: c.text.secondary }]} numberOfLines={1}>
                  {order.startAddr || "-"}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#CBD5E1" />
              <View style={[s.addrBlock, { alignItems: "flex-end" }]}>
                <Text style={[s.addrLabel, { color: c.text.secondary }]}>하차지</Text>
                <Text style={[s.addrTitle, { color: c.text.primary }]}>{shortAddr(order.endAddr)}</Text>
                <Text style={[s.addrSub, { color: c.text.secondary }]} numberOfLines={1}>
                  {order.endAddr || "-"}
                </Text>
              </View>
            </View>

            <View style={[s.metaBar, { backgroundColor: c.bg.canvas }]}>
              <Text style={[s.metaText, { color: c.text.secondary }]}>상차 {toHHmm(order.startSchedule)}</Text>
              <Text style={[s.metaText, { color: c.text.secondary }]}>하차 {toHHmm(order.endSchedule)}</Text>
              <Text style={[s.metaText, { color: c.text.secondary }]}>{Math.round(order.distance || 0)}km</Text>
            </View>
          </Card>

          <Card>
            <Text style={[s.sectionTitle, { color: c.text.primary }]}>화물 정보</Text>
            <DetailRow label="차량" value={`${order.reqTonnage || ""} ${order.reqCarType || ""}`.trim() || "-"} />
            <DetailRow label="운행 형태" value={order.driveMode || "-"} />
            <DetailRow label="상차 방식" value={order.loadMethod || "-"} />
            <DetailRow label="작업 방식" value={order.workType || "-"} />
          </Card>

          <Card>
            <Text style={[s.sectionTitle, { color: c.text.primary }]}>요청 사항</Text>
            <Text style={[s.memo, { color: c.text.secondary }]}>{order.cargoContent?.trim() || "요청사항 없음"}</Text>
          </Card>

          <Card>
            <Text style={[s.sectionTitle, { color: c.text.primary }]}>운임 정보</Text>
            <DetailRow label="기본 운임" value={formatWon(order.basePrice)} />
            <DetailRow label="수작업비" value={formatWon(order.laborFee)} />
            <DetailRow label="포장비" value={formatWon(order.packagingPrice)} />
            <DetailRow label="결제 방식" value={order.payMethod || "-"} />
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "900" },
  mainCard: { marginBottom: 14 },
  mainTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  orderNo: { fontSize: 12, fontWeight: "700" },
  routeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  addrBlock: { flex: 1 },
  addrLabel: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  addrTitle: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  addrSub: { fontSize: 12, fontWeight: "600" },
  metaBar: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between" },
  metaText: { fontSize: 12, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "900", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 },
  rowLabel: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  rowValue: { flex: 1, textAlign: "right", fontSize: 14, fontWeight: "800", color: "#0F172A" },
  memo: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
});
