import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type DispatchStatusKey } from "@/features/shipper/order/ui/DispatchStatusBadge";
import { OrderApi } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import { RecommendedOrderCard } from "@/shared/ui/business/RecommendedOrderCard";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { Ionicons } from "@expo/vector-icons";

type DispatchTab = "WAITING" | "PROGRESS" | "DONE" | "CANCEL";

type DispatchCardItem = {
  id: string;
  tab: DispatchTab;
  isInstantDispatch?: boolean;
  statusLabel: string;
  statusTone: "yellow" | "blue" | "green" | "gray";
  timeLabel: string;
  from: string;
  to: string;
  fromDetail?: string;
  toDetail?: string;
  distanceKm: number;
  pickupTimeHHmm?: string;
  dropoffTimeHHmm?: string;
  cargoLabel: string;
  loadMethodShort?: string;
  workToolShort?: string;
  priceWon: number;
  applicants?: number;
  pickupLabel?: string;
  driverName?: string;
  driverVehicle?: string;
  receiptLabel?: string;
  drivingStageLabel?: "상차중" | "배달 중" | "하차중";
};

function relativeLabel(iso?: string) {
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

function scheduleLabel(schedule?: string) {
  if (!schedule) return "오늘 상차";
  const normalized = schedule.includes("T")
    ? schedule
    : schedule.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "오늘 상차";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `오늘 ${hh}:${mm} 상차`;
}

function toHHmm(v?: string) {
  if (!v) return undefined;
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const m = v.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  return undefined;
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

function resolveApplicants(order: OrderResponse) {
  const applicantsRaw = Number((order as any).applicantCount);
  const applicants = Number.isFinite(applicantsRaw)
    ? Math.max(0, Math.floor(applicantsRaw))
    : 0;
  return order.instant ? 0 : applicants;
}

function toUiCard(order: OrderResponse): DispatchCardItem | null {
  const from = order.startAddr || order.startPlace || "출발지 미정";
  const to = order.endAddr || order.endPlace || "도착지 미정";
  const fromDetail = order.startPlace || "";
  const toDetail = order.endPlace || "";
  const cargoLabel =
    `${order.reqTonnage ?? ""} ${order.reqCarType ?? ""}`.trim() ||
    order.cargoContent ||
    "차량 정보 미정";
  const timeLabel = relativeLabel(order.updated ?? order.createdAt);
  const distanceKm = Math.round(order.distance ?? 0);
  const priceWon = order.basePrice ?? 0;
  const loadMethodShort = toLoadMethodShort(order.loadMethod);
  const workToolShort = toWorkToolShort(order.workType);

  if (
    order.status === "REQUESTED" ||
    order.status === "PENDING" ||
    order.status === "APPLIED"
  ) {
    const applicants = resolveApplicants(order);
    return {
      id: String(order.orderId),
      isInstantDispatch: Boolean(order.instant),
      tab: "WAITING",
      statusLabel: applicants > 0 ? `신청 ${applicants}명` : "대기중",
      statusTone: applicants > 0 ? "yellow" : "gray",
      timeLabel,
      from,
      to,
      fromDetail,
      toDetail,
      distanceKm,
      pickupTimeHHmm: toHHmm(order.startSchedule),
      dropoffTimeHHmm: toHHmm(order.endSchedule),
      cargoLabel,
      loadMethodShort,
      workToolShort,
      priceWon,
      applicants,
    };
  }

  if (order.status === "ACCEPTED") {
    return {
      id: String(order.orderId),
      isInstantDispatch: Boolean(order.instant),
      tab: "WAITING",
      statusLabel: "배차완료",
      statusTone: "blue",
      timeLabel,
      from,
      to,
      fromDetail,
      toDetail,
      distanceKm,
      pickupTimeHHmm: toHHmm(order.startSchedule),
      dropoffTimeHHmm: toHHmm(order.endSchedule),
      cargoLabel,
      loadMethodShort,
      workToolShort,
      priceWon,
      pickupLabel: scheduleLabel(order.startSchedule),
      driverName: order.user?.nickname || "김기사",
      driverVehicle: cargoLabel,
    };
  }

  if (["LOADING", "IN_TRANSIT", "UNLOADING"].includes(order.status)) {
    return {
      id: String(order.orderId),
      isInstantDispatch: Boolean(order.instant),
      tab: "PROGRESS",
      statusLabel: "운송중",
      statusTone: "blue",
      timeLabel,
      from,
      to,
      fromDetail,
      toDetail,
      distanceKm,
      pickupTimeHHmm: toHHmm(order.startSchedule),
      dropoffTimeHHmm: toHHmm(order.endSchedule),
      cargoLabel,
      loadMethodShort,
      workToolShort,
      priceWon,
      pickupLabel: scheduleLabel(order.startSchedule),
      driverName: order.user?.nickname || "김기사",
      driverVehicle: cargoLabel,
      drivingStageLabel:
        order.status === "LOADING"
          ? "상차중"
          : order.status === "UNLOADING"
            ? "하차중"
            : "배달 중",
    };
  }

  if (order.status === "COMPLETED") {
    return {
      id: String(order.orderId),
      isInstantDispatch: Boolean(order.instant),
      tab: "DONE",
      statusLabel: "운행완료",
      statusTone: "gray",
      timeLabel: `어제 완료`,
      from,
      to,
      fromDetail,
      toDetail,
      distanceKm,
      pickupTimeHHmm: toHHmm(order.startSchedule),
      dropoffTimeHHmm: toHHmm(order.endSchedule),
      cargoLabel,
      loadMethodShort,
      workToolShort,
      priceWon,
      receiptLabel: "인수증 확인",
    };
  }

  if (order.status === "CANCELLED") {
    const applicants = resolveApplicants(order);
    if (applicants > 0) return null;
    return {
      id: String(order.orderId),
      isInstantDispatch: Boolean(order.instant),
      tab: "CANCEL",
      statusLabel: "기간만료 취소",
      statusTone: "gray",
      timeLabel,
      from,
      to,
      fromDetail,
      toDetail,
      distanceKm,
      pickupTimeHHmm: toHHmm(order.startSchedule),
      dropoffTimeHHmm: toHHmm(order.endSchedule),
      cargoLabel,
      loadMethodShort,
      workToolShort,
      priceWon,
      applicants,
    };
  }

  return null;
}

function badgeStatusOf(item: DispatchCardItem): DispatchStatusKey {
  if (item.tab === "WAITING") {
    return item.statusLabel === "배차완료" ? "CONFIRMED" : "WAITING";
  }
  if (item.tab === "DONE") return "COMPLETED";
  return "DRIVING";
}

function toHomeStatusKey(
  item: DispatchCardItem,
): "MATCHING" | "DISPATCHED" | "DRIVING" | "DONE" | "CANCELLED" {
  if (item.tab === "CANCEL") return "CANCELLED";
  const k = badgeStatusOf(item);
  if (k === "WAITING") return "MATCHING";
  if (k === "CONFIRMED") return "DISPATCHED";
  if (k === "DRIVING") return "DRIVING";
  return "DONE";
}

export default function ShipperOrdersScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string | string[] }>();

  const [tab, setTab] = React.useState<DispatchTab>("WAITING");
  const [cards, setCards] = React.useState<DispatchCardItem[]>([]);

  React.useEffect(() => {
    const resolved = Array.isArray(tabParam) ? tabParam[0] : tabParam;
    if (
      resolved === "WAITING" ||
      resolved === "PROGRESS" ||
      resolved === "DONE" ||
      resolved === "CANCEL"
    ) {
      setTab(resolved as DispatchTab);
    }
  }, [tabParam]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void (async () => {
        try {
          const rows = await OrderApi.getMyShipperOrders();
          if (!active) return;
          const serverMapped = rows
            .map(toUiCard)
            .filter((row): row is DispatchCardItem => row !== null);
          setCards(serverMapped);
        } catch (error: any) {
          if (!active) return;
          setCards([]);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const filtered = cards.filter((item) => item.tab === tab);
  const hasWaitingApplicants = cards.some(
    (item) =>
      item.tab === "WAITING" &&
      !item.isInstantDispatch &&
      (item.applicants ?? 0) > 0,
  );

  const renderCard = (item: DispatchCardItem) => {
    const hasApplicants = (item.applicants ?? 0) > 0;
    const isUnloadingProgress =
      item.tab === "PROGRESS" && item.drivingStageLabel === "하차중";
    const isEtaUrgent =
      isUnloadingProgress || isWithinNextHour(item.dropoffTimeHHmm);
    const isWaitingWithApplicants =
      item.tab === "WAITING" && !item.isInstantDispatch && hasApplicants;
    const statusLabel =
      (item.tab === "PROGRESS" && isEtaUrgent
        ? "곧 도착"
        : item.drivingStageLabel) ||
      (item.tab === "PROGRESS"
        ? "배달 중"
        : item.tab === "DONE"
          ? "완료"
          : item.tab === "CANCEL"
            ? "기간만료 자동취소"
            : item.statusLabel === "배차완료"
              ? "배차 완료"
              : "대기");
    const isDone = item.tab === "DONE" || item.tab === "CANCEL";

    return (
      <RecommendedOrderCard
        key={item.id}
        statusKey={toHomeStatusKey(item)}
        from={item.from}
        to={item.to}
        fromDetail={item.fromDetail}
        toDetail={item.toDetail}
        distanceKm={item.distanceKm}
        statusLabel={statusLabel}
        etaHHmm={item.dropoffTimeHHmm}
        isEtaUrgent={isEtaUrgent}
        isHighlighted={isWaitingWithApplicants}
        actionLabel={undefined}
        actionVariant={isDone ? "outline" : "primary"}
        onPressAction={undefined}
        onPress={() =>
          router.push(
            `/(common)/orders/${item.id}?applicants=${encodeURIComponent(
              String(item.applicants ?? 0),
            )}` as any,
          )
        }
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ShipperScreenHeader title="배차 관리" hideBackButton />

      <View style={s.tabHeader}>
        {[
          { key: "WAITING" as const, label: "배차" },
          { key: "PROGRESS" as const, label: "운송중" },
          { key: "DONE" as const, label: "완료" },
          { key: "CANCEL" as const, label: "취소" },
        ].map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[s.tabItem, active && s.activeTab]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={[
                    s.tabText,
                    active && s.activeText,
                    !active && { color: "#94A3B8" },
                  ]}
                >
                  {item.label}
                </Text>
                {item.key === "WAITING" && hasWaitingApplicants ? (
                  <View style={s.redDot} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {tab === "WAITING" && filtered.length > 0 ? (
          <>
            {filtered.filter((item) => item.statusLabel === "배차완료").length >
              0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={[s.indicator, { backgroundColor: "#4E46E5" }]} />
                  <Text style={[s.sectionTitle, { color: "#4E46E5" }]}>
                    배차 완료 (
                    {
                      filtered.filter((item) => item.statusLabel === "배차완료")
                        .length
                    }
                    )
                  </Text>
                </View>
                {filtered
                  .filter((item) => item.statusLabel === "배차완료")
                  .map(renderCard)}
              </View>
            )}

            {filtered.filter(
              (item) =>
                item.statusLabel !== "배차완료" && (item.applicants ?? 0) > 0,
            ).length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <View
                    style={[s.indicator, { backgroundColor: c.status.warning }]}
                  />
                  <Text style={[s.sectionTitle, { color: c.status.warning }]}>
                    승인 대기 (
                    {
                      filtered.filter(
                        (item) =>
                          item.statusLabel !== "배차완료" &&
                          (item.applicants ?? 0) > 0,
                      ).length
                    }
                    )
                  </Text>
                </View>
                {filtered
                  .filter(
                    (item) =>
                      item.statusLabel !== "배차완료" &&
                      (item.applicants ?? 0) > 0,
                  )
                  .map(renderCard)}
              </View>
            )}

            {filtered.filter(
              (item) =>
                item.statusLabel !== "배차완료" && (item.applicants ?? 0) === 0,
            ).length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <View
                    style={[s.indicator, { backgroundColor: c.status.warning }]}
                  />
                  <Text style={[s.sectionTitle, { color: c.status.warning }]}>
                    배차 대기 (
                    {
                      filtered.filter(
                        (item) =>
                          item.statusLabel !== "배차완료" &&
                          (item.applicants ?? 0) === 0,
                      ).length
                    }
                    )
                  </Text>
                </View>
                {filtered
                  .filter(
                    (item) =>
                      item.statusLabel !== "배차완료" &&
                      (item.applicants ?? 0) === 0,
                  )
                  .map(renderCard)}
              </View>
            )}
          </>
        ) : (
          filtered.map(renderCard)
        )}

        {!filtered.length ? (
          <View style={s.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={s.emptyText}>표시할 배차가 없습니다.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tabHeader: {
    flexDirection: "row",
    height: 52,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#4E46E5",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeText: {
    color: "#1E293B",
    fontWeight: "800",
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F97316",
    marginLeft: 4,
    marginTop: -10,
  },
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 4,
  },
  indicator: {
    width: 4,
    height: 14,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyCard: {
    paddingVertical: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
});
