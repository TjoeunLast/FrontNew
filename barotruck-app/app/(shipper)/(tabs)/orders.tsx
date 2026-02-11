import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";

import { OrderApi } from "@/shared/api/orderService";
import type { OrderResponse } from "@/shared/models/order";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Card } from "@/shared/ui/base/Card";
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

export default function ShipperOrdersScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();
  const [orders, setOrders] = React.useState<OrderResponse[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void (async () => {
        try {
          const rows = await OrderApi.getAvailableOrders();
          if (!active) return;
          setOrders(rows);
        } catch {
          if (!active) return;
          setOrders([]);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: c.text.primary, fontSize: 20, fontWeight: "900", marginBottom: 12 }}>
          배차관리
        </Text>

        {!orders.length ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: c.border.default,
              borderRadius: 14,
              padding: 14,
              backgroundColor: c.bg.surface,
            }}
          >
            <Text style={{ color: c.text.secondary, fontWeight: "700" }}>서버 데이터가 없습니다.</Text>
          </View>
        ) : null}

        {orders.map((o) => {
          const st = toUiStatus(o.status);
          return (
            <Card
              key={o.orderId}
              padding={14}
              style={{ marginBottom: 10 }}
              onPress={() => router.push(`/(common)/orders/${o.orderId}` as any)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <Badge label={st.label} tone={st.tone} />
                <Text style={{ color: c.text.secondary, fontWeight: "700", fontSize: 12 }}>
                  {toRelativeLabel(o.updated ?? o.createdAt)}
                </Text>
              </View>

              <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 16 }}>
                {o.startAddr || o.startPlace || "-"} → {o.endAddr || o.endPlace || "-"}
              </Text>
              <Text style={{ color: c.text.secondary, fontWeight: "700", marginTop: 4 }}>
                {`${o.reqTonnage ?? ""} ${o.reqCarType ?? ""}`.trim() || o.cargoContent || "-"}
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                <Text style={{ color: c.text.secondary, fontWeight: "700" }}>{Math.round(o.distance ?? 0)}km</Text>
                <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 16 }}>{formatWon(o.basePrice ?? 0)}</Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}
