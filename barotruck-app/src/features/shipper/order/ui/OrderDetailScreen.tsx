import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";

import { ActivityIndicator, Alert, Linking, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import OrderDetailPageFrame from "@/features/driver/order-detail/ui/OrderDetailPageFrame";
import {
  getShipperOrderCancellationMessage,
  isShipperOrderExpired,
  parseShipperOrderSchedule,
  resolveShipperOrderStatus,
} from "@/features/shipper/order/lib/shipperOrderExpiry";
import { OrderDetailModals } from "@/features/shipper/order/ui/OrderDetailModals";
import { s } from "@/features/shipper/order/ui/OrderDetailScreen.styles";
import {
  type RoutePathPoint,
  type RoutePreviewData,
  requestDrivingRoutePath,
} from "@/features/shipper/order/ui/orderDetailRoute";
import {
  buildChatLocationLabel,
  normalizeDisplayText,
  parseCargoAndRequests,
  toFiniteNumber,
} from "@/features/shipper/order/ui/orderDetail.utils";
import { OrderDetailStatusContent } from "@/features/shipper/order/ui/status/OrderDetailStatusContent";
import {
  getMainActionButtonConfig,
  getOrderDetailStatusGroup,
  getOrderStatusInfo,
  isCompletedStatus,
  isWaitingStatus,
  type ActionButtonConfig,
} from "@/features/shipper/order/ui/status/orderDetailStatus";
import apiClient from "@/shared/api/apiClient";
import { KakaoLocalApi } from "@/shared/api/kakaoLocalService";
import { OrderApi } from "@/shared/api/orderService";
import { ProofService } from "@/shared/api/proofService";
import { ReportService, ReviewService } from "@/shared/api/reviewService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { type ReportTypeCode } from "@/shared/models/review";
import type { AssignedDriverInfoResponse, OrderResponse } from "@/shared/models/order";
import type { ProofResponse } from "@/shared/models/proof";
import { hasKakaoMapJsKey } from "@/shared/ui/business/RoutePreviewModal";

type RoutePreviewBuildResult = {
  data: RoutePreviewData | null;
  usedFallbackLine: boolean;
  pathErrorMessage: string;
};

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
  const [routeLoading, setRouteLoading] = useState(false);
  const [routePreviewOpen, setRoutePreviewOpen] = useState(false);
  const [routePreviewData, setRoutePreviewData] = useState<RoutePreviewData | null>(null);
  const [routeWebviewError, setRouteWebviewError] = useState<string>("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportTypeCode>("ETC");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

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

  useEffect(() => {
    let active = true;

    const loadProof = async () => {
      const idNum = Number(order?.orderId ?? resolvedOrderId);
      if (!Number.isFinite(idNum) || !isCompletedStatus(order?.status)) {
        if (active) {
          setProof(null);
          setProofLoading(false);
        }
        return;
      }

      setProofLoading(true);
      try {
        const response = await ProofService.getProof(idNum);
        if (active) setProof(response);
      } catch {
        if (active) setProof(null);
      } finally {
        if (active) setProofLoading(false);
      }
    };

    void loadProof();

    return () => {
      active = false;
    };
  }, [order?.orderId, order?.status, resolvedOrderId]);

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
    const tags = Array.isArray(order?.tag) ? order.tag.map((x) => String(x).trim()).filter(Boolean) : [];
    if (tags.length > 0) return tags;
    return parsedCargo.tags;
  }, [order?.tag, parsedCargo.tags]);
  const packagingOx = useMemo(() => {
    return Number(order?.packagingPrice ?? 0) > 0 ? "O" : "X";
  }, [order?.packagingPrice]);
  const shipperInfo = useMemo(() => {
    const userAny = order?.user as any;
    const businessName = String(
      userAny?.companyName ?? userAny?.businessName ?? userAny?.bizName ?? userAny?.corpName ?? ""
    ).trim();
    const isBusiness = businessName.length > 0;
    const label = isBusiness ? "업체명" : "화주명";
    const name = isBusiness ? businessName : String(order?.user?.nickname ?? "").trim() || "닉네임 없음";
    const phone = String(order?.user?.phone ?? "").trim() || parsedCargo.pickupContact || "-";
    return { label, name, phone };
  }, [order?.user, parsedCargo.pickupContact]);
  const hasCancellationMeta = useMemo(() => {
    return Boolean(
      order?.cancellation?.cancelledAt ||
        order?.cancellation?.cancelReason ||
        order?.cancellation?.cancelledBy ||
        (order as any)?.cancelledAt ||
        (order as any)?.cancelReason ||
        (order as any)?.cancelledBy
    );
  }, [order]);
  const isExpiredCancellation = useMemo(() => isShipperOrderExpired(order), [order]);
  const displayOrder = useMemo(() => {
    if (!order) return null;
    const resolvedStatus = resolveShipperOrderStatus(order) ?? order.status;
    if (resolvedStatus !== "CANCELLED" || hasCancellationMeta) {
      return resolvedStatus === order.status ? order : { ...order, status: resolvedStatus };
    }

    const scheduledAt = parseShipperOrderSchedule(order.startSchedule);
    return {
      ...order,
      status: "CANCELLED" as const,
      cancellation: {
        cancelReason: "상차 예정 시간이 지나 자동 취소 처리되었습니다.",
        cancelledAt: scheduledAt?.toISOString() ?? new Date().toISOString(),
        cancelledBy: "SYSTEM",
      },
    };
  }, [hasCancellationMeta, order]);
  const isWaiting = isWaitingStatus(displayOrder?.status);
  const hasApplicants = useMemo(() => {
    if (!isWaiting) return false;
    if (applicantList.length > 0) return true;
    const serverCount = Number(displayOrder?.applicantCount ?? 0);
    return Math.max(serverCount, applicantsFromParam) > 0;
  }, [applicantList.length, applicantsFromParam, displayOrder?.applicantCount, isWaiting]);
  const isCompleted = isCompletedStatus(displayOrder?.status);
  const canCancelOrder = isWaitingStatus(displayOrder?.status) && !hasCancellationMeta && !isExpiredCancellation;
  const statusGroup =
    hasCancellationMeta || isExpiredCancellation ? "CANCELLED" : getOrderDetailStatusGroup(displayOrder?.status);
  const isSettled = order?.settlementStatus === "COMPLETED";
  const statusInfo = getOrderStatusInfo(displayOrder?.status);
  const statusHeaderText = useMemo(() => {
    if (statusGroup === "CANCELLED") {
      return getShipperOrderCancellationMessage(displayOrder);
    }
    if (isCompleted) {
      return isSettled
        ? "운송료 정산이 완료되었습니다."
        : "운송은 완료되었고, 정산 대기 중입니다.";
    }
    return undefined;
  }, [displayOrder, isCompleted, isSettled, statusGroup]);
  const statusHeaderVisible = statusGroup === "CANCELLED" || isCompleted;
  const statusHeaderIcon = statusGroup === "CANCELLED" ? "close-circle-outline" : undefined;
  const statusHeaderBackgroundColor = statusGroup === "CANCELLED" ? "#FEF2F2" : undefined;
  const statusHeaderTextColor = statusGroup === "CANCELLED" ? "#DC2626" : undefined;

  const buttonConfig = useMemo<ActionButtonConfig | null>(() => {
    return getMainActionButtonConfig({
      order: displayOrder,
      reviewSubmitted,
      brandPrimary: c.brand.primary,
    });
  }, [displayOrder, reviewSubmitted, c.brand.primary]);

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
    router.push(`/(common)/orders/${order.orderId}/transport-status` as any);
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
        driverNo,
      });
      Alert.alert("완료", `${driver.nickname} 기사로 배차가 확정되었습니다.`);
    } catch (err) {
      console.log("기사 선택 실패:", err);
      console.log(order);
      console.log(driverNo);
      Alert.alert("오류", "기사 선택에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setActionLoading(false);
    }
  };

  const runCancelOrder = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await OrderApi.cancelOrder(order.orderId, "화주 직접 취소");
      setApplicantsOpen(false);
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "CANCELLED",
              cancellation: {
                ...prev.cancellation,
                cancelReason: "화주 직접 취소",
                cancelledAt: new Date().toISOString(),
                cancelledBy: "SHIPPER",
              },
            }
          : prev
      );
      router.replace("/(shipper)/(tabs)/orders?tab=CANCEL" as any);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "취소 처리에 실패했습니다. 잠시 후 다시 시도해주세요.";
      Alert.alert("취소 실패", message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = () => {
    if (!order || !canCancelOrder || actionLoading) return;
    Alert.alert("화물 취소", "등록한 화물을 취소하시겠습니까?", [
      { text: "아니오", style: "cancel" },
      {
        text: "취소하기",
        style: "destructive",
        onPress: () => void runCancelOrder(),
      },
    ]);
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
        type: "REPORT",
        orderId: id,
        reportType,
        description,
      });
      setReportOpen(false);
      setReportType("ETC");
      setReportDescription("");
      Alert.alert("완료", "신고가 접수되었습니다.");
    } catch (err) {
      const serverMessage =
        typeof (err as any)?.response?.data?.message === "string"
          ? (err as any).response.data.message
          : typeof (err as any)?.response?.data === "string"
            ? (err as any).response.data
            : "";
      console.error("신고 접수 실패:", (err as any)?.response?.data ?? err);
      Alert.alert("오류", serverMessage || "신고 접수에 실패했습니다. 다시 시도해주세요.");
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

    const routeText = `${buildChatLocationLabel(order?.startAddr, order?.startPlace)} → ${buildChatLocationLabel(
      order?.endAddr,
      order?.endPlace
    )}`;
    const tonnageText =
      normalizeDisplayText(order?.reqTonnage) ||
      (Number.isFinite(Number(order?.tonnage)) && Number(order?.tonnage) > 0 ? `${order?.tonnage}톤` : "");
    const vehicleText = [tonnageText, normalizeDisplayText(order?.reqCarType) || "차량"].filter(Boolean).join(" ");
    const cargoText = [vehicleText, cargoName].filter(Boolean).join(" · ");
    const priceText = `${totalPrice.toLocaleString()}원`;

    setActionLoading(true);
    try {
      const res = await apiClient.post<number>(`/api/chat/room/personal/${targetId}`);
      const roomId = res.data;
      router.push({
        pathname: "/(chat)/[roomId]",
        params: {
          roomId: String(roomId),
          orderId: String(order?.orderId ?? ""),
          routeText,
          cargoText,
          priceText,
        },
      });
    } catch (err) {
      console.error("채팅방 생성 실패:", err);
      Alert.alert("오류", "채팅방을 열 수 없습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const buildRoutePreviewData = async (): Promise<RoutePreviewBuildResult> => {
    if (!order) return { data: null, usedFallbackLine: false, pathErrorMessage: "" };

    const directStartLat = toFiniteNumber((order as any)?.startLat);
    const directStartLng = toFiniteNumber((order as any)?.startLng);
    const directEndLat = toFiniteNumber((order as any)?.endLat);
    const directEndLng = toFiniteNumber((order as any)?.endLng);

    // 수정할 코드
  const startAddress = normalizeDisplayText(order.startAddr); // startPlace 제거
  const endAddress = normalizeDisplayText(order.endAddr);     // endPlace 제거
      // 수정할 코드

  const [startGeo, endGeo] = await Promise.all([
    directStartLat !== null && directStartLng !== null
      ? Promise.resolve({ lat: directStartLat, lng: directStartLng })
      : startAddress
        ? KakaoLocalApi.geocodeAddress(startAddress).catch((e) => {
            console.error("🔴 출발지 좌표 변환 실패:", e); // 에러 로그 추가
            return null;
          })
        : Promise.resolve(null),
    directEndLat !== null && directEndLng !== null
      ? Promise.resolve({ lat: directEndLat, lng: directEndLng })
      : endAddress
        ? KakaoLocalApi.geocodeAddress(endAddress).catch((e) => {
            console.error("🔴 도착지 좌표 변환 실패:", e); // 에러 로그 추가
            return null;
          })
        : Promise.resolve(null),
  ]);
  console.log("resolveRouteCoordinates - startGeo:", startGeo, "endGeo:", endGeo);

    if (!startGeo || !endGeo) return { data: null, usedFallbackLine: false, pathErrorMessage: "" };

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
      pathErrorMessage = pathError instanceof Error ? pathError.message : "unknown_error";
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
        path: drivingPath && drivingPath.length >= 2 ? drivingPath : fallbackLine,
      },
      usedFallbackLine: !drivingPath || drivingPath.length < 2,
      pathErrorMessage,
    };
  };

  useEffect(() => {
    let active = true;
    setRoutePreviewData(null);
    setRouteWebviewError("");

    if (!order) return () => void 0;

    setRouteLoading(true);
    void (async () => {
      try {
        const result = await buildRoutePreviewData();
        if (!active) return;
        if (result.data) setRoutePreviewData(result.data);
      } finally {
        if (active) setRouteLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [order?.orderId]);

  const handleOpenRouteMap = async () => {
    if (!order || routeLoading) return;
    setRouteLoading(true);
    try {
      const result = routePreviewData
        ? { data: routePreviewData, usedFallbackLine: false, pathErrorMessage: "" }
        : await buildRoutePreviewData();
      if (!result.data) {
        Alert.alert("안내", "출발지/도착지 좌표를 찾지 못했어요. 주소를 확인해주세요.");
        console.warn("경로 지도 데이터 없음:", { routeLoading, result, routePreviewData });
        console.warn("경로 지도 데이터 없음:", { orderId: order.orderId, result });
        return;
      }
      setRoutePreviewData(result.data);

      if (!hasKakaoMapJsKey()) {
        Alert.alert("안내", "지도 키가 없습니다. .env에 EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY를 추가해주세요.");
        return;
      }

      setRouteWebviewError("");
      if (result.usedFallbackLine) {
        const suffix = result.pathErrorMessage ? `\n(${result.pathErrorMessage})` : "";
        Alert.alert(
          "안내",
          `자동차 도로 경로를 불러오지 못해 직선으로 표시됩니다. REST 키/모빌리티 권한을 확인해주세요.${suffix}`
        );
      }
      setRoutePreviewOpen(true);
    } catch (error) {
      console.error("경로 지도 열기 실패:", error);
      Alert.alert("오류", "경로 지도를 열지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: c.bg.canvas }]}>
      <OrderDetailPageFrame
        title={displayOrder ? `오더 #${displayOrder.orderId}` : "오더 상세"}
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/(shipper)/(tabs)/orders" as any);
        }}
        rightActionLabel={canCancelOrder ? "취소" : undefined}
        onPressRightAction={canCancelOrder ? () => void handleCancelOrder() : undefined}
        rightActionDisabled={actionLoading}
        rightActionColor={c.status.danger}
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
        statusHeaderVisible={statusHeaderVisible}
        statusHeaderText={statusHeaderText}
        statusHeaderIcon={statusHeaderIcon}
        statusHeaderBackgroundColor={statusHeaderBackgroundColor}
        statusHeaderTextColor={statusHeaderTextColor}
      >
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={c.brand.primary} />
          </View>
        ) : !displayOrder ? (
          <View style={s.loadingWrap}>
            <Text style={{ color: c.text.primary, fontWeight: "800" }}>해당 오더를 찾을 수 없습니다.</Text>
          </View>
        ) : (
          <>
            <OrderDetailStatusContent
              order={displayOrder}
              statusGroup={statusGroup}
              insetsBottom={insets.bottom}
              isCompleted={isCompleted}
              isSettled={isSettled}
              statusInfo={statusInfo}
              totalPrice={totalPrice}
              cargoName={cargoName}
              packagingOx={packagingOx}
              shipperInfo={shipperInfo}
              requestTags={requestTags}
              requestSummary={requestSummary}
              proof={proof}
              proofLoading={proofLoading}
              routePreviewData={routePreviewData}
              routeWebviewError={routeWebviewError}
              onChangeRouteWebviewError={setRouteWebviewError}
              canRenderRouteMap={hasKakaoMapJsKey()}
              actionLoading={actionLoading}
              buttonConfig={buttonConfig}
              colors={{
                bgSurface: c.bg.surface,
                bgCanvas: c.bg.canvas,
                borderDefault: c.border.default,
                textPrimary: c.text.primary,
                textSecondary: c.text.secondary,
                brandPrimary: c.brand.primary,
              }}
              onOpenRouteMap={() => void handleOpenRouteMap()}
              onCopyAddress={(baseAddr, detailAddr) => void handleCopyAddress(baseAddr, detailAddr)}
              onMainAction={() => void handleMainAction()}
              onStartChat={() => void handleStartChat()}
              onCall={() => void handleCall()}
              onReport={handleReport}
            />

            <OrderDetailModals
              colors={{
                bgSurface: c.bg.surface,
                bgCanvas: c.bg.canvas,
                borderDefault: c.border.default,
                textPrimary: c.text.primary,
                textSecondary: c.text.secondary,
                brandPrimary: c.brand.primary,
              }}
              insetTop={Math.max(insets.top, 10)}
              applicantsOpen={applicantsOpen}
              applicantsLoading={applicantsLoading}
              applicantList={applicantList}
              onCloseApplicants={() => setApplicantsOpen(false)}
              onSelectDriver={(driver) => void handleSelectDriver(driver)}
              routePreviewOpen={routePreviewOpen}
              routePreviewData={routePreviewData}
              routeWebviewError={routeWebviewError}
              onChangeRouteWebviewError={setRouteWebviewError}
              onCloseRoutePreview={() => {
                setRoutePreviewOpen(false);
                setRouteWebviewError("");
              }}
              reportOpen={reportOpen}
              reportType={reportType}
              reportDescription={reportDescription}
              reportLoading={reportLoading}
              onCloseReport={() => setReportOpen(false)}
              onChangeReportType={setReportType}
              onChangeReportDescription={setReportDescription}
              onSubmitReport={() => void handleSubmitReport()}
              reviewOpen={reviewOpen}
              reviewRating={reviewRating}
              reviewContent={reviewContent}
              reviewLoading={reviewLoading}
              onCloseReview={() => setReviewOpen(false)}
              onChangeReviewRating={setReviewRating}
              onChangeReviewContent={setReviewContent}
              onSubmitReview={() => void handleSubmitReview()}
            />
          </>
        )}
      </OrderDetailPageFrame>
    </View>
  );
}
