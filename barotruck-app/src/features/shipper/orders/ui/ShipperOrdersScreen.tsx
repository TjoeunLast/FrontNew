import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type DispatchStatusKey } from "@/features/common/orders/ui/DispatchStatusBadge";
import { OrderApi } from "@/shared/api/orderService";
import { getLocalShipperOrders, hydrateLocalShipperOrders } from "@/features/shipper/home/model/localShipperOrders";
import { MOCK_SHIPPER_ORDERS } from "@/features/shipper/mock";
import type { OrderResponse } from "@/shared/models/order";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { RecommendedOrderCard } from "@/shared/ui/business/RecommendedOrderCard";

type DispatchTab = "WAITING" | "PROGRESS" | "DONE";

type DispatchCardItem = {
  id: string;
  tab: DispatchTab;
  isInstantDispatch?: boolean;
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
    const applicantsBase = Number.isFinite(applicantsNum) ? Math.max(0, Math.floor(applicantsNum)) : 0;
    const isInstantDispatch = Boolean(order.instant);
    const applicants = isInstantDispatch ? 0 : applicantsBase;
    return {
      id: String(order.orderId),
      isInstantDispatch,
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
      isInstantDispatch: Boolean(order.instant),
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
      isInstantDispatch: Boolean(order.instant),
      tab: "PROGRESS",
      statusLabel: "운송중",
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
      isInstantDispatch: Boolean(order.instant),
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
  return getLocalShipperOrders().map((item) => {
    if (item.status === "CONFIRMED") {
      return {
        id: item.id,
        isInstantDispatch: item.dispatchMode === "instant",
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
        isInstantDispatch: item.dispatchMode === "instant",
        tab: "PROGRESS",
        statusLabel: "운송중",
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
        drivingStageLabel: "배달 중",
      };
    }

    if (item.status === "DONE") {
      return {
        id: item.id,
        isInstantDispatch: item.dispatchMode === "instant",
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
      isInstantDispatch: item.dispatchMode === "instant",
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
        isInstantDispatch: item.isInstantDispatch,
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
        isInstantDispatch: item.isInstantDispatch,
        tab: "PROGRESS",
        statusLabel: "운송중",
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
        drivingStageLabel: "배달 중",
      };
    }

    if (item.status === "DONE") {
      return {
        id: item.id,
        isInstantDispatch: item.isInstantDispatch,
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
      isInstantDispatch: item.isInstantDispatch,
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

const FORCE_MOCK_DISPATCH_DATA =
  ["1", "true", "yes", "on"].includes(String(process.env.EXPO_PUBLIC_USE_SHIPPER_MOCK ?? "").trim().toLowerCase()) ||
  ["1", "true", "yes", "on"].includes(String(process.env.EXPO_PUBLIC_USE_MOCK ?? "").trim().toLowerCase());
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

  React.useEffect(() => {
    const resolved = Array.isArray(tabParam) ? tabParam[0] : tabParam;
    if (resolved === "WAITING" || resolved === "PROGRESS" || resolved === "DONE") {
      setTab(resolved);
    }
  }, [tabParam]);

  useFocusEffect(
    React.useCallback(() => {
      // MOCK 데이터 모드일 때는 기존 로직 유지 (테스트용)
      if (FORCE_MOCK_DISPATCH_DATA) {
        setCards(SHARED_MOCK_DISPATCH_CARDS); // 로컬 제외하고 Mock만
        return () => {};
      }

      let active = true;
      void (async () => {
        try {
          console.log("🔍 [1. API 요청 시작] /api/v1/orders/my-shipper");
          // 서버에서 실데이터만 가져옴 (로컬 로직 삭제)
          const rows = await OrderApi.getMyShipperOrders();
          
          if (!active) return;
          // 서버에서 들어온 생데이터(Raw Data) 구조 파악용 로그
          console.log("📦 [2. 서버 응답 성공] 데이터 개수:", rows.length);
          if (rows.length > 0) {
            console.log("📄 [3. 첫 번째 데이터 샘플]:", JSON.stringify(rows[0], null, 2));
            
            // 특정 필드들 집중 점검
            console.log("📅 createdAt 타입:", typeof rows[0].createdAt, "| 값:", rows[0].createdAt);
            console.log("🏷️ tag 타입:", Array.isArray(rows[0].tag) ? "Array" : typeof rows[0].tag, "| 값:", rows[0].tag);
          }


          // 서버 데이터 매핑 및 유효성 검사
          const serverMapped = rows
            .map(toUiCard)
            .filter((row): row is DispatchCardItem => row !== null);

          // 오직 서버 데이터만 상태에 저장
          setCards(serverMapped);
        } catch (error: any) {
        // 400 에러의 진짜 이유(서버가 보낸 메세지) 출력
        console.error("🔥 [API 에러 발생]");
        console.error("상태 코드:", error.response?.status);
        console.error("에러 데이터(서버 메세지):", JSON.stringify(error.response?.data, null, 2));
        
        if (error.response?.status === 400) {
          Alert.alert("데이터 오류", "서버 응답 형식이 올바르지 않습니다. 로그를 확인하세요.");
        }
        
        if (!active) return;
        setCards([]);
      }
    })();

    return () => { active = false; };
  }, [])
);

  const filtered = cards.filter((item) => item.tab === tab);
  const hasWaitingApplicants = cards.some(
    (item) => item.tab === "WAITING" && !item.isInstantDispatch && (item.applicants ?? 0) > 0
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
            { key: "PROGRESS" as const, label: "운송중" },
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
          const isWaitingWithApplicants = item.tab === "WAITING" && !item.isInstantDispatch && hasApplicants;
          const statusLabel =
            (item.tab === "PROGRESS" && isEtaUrgent ? "곧 도착" : item.drivingStageLabel)
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
              actionLabel={undefined}
              actionVariant={isDone ? "outline" : "primary"}
              onPressAction={undefined}
              onPress={() =>
                router.push(`/(common)/orders/${item.id}?applicants=${encodeURIComponent(String(item.applicants ?? 0))}` as any)
              }
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

    </View>
  );
}



