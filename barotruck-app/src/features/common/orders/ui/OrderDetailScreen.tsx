import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PRESET_REQUEST_TAGS } from "@/features/shipper/create-order/ui/createOrderStep1.constants";
import { getLocalShipperOrders, hydrateLocalShipperOrders } from "@/features/shipper/home/model/localShipperOrders";
import { MOCK_SHIPPER_ORDERS } from "@/features/shipper/mock";
import { OrderApi } from "@/shared/api/orderService";
import { ProofService } from "@/shared/api/proofService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import type { ProofResponse } from "@/shared/models/proof";
import { Badge } from "@/shared/ui/feedback/Badge";
import { Chip as FormChip } from "@/shared/ui/form/Chip";

function formatWon(v: number) {
  const s = Math.round(v).toString();
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

function toDetailedAddress(addr?: string) {
  if (!addr) return "-";
  const key = addr.trim();
  const map: Record<string, string> = {
    "서울 강남": "서울특별시 강남구 테헤란로 152, 강남파이낸스센터 12층 1203호 (역삼동)",
    "부산 해운대": "부산광역시 해운대구 센텀동로 45, B동 3층 305호 (우동)",
    "서울 구로": "서울특별시 구로구 디지털로 300, 코오롱디지털타워 7층 712호 (구로동)",
    "경기 화성": "경기도 화성시 동탄대로 181, 물류동 2층 201호 (오산동)",
    "인천 남동": "인천광역시 남동구 남동대로 123, 남동물류센터 A동 1층 101호 (고잔동)",
    "대전 유성": "대전광역시 유성구 테크노중앙로 55, 테크노타워 5층 503호 (관평동)",
    "서울 영등포": "서울특별시 영등포구 여의대로 24, 전경련회관 8층 802호 (여의도동)",
    "경기 수원": "경기도 수원시 영통구 광교중앙로 140, 광교빌딩 4층 402호 (하동)",
    "경기 평택": "경기도 평택시 포승읍 평택항로 184, 항만물류동 2층 215호",
    "충북 청주": "충청북도 청주시 흥덕구 가로수로 1164, C동 1층 105호",
    "대구 달서구": "대구광역시 달서구 성서공단북로 85, 공단지원센터 3층 307호 (갈산동)",
    "경북 구미시": "경상북도 구미시 1공단로 199, 물류창고 D동 1층 109호 (공단동)",
    "광주 광산구": "광주광역시 광산구 하남산단8번로 35, A동 2층 208호",
    "전북 전주시": "전북특별자치도 전주시 덕진구 기린대로 451, 전주유통센터 6층 601호",
    "울산 남구": "울산광역시 남구 삼산로 217, 울산물류타워 3층 311호 (달동)",
    "경남 창원시": "경상남도 창원시 의창구 창원대로 363, 창원복합물류 B동 2층 204호",
    "충남 아산시": "충청남도 아산시 음봉면 산동로 87, 아산허브센터 1층 103호",
    "대전 유성구": "대전광역시 유성구 대학로 291, 대학물류관 4층 406호 (구성동)",
    "서울 금천구": "서울특별시 금천구 가산디지털1로 186, 제이플라츠 9층 918호 (가산동)",
    "인천 연수구": "인천광역시 연수구 송도과학로 85, 송도물류센터 5층 509호 (송도동)",
    "경기 고양시": "경기도 고양시 일산동구 중앙로 1286, 일산오피스 A동 10층 1002호 (장항동)",
    "강원 원주시": "강원특별자치도 원주시 지정면 기업도시로 200, 원주허브센터 2층 207호",
    "부산 사상구": "부산광역시 사상구 낙동대로 910, 사상물류빌딩 3층 302호 (감전동)",
    "경남 김해시": "경상남도 김해시 김해대로 2596, 김해산업유통 1층 112호 (안동)",
    "경북 포항시": "경상북도 포항시 남구 철강로 190, 포항철강센터 4층 409호 (호동)",
    "대구 북구": "대구광역시 북구 유통단지로 16, 대구유통센터 C동 2층 223호 (산격동)",
    "경기 파주": "경기도 파주시 교하로 700, 파주물류단지 3층 318호 (동패동)",
    "인천항": "인천광역시 중구 서해대로 366, 인천항 국제물류센터 2층 205호 (항동7가)",
    "서울 구로구": "서울특별시 구로구 경인로 662, 디큐브시티 오피스동 11층 1104호 (신도림동)",
    "경기 화성시": "경기도 화성시 효행로 1206, 화성산업단지 지원동 2층 203호 (진안동)",
  };
  return map[key] || addr;
}

function toOrderStatus(localStatus: "MATCHING" | "CONFIRMED" | "DRIVING" | "DONE") {
  if (localStatus === "MATCHING") return "REQUESTED" as const;
  if (localStatus === "CONFIRMED") return "ACCEPTED" as const;
  if (localStatus === "DRIVING") return "IN_TRANSIT" as const;
  return "COMPLETED" as const;
}

function withTime(iso: string, hhmm: string) {
  const d = new Date(iso);
  const m = hhmm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toISOString();
}

function localToOrderResponse(id: string): OrderResponse | null {
  const item = getLocalShipperOrders().find((x) => String(x.id) === String(id));
  if (!item) return null;

  const now = new Date().toISOString();
  const pickup = item.pickupTimeHHmm || "09:00";
  const dropoff = item.dropoffTimeHHmm || "15:00";
  return {
    orderId: -1,
    status: toOrderStatus(item.status),
    createdAt: now,
    updated: now,
    startAddr: toDetailedAddress(item.from),
    startPlace: toDetailedAddress(item.from),
    startType: "당상",
    startSchedule: withTime(now, pickup),
    endAddr: toDetailedAddress(item.to),
    endPlace: toDetailedAddress(item.to),
    endType: "당착",
    endSchedule: withTime(now, dropoff),
    cargoContent: item.cargoSummary,
    loadMethod: item.loadMethod,
    workType: item.workTool,
    tonnage: 0,
    reqCarType: item.cargoSummary,
    reqTonnage: "",
    driveMode: item.dispatchMode || "instant",
    basePrice: item.priceWon,
    payMethod: "receipt30",
    instant: item.dispatchMode === "instant",
    distance: item.distanceKm,
    duration: Math.max(30, Math.round(item.distanceKm * 2)),
    user: {
      userId: 0,
      email: "",
      phone: "010-1234-5678",
      nickname:
        item.status === "CONFIRMED" || item.status === "DRIVING" || item.status === "DONE" || item.dispatchMode === "instant"
          ? "즉시배차기사"
          : "기사 미배정",
    },
  };
}

function mockShipperOrderToOrderResponse(id: string): OrderResponse | null {
  const row = MOCK_SHIPPER_ORDERS.find((x) => String(x.id) === String(id));
  if (!row) return null;

  const now = new Date().toISOString();
  const toOrderStatus = (s: "MATCHING" | "DISPATCHED" | "DRIVING" | "DONE") => {
    if (s === "MATCHING") return "REQUESTED" as const;
    if (s === "DISPATCHED") return "ACCEPTED" as const;
    if (s === "DRIVING") return "IN_TRANSIT" as const;
    return "COMPLETED" as const;
  };
  const loadMethod = row.loadMethodShort === "혼" ? "혼적" : "독차";
  const workType =
    row.workToolShort === "지"
      ? "지게차"
      : row.workToolShort === "크"
        ? "크레인"
        : row.workToolShort === "호"
          ? "호이스트"
          : "수작업";
  const pickup = row.pickupTimeHHmm || "09:00";
  const dropoff = row.dropoffTimeHHmm || "15:00";

  return {
    orderId: -3,
    status: toOrderStatus(row.status),
    createdAt: now,
    updated: now,
    startAddr: toDetailedAddress(row.from),
    startPlace: toDetailedAddress(row.from),
    startType: "당상",
    startSchedule: withTime(now, pickup),
    endAddr: toDetailedAddress(row.to),
    endPlace: toDetailedAddress(row.to),
    endType: "당착",
    endSchedule: withTime(now, dropoff),
    cargoContent: "",
    loadMethod,
    workType,
    tonnage: 0,
    reqCarType: row.cargoSummary,
    reqTonnage: "",
    driveMode: row.isInstantDispatch ? "instant" : "direct",
    basePrice: row.priceWon,
    payMethod: "receipt30",
    instant: Boolean(row.isInstantDispatch),
    distance: row.distanceKm,
    duration: Math.max(30, Math.round(row.distanceKm * 2)),
    user: {
      userId: 0,
      email: "",
      phone: "010-1234-5678",
      nickname: row.status === "MATCHING" ? "기사 미배정" : "배정 기사",
    },
  };
}

function resolveDriverNickname(order: OrderResponse) {
  const fromUser = order.user?.nickname?.trim();
  const fromAny = String((order as any).driverNickname ?? (order as any).driverName ?? "").trim();
  if (fromUser || fromAny) return fromUser || fromAny;
  if (["ACCEPTED", "LOADING", "IN_TRANSIT", "UNLOADING", "COMPLETED"].includes(order.status)) {
    return "배정 기사";
  }
  return "기사 미배정";
}

function resolveDriverPhone(order: OrderResponse) {
  const fromUser = order.user?.phone?.trim();
  const fromAny = String((order as any).driverPhone ?? "").trim();
  return fromUser || fromAny || "010-1234-5678";
}

type ApplicantDriver = {
  id: string;
  name: string;
  phone: string;
  detail: string;
};

function parseRequestInfo(cargoContent?: string) {
  const raw = (cargoContent ?? "").trim();
  if (!raw) return { tags: [] as string[], memoText: "" };

  const segments = raw
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);

  const tagsSet = new Set<string>();
  const memoParts: string[] = [];

  const absorbTagTokens = (text: string) => {
    const tokens = text
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    tokens.forEach((tk) => {
      if (PRESET_REQUEST_TAGS.includes(tk)) tagsSet.add(tk);
    });
  };

  segments.forEach((seg) => {
    if (seg.startsWith("요청태그:")) {
      absorbTagTokens(seg.replace("요청태그:", "").trim());
      return;
    }
    if (seg.startsWith("직접입력:")) {
      const v = seg.replace("직접입력:", "").trim();
      if (v) memoParts.push(v);
      return;
    }
    if (seg.startsWith("추가메모:")) {
      const v = seg.replace("추가메모:", "").trim();
      if (v) memoParts.push(v);
      return;
    }
    if (seg.startsWith("화물:") || seg.includes("연락처:")) {
      return;
    }
    absorbTagTokens(seg);
  });

  if (!tagsSet.size && !segments.length) {
    absorbTagTokens(raw);
  }

  const tags = PRESET_REQUEST_TAGS.filter((tag) => tagsSet.has(tag));
  return { tags, memoText: memoParts.join(" / ") };
}

