import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { resolveShipperOrderStatus } from "@/features/shipper/order/lib/shipperOrderExpiry";
import { OrderApi } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse, OrderStatus } from "@/shared/models/order";
import { Badge } from "@/shared/ui/feedback/Badge";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

type StageItem = {
  key: string;
  label: string;
  description: string;
  statuses: OrderStatus[];
};

const STAGES: StageItem[] = [
  {
    key: "loading",
    label: "상차 중",
    description: "기사님이 상차 작업을 진행 중",
    statuses: ["LOADING"],
  },
  {
    key: "transit",
    label: "운송 중",
    description: "화물이 목적지로 이동 중",
    statuses: ["IN_TRANSIT"],
  },
  {
    key: "unloading",
    label: "하차 중",
    description: "도착 후 하차 작업 진행 중",
    statuses: ["UNLOADING"],
  },
  {
    key: "completed",
    label: "운송 완료",
    description: "운송이 정상적으로 완료됨",
    statuses: ["COMPLETED"],
  },
];

function normalizeDateLabel(value?: string) {
  if (!value) return "-";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getCurrentStageIndex(status?: OrderStatus) {
  if (!status || status === "ACCEPTED") return -1;
  return STAGES.findIndex((stage) => stage.statuses.includes(status));
}

function getStatusMeta(status?: OrderStatus) {
  switch (status) {
    case "REQUESTED":
    case "PENDING":
    case "APPLIED":
      return {
        badgeTone: "warning" as const,
        badgeText: "운송 준비 전",
        title: "운송이 아직 시작되지 않았습니다",
        description: "운송현황은 기사님이 상차를 시작한 뒤부터 단계별로 표시됩니다.",
      };
    case "ACCEPTED":
      return {
        badgeTone: "info" as const,
        badgeText: "운송 준비",
        title: "기사님이 운송 시작을 기다리는 중입니다",
        description: "상차가 시작되면 이 화면에 운송 단계가 표시됩니다.",
      };
    case "LOADING":
      return {
        badgeTone: "ongoing" as const,
        badgeText: "상차 중",
        title: "기사님이 상차 작업 중입니다",
        description: "현재 위치는 표시하지 않고 작업 상태만 제공합니다.",
      };
    case "IN_TRANSIT":
      return {
        badgeTone: "ongoing" as const,
        badgeText: "운송 중",
        title: "화물이 목적지로 이동 중입니다",
        description: "기사님이 하차지 도착 처리하면 다음 단계로 넘어갑니다.",
      };
    case "UNLOADING":
      return {
        badgeTone: "ongoing" as const,
        badgeText: "하차 중",
        title: "기사님이 하차 작업 중입니다",
        description: "하차 완료 처리 후 운송 완료 상태로 변경됩니다.",
      };
    case "COMPLETED":
      return {
        badgeTone: "success" as const,
        badgeText: "운송 완료",
        title: "운송이 완료되었습니다",
        description: "운송 상태 변경은 모두 반영된 상태입니다.",
      };
    case "CANCELLED":
      return {
        badgeTone: "cancel" as const,
        badgeText: "취소",
        title: "운송이 취소되었습니다",
        description: "취소된 오더는 더 이상 진행 상태가 변경되지 않습니다.",
      };
    default:
      return {
        badgeTone: "neutral" as const,
        badgeText: "상태 확인 중",
        title: "운송 상태를 확인 중입니다",
        description: "잠시 후 다시 확인해주세요.",
      };
  }
}

function StageRow({
  item,
  index,
  currentIndex,
}: {
  item: StageItem;
  index: number;
  currentIndex: number;
}) {
  const { colors: c } = useAppTheme();
  const isCompleted = currentIndex > index;
  const isCurrent = currentIndex === index;
  const iconBg = isCompleted ? c.status.success : isCurrent ? c.brand.primary : c.bg.muted;
  const iconColor = isCompleted || isCurrent ? c.text.inverse : c.text.secondary;
  const lineColor = currentIndex > index ? c.status.success : c.border.default;

  return (
    <View style={s.stageRow}>
      <View style={s.stageLeft}>
        <View style={[s.stageDot, { backgroundColor: iconBg }]}>
          {isCompleted ? (
            <Ionicons name="checkmark" size={16} color={iconColor} />
          ) : (
            <Text style={[s.stageIndex, { color: iconColor }]}>{index + 1}</Text>
          )}
        </View>
        {index < STAGES.length - 1 ? <View style={[s.stageLine, { backgroundColor: lineColor }]} /> : null}
      </View>
      <View
        style={[
          s.stageContent,
          {
            backgroundColor: isCurrent ? c.brand.primarySoft : c.bg.surface,
            borderColor: isCurrent ? c.brand.primary : c.border.default,
          },
        ]}
      >
        <View style={s.stageTitleRow}>
          <Text style={[s.stageTitle, { color: c.text.primary }]}>{item.label}</Text>
          {isCurrent ? <Badge label="현재" tone="info" /> : null}
          {isCompleted ? <Badge label="완료" tone="success" /> : null}
        </View>
        <Text style={[s.stageDescription, { color: c.text.secondary }]}>{item.description}</Text>
      </View>
    </View>
  );
}

export default function ShipperTransportStatusScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
  const resolvedOrderId = React.useMemo(() => {
    const raw = Array.isArray(orderId) ? orderId[0] : orderId;
    return Number(raw ?? "");
  }, [orderId]);

  const [loading, setLoading] = React.useState(true);
  const [order, setOrder] = React.useState<OrderResponse | null>(null);
  const displayStatus = React.useMemo(
    () => resolveShipperOrderStatus(order) ?? order?.status,
    [order],
  );

  const loadOrder = React.useCallback(async () => {
    if (!Number.isFinite(resolvedOrderId)) {
      setOrder(null);
      setLoading(false);
      return;
    }

    try {
      const orders = await OrderApi.getMyShipperOrders();
      const found = orders.find((item) => Number(item.orderId) === resolvedOrderId) ?? null;
      setOrder(found);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [resolvedOrderId]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      let timer: ReturnType<typeof setInterval> | null = null;

      setLoading(true);
      void loadOrder();

      timer = setInterval(() => {
        if (!active) return;
        void loadOrder();
      }, 3000);

      return () => {
        active = false;
        if (timer) clearInterval(timer);
      };
    }, [loadOrder])
  );

  const statusMeta = getStatusMeta(displayStatus);
  const currentStageIndex = getCurrentStageIndex(displayStatus);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
        <ShipperScreenHeader title="운송 현황" />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={c.brand.primary} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
        <ShipperScreenHeader title="운송 현황" />
        <View style={s.emptyWrap}>
          <MaterialCommunityIcons name="truck-alert-outline" size={40} color={c.text.secondary} />
          <Text style={[s.emptyTitle, { color: c.text.primary }]}>운송 정보를 찾을 수 없습니다</Text>
          <Text style={[s.emptyDescription, { color: c.text.secondary }]}>
            오더가 삭제되었거나 조회 대상이 아닐 수 있습니다.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
      <ShipperScreenHeader title="운송 현황" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}
      >
        <View style={[s.heroCard, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
          <View style={s.heroTop}>
            <Badge label={statusMeta.badgeText} tone={statusMeta.badgeTone} />
            <Text style={[s.updatedText, { color: c.text.secondary }]}>
              최근 반영 {normalizeDateLabel(order.updated ?? order.createdAt)}
            </Text>
          </View>
          <Text style={[s.heroTitle, { color: c.text.primary }]}>{statusMeta.title}</Text>
          <Text style={[s.heroDescription, { color: c.text.secondary }]}>{statusMeta.description}</Text>

          <View style={[s.noticeRow, { backgroundColor: c.bg.muted }]}>
            <Ionicons name="refresh-outline" size={16} color={c.brand.primary} />
            <Text style={[s.noticeText, { color: c.text.primary }]}>화면이 열려 있는 동안 3초마다 상태를 확인합니다.</Text>
          </View>
        </View>

        <View style={[s.card, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>진행 단계</Text>
          {STAGES.map((item, index) => (
            <StageRow key={item.key} item={item} index={index} currentIndex={currentStageIndex} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },
  emptyDescription: {
    marginTop: 6,
    fontSize: 14,
    textAlign: "center",
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  updatedText: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  heroTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "900",
  },
  heroDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeRow: {
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 16,
  },
  stageRow: {
    flexDirection: "row",
    gap: 12,
  },
  stageLeft: {
    width: 28,
    alignItems: "center",
  },
  stageDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stageIndex: {
    fontSize: 12,
    fontWeight: "800",
  },
  stageLine: {
    width: 2,
    flex: 1,
    marginTop: 6,
    marginBottom: 6,
  },
  stageContent: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  stageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  stageDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
});
