import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderApi } from "@/shared/api/orderService";
import { ReportService, ReviewService } from "@/shared/api/reviewService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { AssignedDriverInfoResponse, OrderResponse } from "@/shared/models/order";
import { Badge } from "@/shared/ui/feedback/Badge";
import apiClient from "@/shared/api/apiClient";
import OrderDetailPageFrame from "@/features/driver/order-detail/ui/OrderDetailPageFrame";

const { width } = Dimensions.get("window");



function formatAddressBig(addr?: string) {
  const parts = String(addr ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "-";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

function formatAddressSmall(addr?: string) {
  const parts = String(addr ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return "-";
  return parts.slice(2).join(" ");
}

function formatDetailSubText(addr?: string, place?: string) {
  const placeText = String(place ?? "").trim();
  if (placeText) return placeText;
  return formatAddressSmall(addr);
}

function formatYmd(dateStr?: string) {
  if (!dateStr) return "-";
  return dateStr.slice(0, 10);
}

function formatEstimatedDuration(v?: number) {
  const raw = Number(v ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return "예상 시간 미정";
  const minutes = raw > 1000 ? Math.round(raw / 60) : Math.round(raw);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `예상 ${m}분`;
  if (m === 0) return `예상 ${h}시간`;
  return `예상 ${h}시간 ${m}분`;
}

function formatSchedule(v?: string) {
  if (!v) return "상차 시간 미정";
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `오늘 ${hh}:${mm} 상차`;
  }
  return `${v} 상차`;
}

function parseCargoAndRequests(raw?: string) {
  const text = String(raw ?? "").trim();
  if (!text) return { cargo: "", requests: [] as string[], pickupContact: "", tags: [] as string[], packaging: "" };

  const parts = text.split(/\s*\|\s*/).map((x) => x.trim()).filter(Boolean);
  if (parts.length <= 1) return { cargo: text, requests: [] as string[], pickupContact: "", tags: [] as string[], packaging: "" };

  let cargo = "";
  const requests: string[] = [];
  let pickupContact = "";
  const tags: string[] = [];
  let packaging = "";

  for (const part of parts) {
    if (part.startsWith("화물:")) {
      cargo = part.replace(/^화물:/, "").trim();
      continue;
    }
    if (part.startsWith("요청태그:")) {
      const rawTags = part.replace(/^요청태그:/, "").trim();
      rawTags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((t) => tags.push(t));
      continue;
    }
    if (part.startsWith("직접입력:")) {
      requests.push(`직접 요청: ${part.replace(/^직접입력:/, "").trim()}`);
      continue;
    }
    if (part.startsWith("추가메모:")) {
      requests.push(`추가 메모: ${part.replace(/^추가메모:/, "").trim()}`);
      continue;
    }
    if (part.startsWith("상차지 연락처:")) {
      pickupContact = part.replace(/^상차지 연락처:/, "").trim();
      continue;
    }
    if (part.startsWith("하차지 연락처:")) {
      continue;
    }
    if (part.startsWith("상하차방식:")) {
      // 상하차 방식은 요청사항 카드에서 제외
      continue;
    }
    if (part.startsWith("포장:")) {
      packaging = part.replace(/^포장:/, "").trim();
      continue;
    }
  }

  if (!cargo) {
    cargo = parts.find((x) => !x.includes(":")) ?? "";
  }

  return { cargo, requests, pickupContact, tags, packaging };
}

function normalizeDisplayText(v?: string) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return "";
  return s;
}

type ActionButtonConfig = {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  disabled?: boolean;
};

type ReportType = "ACCIDENT" | "NO_SHOW" | "RUDE" | "ETC";

const REVIEWED_ORDER_IDS_STORAGE_KEY = "baro_shipper_reviewed_order_ids_v1";

async function loadReviewedOrderIds() {
  try {
    const raw = await AsyncStorage.getItem(REVIEWED_ORDER_IDS_STORAGE_KEY);
    if (!raw) return new Set<number>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<number>();
    return new Set(parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x)));
  } catch {
    return new Set<number>();
  }
}

