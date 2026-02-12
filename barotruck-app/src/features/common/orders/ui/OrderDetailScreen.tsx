import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PRESET_REQUEST_TAGS } from "@/features/shipper/create-order/ui/createOrderStep1.constants";
import { getLocalShipperOrders } from "@/features/shipper/home/model/localShipperOrders";
import { OrderApi } from "@/shared/api/orderService";
import { ProofService } from "@/shared/api/proofService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse } from "@/shared/models/order";
import type { ProofResponse } from "@/shared/models/proof";
import { Card } from "@/shared/ui/base/Card";
import { Badge } from "@/shared/ui/feedback/Badge";
import { Chip as FormChip } from "@/shared/ui/form/Chip";

function formatWon(v: number) {
  const s = Math.round(v).toString();
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

function toUiStatus(status: string) {
  if (status === "COMPLETED") return { label: "운행완료", tone: "complete" as const };
  if (status === "REQUESTED" || status === "PENDING") return { label: "배차대기", tone: "warning" as const };
  if (status === "ACCEPTED") return { label: "배차확정", tone: "warning" as const };
  return { label: "운행중", tone: "info" as const };
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

function mockTimesById(id: string) {
  const map: Record<string, { pickup: string; dropoff: string }> = {
    m1: { pickup: "09:00", dropoff: "15:00" },
    m2: { pickup: "10:00", dropoff: "13:30" },
    m3: { pickup: "14:00", dropoff: "17:00" },
    m4: { pickup: "09:00", dropoff: "11:00" },
    m5: { pickup: "08:30", dropoff: "13:30" },
    m6: { pickup: "10:00", dropoff: "12:00" },
    m7: { pickup: "09:30", dropoff: "14:00" },
    m8: { pickup: "16:30", dropoff: "18:00" },
    m9: { pickup: "08:00", dropoff: "10:00" },
    m10: { pickup: "13:00", dropoff: "15:00" },
    m11: { pickup: "11:00", dropoff: "15:00" },
    m12: { pickup: "09:00", dropoff: "10:30" },
    m13: { pickup: "07:30", dropoff: "12:00" },
    w1: { pickup: "09:00", dropoff: "15:00" },
    w2: { pickup: "11:30", dropoff: "16:00" },
    w3: { pickup: "10:00", dropoff: "13:30" },
    w4: { pickup: "09:30", dropoff: "14:00" },
    w5: { pickup: "13:00", dropoff: "15:00" },
    p1: { pickup: "14:00", dropoff: "17:00" },
    p2: { pickup: "16:30", dropoff: "18:00" },
    p3: { pickup: "11:00", dropoff: "15:00" },
    d1: { pickup: "09:00", dropoff: "11:00" },
    d2: { pickup: "08:30", dropoff: "13:30" },
    d3: { pickup: "10:00", dropoff: "12:00" },
    d4: { pickup: "08:00", dropoff: "10:00" },
    d5: { pickup: "09:00", dropoff: "10:30" },
    d6: { pickup: "07:30", dropoff: "12:00" },
  };
  return map[id] || { pickup: "09:00", dropoff: "15:00" };
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
    distance: item.distanceKm,
    duration: Math.max(30, Math.round(item.distanceKm * 2)),
  };
}

function mockToOrderResponse(id: string): OrderResponse | null {
  const now = new Date().toISOString();
  const mockTimes = mockTimesById(id);
  const mockMap: Record<
    string,
    {
      status: "REQUESTED" | "ACCEPTED" | "IN_TRANSIT" | "COMPLETED";
      from: string;
      to: string;
      distanceKm: number;
      cargo: string;
      priceWon: number;
      loadMethod: string;
      workType: string;
      driverNickname?: string;
      driverPhone?: string;
      requestTags?: string[];
    }
  > = {
    m1: { status: "REQUESTED", from: "서울 강남", to: "부산 해운대", distanceKm: 340, cargo: "11톤 윙바디", priceWon: 350000, loadMethod: "독차", workType: "지게차", requestTags: ["도착 전 연락", "비오면 안됨"] },
    m2: { status: "REQUESTED", from: "서울 구로", to: "경기 화성", distanceKm: 62, cargo: "3.5톤 카고", priceWon: 180000, loadMethod: "혼적", workType: "수작업", requestTags: ["수작업 없음", "파손주의"] },
    m3: { status: "ACCEPTED", from: "인천 남동", to: "대전 유성", distanceKm: 120, cargo: "5톤 카고", priceWon: 210000, loadMethod: "독차", workType: "크레인", driverNickname: "김기사", driverPhone: "010-3344-5566", requestTags: ["지게차 상하차", "도착 전 연락"] },
    m4: { status: "COMPLETED", from: "서울 영등포", to: "경기 수원", distanceKm: 45, cargo: "1톤 용달", priceWon: 80000, loadMethod: "혼적", workType: "호이스트" },
    m5: { status: "COMPLETED", from: "경기 평택", to: "충북 청주", distanceKm: 98, cargo: "5톤 윙바디", priceWon: 190000, loadMethod: "독차", workType: "지게차" },
    m6: { status: "COMPLETED", from: "대구 달서구", to: "경북 구미시", distanceKm: 34, cargo: "2.5톤 카고", priceWon: 90000, loadMethod: "혼적", workType: "수작업" },
    m7: { status: "REQUESTED", from: "광주 광산구", to: "전북 전주시", distanceKm: 92, cargo: "5톤 카고", priceWon: 175000, loadMethod: "독차", workType: "지게차" },
    m8: { status: "IN_TRANSIT", from: "울산 남구", to: "경남 창원시", distanceKm: 54, cargo: "3.5톤 윙바디", priceWon: 120000, loadMethod: "혼적", workType: "수작업" },
    m9: { status: "COMPLETED", from: "충남 아산시", to: "대전 유성구", distanceKm: 41, cargo: "1톤 용달", priceWon: 78000, loadMethod: "독차", workType: "호이스트" },
    m10: { status: "REQUESTED", from: "서울 금천구", to: "인천 연수구", distanceKm: 38, cargo: "2.5톤 카고", priceWon: 98000, loadMethod: "혼적", workType: "크레인" },
    m11: { status: "ACCEPTED", from: "경기 고양시", to: "강원 원주시", distanceKm: 114, cargo: "11톤 윙바디", priceWon: 265000, loadMethod: "독차", workType: "지게차", driverNickname: "박신속", driverPhone: "010-6655-1122", requestTags: ["지게차 상하차", "취급주의"] },
    m12: { status: "COMPLETED", from: "부산 사상구", to: "경남 김해시", distanceKm: 19, cargo: "1톤 탑차", priceWon: 52000, loadMethod: "혼적", workType: "수작업" },
    m13: { status: "COMPLETED", from: "경북 포항시", to: "대구 북구", distanceKm: 89, cargo: "5톤 냉장", priceWon: 168000, loadMethod: "독차", workType: "크레인" },
    w1: { status: "REQUESTED", from: "서울 강남", to: "부산 해운대", distanceKm: 340, cargo: "11톤 윙바디", priceWon: 350000, loadMethod: "독차", workType: "지게차" },
    w2: { status: "REQUESTED", from: "경기 파주", to: "인천항", distanceKm: 80, cargo: "5톤 카고", priceWon: 150000, loadMethod: "독차", workType: "크레인" },
    w3: { status: "REQUESTED", from: "서울 구로", to: "경기 화성", distanceKm: 62, cargo: "3.5톤 카고", priceWon: 180000, loadMethod: "혼적", workType: "수작업" },
    p1: { status: "ACCEPTED", from: "인천 남동", to: "대전 유성", distanceKm: 120, cargo: "5톤 카고", priceWon: 210000, loadMethod: "독차", workType: "지게차", driverNickname: "이성실", driverPhone: "010-7788-2211", requestTags: ["도착 전 연락", "비오면 안됨"] },
    d1: { status: "COMPLETED", from: "서울 영등포", to: "경기 수원", distanceKm: 45, cargo: "1톤 용달", priceWon: 80000, loadMethod: "혼적", workType: "호이스트" },
    d2: { status: "COMPLETED", from: "경기 평택", to: "충북 청주", distanceKm: 98, cargo: "5톤 윙바디", priceWon: 190000, loadMethod: "독차", workType: "지게차" },
    d3: { status: "COMPLETED", from: "대구 달서구", to: "경북 구미시", distanceKm: 34, cargo: "2.5톤 카고", priceWon: 90000, loadMethod: "혼적", workType: "수작업" },
    w4: { status: "REQUESTED", from: "광주 광산구", to: "전북 전주시", distanceKm: 92, cargo: "5톤 카고", priceWon: 175000, loadMethod: "독차", workType: "지게차" },
    w5: { status: "REQUESTED", from: "서울 금천구", to: "인천 연수구", distanceKm: 38, cargo: "2.5톤 카고", priceWon: 98000, loadMethod: "혼적", workType: "크레인" },
    p2: { status: "IN_TRANSIT", from: "울산 남구", to: "경남 창원시", distanceKm: 54, cargo: "3.5톤 윙바디", priceWon: 120000, loadMethod: "혼적", workType: "수작업", requestTags: ["파손주의"] },
    p3: { status: "IN_TRANSIT", from: "경기 고양시", to: "강원 원주시", distanceKm: 114, cargo: "11톤 윙바디", priceWon: 265000, loadMethod: "독차", workType: "지게차", requestTags: ["지게차 상하차"] },
    d4: { status: "COMPLETED", from: "충남 아산시", to: "대전 유성구", distanceKm: 41, cargo: "1톤 용달", priceWon: 78000, loadMethod: "독차", workType: "호이스트" },
    d5: { status: "COMPLETED", from: "부산 사상구", to: "경남 김해시", distanceKm: 19, cargo: "1톤 탑차", priceWon: 52000, loadMethod: "혼적", workType: "수작업" },
    d6: { status: "COMPLETED", from: "경북 포항시", to: "대구 북구", distanceKm: 89, cargo: "5톤 냉장", priceWon: 168000, loadMethod: "독차", workType: "크레인" },
  };

  const row = mockMap[id];
  if (!row) return null;

  return {
    orderId: -2,
    status: row.status,
    createdAt: now,
    updated: now,
    startAddr: toDetailedAddress(row.from),
    startPlace: toDetailedAddress(row.from),
    startType: "당상",
    startSchedule: withTime(now, mockTimes.pickup),
    endAddr: toDetailedAddress(row.to),
    endPlace: toDetailedAddress(row.to),
    endType: "당착",
    endSchedule: withTime(now, mockTimes.dropoff),
    cargoContent: row.requestTags?.join(", ") || "",
    loadMethod: row.loadMethod,
    workType: row.workType,
    tonnage: 0,
    reqCarType: row.cargo,
    reqTonnage: "",
    driveMode: "instant",
    basePrice: row.priceWon,
    payMethod: "receipt30",
    distance: row.distanceKm,
    duration: Math.max(30, Math.round(row.distanceKm * 2)),
    user:
      row.driverNickname || row.driverPhone
        ? {
            userId: 0,
            email: "",
            phone: row.driverPhone || "",
            nickname: row.driverNickname || "배차 기사",
          }
        : undefined,
  };
}

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

export default function OrderDetailScreen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
  const resolvedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [openProofModal, setOpenProofModal] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const id = String(resolvedOrderId ?? "");
        const local = localToOrderResponse(id);
        if (local) {
          if (active) setOrder(local);
          return;
        }

        const mock = mockToOrderResponse(id);
        if (mock) {
          if (active) setOrder(mock);
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

  const requestInfo = parseRequestInfo(order.cargoContent);
  const startHHmm = toHHmm(order.startSchedule, "09:00");
  const endHHmm = toHHmm(order.endSchedule, "15:00");
  const isDispatched = order.status === "ACCEPTED";
  const isInTransit = ["LOADING", "IN_TRANSIT", "UNLOADING"].includes(order.status);
  const isCompleted = order.status === "COMPLETED";
  const showDriverSection = isDispatched || isInTransit;
  const driverName = order.user?.nickname || "배차 기사";
  const driverPhone = order.user?.phone || "010-1234-5678";
  const chatOrderId = String(resolvedOrderId ?? order.orderId);

  const onPressCall = () => {
    const tel = `tel:${driverPhone.replace(/[^\d+]/g, "")}`;
    void Linking.openURL(tel).catch(() => {
      Alert.alert("전화 연결 실패", "전화 앱을 열 수 없습니다.");
    });
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

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <View
        style={{
          height: 52 + insets.top + 6,
          paddingTop: insets.top + 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: c.border.default,
          backgroundColor: c.bg.canvas,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={22} color={c.text.primary} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "900", color: c.text.primary }}>운송 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <Card padding={16} style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Badge label={st?.label ?? "-"} tone={st?.tone ?? "warning"} />
            <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "700" }}>
              {toRelativeLabel(order.updated ?? order.createdAt)}
            </Text>
          </View>
          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>상차</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>
            {order.startAddr || "-"}
          </Text>
          {!isSameText(order.startAddr, order.startPlace) ? (
            <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>
              {order.startPlace || "-"}
            </Text>
          ) : null}
          <Text style={{ color: c.text.secondary, fontWeight: "700", marginTop: -2, marginBottom: 8 }}>{startHHmm} 상차</Text>

          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>하차</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>
            {order.endAddr || "-"}
          </Text>
          {!isSameText(order.endAddr, order.endPlace) ? (
            <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>
              {order.endPlace || "-"}
            </Text>
          ) : null}
          <Text style={{ color: c.text.secondary, fontWeight: "700", marginTop: -2, marginBottom: 8 }}>{endHHmm} 하차</Text>

          <View style={{ height: 1, backgroundColor: c.border.default, marginVertical: 12 }} />

          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>
            {toKoreanDateOnly(order.startSchedule)} ({order.startType || "-"})
          </Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800", marginTop: 6 }}>
            {`${order.reqTonnage ?? ""} ${order.reqCarType ?? ""}`.trim() || "-"} · {toDriveModeLabel(order.driveMode)}
          </Text>
        </Card>

        {isInTransit ? (
          <Card padding={16} style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 12 }}>실시간 위치</Text>
            <View
              style={{
                height: 170,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: c.border.default,
                backgroundColor: c.bg.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="map-outline" size={28} color={c.text.secondary} />
              <Text style={{ color: c.text.secondary, fontWeight: "800", marginTop: 8 }}>지도 연동 준비 중</Text>
              <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 4 }}>
                추후 실시간 기사 위치를 표시할 예정입니다.
              </Text>
            </View>
          </Card>
        ) : null}

        {showDriverSection ? (
          <Card padding={16} style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 12 }}>배차 기사</Text>
            <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 15 }}>{driverName}</Text>
            <Text style={{ color: c.text.secondary, fontWeight: "800", marginTop: 4 }}>{driverPhone}</Text>
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <Pressable
                onPress={onPressCall}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.brand.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  marginRight: 6,
                }}
              >
                <Ionicons name="call-outline" size={16} color={c.brand.primary} style={{ marginRight: 4 }} />
                <Text style={{ color: c.brand.primary, fontWeight: "900", fontSize: 14 }}>전화</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(common)/orders/${chatOrderId}/chat` as any)}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border.default,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  marginLeft: 6,
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.text.secondary} style={{ marginRight: 4 }} />
                <Text style={{ color: c.text.secondary, fontWeight: "900", fontSize: 14 }}>채팅</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        <Card padding={16} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 12 }}>작업 정보</Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.secondary }}>적재 방식</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary }}>{order.loadMethod || "-"}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.secondary }}>상하차 도구</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary }}>{order.workType || "-"}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.secondary }}>거리</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary }}>{Math.round(order.distance ?? 0)}km</Text>
          </View>
        </Card>

        <Card padding={16} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 12 }}>요청사항</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {requestInfo.tags.length ? (
              requestInfo.tags.map((tag) => (
                <FormChip key={tag} label={`#${String(tag)}`} selected disabled onPress={() => {}} />
              ))
            ) : (
              <Text style={{ color: c.text.secondary, fontWeight: "700" }}>등록된 요청사항이 없습니다.</Text>
            )}
          </View>

          {requestInfo.memoText ? (
            <View>
              <Text style={{ color: c.text.primary, fontSize: 14, fontWeight: "900", marginTop: 14, marginBottom: 8 }}>
                추가 메모
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: c.border.default,
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: c.bg.surface,
                  minHeight: 84,
                }}
              >
                <Text style={{ color: c.text.primary, fontWeight: "700", lineHeight: 20 }}>{String(requestInfo.memoText)}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        <Card padding={16}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 12 }}>운임 정보</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>희망 운임</Text>
            <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 18 }}>{formatWon(order.basePrice ?? 0)}</Text>
          </View>
          <Text style={{ color: c.text.secondary, fontWeight: "800", marginTop: 8 }}>
            결제 방식: {toPayMethodLabel(order.payMethod)}
          </Text>
        </Card>

        {isCompleted ? (
          <Card padding={16} style={{ marginTop: 18 }}>
            <Pressable
              onPress={onPressProof}
              style={{
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border.default,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
              }}
            >
              <Ionicons name="document-text-outline" size={16} color={c.text.secondary} style={{ marginRight: 6 }} />
              <Text style={{ color: c.text.secondary, fontWeight: "900", fontSize: 14 }}>
                {proofLoading ? "불러오는 중..." : "인수증 확인"}
              </Text>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>

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
  page: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  title: { fontSize: 18, fontWeight: "900" },
  backBtn: { marginTop: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  backBtnText: { fontSize: 13, fontWeight: "800" },
});
