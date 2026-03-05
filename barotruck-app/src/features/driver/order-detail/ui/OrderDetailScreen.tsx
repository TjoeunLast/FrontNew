import apiClient from "@/shared/api/apiClient";
import { KakaoLocalApi } from "@/shared/api/kakaoLocalService";
import { ReportService, ReviewService } from "@/shared/api/reviewService";
import {
  hasKakaoMapJsKey,
  RoutePreviewModal,
  RoutePreviewWebView,
} from "@/shared/ui/business/RoutePreviewModal";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReceiptModal } from "@/features/driver/driving/ui/ReceiptModal";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useOrderDetail } from "../model/useOrderDetail";
import OrderDetailPageFrame from "./OrderDetailPageFrame";
import { styles } from "./OrderDetailScreen.styles";

const { width } = Dimensions.get("window");
type ReportType = "ACCIDENT" | "NO_SHOW" | "RUDE" | "ETC";
const REVIEWED_ORDER_IDS_STORAGE_KEY = "baro_driver_reviewed_order_ids_v1";
type RoutePathPoint = {
  lat: number;
  lng: number;
};
type RoutePreviewData = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startLabel: string;
  endLabel: string;
  path: RoutePathPoint[];
};
type RoutePreviewBuildResult = {
  data: RoutePreviewData | null;
  usedFallbackLine: boolean;
  pathErrorMessage: string;
};

const KAKAO_MAP_JS_KEY = String(
  process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "",
).trim();
const KAKAO_MAP_WEBVIEW_BASE_URL = String(
  process.env.EXPO_PUBLIC_KAKAO_WEBVIEW_BASE_URL ?? "https://localhost",
).trim();
const KAKAO_REST_API_KEY = String(
  process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "",
).trim();

interface KakaoMobilityRoad {
  vertexes?: unknown;
}

interface KakaoMobilitySection {
  roads?: KakaoMobilityRoad[];
}

interface KakaoMobilityRoute {
  sections?: KakaoMobilitySection[];
}

interface KakaoMobilityDirectionsResponse {
  routes?: KakaoMobilityRoute[];
}

async function loadReviewedOrderIds() {
  try {
    const raw = await AsyncStorage.getItem(REVIEWED_ORDER_IDS_STORAGE_KEY);
    if (!raw) return new Set<number>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<number>();
    return new Set(
      parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x)),
    );
  } catch {
    return new Set<number>();
  }
}

async function saveReviewedOrderIds(ids: Set<number>) {
  try {
    const arr = Array.from(ids.values()).filter((x) => Number.isFinite(x));
    await AsyncStorage.setItem(
      REVIEWED_ORDER_IDS_STORAGE_KEY,
      JSON.stringify(arr),
    );
  } catch {
    // noop
  }
}