async function saveReviewedOrderIds(ids: Set<number>) {
  try {
    const arr = Array.from(ids.values()).filter((x) => Number.isFinite(x));
    await AsyncStorage.setItem(REVIEWED_ORDER_IDS_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // noop
  }
}

function getStatusInfo(status?: string) {
  switch (String(status ?? "").toUpperCase()) {
    case "APPLIED":
      return { label: "확인 대기", tone: "warning" as const };
    case "ACCEPTED":
      return { label: "배차 확정", tone: "info" as const };
    case "LOADING":
      return { label: "상차 작업 중", tone: "neutral" as const };
    case "IN_TRANSIT":
      return { label: "이동 중", tone: "neutral" as const };
    case "UNLOADING":
      return { label: "하차 작업 중", tone: "neutral" as const };
    case "COMPLETED":
      return { label: "운송 완료", tone: "neutral" as const };
    case "CANCELLED":
      return { label: "취소", tone: "warning" as const };
    default:
      return { label: "배차 대기", tone: "warning" as const };
  }
}

function GridItem({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <View style={s.gridItem}>
      <Text style={s.gridLabel}>{label}</Text>
      <Text style={s.gridValue}>{value}</Text>
      {!!subValue && <Text style={s.gridSubValue}>{subValue}</Text>}
    </View>
  );
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const { orderId, applicants } = useLocalSearchParams<{
    orderId?: string | string[];
    applicants?: string | string[];
  }>();

  const resolvedOrderId = useMemo(() => {
    const raw = Array.isArray(orderId) ? orderId[0] : orderId;
    return String(raw ?? "").trim();
  }, [orderId]);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantsOpen, setApplicantsOpen] = useState(false);
  const [applicantList, setApplicantList] = useState<AssignedDriverInfoResponse[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("ETC");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const applicantsFromParam = useMemo(() => {
    const raw = Array.isArray(applicants) ? applicants[0] : applicants;
    const n = Number(raw ?? "");
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  }, [applicants]);

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

  useEffect(() => {
    let active = true;

    void (async () => {
      const idNum = Number(order?.orderId ?? resolvedOrderId);
      if (!Number.isFinite(idNum)) return;
      if (order?.status && order.status !== "COMPLETED") {
        if (active) setReviewSubmitted(false);
        return;
      }

      const reviewedIds = await loadReviewedOrderIds();
      if (!active) return;

      if (reviewedIds.has(idNum)) {
        setReviewSubmitted(true);
        return;
      }

      try {
        const myReviews = await ReviewService.getMyReviews();
        if (!active || !Array.isArray(myReviews)) return;

        const matched = myReviews.some((row: any) => {
          const candidateOrderId = Number(
            row?.orderId ??
              row?.orderNo ??
              row?.order?.orderId ??
              row?.order?.orderNo ??
              row?.order?.id ??
              row?.targetOrderId ??
              row?.targetId
          );
          return Number.isFinite(candidateOrderId) && candidateOrderId === idNum;
        });

        if (matched) {
          setReviewSubmitted(true);
          reviewedIds.add(idNum);
          await saveReviewedOrderIds(reviewedIds);
        }
      } catch {
        // noop
      }
    })();

    return () => {
      active = false;
    };
  }, [order?.orderId, order?.status, resolvedOrderId]);

  const isWaiting = order?.status === "REQUESTED" || order?.status === "PENDING";
  const hasApplicants = useMemo(() => {
    if (!isWaiting) return false;
    if (applicantList.length > 0) return true;
    const serverCount = Number(order?.applicantCount ?? 0);
    return Math.max(serverCount, applicantsFromParam) > 0;
  }, [applicantList.length, applicantsFromParam, isWaiting, order?.applicantCount]);

  const totalPrice = useMemo(() => {
    if (!order) return 0;
    return (
      Number(order.basePrice ?? 0) +
      Number(order.laborFee ?? 0) +
      Number(order.packagingPrice ?? 0) +
      Number(order.insuranceFee ?? 0)
    );
  }, [order]);
  const parsedCargo = useMemo(() => parseCargoAndRequests(order?.cargoContent), [order?.cargoContent]);
  const requestSummary = useMemo(() => {
    const rows = [
      ...parsedCargo.requests,
      normalizeDisplayText(order?.remark),
      normalizeDisplayText(order?.memo),
    ].filter(Boolean);
    return rows.join("\n");
  }, [order?.memo, order?.remark, parsedCargo.requests]);
  const cargoName = useMemo(() => {
    const clean = normalizeDisplayText(parsedCargo.cargo);
    if (clean && !clean.includes("요청태그:") && !clean.includes("상하차방식:")) return clean;
    return "일반화물";
  }, [parsedCargo.cargo]);
  const requestTags = useMemo(() => {
    const tags = Array.isArray(order?.tag) ? order!.tag!.map((x) => String(x).trim()).filter(Boolean) : [];
    if (tags.length > 0) return tags;
    return parsedCargo.tags;
  }, [order?.tag, parsedCargo.tags]);
  const packagingOx = useMemo(() => {
    const v = normalizeDisplayText(parsedCargo.packaging).toLowerCase();
    if (!v) return "X";
    if (v.includes("없") || v.includes("미포장") || v === "x" || v === "n" || v === "no") return "X";
    return "O";
  }, [parsedCargo.packaging]);
  const shipperInfo = useMemo(() => {
    const userAny = order?.user as any;
    const businessName = String(
      userAny?.companyName ?? userAny?.businessName ?? userAny?.bizName ?? userAny?.corpName ?? ""
    ).trim();
    const isBusiness = businessName.length > 0;
    const label = isBusiness ? "업체명" : "화주명";
    const name = isBusiness ? businessName : String(order?.user?.nickname ?? "").trim() || "닉네임 없음";
    const phone = parsedCargo.pickupContact || "-";
    return { label, name, phone };
  }, [order?.user, parsedCargo.pickupContact]);
  const isCompleted = order?.status === "COMPLETED";
  const isSettled = order?.settlementStatus === "COMPLETED";
  const statusInfo = getStatusInfo(order?.status);

  const buttonConfig = useMemo<ActionButtonConfig | null>(() => {
    if (!order) return null;

    if (order.status === "REQUESTED" || order.status === "PENDING") {
      if (order.instant) {
        return {
          text: "배차 대기중",
          icon: "time-outline",
          color: "#94A3B8",
          disabled: true,
        };
      }
      return {
        text: "기사 선택",
        icon: "people-outline",
        color: c.brand.primary,
        disabled: false,
      };
    }

    if (order.status === "COMPLETED") {
      if (reviewSubmitted) {
        return {
          text: "평점 완료",
          icon: "checkmark-done-circle-outline",
          color: "#94A3B8",
          disabled: true,
        };
      }
      return {
        text: "평점 남기기",
        icon: "star-outline",
        color: c.brand.primary,
        disabled: false,
      };
    }

    return {
      text: "운송 현황",
      icon: "navigate-circle-outline",
      color: c.brand.primary,
    };
  }, [order, c.brand.primary, hasApplicants, reviewSubmitted]);

  const loadApplicants = async (idOverride?: number) => {
    const idNum = idOverride ?? Number(order?.orderId);
    if (!Number.isFinite(idNum)) return [];
    setApplicantsLoading(true);
    try {
      const list = await OrderApi.getApplicantsInfo(idNum);
      setApplicantList(list ?? []);
      return list ?? [];
    } catch {
      setApplicantList([]);
      return [];
    } finally {
      setApplicantsLoading(false);
    }
  };

  useEffect(() => {
    if (!isWaiting || !order) return;
    if (hasApplicants) {
      void loadApplicants(order.orderId);
    }
  }, [isWaiting, order?.orderId, hasApplicants]);

  const handleCopyAddress = async (baseAddr?: string, detailAddr?: string) => {
    const base = String(baseAddr ?? "").trim();
    const detail = String(detailAddr ?? "").trim();
    const value = [base, detail].filter(Boolean).join(" ");
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Alert.alert("알림", "주소가 복사되었습니다.");
  };

  const handleCall = async () => {
    const phone = String(order?.user?.phone ?? "").trim();
    if (!phone) {
      Alert.alert("안내", "연락처 정보가 없습니다.");
      return;
    }
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert("오류", "전화 앱을 실행할 수 없습니다.");
    }
  };

  const handleMainAction = async () => {
    if (!buttonConfig || buttonConfig.disabled || !order) return;
    if (isWaiting) {
      if (order.instant) {
        Alert.alert("안내", "운송 현황 기능은 준비 중입니다.");
        return;
      }
      await loadApplicants(order.orderId);
      setApplicantsOpen(true);
      return;
    }

    if (order.status === "COMPLETED") {
      setReviewOpen(true);
      return;
    }
    setActionLoading(true);
    try {
      Alert.alert("안내", `${buttonConfig.text} 기능은 준비 중입니다.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectDriver = async (driver: AssignedDriverInfoResponse) => {
    if (!order) return;
    const driverNo = Number(driver.userId);
    if (!Number.isFinite(driverNo)) {
      Alert.alert("오류", "기사 정보를 확인할 수 없습니다.");
      return;
    }
    setActionLoading(true);
    try {
      await OrderApi.selectDriver(order.orderId, driverNo);
      setApplicantsOpen(false);
      setOrder({
        ...order,
        status: "ACCEPTED",
        driverNo
      });
      Alert.alert("완료", `${driver.nickname} 기사로 배차가 확정되었습니다.`);
    } catch(err) {
      console.log("기사 선택 실패:", err);
      console.log(order);
      console.log(driverNo);
      Alert.alert("오류", "기사 선택에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!order) return;
    const rating = Math.max(1, Math.min(5, Math.floor(reviewRating)));
    const content = reviewContent.trim();
    if (!content) {
      Alert.alert("안내", "리뷰 내용을 입력해주세요.");
      return;
    }
    setReviewLoading(true);
    try {
      await ReviewService.createReview({
        orderId: Number(order.orderId),
        rating,
        content,
      });
      setReviewSubmitted(true);
      {
        const reviewedIds = await loadReviewedOrderIds();
        reviewedIds.add(Number(order.orderId));
        await saveReviewedOrderIds(reviewedIds);
      }
      setReviewOpen(false);
      Alert.alert("완료", "평점이 등록되었습니다.");
    } catch {
      Alert.alert("오류", "평점 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setReviewLoading(false);
    }
  };

  const resolveDriverChatTargetId = async () => {
    if (!order) return null;

    const toPositiveNumber = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const candidateIds = [
      (order as any)?.driverId,
      (order as any)?.driver_id,
      (order as any)?.assignedDriverId,
      (order as any)?.assigned_driver_id,
      (order as any)?.driver?.userId,
      (order as any)?.driver?.user?.id,
      (order as any)?.driver?.id,
      (order as any)?.assignedDriver?.userId,
      (order as any)?.assignedDriver?.id,
    ];
    for (const id of candidateIds) {
      const numeric = toPositiveNumber(id);
      if (numeric) return numeric;
    }

    const source = applicantList.length > 0 ? applicantList : await loadApplicants(order.orderId);
    if (source.length > 0) {
      const driverNo = toPositiveNumber(order.driverNo);
      if (driverNo) {
        const matched =
          source.find((d) => Number(d.driverId) === driverNo || Number(d.userId) === driverNo) ??
          source.find((d: any) => d?.selected === true || d?.assigned === true || d?.status === "ACCEPTED") ??
          (source.length === 1 ? source[0] : undefined);
        const matchedUserId = toPositiveNumber(matched?.userId);
        if (matchedUserId) return matchedUserId;
        const matchedDriverId = toPositiveNumber(matched?.driverId);
        if (matchedDriverId) return matchedDriverId;
      } else if (source.length === 1) {
        const onlyUserId = toPositiveNumber(source[0]?.userId);
        if (onlyUserId) return onlyUserId;
        const onlyDriverId = toPositiveNumber(source[0]?.driverId);
        if (onlyDriverId) return onlyDriverId;
      }
    }

    const driverNoFallback = toPositiveNumber(order.driverNo);
    if (driverNoFallback) {
      if (source.length > 0) {
        const matched =
          source.find((d) => Number(d.driverId) === driverNoFallback || Number(d.userId) === driverNoFallback) ??
          (source.length === 1 ? source[0] : undefined);
        const matchedUserId = toPositiveNumber(matched?.userId);
        if (matchedUserId) return matchedUserId;
      }
      return driverNoFallback;
    }

    return null;
  };

  const handleReport = () => {
    setReportOpen(true);
  };

  const handleSubmitReport = async () => {
    const id = Number(order?.orderId);
    const description = reportDescription.trim();

    if (!Number.isFinite(id) || id <= 0) {
      Alert.alert("오류", "오더 정보를 확인할 수 없습니다.");
      return;
    }
    if (!description) {
      Alert.alert("안내", "신고 내용을 입력해주세요.");
      return;
    }

    setReportLoading(true);
    try {
      await ReportService.createReport({
        orderId: id,
        reportType,
        description,
      });
      setReportOpen(false);
      setReportType("ETC");
      setReportDescription("");
      Alert.alert("완료", "신고가 접수되었습니다.");
    } catch (err) {
      console.error("신고 접수 실패:", err);
      Alert.alert("오류", "신고 접수에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setReportLoading(false);
    }
  };

  const handleStartChat = async () => {
    const targetId = await resolveDriverChatTargetId();
    if (!targetId) {
      Alert.alert("안내", "배차된 기사 정보를 아직 확인할 수 없습니다.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post<number>(`/api/chat/room/personal/${targetId}`);
      const roomId = res.data;
      router.push({
        pathname: "/(chat)/[roomId]",
        params: { roomId: String(roomId) },
      });
    } catch (err) {
      console.error("채팅방 생성 실패:", err);
      Alert.alert("오류", "채팅방을 열 수 없습니다.");
    } finally {
      setActionLoading(false);
    }
  };


  return (
    <View style={[s.container, { backgroundColor: c.bg.canvas }]}>
      <OrderDetailPageFrame
        title={order ? `오더 #${order.orderId}` : "오더 상세"}
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/(shipper)/(tabs)/orders" as any);
        }}
        isCompleted={isCompleted}
        isSettled={isSettled}
        surfaceColor={c.bg.surface}
        borderColor={c.border.default}
        textPrimary={c.text.primary}
        textSecondary={c.text.secondary}
        successSoft={c.status.successSoft}
        warningSoft={c.status.warningSoft}
        success={c.status.success}
        warning={c.status.warning}
      >

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={c.brand.primary} />
        </View>
      ) : !order ? (
        <View style={s.loadingWrap}>
          <Text style={{ color: c.text.primary, fontWeight: "800" }}>
            해당 오더를 찾을 수 없습니다.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              s.scrollContent,
              isCompleted && { paddingTop: 10 },
              { paddingBottom: 112 + Math.max(insets.bottom, 10) },
            ]}
          >
            <View
              style={[
                s.card,
                {
                  backgroundColor: c.bg.surface,
                  borderColor: c.border.default,
                  borderWidth: 1,
                },
              ]}
            >
              <View style={s.cardTop}>
                <View style={s.badgeGroup}>
                  {isCompleted ? (
                    <Badge
                      label={isSettled ? "정산완료" : "정산대기"}
                      tone={isSettled ? "success" : "warning"}
                      style={s.unifiedBadge}
                    />
                  ) : (
                    <>
                      <Badge
                        label={statusInfo.label}
                        tone={statusInfo.tone}
                        style={s.unifiedBadge}
                      />
                      <Badge
                        label={order.instant ? "바로배차" : "직접배차"}
                        tone={order.instant ? "urgent" : "direct"}
                        style={s.unifiedBadge}
                      />
                    </>
                  )}
                </View>
                <Text style={[s.dateText, { color: c.text.secondary }]}>{formatYmd(order.createdAt)}</Text>
              </View>

              <View style={s.routeBigRow}>
                <View style={s.addrBox}>
                  <Text style={s.addrBig}>{formatAddressBig(order.startAddr)}</Text>
                  <Text style={s.addrSmall}>
                    {formatDetailSubText(order.startAddr, order.startPlace)}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={24} color="#CBD5E1" />
                <View style={[s.addrBox, { alignItems: "flex-end" }]}>
                  <Text style={s.addrBig}>{formatAddressBig(order.endAddr)}</Text>
                  <Text style={s.addrSmall}>
                    {formatDetailSubText(order.endAddr, order.endPlace)}
                  </Text>
                </View>
              </View>

              <View style={s.infoBar}>
                <View style={s.infoItem}>
                  <MaterialCommunityIcons
                    name="map-marker-distance"
                    size={16}
                    color="#64748B"
                  />
                  <Text style={s.infoText}>{Math.round(order.distance || 0)}km</Text>
                </View>
                <View style={s.divider} />
                <View style={s.infoItem}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color="#64748B"
                  />
                  <Text style={s.infoText}>
                    {formatEstimatedDuration(order.duration)}
                  </Text>
                </View>
              </View>

              <View style={s.priceRow}>
                <Text style={s.priceLabel}>운송료</Text>
                <View style={s.priceRight}>
                  <Text
                    style={[
                      s.priceValue,
                      { color: order.instant ? "#EF4444" : c.brand.primary },
                    ]}
                  >
                    {totalPrice.toLocaleString()}
                  </Text>
                  <Badge
                    label={order.payMethod || "결제방식 미정"}
                    tone={
                      String(order.payMethod || "").includes("선착불")
                        ? "payPrepaid"
                        : "payDeferred"
                    }
                    style={{ marginLeft: 6, marginTop: 3 }}
                  />
                </View>
              </View>
            </View>

            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>운행 경로</Text>
              <View style={s.timelineContainer}>
                <View style={s.timelineLine} />

                <View style={s.timelineItem}>
                  <View style={[s.timelineDot, { backgroundColor: "#1E293B" }]}>
                    <Text style={s.dotText}>출</Text>
                  </View>
                  <View style={s.timelineContent}>
                    <Text style={s.timeLabel}>{formatSchedule(order.startSchedule)}</Text>
                    <Text style={s.placeTitle}>{order.startAddr || "-"}</Text>
                    <Text style={s.placeDetail}>{order.startPlace || "-"}</Text>
                    <Pressable
                      style={s.copyBtn}
                      onPress={() =>
                        void handleCopyAddress(order.startAddr, order.startPlace)
                      }
                    >
                      <Ionicons name="copy-outline" size={12} color="#475569" />
                      <Text style={s.copyText}>주소복사</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={[s.timelineItem, { marginTop: 20 }]}>
                  <View style={[s.timelineDot, { backgroundColor: "#4F46E5" }]}>
                    <Text style={s.dotText}>도</Text>
                  </View>
                  <View style={s.timelineContent}>
                    <Text style={[s.timeLabel, { color: "#4F46E5" }]}>하차 예정</Text>
                    <Text style={s.placeTitle}>{order.endAddr || "-"}</Text>
                    <Text style={s.placeDetail}>{order.endPlace || "-"}</Text>
                    <Pressable
                      style={s.copyBtn}
                      onPress={() =>
                        void handleCopyAddress(order.endAddr, order.endPlace)
                      }
                    >
                      <Ionicons name="copy-outline" size={12} color="#475569" />
                      <Text style={s.copyText}>주소복사</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>화물 정보</Text>
              <View style={s.gridContainer}>
                <GridItem
                  label="화물종류"
                  value={cargoName}
                  subValue={`포장 여부 ${packagingOx}`}
                />
                <GridItem
                  label="운송방식"
                  value={order.driveMode || "독차"}
                />
                <GridItem
                  label="상하차방법"
                  value={order.loadMethod || "지게차"}
                />
                <GridItem label="요청차종" value={order.reqCarType || "카고"} />
                <GridItem label="요청톤수" value={order.reqTonnage || `${Math.max(1, Number(order.tonnage || 1))}톤`} />
                <GridItem label="작업유형" value={order.workType || "일반"} />
              </View>
            </View>

            <View style={[s.sectionCard, { backgroundColor: c.bg.surface }]}>
              <Text style={[s.sectionTitle, { color: c.text.primary }]}>화주 정보</Text>
              <View
                style={[
                  s.managerBox,
                  { backgroundColor: c.bg.canvas, borderColor: c.border.default },
                ]}
              >
                <View style={s.managerRow}>
                  <Ionicons
                    name={shipperInfo.label === "업체명" ? "business-outline" : "person-circle-outline"}
                    size={18}
                    color={c.text.secondary}
                  />
                  <Text style={[s.managerLabel, { color: c.text.secondary }]}>{shipperInfo.label}</Text>
                  <Text style={[s.managerValue, { color: c.text.primary }]}>{shipperInfo.name}</Text>
                </View>

                <View style={[s.managerRow, { marginTop: 12 }]}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={c.text.secondary}
                  />
                  <Text style={[s.managerLabel, { color: c.text.secondary }]}>전화번호</Text>
                  <Text style={[s.managerValue, { color: c.text.primary }]}>{shipperInfo.phone}</Text>
                </View>
              </View>
            </View>

            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>요청사항</Text>
              {requestTags.length > 0 ? (
                <View style={s.requestTagWrap}>
                  {requestTags.map((tag, idx) => (
                    <View key={`${tag}-${idx}`} style={s.requestTagChip}>
                      <Text style={s.requestTagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {requestSummary ? (
                <View style={[s.remarkBox, requestTags.length > 0 && { marginTop: 10 }]}>
                  <Text style={s.remarkText}>{requestSummary}</Text>
                </View>
              ) : requestTags.length === 0 ? (
                <View style={s.remarkBox}>
                  <Text style={s.remarkText}>요청사항 없음</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={[s.bottomBar, { height: 84 + insets.bottom, paddingBottom: insets.bottom || 10 }]}>
            {!isWaiting ? (
              <View style={s.iconBtnGroup}>
                {order.status === "COMPLETED" ? (
                  <Pressable style={s.circleBtn} onPress={handleReport}>
                    <Ionicons name="notifications-outline" size={24} color="#DC2626" />
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      style={s.circleBtn}
                      onPress={() => void handleStartChat()}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={24}
                        color="#333"
                      />
                    </Pressable>
                    <Pressable style={s.circleBtn} onPress={() => void handleCall()}>
                      <Ionicons name="call-outline" size={24} color="#333" />
                    </Pressable>
                  </>
                )}
              </View>
            ) : null}

            <Pressable
              onPress={actionLoading ? undefined : () => void handleMainAction()}
              disabled={buttonConfig?.disabled}
              style={({ pressed }) => [
                s.mainActionBtn,
                {
                  backgroundColor:
                    buttonConfig?.color ?? c.brand.primary,
                  opacity:
                    pressed || actionLoading || buttonConfig?.disabled ? 0.7 : 1,
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "row",
                },
              ]}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons
                    name={buttonConfig?.icon ?? "checkmark-circle-outline"}
                    size={22}
                    color="#FFF"
                  />
                  <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "700" }}>
                    {buttonConfig?.text ?? "상세 보기"}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <Modal
            visible={applicantsOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setApplicantsOpen(false)}
          >
            <View style={s.modalBackdrop}>
              <View style={[s.modalCard, { backgroundColor: c.bg.surface }]}>
                <View style={s.modalHeader}>
                  <Text style={[s.modalTitle, { color: c.text.primary }]}>기사 선택</Text>
                  <Pressable onPress={() => setApplicantsOpen(false)} style={s.modalCloseBtn}>
                    <Ionicons name="close" size={20} color={c.text.secondary} />
                  </Pressable>
                </View>
                {applicantsLoading ? (
                  <View style={s.modalLoading}>
                    <ActivityIndicator color={c.brand.primary} />
                  </View>
                ) : applicantList.length === 0 ? (
                  <View style={s.modalLoading}>
                    <Text style={{ color: c.text.secondary, fontWeight: "700" }}>
                      신청한 기사가 없습니다.
                    </Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {applicantList.map((driver) => {
                      const driverNo = Number(driver.driverId ?? driver.userId);
                      return (
                        <Pressable
                          key={String(driverNo)}
                          style={[s.applicantItem, { borderColor: c.border.default }]}
                          onPress={() => void handleSelectDriver(driver)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[s.applicantName, { color: c.text.primary }]}>
                              {driver.nickname || "기사"}
                            </Text>
                            <Text style={[s.applicantMeta, { color: c.text.secondary }]}>
                              {driver.tonnage || "-"} {driver.carType || "-"} | 경력 {driver.career ?? 0}년
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={c.text.secondary} />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>

          <Modal
            visible={reportOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setReportOpen(false)}
          >
            <View style={s.modalBackdrop}>
              <View style={[s.modalCard, { backgroundColor: c.bg.surface }]}>
                <View style={s.modalHeader}>
                  <Text style={[s.modalTitle, { color: c.text.primary }]}>신고 접수</Text>
                  <Pressable onPress={() => setReportOpen(false)} style={s.modalCloseBtn}>
                    <Ionicons name="close" size={20} color={c.text.secondary} />
                  </Pressable>
                </View>

                <Text style={[s.reviewLabel, { color: c.text.primary }]}>신고 유형</Text>
                <View style={s.reportTypeWrap}>
                  {[
                    { key: "ACCIDENT" as ReportType, label: "사고" },
                    { key: "NO_SHOW" as ReportType, label: "노쇼" },
                    { key: "RUDE" as ReportType, label: "불친절" },
                    { key: "ETC" as ReportType, label: "기타" },
                  ].map((item) => {
                    const active = reportType === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => setReportType(item.key)}
                        style={[
                          s.reportTypeChip,
                          {
                            borderColor: active ? c.brand.primary : c.border.default,
                            backgroundColor: active ? "#EEF2FF" : c.bg.canvas,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? c.brand.primary : c.text.secondary,
                            fontWeight: active ? "800" : "600",
                            fontSize: 13,
                          }}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[s.reviewLabel, { color: c.text.primary, marginTop: 8 }]}>상세 내용</Text>
                <TextInput
                  value={reportDescription}
                  onChangeText={setReportDescription}
                  placeholder="신고 사유를 구체적으로 입력해주세요."
                  placeholderTextColor="#94A3B8"
                  style={[s.reviewInput, { color: c.text.primary, borderColor: c.border.default }]}
                  multiline
                />

                <Pressable
                  onPress={() => void handleSubmitReport()}
                  disabled={reportLoading}
                  style={({ pressed }) => [
                    s.reviewSubmitBtn,
                    {
                      backgroundColor: "#DC2626",
                      opacity: pressed || reportLoading ? 0.75 : 1,
                    },
                  ]}
                >
                  {reportLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={s.reviewSubmitText}>신고 접수</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Modal>

          <Modal
            visible={reviewOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setReviewOpen(false)}
          >
            <View style={s.modalBackdrop}>
              <View style={[s.modalCard, { backgroundColor: c.bg.surface }]}>
                <View style={s.modalHeader}>
                  <Text style={[s.modalTitle, { color: c.text.primary }]}>평점 남기기</Text>
                  <Pressable onPress={() => setReviewOpen(false)} style={s.modalCloseBtn}>
                    <Ionicons name="close" size={20} color={c.text.secondary} />
                  </Pressable>
                </View>

                <Text style={[s.reviewLabel, { color: c.text.primary }]}>별점</Text>
                <View style={s.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setReviewRating(n)} style={s.starBtn}>
                      <Ionicons
                        name={n <= reviewRating ? "star" : "star-outline"}
                        size={30}
                        color={n <= reviewRating ? "#F59E0B" : "#CBD5E1"}
                      />
                    </Pressable>
                  ))}
                </View>

                <Text style={[s.reviewLabel, { color: c.text.primary }]}>리뷰 내용</Text>
                <TextInput
                  value={reviewContent}
                  onChangeText={setReviewContent}
                  placeholder="기사님 운행에 대한 후기를 남겨주세요."
                  placeholderTextColor="#94A3B8"
                  style={[s.reviewInput, { color: c.text.primary, borderColor: c.border.default }]}
                  multiline
                />

                <Pressable
                  onPress={() => void handleSubmitReview()}
                  disabled={reviewLoading}
                  style={({ pressed }) => [
                    s.reviewSubmitBtn,
                    {
                      backgroundColor: c.brand.primary,
                      opacity: pressed || reviewLoading ? 0.75 : 1,
                    },
                  ]}
                >
                  {reviewLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={s.reviewSubmitText}>평점 등록</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Modal>
        </>
      )}
      </OrderDetailPageFrame>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  badgeGroup: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  unifiedBadge: { alignItems: "center" },
  dateText: { fontSize: 12, color: "#94A3B8", marginTop: 6 },
  routeBigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  addrBox: { flex: 1 },
  addrBig: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  addrSmall: { fontSize: 14, color: "#64748B" },
  infoBar: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 16,
  },
  infoText: { fontSize: 13, color: "#475569", fontWeight: "600" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  priceLabel: { fontSize: 14, color: "#64748B" },
  priceRight: { flexDirection: "row", alignItems: "center" },
  priceValue: { fontSize: 22, fontWeight: "900", color: "#1E293B" },
  timelineContainer: { position: "relative" },
  timelineLine: {
    position: "absolute",
    left: 14,
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: "#E2E8F0",
  },
  timelineItem: { flexDirection: "row", gap: 16 },
  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  dotText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  timelineContent: { flex: 1 },
  timeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6366F1",
    marginBottom: 4,
  },
  placeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  placeDetail: { fontSize: 13, color: "#64748B", marginBottom: 8 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  copyText: { fontSize: 11, color: "#475569" },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: {
    width: (width - 82) / 2,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
  },
  gridLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 4 },
  gridValue: { fontSize: 15, fontWeight: "700", color: "#334155" },
  gridSubValue: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  managerBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  managerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  managerLabel: {
    fontSize: 14,
    width: 60,
    marginLeft: 8,
  },
  managerValue: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  remarkBox: {
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  remarkText: { fontSize: 14, color: "#92400E", lineHeight: 20 },
  requestTagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  requestTagChip: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    gap: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  iconBtnGroup: { flexDirection: "row", gap: 10 },
  circleBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  mainActionBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoading: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  applicantItem: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  applicantMeta: {
    fontSize: 13,
    fontWeight: "600",
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  starBtn: {
    marginRight: 8,
  },
  reportTypeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  reportTypeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    marginBottom: 14,
    fontSize: 14,
  },
  reviewSubmitBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewSubmitText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
