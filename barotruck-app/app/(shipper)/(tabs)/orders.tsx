import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type DispatchStatusKey } from "@/features/common/orders/ui/DispatchStatusBadge";
import { OrderApi } from "@/shared/api/orderService";
import { getLocalShipperOrders } from "@/features/shipper/home/model/localShipperOrders";
import { MOCK_SHIPPER_ORDERS } from "@/features/shipper/home/model/mockShipperOrders";
import type { OrderResponse } from "@/shared/models/order";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { RecommendedOrderCard } from "@/shared/ui/business/RecommendedOrderCard";

type DispatchTab = "WAITING" | "PROGRESS" | "DONE";

type ApplicantItem = {
  id: string;
  name: string;
  rating: number;
  detail: string;
  highlighted?: boolean;
};

type DispatchCardItem = {
  id: string;
  tab: DispatchTab;
  statusLabel: string;
  statusTone: "yellow" | "blue" | "green" | "gray";
  timeLabel: string;
  from: string;
  to: string;
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

function won(v: number) {
  const s = Math.max(0, Math.round(v)).toString();
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

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
  const normalized = schedule.includes("T") ? schedule : schedule.replace(" ", "T");
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

function toPlaceLabel(addr: string) {
  const parts = addr.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "-";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
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

function toUiCard(order: OrderResponse): DispatchCardItem | null {
  const from = order.startAddr || order.startPlace || "출발지 미정";
  const to = order.endAddr || order.endPlace || "도착지 미정";
  const cargoLabel = `${order.reqTonnage ?? ""} ${order.reqCarType ?? ""}`.trim() || order.cargoContent || "차량 정보 미정";
  const timeLabel = relativeLabel(order.updated ?? order.createdAt);
  const distanceKm = Math.round(order.distance ?? 0);
  const priceWon = order.basePrice ?? 0;
  const loadMethodShort = toLoadMethodShort(order.loadMethod);
  const workToolShort = toWorkToolShort(order.workType);

  if (order.status === "REQUESTED" || order.status === "PENDING") {
    const applicantsRaw = (order as any).applicantCount;
    const applicantsNum = Number(applicantsRaw);
    const applicants = Number.isFinite(applicantsNum) ? Math.max(0, Math.floor(applicantsNum)) : 0;
    return {
      id: String(order.orderId),
      tab: "WAITING",
      statusLabel: applicants > 1 ? `신청 ${applicants}명` : "대기중",
      statusTone: applicants > 1 ? "yellow" : "gray",
      timeLabel,
      from,
      to,
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
      tab: "WAITING",
      statusLabel: "배차완료",
      statusTone: "blue",
      timeLabel,
      from,
      to,
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
      tab: "PROGRESS",
      statusLabel: "운행중",
      statusTone: "blue",
      timeLabel,
      from,
      to,
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
        order.status === "LOADING" ? "상차중" : order.status === "UNLOADING" ? "하차중" : "배달 중",
    };
  }

  if (order.status === "COMPLETED") {
    return {
      id: String(order.orderId),
      tab: "DONE",
      statusLabel: "운행완료",
      statusTone: "gray",
      timeLabel: `어제 완료`,
      from,
      to,
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

  return null;
}

function mapLocalToDispatchCards(): DispatchCardItem[] {
  return getLocalShipperOrders().map((item, index) => {
    if (item.status === "CONFIRMED") {
      return {
        id: item.id,
        tab: "WAITING",
        statusLabel: "배차완료",
        statusTone: "blue",
        timeLabel: item.updatedAtLabel,
        from: item.from,
        to: item.to,
        distanceKm: item.distanceKm,
        pickupTimeHHmm: item.pickupTimeHHmm || "09:00",
        dropoffTimeHHmm: item.dropoffTimeHHmm || "15:00",
        cargoLabel: item.cargoSummary,
        loadMethodShort: toLoadMethodShort(item.loadMethod),
        workToolShort: toWorkToolShort(item.workTool),
        priceWon: item.priceWon,
        driverName: "선착순 배차",
        driverVehicle: item.cargoSummary,
      };
    }

    if (item.status === "DRIVING") {
      return {
        id: item.id,
        tab: "PROGRESS",
        statusLabel: "운행중",
        statusTone: "blue",
        timeLabel: item.updatedAtLabel,
        from: item.from,
        to: item.to,
        distanceKm: item.distanceKm,
        pickupTimeHHmm: item.pickupTimeHHmm || "09:00",
        dropoffTimeHHmm: item.dropoffTimeHHmm || "15:00",
        cargoLabel: item.cargoSummary,
        loadMethodShort: toLoadMethodShort(item.loadMethod),
        workToolShort: toWorkToolShort(item.workTool),
        priceWon: item.priceWon,
        driverName: "배차된 기사",
        driverVehicle: item.cargoSummary,
        drivingStageLabel: item.id.endsWith("u") ? "하차중" : item.id.endsWith("l") ? "상차중" : "배달 중",
      };
    }

    if (item.status === "DONE") {
      return {
        id: item.id,
        tab: "DONE",
        statusLabel: "운행완료",
        statusTone: "gray",
        timeLabel: item.updatedAtLabel,
        from: item.from,
        to: item.to,
        distanceKm: item.distanceKm,
        pickupTimeHHmm: item.pickupTimeHHmm || "09:00",
        dropoffTimeHHmm: item.dropoffTimeHHmm || "15:00",
        cargoLabel: item.cargoSummary,
        loadMethodShort: toLoadMethodShort(item.loadMethod),
        workToolShort: toWorkToolShort(item.workTool),
        priceWon: item.priceWon,
        receiptLabel: "인수증 확인",
      };
    }

    return {
      id: item.id,
      tab: "WAITING",
      statusLabel: "대기중",
      statusTone: "gray",
      timeLabel: item.updatedAtLabel,
      from: item.from,
      to: item.to,
      distanceKm: item.distanceKm,
      pickupTimeHHmm: item.pickupTimeHHmm || "09:00",
      dropoffTimeHHmm: item.dropoffTimeHHmm || "15:00",
      cargoLabel: item.cargoSummary,
      loadMethodShort: toLoadMethodShort(item.loadMethod),
      workToolShort: toWorkToolShort(item.workTool),
      priceWon: item.priceWon,
      applicants: 0,
    };
  });
}

function mapSharedMockToDispatchCards(): DispatchCardItem[] {
  return MOCK_SHIPPER_ORDERS.map((item, index) => {
    if (item.status === "DISPATCHED") {
      return {
        id: item.id,
        tab: "WAITING",
        statusLabel: "배차완료",
        statusTone: "blue",
        timeLabel: item.updatedAtLabel,
        from: item.from,
        to: item.to,
        distanceKm: item.distanceKm,
        pickupTimeHHmm: item.pickupTimeHHmm || "09:00",
        dropoffTimeHHmm: item.dropoffTimeHHmm || "15:00",
        cargoLabel: item.cargoSummary,
        loadMethodShort: item.loadMethodShort || "-",
        workToolShort: item.workToolShort || "-",
        priceWon: item.priceWon,
        driverName: "선착순 배차",
        driverVehicle: item.cargoSummary,
        pickupLabel: item.updatedAtLabel,
      };
    }

    if (item.status === "DRIVING") {
      return {
        id: item.id,
        tab: "PROGRESS",
        statusLabel: "운행중",
        statusTone: "blue",
        timeLabel: item.updatedAtLabel,
        from: item.from,
        to: item.to,
        distanceKm: item.distanceKm,
        pickupTimeHHmm: item.pickupTimeHHmm || "09:00",
        dropoffTimeHHmm: item.dropoffTimeHHmm || "15:00",
        cargoLabel: item.cargoSummary,
        loadMethodShort: item.loadMethodShort || "-",
        workToolShort: item.workToolShort || "-",
        priceWon: item.priceWon,
        driverName: "배차된 기사",
        driverVehicle: item.cargoSummary,
        pickupLabel: item.updatedAtLabel,
        drivingStageLabel: item.id === "m8" ? "하차중" : item.id === "m11" ? "상차중" : "배달 중",
      };
    }

    if (item.status === "DONE") {
      return {
        id: item.id,
        tab: "DONE",
        statusLabel: "운행완료",
        statusTone: "gray",
        timeLabel: item.updatedAtLabel,
        from: item.from,
        to: item.to,
        distanceKm: item.distanceKm,
        pickupTimeHHmm: item.pickupTimeHHmm || "09:00",
        dropoffTimeHHmm: item.dropoffTimeHHmm || "15:00",
        cargoLabel: item.cargoSummary,
        loadMethodShort: item.loadMethodShort || "-",
        workToolShort: item.workToolShort || "-",
        priceWon: item.priceWon,
        receiptLabel: "인수증 확인",
      };
    }

    const mockApplicants = index % 2 === 0 ? 3 : 2;
    return {
      id: item.id,
      tab: "WAITING",
      statusLabel: mockApplicants > 0 ? `신청 ${mockApplicants}명` : "대기중",
      statusTone: mockApplicants > 0 ? "yellow" : "gray",
      timeLabel: item.updatedAtLabel,
      from: item.from,
      to: item.to,
      distanceKm: item.distanceKm,
      pickupTimeHHmm: item.pickupTimeHHmm || "09:00",
      dropoffTimeHHmm: item.dropoffTimeHHmm || "15:00",
      cargoLabel: item.cargoSummary,
      loadMethodShort: item.loadMethodShort || "-",
      workToolShort: item.workToolShort || "-",
      priceWon: item.priceWon,
      applicants: mockApplicants,
    };
  });
}

const waitingApplicants: ApplicantItem[] = [
  { id: "a1", name: "박베테랑", rating: 4.9, detail: "11톤 윙바디 · 무사고 10년", highlighted: true },
  { id: "a2", name: "김신속", rating: 4.5, detail: "11톤 윙바디 · 거리 5km" },
  { id: "a3", name: "최성실", rating: 4.3, detail: "11톤 윙바디 · 거리 8km" },
];

const FORCE_MOCK_DISPATCH_DATA = false;
const SHARED_MOCK_DISPATCH_CARDS = mapSharedMockToDispatchCards();

function badgeStatusOf(item: DispatchCardItem): DispatchStatusKey {
  if (item.tab === "WAITING") {
    return item.statusLabel === "배차완료" ? "CONFIRMED" : "WAITING";
  }
  if (item.tab === "DONE") return "COMPLETED";
  return "DRIVING";
}

function toHomeStatusKey(item: DispatchCardItem): "MATCHING" | "DISPATCHED" | "DRIVING" | "DONE" {
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
  const [openApplicantModal, setOpenApplicantModal] = React.useState(false);
  const [selectedWaitingCardId, setSelectedWaitingCardId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const resolved = Array.isArray(tabParam) ? tabParam[0] : tabParam;
    if (resolved === "WAITING" || resolved === "PROGRESS" || resolved === "DONE") {
      setTab(resolved);
    }
  }, [tabParam]);

  useFocusEffect(
    React.useCallback(() => {
      if (FORCE_MOCK_DISPATCH_DATA) {
        setCards([...mapLocalToDispatchCards(), ...SHARED_MOCK_DISPATCH_CARDS]);
        return () => {};
      }

      let active = true;
      void (async () => {
        try {
          const rows = await OrderApi.getMyShipperOrders();
          if (!active) return;
          const mapped = rows.map(toUiCard).filter((row): row is DispatchCardItem => row !== null);
          setCards([...mapLocalToDispatchCards(), ...mapped]);
        } catch {
          if (!active) return;
          setCards([...mapLocalToDispatchCards()]);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const filtered = cards.filter((item) => item.tab === tab);
  const hasWaitingApplicants = cards.some((item) => item.tab === "WAITING" && (item.applicants ?? 0) > 0);
  const selectedWaitingCard =
    selectedWaitingCardId == null ? null : cards.find((item) => item.id === selectedWaitingCardId && item.tab === "WAITING");

  const openApplicantPicker = React.useCallback((cardId: string) => {
    setSelectedWaitingCardId(cardId);
    setOpenApplicantModal(true);
  }, []);

  const closeApplicantModal = React.useCallback(() => {
    setOpenApplicantModal(false);
    setSelectedWaitingCardId(null);
  }, []);

  const handleConfirmDriver = React.useCallback(
    (driver: ApplicantItem) => {
      if (!selectedWaitingCardId) return;
      setCards((prev) =>
        prev.map((item) => {
          if (item.id !== selectedWaitingCardId) return item;
          return {
            ...item,
            statusLabel: "배차완료",
            statusTone: "blue",
            applicants: 0,
            pickupLabel: "방금 배차 확정",
            driverName: driver.name,
            driverVehicle: item.cargoLabel,
          };
        })
      );
      closeApplicantModal();
      Alert.alert("배차 확정", `${driver.name} 기사님으로 배차를 확정했습니다.`);
    },
    [closeApplicantModal, selectedWaitingCardId]
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
      <View
        style={{
          backgroundColor: c.bg.surface,
          paddingTop: insets.top + 4,
          borderBottomWidth: 1,
          borderBottomColor: c.border.default,
        }}
      >
        <View style={{ borderBottomWidth: 1, borderBottomColor: c.border.default }}>
          <Text
            style={{
              color: c.text.primary,
              fontSize: 20,
              fontWeight: "900",
              textAlign: "center",
              paddingVertical: 8,
            }}
          >
            배차 관리
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            height: 46,
            borderTopWidth: 1,
            borderTopColor: c.border.default,
            borderBottomWidth: 1,
            borderBottomColor: c.border.default,
          }}
        >
          {[
            { key: "WAITING" as const, label: "배차" },
            { key: "PROGRESS" as const, label: "진행 중" },
            { key: "DONE" as const, label: "완료" },
          ].map((item) => {
            const active = tab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderBottomWidth: active ? 3 : 0,
                  borderBottomColor: active ? c.text.primary : "transparent",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ color: active ? c.text.primary : "#7C8698", fontWeight: "800", fontSize: 15 }}>
                    {item.label}
                  </Text>
                  {item.key === "WAITING" && hasWaitingApplicants ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#F97316",
                        marginLeft: 4,
                        marginTop: -12,
                      }}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => {
          const hasApplicants = (item.applicants ?? 0) > 0;
          const isUnloadingProgress = item.tab === "PROGRESS" && item.drivingStageLabel === "하차중";
          const isEtaUrgent = isUnloadingProgress || isWithinNextHour(item.dropoffTimeHHmm);
          const isWaitingWithApplicants = item.tab === "WAITING" && hasApplicants;
          const statusLabel =
            item.drivingStageLabel
            || (item.tab === "PROGRESS" ? "배달 중" : item.tab === "DONE" ? "완료" : item.statusLabel === "배차완료" ? "상차 완료" : "대기");
          const isDone = item.tab === "DONE";

          return (
            <RecommendedOrderCard
              key={item.id}
              statusKey={toHomeStatusKey(item)}
              from={item.from}
              to={item.to}
              distanceKm={item.distanceKm}
              statusLabel={statusLabel}
              etaHHmm={item.dropoffTimeHHmm}
              isEtaUrgent={isEtaUrgent}
              isHighlighted={isWaitingWithApplicants}
              actionLabel={isWaitingWithApplicants ? "기사 선택하기" : isDone ? "기사 평점 남기기" : undefined}
              actionVariant={isDone ? "outline" : "primary"}
              onPressAction={
                isWaitingWithApplicants
                  ? () => openApplicantPicker(item.id)
                  : isDone
                    ? () => Alert.alert("준비 중", "기사 평점 모달을 연결해주세요.")
                    : undefined
              }
              onPress={() => router.push(`/(common)/orders/${item.id}` as any)}
            />
          );
        })}

        {!filtered.length ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: c.border.default,
              borderRadius: 14,
              padding: 16,
              backgroundColor: c.bg.surface,
            }}
          >
            <Text style={{ color: c.text.secondary, fontWeight: "700" }}>표시할 배차가 없습니다.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={openApplicantModal} transparent animationType="fade" onRequestClose={closeApplicantModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "center", padding: 10 }}>
          <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: c.bg.surface }}>
            <View
              style={{
                height: 72,
                borderBottomWidth: 1,
                borderBottomColor: c.border.default,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: c.text.primary, fontSize: 24, fontWeight: "900" }}>
                배차 신청 ({selectedWaitingCard?.applicants ?? waitingApplicants.length}명)
              </Text>
              <Pressable onPress={closeApplicantModal}>
                <Ionicons name="close" size={28} color={c.text.primary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 14, maxHeight: 430 }}>
              {waitingApplicants.map((driver) => (
                <View
                  key={driver.id}
                  style={{
                    borderWidth: 1,
                    borderColor: driver.highlighted ? c.brand.primary : c.border.default,
                    borderRadius: 16,
                    padding: 12,
                    marginBottom: 12,
                    backgroundColor: c.bg.surface,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: driver.highlighted ? "#F5EBCD" : "#E2E8F0",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <Ionicons
                        name={driver.highlighted ? "trophy-outline" : "person-outline"}
                        size={16}
                        color={driver.highlighted ? "#B45309" : c.text.primary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 17 }}>
                        {driver.name}
                        <Text style={{ color: "#B45309", fontWeight: "900" }}> {driver.rating.toFixed(1)}</Text>
                      </Text>
                      <Text style={{ color: c.text.secondary, fontWeight: "700", marginTop: 2 }}>{driver.detail}</Text>
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: c.border.default, marginVertical: 12 }} />

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 18, flex: 1 }}>{won(350000)}</Text>
                    <Pressable
                      onPress={() => Alert.alert("준비 중", "채팅 화면을 연결해주세요.")}
                      style={{
                        width: 78,
                        height: 40,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: c.border.default,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ color: c.text.secondary, fontWeight: "800", fontSize: 14 }}>채팅</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleConfirmDriver(driver)}
                      style={{
                        width: 86,
                        height: 40,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: c.brand.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: c.brand.primary, fontWeight: "900", fontSize: 14 }}>배차 확정</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}