function toKoreanDateOnly(v?: string) {
  if (!v) return "-";
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) {
    const m = v.match(/\d{4}-\d{2}-\d{2}/);
    if (m) return m[0].replace(/-/g, ".");
    return v;
  }
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}.${mm}.${dd}`;
}

function toPayMethodLabel(payMethod?: string) {
  if (!payMethod) return "-";
  if (payMethod === "card") return "카드";
  if (payMethod === "receipt30") return "인수증(30일)";
  if (payMethod === "prepay") return "선불";
  return payMethod;
}

function toDriveModeLabel(v?: string) {
  if (!v) return "-";
  if (v === "roundTrip") return "왕복";
  if (v === "oneWay") return "편도";
  if (v === "instant") return "편도";
  if (v === "direct") return "편도";
  return v;
}

function toHHmm(v?: string, fallback = "-") {
  if (!v) return fallback;
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const m = v.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  return fallback;
}

function isSameText(a?: string, b?: string) {
  return (a ?? "").trim() === (b ?? "").trim();
}

function compactPlace(addr?: string) {
  const t = (addr ?? "").trim();
  if (!t) return "-";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
  return t;
}

function formatDurationLabel(totalMinutesRaw?: number) {
  const total = Math.max(30, Math.round(totalMinutesRaw ?? 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export default function OrderDetailScreen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId, applicants } = useLocalSearchParams<{ orderId?: string | string[]; applicants?: string | string[] }>();
  const resolvedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
  const resolvedApplicants = Array.isArray(applicants) ? applicants[0] : applicants;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [openProofModal, setOpenProofModal] = useState(false);
  const [openDriverPicker, setOpenDriverPicker] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<ApplicantDriver | null>(null);
  const [openRatingModal, setOpenRatingModal] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await hydrateLocalShipperOrders();
        const id = String(resolvedOrderId ?? "");
        const local = localToOrderResponse(id);
        if (local) {
          if (active) setOrder(local);
          return;
        }

        const fromMock = mockShipperOrderToOrderResponse(id);
        if (fromMock) {
          if (active) setOrder(fromMock);
          return;
        }

        const safeApiPromise: Promise<OrderResponse[]> = OrderApi.getAvailableOrders().catch(() => []);
        const timeoutFallback = new Promise<OrderResponse[]>((resolve) => {
          setTimeout(() => resolve([]), 5000);
        });
        const rows = await Promise.race([safeApiPromise, timeoutFallback]);
        if (!active) return;
        const found = rows.find((x) => String(x.orderId) === id);
        setOrder(found ?? null);
      } catch {
        if (active) {
          setOrder(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [resolvedOrderId]);

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

  const requestInfo = parseRequestInfo(order.cargoContent);
  const startHHmm = toHHmm(order.startSchedule, "09:00");
  const endHHmm = toHHmm(order.endSchedule, "15:00");
  const isDispatched = order.status === "ACCEPTED";
  const isInTransit = ["LOADING", "IN_TRANSIT", "UNLOADING"].includes(order.status);
  const isCompleted = order.status === "COMPLETED";
  const isDirectDispatch = !order.instant;
  const hasAssignedDriver = ["ACCEPTED", "LOADING", "IN_TRANSIT", "UNLOADING", "COMPLETED"].includes(order.status);
  const hasAssignedDriverNow = hasAssignedDriver || Boolean(selectedDriver);
  const applicantsCount = Math.max(
    0,
    Number.parseInt(String(resolvedApplicants ?? (order as any).applicantCount ?? (order as any).applicants ?? 0), 10) || 0
  );
  const canSelectDriver = isDirectDispatch && !hasAssignedDriverNow && applicantsCount > 0;
  const canShowContactActions = !isDirectDispatch || hasAssignedDriverNow;
  const isInstantAutoDispatch = Boolean(order.instant);
  const isInstantWaiting = isInstantAutoDispatch && !isDispatched && !isInTransit && !isCompleted && !hasAssignedDriverNow;
  const showMainAction = !isInstantAutoDispatch || isInstantWaiting;
  const driverName = selectedDriver?.name ?? resolveDriverNickname(order);
  const driverPhone = selectedDriver?.phone ?? resolveDriverPhone(order);
  const chatOrderId = String(resolvedOrderId ?? order.orderId);

  const onPressCall = () => {
    const tel = `tel:${driverPhone.replace(/[^\d+]/g, "")}`;
    void Linking.openURL(tel).catch(() => {
      Alert.alert("전화 연결 실패", "전화 앱을 열 수 없습니다.");
    });
  };

  const copyAddress = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("안내", "주소가 복사되었습니다.");
    } catch {
      Alert.alert("안내", "주소 복사에 실패했습니다.");
    }
  };

  const onPressProof = async () => {
    setProofLoading(true);
    try {
      const parsed = Number(String(resolvedOrderId ?? order.orderId));
      if (Number.isFinite(parsed)) {
        const res = await ProofService.getProof(parsed);
        setProof(res);
      } else {
        setProof({
          proofId: -1,
          receiptImageUrl: "",
          signatureImageUrl: "",
          recipientName: "목업 수령인",
        });
      }
      setOpenProofModal(true);
    } catch {
      setProof({
        proofId: -1,
        receiptImageUrl: "",
        signatureImageUrl: "",
        recipientName: "증빙 데이터 없음",
      });
      setOpenProofModal(true);
    } finally {
      setProofLoading(false);
    }
  };

  const waitingApplicants: ApplicantDriver[] = [
    { id: "d1", name: "박베테랑", phone: "010-2211-3344", detail: "11톤 윙바디 · 무사고 10년" },
    { id: "d2", name: "김신속", phone: "010-5566-7788", detail: "5톤 카고 · 5km 거리" },
    { id: "d3", name: "최성실", phone: "010-8899-1100", detail: "3.5톤 윙바디 · 평점 4.8" },
  ];

  const mainActionLabel = isCompleted
    ? ratingSubmitted
      ? "평점 등록 완료"
      : "기사 평점 남기기"
    : isInstantWaiting
      ? "기사 선택"
      : hasAssignedDriverNow || isDispatched || isInTransit
      ? "배차 완료"
      : "기사 선택";
  const mainActionReadonly = isInstantWaiting;
  const mainActionDisabled = isCompleted
    ? ratingSubmitted
    : mainActionReadonly || isDispatched || isInTransit || Boolean(selectedDriver) || (isDirectDispatch && !canSelectDriver);

  return (
    <View style={[s.page, { backgroundColor: "#F5F7FB" }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={s.headerTitle}>오더 #{resolvedOrderId ?? order.orderId}</Text>
        <View style={s.headerSide} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 112 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={s.topCard}>
          <View style={s.topCardHead}>
            <Badge label={order.instant ? "바로배차" : "직접배차"} tone={order.instant ? "urgent" : "direct"} />
            <Text style={s.dateText}>{toKoreanDateOnly(order.createdAt)}</Text>
          </View>

          <View style={s.routeRow}>
            <View style={s.routeSide}>
              <Text style={s.routeBig}>{compactPlace(order.startAddr)}</Text>
              <Text style={s.routeSmall}>{order.startPlace || "-"}</Text>
            </View>
            <Ionicons name="arrow-forward" size={30} color="#CBD5E1" />
            <View style={[s.routeSide, { alignItems: "flex-end" }]}>
              <Text style={s.routeBig}>{compactPlace(order.endAddr)}</Text>
              <Text style={s.routeSmall}>{order.endPlace || "-"}</Text>
            </View>
          </View>

          <View style={s.infoBar}>
            <View style={s.infoItem}>
              <Ionicons name="navigate-outline" size={16} color="#64748B" />
              <Text style={s.infoText}>{Math.round(order.distance ?? 0)}km</Text>
            </View>
            <Text style={s.infoDivider}>|</Text>
            <View style={s.infoItem}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <Text style={s.infoText}>예상 {formatDurationLabel(order.duration)}</Text>
            </View>
          </View>

          <View style={s.fareRow}>
            <Text style={s.fareLabel}>운송료</Text>
            <View style={s.fareRight}>
              <Text style={s.fareValue}>{formatWon(order.basePrice ?? 0)}</Text>
              <View style={s.payChip}>
                <Text style={s.payChipText}>{toPayMethodLabel(order.payMethod)}</Text>
              </View>
            </View>
          </View>

          {isInstantAutoDispatch ? (
            <View style={s.driverInfoRow}>
              <Text style={s.driverInfoName}>기사 {driverName}</Text>
              <Text style={s.driverInfoPhone}>{driverPhone}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>운행 경로</Text>
          <View style={s.timelineWrap}>
            <View style={s.timelineLine} />
            <View style={s.timelineItem}>
              <View style={[s.dot, { backgroundColor: "#1E293B" }]}>
                <Text style={s.dotText}>출</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={s.timeText}>오늘 {startHHmm} 상차</Text>
                <Text style={s.addrTitle}>{order.startAddr || "-"}</Text>
                {!isSameText(order.startAddr, order.startPlace) ? <Text style={s.addrDesc}>{order.startPlace || "-"}</Text> : null}
                <Pressable style={s.copyBtn} onPress={() => void copyAddress(order.startAddr || order.startPlace || "")}>
                  <Ionicons name="copy-outline" size={14} color="#475569" />
                  <Text style={s.copyBtnText}>주소복사</Text>
                </Pressable>
              </View>
            </View>
            <View style={[s.timelineItem, { marginTop: 20 }]}>
              <View style={[s.dot, { backgroundColor: "#4F46E5" }]}>
                <Text style={s.dotText}>도</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={[s.timeText, { color: "#4F46E5" }]}>하차 예정</Text>
                <Text style={s.addrTitle}>{order.endAddr || "-"}</Text>
                {!isSameText(order.endAddr, order.endPlace) ? <Text style={s.addrDesc}>{order.endPlace || "-"}</Text> : null}
                <Pressable style={s.copyBtn} onPress={() => void copyAddress(order.endAddr || order.endPlace || "")}>
                  <Ionicons name="copy-outline" size={14} color="#475569" />
                  <Text style={s.copyBtnText}>주소복사</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {isInTransit ? (
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>실시간 위치</Text>
            <View style={s.mapPreview}>
              <Ionicons name="map-outline" size={24} color="#64748B" />
              <Text style={s.mapPreviewTitle}>지도 영역 (실시간 위치 연동 예정)</Text>
              <Text style={s.mapPreviewSub}>현재는 자리만 준비되어 있고, 추후 기사 좌표를 연결하면 바로 표시됩니다.</Text>
            </View>
          </View>
        ) : null}

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>작업 정보</Text>
          <Text style={s.metaText}>차량: {`${order.reqTonnage ?? ""} ${order.reqCarType ?? ""}`.trim() || "-"}</Text>
          <Text style={s.metaText}>운행형태: {toDriveModeLabel(order.driveMode)}</Text>
          <Text style={s.metaText}>적재방식: {order.loadMethod || "-"}</Text>
          <Text style={s.metaText}>상하차: {order.workType || "-"}</Text>
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>요청사항</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {requestInfo.tags.length ? requestInfo.tags.map((tag) => <FormChip key={tag} label={`#${tag}`} selected disabled onPress={() => {}} />) : <Text style={s.emptyText}>등록된 요청사항이 없습니다.</Text>}
          </View>
          {requestInfo.memoText ? <Text style={[s.metaText, { marginTop: 10 }]}>{requestInfo.memoText}</Text> : null}
        </View>
      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: 10 + insets.bottom }]}>
        {canShowContactActions ? (
          <View style={s.iconGroup}>
            <Pressable style={s.iconBtn} onPress={() => router.push(`/(common)/orders/${chatOrderId}/chat` as any)}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#334155" />
            </Pressable>
            <Pressable style={s.iconBtn} onPress={onPressCall}>
              <Ionicons name="call-outline" size={22} color="#334155" />
            </Pressable>
          </View>
        ) : null}
        {showMainAction ? (
          <Pressable
            disabled={mainActionDisabled && !isInstantWaiting}
            onPress={() => {
              if (isInstantWaiting) {
                Alert.alert("안내", "바로배차는 자동으로 배차 됩니다.");
                return;
              }
              if (isCompleted) {
                setOpenRatingModal(true);
                return;
              }
              if (isDirectDispatch && !hasAssignedDriverNow && canSelectDriver) {
                setOpenDriverPicker(true);
                return;
              }
              Alert.alert("안내", "이미 배차가 확정되었습니다.");
            }}
            style={[s.mainBtn, { opacity: mainActionDisabled ? 0.55 : 1, backgroundColor: c.brand.primary }]}
          >
            <Ionicons name={isCompleted ? "document-text-outline" : "checkmark-circle-outline"} size={20} color="#FFF" />
            <Text style={s.mainBtnText}>{proofLoading && isCompleted ? "불러오는 중..." : mainActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal visible={openDriverPicker} transparent animationType="fade" onRequestClose={() => setOpenDriverPicker(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: 16 }}>
          <View style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border.default }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "900" }}>기사 선택</Text>
              <Pressable onPress={() => setOpenDriverPicker(false)}>
                <Ionicons name="close" size={20} color={c.text.primary} />
              </Pressable>
            </View>

            {waitingApplicants.map((driver) => (
              <Pressable
                key={driver.id}
                onPress={() => {
                  setSelectedDriver(driver);
                  setOpenDriverPicker(false);
                  Alert.alert("배차 확정", `${driver.name} 기사님으로 배차가 확정되었습니다.`);
                }}
                style={{
                  borderWidth: 1,
                  borderColor: c.border.default,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  backgroundColor: c.bg.surface,
                }}
              >
                <Text style={{ color: c.text.primary, fontSize: 14, fontWeight: "900" }}>{driver.name}</Text>
                <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "700", marginTop: 2 }}>{driver.detail}</Text>
                <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "700", marginTop: 2 }}>{driver.phone}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={openRatingModal} transparent animationType="fade" onRequestClose={() => setOpenRatingModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: 16 }}>
          <View style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border.default }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "900" }}>기사 평점 남기기</Text>
              <Pressable onPress={() => setOpenRatingModal(false)}>
                <Ionicons name="close" size={20} color={c.text.primary} />
              </Pressable>
            </View>

            <Text style={{ color: c.text.secondary, fontSize: 13, fontWeight: "700", marginBottom: 8 }}>
              기사: {driverName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((score) => (
                <Pressable key={score} onPress={() => setRatingScore(score)} style={{ marginRight: 6 }}>
                  <Ionicons name={ratingScore >= score ? "star" : "star-outline"} size={24} color={ratingScore >= score ? "#F59E0B" : "#94A3B8"} />
                </Pressable>
              ))}
              <Text style={{ color: c.text.primary, fontWeight: "800", marginLeft: 6 }}>{ratingScore}.0</Text>
            </View>

            <View style={{ borderWidth: 1, borderColor: c.border.default, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 }}>
              <TextInput
                value={ratingComment}
                onChangeText={setRatingComment}
                placeholder="기사님에 대한 후기를 남겨주세요 (선택)"
                placeholderTextColor={c.text.secondary}
                multiline
                style={{ color: c.text.primary, minHeight: 76, textAlignVertical: "top", fontWeight: "700" }}
              />
            </View>

            <Pressable
              onPress={() => {
                setRatingSubmitted(true);
                setOpenRatingModal(false);
                Alert.alert("등록 완료", `평점 ${ratingScore}점을 남겼습니다.`);
              }}
              style={{
                marginTop: 12,
                height: 44,
                borderRadius: 12,
                backgroundColor: c.brand.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: c.text.inverse, fontSize: 14, fontWeight: "900" }}>평점 등록</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={openProofModal} transparent animationType="fade" onRequestClose={() => setOpenProofModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "center", padding: 16 }}>
          <View style={{ backgroundColor: c.bg.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border.default, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "900" }}>인수증 상세</Text>
              <Pressable onPress={() => setOpenProofModal(false)}>
                <Ionicons name="close" size={22} color={c.text.primary} />
              </Pressable>
            </View>

            <Text style={{ color: c.text.secondary, fontWeight: "800", marginBottom: 10 }}>
              수령인: {proof?.recipientName || "-"}
            </Text>
            <View style={{ borderWidth: 1, borderColor: c.border.default, borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <Text style={{ color: c.text.primary, fontWeight: "800" }}>
                인수증 이미지: {proof?.receiptImageUrl ? "등록됨" : "미등록"}
              </Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: c.border.default, borderRadius: 12, padding: 12 }}>
              <Text style={{ color: c.text.primary, fontWeight: "800" }}>
                수령인 서명: {proof?.signatureImageUrl ? "등록됨" : "미등록"}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F5F7FB" },
  center: { justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  title: { fontSize: 16, fontWeight: "800" },
  backBtn: { marginTop: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  backBtnText: { fontSize: 12, fontWeight: "700" },
  header: {
    height: 86,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    backgroundColor: "#F5F7FB",
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  headerSide: { width: 40 },
  content: { padding: 16 },
  topCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  topCardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  dateText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  routeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  routeSide: { flex: 1 },
  routeBig: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  routeSmall: { color: "#64748B", fontSize: 13, fontWeight: "700", marginTop: 5 },
  infoBar: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  infoItem: { flexDirection: "row", alignItems: "center" },
  infoText: { color: "#475569", fontSize: 12, fontWeight: "700", marginLeft: 6 },
  infoDivider: { color: "#CBD5E1", marginHorizontal: 12, fontWeight: "800" },
  fareRow: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareLabel: { color: "#64748B", fontSize: 13, fontWeight: "700" },
  fareRight: { flexDirection: "row", alignItems: "center" },
  fareValue: { color: "#EF4444", fontSize: 16, fontWeight: "900" },
  payChip: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#93C5FD",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
  },
  payChipText: { color: "#3B82F6", fontSize: 11, fontWeight: "800" },
  driverInfoRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
  },
  driverInfoName: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  driverInfoPhone: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  sectionCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 18, marginBottom: 14 },
  sectionTitle: { color: "#0F172A", fontSize: 15, fontWeight: "800", marginBottom: 10 },
  timelineWrap: { position: "relative", paddingLeft: 2 },
  timelineLine: { position: "absolute", left: 20, top: 8, bottom: 8, width: 2, backgroundColor: "#E2E8F0" },
  timelineItem: { flexDirection: "row" },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: 2 },
  dotText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  timelineContent: { flex: 1, paddingLeft: 14 },
  timeText: { color: "#4F46E5", fontSize: 11, fontWeight: "800", marginBottom: 4 },
  addrTitle: { color: "#0F172A", fontSize: 15, fontWeight: "700" },
  addrDesc: { color: "#64748B", fontSize: 12, fontWeight: "700", marginTop: 3 },
  copyBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  copyBtnText: { color: "#475569", fontSize: 10, fontWeight: "700", marginLeft: 4 },
  mapPreview: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    minHeight: 170,
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPreviewTitle: { color: "#0F172A", fontSize: 13, fontWeight: "800", marginTop: 8 },
  mapPreviewSub: { color: "#64748B", fontSize: 11, fontWeight: "700", marginTop: 6, textAlign: "center" },
  metaText: { color: "#475569", fontSize: 12, fontWeight: "700", marginBottom: 5 },
  emptyText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  iconGroup: { flexDirection: "row", marginRight: 10 },
  iconBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  mainBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  mainBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", marginLeft: 8 },
});