function buildChatLocationLabel(addr?: string, place?: string) {
  const placeText = String(place ?? "").trim();
  if (placeText) return placeText;
  const parts = String(addr ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "-";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

function normalizeDisplayText(value?: string) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  if (s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return "";
  return s;
}

function parseCargoAndRequests(raw?: string) {
  const text = String(raw ?? "").trim();
  if (!text)
    return {
      cargo: "",
      requests: [] as string[],
      tags: [] as string[],
      packaging: "",
    };

  const parts = text
    .split(/\s*\|\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length <= 1)
    return {
      cargo: text,
      requests: [] as string[],
      tags: [] as string[],
      packaging: "",
    };

  let cargo = "";
  const requests: string[] = [];
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
    if (part.startsWith("상하차방식:")) {
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

  return { cargo, requests, tags, packaging };
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseKakaoDrivingPath(
  payload: KakaoMobilityDirectionsResponse,
): RoutePathPoint[] {
  const points: RoutePathPoint[] = [];
  const roads =
    payload.routes?.[0]?.sections?.flatMap((section) => section.roads ?? []) ??
    [];
  for (const road of roads) {
    const vertexes = Array.isArray(road.vertexes) ? road.vertexes : [];
    for (let i = 0; i < vertexes.length - 1; i += 2) {
      const lng = toFiniteNumber(vertexes[i]);
      const lat = toFiniteNumber(vertexes[i + 1]);
      if (lat === null || lng === null) continue;
      const prev = points[points.length - 1];
      if (prev && prev.lat === lat && prev.lng === lng) continue;
      points.push({ lat, lng });
    }
  }
  return points;
}

async function requestDrivingRoutePath(params: {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}): Promise<RoutePathPoint[] | null> {
  if (!KAKAO_REST_API_KEY) return null;

  const query = new URLSearchParams({
    origin: `${params.startLng},${params.startLat}`,
    destination: `${params.endLng},${params.endLat}`,
    priority: "RECOMMEND",
    alternatives: "false",
    road_details: "false",
  });

  const response = await fetch(
    `https://apis-navi.kakaomobility.com/v1/directions?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `kakao_mobility_directions_failed:${response.status}:${err}`,
    );
  }

  const payload = (await response.json()) as KakaoMobilityDirectionsResponse;
  const path = parseKakaoDrivingPath(payload);
  if (path.length < 2) return null;
  return path;
}

export default function OrderDetailScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routePreviewOpen, setRoutePreviewOpen] = useState(false);
  const [routePreviewData, setRoutePreviewData] =
    useState<RoutePreviewData | null>(null);
  const [routeWebviewError, setRouteWebviewError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("ETC");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // 데이터 밒 기능 로드
  const {
    order, // 오더 상세 데이터
    loading, // 현재 상태에 맞는 하단 버튼 설정
    totalPrice,
    formatAddress,
    actions,
    buttonConfig,
    modalOpen,
    setModalOpen,
    myLocation,
    startType,
    endType,
  } = useOrderDetail();

  useEffect(() => {
    let active = true;

    void (async () => {
      const idNum = Number(order?.orderId);
      if (!Number.isFinite(idNum)) {
        if (active) setReviewSubmitted(false);
        return;
      }

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
        if (!active || !Array.isArray(myReviews)) {
          if (active) setReviewSubmitted(false);
          return;
        }

        const matched = myReviews.some((row: any) => {
          const candidateOrderId = Number(
            row?.orderId ??
              row?.orderNo ??
              row?.order?.orderId ??
              row?.order?.orderNo ??
              row?.order?.id ??
              row?.targetOrderId ??
              row?.targetId,
          );
          return (
            Number.isFinite(candidateOrderId) && candidateOrderId === idNum
          );
        });

        if (matched) {
          setReviewSubmitted(true);
          reviewedIds.add(idNum);
          await saveReviewedOrderIds(reviewedIds);
          return;
        }

        setReviewSubmitted(false);
      } catch {
        if (active) setReviewSubmitted(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [order?.orderId, order?.status]);

  // 방어 코드: 데이터 로딩 중 처리
  if (!order || !buttonConfig) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: c.bg.canvas },
        ]}
      >
        <ActivityIndicator size="large" color={c.brand.primary} />
      </View>
    );
  }

  // 거리 계산 함수
  const getDist = (lat: number, lng: number) => {
    if (!myLocation || !lat || !lng) return null;
    const R = 6371;
    const dLat = (lat - myLocation.lat) * (Math.PI / 180);
    const dLon = (lng - myLocation.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(myLocation.lat * (Math.PI / 180)) *
        Math.cos(lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const cVal = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * cVal).toFixed(1);
  };

  const distFromMe = order ? getDist(order.startLat, order.startLng) : null;

  // 전산 관련 상태 판단 변수
  const isCompleted = order.status === "COMPLETED";
  const isSettled = order.settlementStatus === "COMPLETED"; // 백엔드 수정 후 다시 수정

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "APPLIED":
        return { label: "승인 대기", tone: "warning" as const };
      case "ACCEPTED":
        return { label: "배차 확정", tone: "info" as const };
      case "LOADING":
        return { label: "상차 작업 중", tone: "neutral" as const };
      case "IN_TRANSIT":
        return { label: "운송 이동 중", tone: "neutral" as const };
      case "UNLOADING":
        return { label: "하차 작업 중", tone: "neutral" as const };
      case "COMPLETED":
        return { label: "운송 완료", tone: "neutral" as const };
      default:
        return { label: status, tone: "neutral" as const };
    }
  };

  const statusInfo = getStatusInfo(order.status);
  const parsedCargo = parseCargoAndRequests(order?.cargoContent);
  const cargoName = (() => {
    const clean = normalizeDisplayText(parsedCargo.cargo);
    if (clean && !clean.includes("요청태그:") && !clean.includes("상하차방식:"))
      return clean;
    return normalizeDisplayText(order?.cargoContent) || "일반화물";
  })();
  const requestSummary = (() => {
    const rows = [
      ...parsedCargo.requests,
      normalizeDisplayText(order?.remark),
      normalizeDisplayText(order?.memo),
    ].filter(Boolean);
    return rows.join("\n");
  })();
  const requestTags = (() => {
    const tags = Array.isArray(order?.tag)
      ? order.tag.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
    if (tags.length > 0) return tags;
    return parsedCargo.tags;
  })();
  const packagingOx = (() => {
    if (Number(order?.packagingPrice ?? 0) > 0) return "O";
    const parsed = normalizeDisplayText(parsedCargo.packaging);
    if (parsed.includes("미포장")) return "X";
    if (parsed.includes("포장")) return "O";
    return "X";
  })();

  const handleStartChat = async () => {
    // targetId는 오더의 화주 ID (userId)
    const targetId = (order as any)?.userId ?? (order as any)?.user.userId;
    console.log("채팅 시작 시도 - targetId:", targetId);
    if (!targetId) {
      Alert.alert("안내", "대화할 상대방 정보를 찾을 수 없습니다.");
      return;
    }

    const routeText = `${buildChatLocationLabel(order.startAddr, order.startPlace)} → ${buildChatLocationLabel(
      order.endAddr,
      order.endPlace,
    )}`;
    const tonnageText =
      order.reqTonnage ||
      (Number.isFinite(Number(order.tonnage)) && Number(order.tonnage) > 0
        ? `${order.tonnage}톤`
        : "");
    const vehicleText = [tonnageText, order.reqCarType || "차량"]
      .filter(Boolean)
      .join(" ");
    const cargoText = [vehicleText, order.cargoContent || "일반화물"]
      .filter(Boolean)
      .join(" · ");
    const priceText = `${totalPrice.toLocaleString()}원`;

    try {
      const res = await apiClient.post<number>(
        `/api/chat/room/personal/${targetId}`,
      );
      const roomId = res.data;
      router.push({
        pathname: "/(chat)/[roomId]",
        params: {
          roomId: String(roomId),
          orderId: String(order.orderId),
          routeText,
          cargoText,
          priceText,
        },
      });
    } catch (err) {
      console.error("채팅방 생성 실패:", err);
      Alert.alert("오류", "채팅방을 열 수 없습니다.");
    }
  };

  const handleSubmitReview = async () => {
    const id = Number(order?.orderId);
    const rating = Math.max(1, Math.min(5, Math.floor(reviewRating)));
    const content = reviewContent.trim();

    if (!Number.isFinite(id) || id <= 0) {
      Alert.alert("오류", "오더 정보를 확인할 수 없습니다.");
      return;
    }
    if (!content) {
      Alert.alert("안내", "리뷰 내용을 입력해주세요.");
      return;
    }

    setReviewLoading(true);
    try {
      await ReviewService.createReview({
        orderId: id,
        rating,
        content,
      });
      setReviewSubmitted(true);
      {
        const reviewedIds = await loadReviewedOrderIds();
        reviewedIds.add(id);
        await saveReviewedOrderIds(reviewedIds);
      }
      setReviewOpen(false);
      setReviewContent("");
      Alert.alert("완료", "평점이 등록되었습니다.");
    } catch (err) {
      console.error("평점 등록 실패:", err);
      Alert.alert("오류", "평점 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setReviewLoading(false);
    }
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

  const resolveRouteCoordinates = async (showAlert = true) => {
    if (!order) return null;
    const directStartLat = toFiniteNumber((order as any)?.startLat);
    const directStartLng = toFiniteNumber((order as any)?.startLng);
    const directEndLat = toFiniteNumber((order as any)?.endLat);
    const directEndLng = toFiniteNumber((order as any)?.endLng);

    const startAddress = normalizeDisplayText(order.startAddr); // startPlace 제거
    const endAddress = normalizeDisplayText(order.endAddr); // endPlace 제거

    const [startGeo, endGeo] = await Promise.all([
      directStartLat !== null && directStartLng !== null
        ? Promise.resolve({ lat: directStartLat, lng: directStartLng })
        : startAddress
          ? KakaoLocalApi.geocodeAddress(startAddress).catch(() => null)
          : Promise.resolve(null),
      directEndLat !== null && directEndLng !== null
        ? Promise.resolve({ lat: directEndLat, lng: directEndLng })
        : endAddress
          ? KakaoLocalApi.geocodeAddress(endAddress).catch(() => null)
          : Promise.resolve(null),
    ]);

    if (!startGeo || !endGeo) {
      if (showAlert)
        Alert.alert(
          "안내",
          "출발지/도착지 좌표를 찾지 못했어요. 주소를 확인해주세요.",
        );
      return null;
    }

    return { startGeo, endGeo };
  };

  const buildRoutePreviewData = async (): Promise<RoutePreviewBuildResult> => {
    const coords = await resolveRouteCoordinates(false);
    if (!coords || !order)
      return { data: null, usedFallbackLine: false, pathErrorMessage: "" };
    const { startGeo, endGeo } = coords;

    let drivingPath: RoutePathPoint[] | null = null;
    let pathErrorMessage = "";
    try {
      drivingPath = await requestDrivingRoutePath({
        startLat: startGeo.lat,
        startLng: startGeo.lng,
        endLat: endGeo.lat,
        endLng: endGeo.lng,
      });
    } catch (pathError) {
      console.error("도로 경로 좌표 조회 실패:", pathError);
      pathErrorMessage =
        pathError instanceof Error ? pathError.message : "unknown_error";
    }

    const fallbackLine = [
      { lat: startGeo.lat, lng: startGeo.lng },
      { lat: endGeo.lat, lng: endGeo.lng },
    ];
    return {
      data: {
        startLat: startGeo.lat,
        startLng: startGeo.lng,
        endLat: endGeo.lat,
        endLng: endGeo.lng,
        startLabel: normalizeDisplayText(order.startAddr) || "출발지",
        endLabel: normalizeDisplayText(order.endAddr) || "도착지",
        path:
          drivingPath && drivingPath.length >= 2 ? drivingPath : fallbackLine,
      },
      usedFallbackLine: !drivingPath || drivingPath.length < 2,
      pathErrorMessage,
    };
  };

  const handleOpenRouteMap = async () => {
    if (!order || routeLoading) return;
    setRouteLoading(true);
    try {
      const result = routePreviewData
        ? {
            data: routePreviewData,
            usedFallbackLine: false,
            pathErrorMessage: "",
          }
        : await buildRoutePreviewData();
      if (!result.data) {
        await resolveRouteCoordinates(true);
        return;
      }
      setRoutePreviewData(result.data);
      if (!hasKakaoMapJsKey()) {
        Alert.alert(
          "안내",
          "지도 키가 없습니다. .env에 EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY를 추가해주세요.",
        );
        return;
      }

      setRouteWebviewError("");
      if (result.usedFallbackLine) {
        const suffix = result.pathErrorMessage
          ? `\n(${result.pathErrorMessage})`
          : "";
        Alert.alert(
          "안내",
          `자동차 도로 경로를 불러오지 못해 직선으로 표시됩니다. REST 키/모빌리티 권한을 확인해주세요.${suffix}`,
        );
      }
      setRoutePreviewOpen(true);
    } catch (error) {
      console.error("경로 지도 열기 실패:", error);
      Alert.alert(
        "오류",
        "경로 지도를 열지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg.canvas }]}>
      <OrderDetailPageFrame
        title={`오더 #${order.orderId}`}
        onPressBack={actions.goBack}
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isCompleted && { paddingTop: 10 },
          ]}
        >
          {/* 메인 */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: c.bg.surface,
                borderColor: c.border.default,
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={styles.badgeGroup}>
                {isCompleted ? (
                  <Badge
                    label={isSettled ? "정산완료" : "정산대기"}
                    tone={isSettled ? "success" : "warning"}
                    style={styles.unifiedBadge}
                  />
                ) : (
                  <>
                    {order.status !== "REQUESTED" && (
                      <Badge
                        label={statusInfo.label}
                        tone={statusInfo.tone}
                        style={styles.unifiedBadge}
                      />
                    )}

                    {(order.status === "REQUESTED" ||
                      order.status === "APPLIED") && (
                      <Badge
                        label={order.instant ? "바로배차" : "직접배차"}
                        tone={order.instant ? "urgent" : "direct"}
                        style={styles.unifiedBadge}
                      />
                    )}
                  </>
                )}
              </View>
              <Text style={[styles.dateText, { color: c.text.secondary }]}>
                {order.createdAt?.substring(0, 10)}
              </Text>
            </View>

            {/* 주소 영역 */}
            <View style={styles.routeBigRow}>
              <View style={styles.addrBox}>
                <Text style={[styles.addrBig, { color: c.text.primary }]}>
                  {formatAddress.big(order.startAddr)}
                </Text>
                <Text style={[styles.addrSmall, { color: c.text.secondary }]}>
                  {formatAddress.small(order.startAddr)} {order.startPlace}
                </Text>
              </View>
              <Ionicons
                name="arrow-forward"
                size={24}
                color={c.border.default}
              />
              <View style={[styles.addrBox, { alignItems: "flex-end" }]}>
                <Text
                  style={[
                    styles.addrBig,
                    { color: c.text.primary, textAlign: "right" },
                  ]}
                >
                  {formatAddress.big(order.endAddr)}
                </Text>
                <Text
                  style={[
                    styles.addrSmall,
                    { color: c.text.secondary, textAlign: "right" },
                  ]}
                >
                  {formatAddress.small(order.endAddr)} {order.endPlace}
                </Text>
              </View>
            </View>

            {/* 인포 바 */}
            <View style={[styles.infoBar, { backgroundColor: c.bg.canvas }]}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons
                  name="navigation-variant-outline"
                  size={16}
                  color={c.brand.primary}
                />
                <Text style={[styles.infoText, { color: c.brand.primary }]}>
                  {isCompleted
                    ? "운송 완료"
                    : order.status === "LOADING" ||
                        order.status === "IN_TRANSIT" ||
                        order.status === "UNLOADING"
                      ? "운송 중"
                      : distFromMe
                        ? `내 위치에서 ${distFromMe}km`
                        : "계산 중..."}
                </Text>
              </View>
              <View
                style={[styles.divider, { backgroundColor: c.border.default }]}
              />
              <View style={styles.infoItem}>
                <MaterialCommunityIcons
                  name="map-marker-distance"
                  size={16}
                  color={c.text.secondary}
                />
                <Text style={[styles.infoText, { color: c.text.primary }]}>
                  {order.distance}km (운송)
                </Text>
              </View>
            </View>

            {/* 최종 운송료 */}
            <View style={[styles.priceRow, { borderTopColor: c.bg.canvas }]}>
              <Text style={[styles.priceLabel, { color: c.text.secondary }]}>
                최종 운송료
              </Text>
              <Text
                style={[
                  styles.priceValue,
                  { color: isSettled ? c.status.success : c.text.primary },
                ]}
              >
                {totalPrice.toLocaleString()}원
              </Text>
            </View>

            {/* 상세 운송료 내역 */}
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownRow}>
                <Text
                  style={[styles.breakdownLabel, { color: c.text.secondary }]}
                >
                  기본 운송료
                </Text>
                <Text
                  style={[styles.breakdownValue, { color: c.text.primary }]}
                >
                  {(order?.basePrice || 0).toLocaleString()}원
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text
                  style={[styles.breakdownLabel, { color: c.text.secondary }]}
                >
                  수작업비
                </Text>
                <Text
                  style={[styles.breakdownValue, { color: c.text.primary }]}
                >
                  {order!.laborFee.toLocaleString()}원
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text
                  style={[styles.breakdownLabel, { color: c.text.secondary }]}
                >
                  포장비
                </Text>
                <Text
                  style={[styles.breakdownValue, { color: c.text.primary }]}
                >
                  {order!.packagingPrice.toLocaleString()}원
                </Text>
              </View>
            </View>

            {/* 결제 방식 */}
            <View style={styles.payMethodRow}>
              <View style={styles.payMethodHeader}>
                <Text
                  style={[styles.breakdownLabel, { color: c.text.secondary }]}
                >
                  결제 방법
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: c.brand.primary,
                    fontWeight: "600",
                  }}
                >
                  {order?.payMethod || "-"}
                </Text>
              </View>
              <Text style={[styles.payMethodText, { color: c.text.secondary }]}>
                {isSettled
                  ? "정산계좌로 입금이 완료되었습니다"
                  : "화주 확인 후 정산 일정에 따라 입금됩니다"}
              </Text>
            </View>
          </View>

          {/* 운행 경로 타임라인 */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: c.bg.surface,
                borderColor: c.border.default,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>
              운행 경로
            </Text>
            <View style={styles.timelineContainer}>
              <View
                style={[
                  styles.timelineLine,
                  { backgroundColor: c.border.default },
                ]}
              />
              <View style={styles.timelineItem}>
                <View
                  style={[styles.timelineDot, { backgroundColor: "#1E293B" }]}
                >
                  <Text style={styles.dotText}>출발</Text>
                </View>
                <View style={styles.timelineContent}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {/* 상차 정보 */}
                    <Text style={[styles.timeLabel, { color: "#1E293B" }]}>
                      {order.startSchedule} {startType}
                    </Text>
                  </View>
                  <Text style={[styles.placeTitle, { color: c.text.primary }]}>
                    {order.startAddr}
                  </Text>
                  <Text
                    style={[styles.placeDetail, { color: c.text.secondary }]}
                  >
                    {order.startPlace}
                  </Text>
                </View>
              </View>
              <View style={[styles.timelineItem, { marginTop: 24 }]}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: c.brand.primary },
                  ]}
                >
                  <Text style={styles.dotText}>도착</Text>
                </View>
                <View style={styles.timelineContent}>
                  {/* 하차 정보*/}
                  <Text style={[styles.timeLabel, { color: c.brand.primary }]}>
                    {order.endSchedule || "시간 미정"} {endType}
                  </Text>
                  <Text style={[styles.placeTitle, { color: c.text.primary }]}>
                    {order.endAddr}
                  </Text>
                  <Text
                    style={[styles.placeDetail, { color: c.text.secondary }]}
                  >
                    {order.endPlace}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.routeMiniCard,
              {
                backgroundColor: c.bg.surface,
                borderColor: c.border.default,
                borderWidth: 1,
              },
            ]}
          >
            {/* 가로 정렬을 위한 헤더 영역 */}
            <View style={styles.routeMiniHeader}>
              <Text style={[styles.routeMiniTitle, { color: c.text.primary }]}>
                경로 지도
              </Text>
              <Pressable
                style={[
                  styles.routeMiniExpandBtn,
                  {
                    borderColor: c.border.default,
                    backgroundColor: c.bg.canvas,
                  },
                ]}
                onPress={() => void handleOpenRouteMap()}
              >
                <Ionicons
                  name="expand-outline"
                  size={14}
                  color={c.text.secondary}
                />
                <Text
                  style={[
                    styles.routeMiniExpandText,
                    { color: c.text.secondary },
                  ]}
                >
                  크게보기
                </Text>
              </Pressable>
            </View>

            {/* 지도 및 빈 상태 표시 영역 */}
            {!hasKakaoMapJsKey() ? (
              <View
                style={[
                  styles.routeMiniEmpty,
                  {
                    borderColor: c.border.default,
                    backgroundColor: c.bg.canvas,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.routeMiniEmptyText,
                    { color: c.text.secondary },
                  ]}
                >
                  지도 키 설정 후 경로 지도를 표시할 수 있습니다.
                </Text>
              </View>
            ) : routePreviewData ? (
              <View style={styles.routeMiniMapWrap}>
                <RoutePreviewWebView
                  data={routePreviewData}
                  onChangeError={setRouteWebviewError}
                  style={styles.routeMiniMapWebview}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.routeMiniEmpty,
                  {
                    borderColor: c.border.default,
                    backgroundColor: c.bg.canvas,
                  },
                ]}
              >
                <Ionicons name="map-outline" size={18} color="#64748B" />
                <Text
                  style={[
                    styles.routeMiniEmptyText,
                    { color: c.text.secondary },
                  ]}
                >
                  확대를 눌러 경로를 불러오세요.
                </Text>
              </View>
            )}

            {routeWebviewError ? (
              <Text style={styles.routeMiniErrorText} numberOfLines={2}>
                {routeWebviewError}
              </Text>
            ) : null}
          </View>

          {/* 화물 정보 */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: c.bg.surface,
                borderColor: c.border.default,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>
              화물 정보
            </Text>
            <View style={styles.gridContainer}>
              <GridItem
                label="화물종류"
                value={cargoName}
                // subValue={`포장 여부 ${packagingOx}`}
                bgColor={c.bg.canvas}
                textPrimary={c.text.primary}
                textSecondary={c.text.secondary}
              />
              <GridItem
                label="운송방식"
                value={order.driveMode || "독차"}
                bgColor={c.bg.canvas}
                textPrimary={c.text.primary}
                textSecondary={c.text.secondary}
              />
              <GridItem
                label="상하차방법"
                value={order.loadMethod || "지게차"}
                bgColor={c.bg.canvas}
                textPrimary={c.text.primary}
                textSecondary={c.text.secondary}
              />
              <GridItem
                label="요청차종"
                value={order.reqCarType || "카고"}
                bgColor={c.bg.canvas}
                textPrimary={c.text.primary}
                textSecondary={c.text.secondary}
              />
              <GridItem
                label="요청톤수"
                value={order.reqTonnage || "1톤"}
                bgColor={c.bg.canvas}
                textPrimary={c.text.primary}
                textSecondary={c.text.secondary}
              />
              <GridItem
                label="작업유형"
                value={order.workType || "일반"}
                bgColor={c.bg.canvas}
                textPrimary={c.text.primary}
                textSecondary={c.text.secondary}
              />
            </View>
          </View>

          {/* 요청 사항 */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: c.bg.surface,
                borderColor: c.border.default,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>
              요청 사항
            </Text>
            {requestTags.length > 0 ? (
              <View style={styles.requestTagWrap}>
                {requestTags.map((tag: string, idx: number) => (
                  <View key={`${tag}-${idx}`} style={styles.requestTagChip}>
                    <Text style={styles.requestTagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View
              style={[
                styles.memoBox,
                {
                  backgroundColor: "#FFFBEB", // 연한 노란색 배경 (포스트잇 느낌)
                  borderColor: "#FDE68A", // 조금 더 진한 노란색 테두리
                },
                requestTags.length > 0 && { marginTop: 10 },
              ]}
            >
              <Text style={[styles.memoText, { color: c.text.primary }]}>
                {requestSummary || "등록된 요청 사항이 없습니다."}
              </Text>
            </View>
          </View>

          {/* 화주 정보 */}
          <View style={[styles.sectionCard, { backgroundColor: c.bg.surface }]}>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>
              화주 정보
            </Text>
            <View
              style={[
                styles.managerBox,
                { backgroundColor: c.bg.canvas, borderColor: c.border.default },
              ]}
            >
              <View style={styles.managerRow}>
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={c.text.secondary}
                />
                <Text
                  style={[styles.managerLabel, { color: c.text.secondary }]}
                >
                  업체명
                </Text>
                <Text style={[styles.managerValue, { color: c.text.primary }]}>
                  {order.user?.nickname || "개인화주"}
                </Text>
              </View>
              <View style={[styles.managerRow, { marginTop: 12 }]}>
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color={c.text.secondary}
                />
                <Text
                  style={[styles.managerLabel, { color: c.text.secondary }]}
                >
                  연락처
                </Text>
                <Text style={[styles.managerValue, { color: c.text.primary }]}>
                  {order.user?.phone || "-"}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* 액션바 */}
        {/* !isCompleted(운송 중) */}
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: c.bg.surface, borderTopColor: c.border.default },
          ]}
        >
          {!isCompleted ? (
            <>
              {/* 채팅 및 전화 버튼 */}
              <View style={styles.iconBtnGroup}>
                <Pressable
                  style={[styles.circleBtn, { borderColor: c.border.default }]}
                  onPress={handleStartChat}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={24}
                    color={c.text.primary}
                  />
                </Pressable>
                <Pressable
                  style={[styles.circleBtn, { borderColor: c.border.default }]}
                  onPress={() =>
                    order.user?.phone
                      ? actions.callPhone(order.user.phone)
                      : Alert.alert("알림", "통화 불가")
                  }
                >
                  <Ionicons
                    name="call-outline"
                    size={24}
                    color={c.text.primary}
                  />
                </Pressable>
              </View>

              {/* 메인 버튼 */}
              <Pressable
                onPress={loading ? undefined : buttonConfig.onPress}
                style={({ pressed }) => [
                  styles.mainActionBtn,
                  {
                    backgroundColor: buttonConfig.color,
                    opacity: pressed || loading ? 0.7 : 1,
                  },
                ]}
              >
                <View style={styles.btnContent}>
                  <Ionicons
                    name={buttonConfig.icon as any}
                    size={22}
                    color="#FFF"
                  />
                  <Text style={styles.mainActionText}>{buttonConfig.text}</Text>
                </View>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.iconBtnGroup}>
                <Pressable
                  style={[styles.circleBtn, { borderColor: c.border.default }]}
                  onPress={handleReport}
                >
                  <MaterialCommunityIcons
                    name="alarm-light-outline"
                    size={24}
                    color="#DC2626"
                  />
                </Pressable>
              </View>

              <Pressable
                onPress={
                  reviewSubmitted ? undefined : () => setReviewOpen(true)
                }
                disabled={reviewSubmitted || reviewLoading}
                style={({ pressed }) => [
                  styles.mainActionBtn,
                  {
                    backgroundColor: reviewSubmitted
                      ? c.status.success
                      : c.brand.primary,
                    opacity: pressed || reviewLoading ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={styles.mainActionText}>
                  {reviewSubmitted ? "평점 완료" : "평점 남기기"}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <RoutePreviewModal
          visible={routePreviewOpen}
          data={routePreviewData}
          errorMessage={routeWebviewError}
          onChangeError={setRouteWebviewError}
          onClose={() => {
            setRoutePreviewOpen(false);
            setRouteWebviewError("");
          }}
          insetTop={Math.max(insets.top, 10)}
          colors={{
            bgCanvas: c.bg.canvas,
            borderDefault: c.border.default,
            textPrimary: c.text.primary,
            textSecondary: c.text.secondary,
          }}
        />

        <Modal
          visible={reportOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setReportOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: c.bg.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.text.primary }]}>
                  신고 접수
                </Text>
                <Pressable
                  onPress={() => setReportOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color={c.text.secondary} />
                </Pressable>
              </View>

              <Text style={[styles.reviewLabel, { color: c.text.primary }]}>
                신고 유형
              </Text>
              <View style={styles.reportTypeWrap}>
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
                        styles.reportTypeChip,
                        {
                          borderColor: active
                            ? c.brand.primary
                            : c.border.default,
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

              <Text
                style={[
                  styles.reviewLabel,
                  { color: c.text.primary, marginTop: 8 },
                ]}
              >
                상세 내용
              </Text>
              <TextInput
                value={reportDescription}
                onChangeText={setReportDescription}
                placeholder="신고 사유를 구체적으로 입력해주세요."
                placeholderTextColor="#94A3B8"
                style={[
                  styles.reviewInput,
                  { color: c.text.primary, borderColor: c.border.default },
                ]}
                multiline
              />

              <Pressable
                onPress={() => void handleSubmitReport()}
                disabled={reportLoading}
                style={({ pressed }) => [
                  styles.reviewSubmitBtn,
                  {
                    backgroundColor: "#DC2626",
                    opacity: pressed || reportLoading ? 0.75 : 1,
                  },
                ]}
              >
                {reportLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.reviewSubmitText}>신고 접수</Text>
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
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: c.bg.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.text.primary }]}>
                  평점 남기기
                </Text>
                <Pressable
                  onPress={() => setReviewOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color={c.text.secondary} />
                </Pressable>
              </View>

              <Text style={[styles.reviewLabel, { color: c.text.primary }]}>
                별점
              </Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setReviewRating(n)}
                    style={styles.starBtn}
                  >
                    <Ionicons
                      name={n <= reviewRating ? "star" : "star-outline"}
                      size={30}
                      color={n <= reviewRating ? "#F59E0B" : "#CBD5E1"}
                    />
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.reviewLabel, { color: c.text.primary }]}>
                리뷰 내용
              </Text>
              <TextInput
                value={reviewContent}
                onChangeText={setReviewContent}
                placeholder="화주에 대한 후기를 남겨주세요."
                placeholderTextColor="#94A3B8"
                style={[
                  styles.reviewInput,
                  { color: c.text.primary, borderColor: c.border.default },
                ]}
                multiline
              />

              <Pressable
                onPress={() => void handleSubmitReview()}
                disabled={reviewLoading}
                style={({ pressed }) => [
                  styles.reviewSubmitBtn,
                  {
                    backgroundColor: c.brand.primary,
                    opacity: pressed || reviewLoading ? 0.75 : 1,
                  },
                ]}
              >
                {reviewLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.reviewSubmitText}>평점 등록</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
        <ReceiptModal visible={modalOpen} onClose={() => setModalOpen(false)} />
      </OrderDetailPageFrame>
    </View>
  );
}

const GridItem = ({
  label,
  value,
  subValue,
  bgColor,
  textPrimary,
  textSecondary,
}: {
  label: string;
  value: string;
  subValue?: string;
  bgColor: string;
  textPrimary: string;
  textSecondary: string;
}) => {
  return (
    <View style={[styles.gridItem, { backgroundColor: bgColor }]}>
      <Text style={[styles.gridLabel, { color: textSecondary }]}>{label}</Text>
      <Text style={[styles.gridValue, { color: textPrimary }]}>{value}</Text>
      {subValue ? (
        <Text style={[styles.gridSubValue, { color: textSecondary }]}>
          {subValue}
        </Text>
      ) : null}
    </View>
  );
};
