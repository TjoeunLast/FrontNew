import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import apiClient from "@/shared/api/apiClient";
import { ReportService, ReviewService } from "@/shared/api/reviewService";

import { useOrderDetail } from "../model/useOrderDetail";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { ReceiptModal } from "@/features/driver/driving/ui/ReceiptModal";
import OrderDetailPageFrame from "./OrderDetailPageFrame";

const { width } = Dimensions.get("window");
type ReportType = "ACCIDENT" | "NO_SHOW" | "RUDE" | "ETC";
const REVIEWED_ORDER_IDS_STORAGE_KEY = "baro_driver_reviewed_order_ids_v1";

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

function buildChatLocationLabel(addr?: string, place?: string) {
  const placeText = String(place ?? "").trim();
  if (placeText) return placeText;
  const parts = String(addr ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "-";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

export default function OrderDetailScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
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
              row?.targetId
          );
          return Number.isFinite(candidateOrderId) && candidateOrderId === idNum;
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
      <View style={[s.container, s.center, { backgroundColor: c.bg.canvas }]}>
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
      order.endPlace
    )}`;
    const tonnageText =
      order.reqTonnage ||
      (Number.isFinite(Number(order.tonnage)) && Number(order.tonnage) > 0 ? `${order.tonnage}톤` : "");
    const vehicleText = [tonnageText, order.reqCarType || "차량"].filter(Boolean).join(" ");
    const cargoText = [vehicleText, order.cargoContent || "일반화물"].filter(Boolean).join(" · ");
    const priceText = `${totalPrice.toLocaleString()}원`;

    try {
      const res = await apiClient.post<number>(`/api/chat/room/personal/${targetId}`);
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

  return (
    <View style={[s.container, { backgroundColor: c.bg.canvas }]}>
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
          s.scrollContent,
          isCompleted && { paddingTop: 10 },
        ]}
      >
        {/* 메인 */}
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
                  {order.status !== "REQUESTED" && (
                    <Badge
                      label={statusInfo.label}
                      tone={statusInfo.tone}
                      style={s.unifiedBadge}
                    />
                  )}

                  {(order.status === "REQUESTED" ||
                    order.status === "APPLIED") && (
                    <Badge
                      label={order.instant ? "바로배차" : "직접배차"}
                      tone={order.instant ? "urgent" : "direct"}
                      style={s.unifiedBadge}
                    />
                  )}
                </>
              )}
            </View>
            <Text style={[s.dateText, { color: c.text.secondary }]}>
              {order.createdAt?.substring(0, 10)}
            </Text>
          </View>

          {/* 주소 영역 */}
          <View style={s.routeBigRow}>
            <View style={s.addrBox}>
              <Text style={[s.addrBig, { color: c.text.primary }]}>
                {formatAddress.big(order.startAddr)}
              </Text>
              <Text style={[s.addrSmall, { color: c.text.secondary }]}>
                {formatAddress.small(order.startAddr)} {order.startPlace}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={c.border.default} />
            <View style={[s.addrBox, { alignItems: "flex-end" }]}>
              <Text
                style={[
                  s.addrBig,
                  { color: c.text.primary, textAlign: "right" },
                ]}
              >
                {formatAddress.big(order.endAddr)}
              </Text>
              <Text
                style={[
                  s.addrSmall,
                  { color: c.text.secondary, textAlign: "right" },
                ]}
              >
                {formatAddress.small(order.endAddr)} {order.endPlace}
              </Text>
            </View>
          </View>

          {/* 인포 바 */}
          <View style={[s.infoBar, { backgroundColor: c.bg.canvas }]}>
            <View style={s.infoItem}>
              <MaterialCommunityIcons
                name="navigation-variant-outline"
                size={16}
                color={c.brand.primary}
              />
              <Text style={[s.infoText, { color: c.brand.primary }]}>
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
            <View style={[s.divider, { backgroundColor: c.border.default }]} />
            <View style={s.infoItem}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={16}
                color={c.text.secondary}
              />
              <Text style={[s.infoText, { color: c.text.primary }]}>
                {order.distance}km (운송)
              </Text>
            </View>
          </View>

          <View style={[s.priceRow, { borderTopColor: c.bg.canvas }]}>
            <Text style={[s.priceLabel, { color: c.text.secondary }]}>
              최종 운송료
            </Text>
            <Text
              style={[
                s.priceValue,
                { color: isSettled ? c.status.success : c.text.primary },
              ]}
            >
              {totalPrice.toLocaleString()}원
            </Text>
          </View>

          {/* 결제 방식 정해 진 후 다시 수정 */}
          {/* <View style={s.payMethodRow}>
            <Badge
              label={order.payMethod}
              tone={
                order.payMethod?.includes("선착불")
                  ? "payPrepaid"
                  : "payDeferred"
              }
              style={{ marginTop: 6, alignSelf: "flex-end" }}
            />
            <Text style={[s.payMethodText, { color: c.text.secondary }]}>
              {isSettled
                ? "정산계좌로 입금이 완료되었습니다"
                : "화주 확인 후 정산 일정에 따라 입금됩니다"}
            </Text>
          </View> */}
        </View>

        {/* 운행 경로 타임라인 */}
        <View style={[s.sectionCard, { backgroundColor: c.bg.surface }]}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            운행 경로
          </Text>
          <View style={s.timelineContainer}>
            <View
              style={[s.timelineLine, { backgroundColor: c.border.default }]}
            />
            <View style={s.timelineItem}>
              <View
                style={[s.timelineDot, { backgroundColor: c.brand.primary }]}
              >
                <Text style={s.dotText}>출발</Text>
              </View>
              <View style={s.timelineContent}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  {/* 상차 정보 */}
                  <Text style={[s.timeLabel, { color: c.brand.primary }]}>
                    {order.startSchedule} {startType}
                  </Text>
                </View>
                <Text style={[s.placeTitle, { color: c.text.primary }]}>
                  {order.startAddr}
                </Text>
                <Text style={[s.placeDetail, { color: c.text.secondary }]}>
                  {order.startPlace}
                </Text>
              </View>
            </View>
            <View style={[s.timelineItem, { marginTop: 24 }]}>
              <View
                style={[s.timelineDot, { backgroundColor: c.brand.primary }]}
              >
                <Text style={s.dotText}>도착</Text>
              </View>
              <View style={s.timelineContent}>
                {/* 하차 정보*/}
                <Text style={[s.timeLabel, { color: c.brand.primary }]}>
                  {order.endSchedule || "시간 미정"} {endType}
                </Text>
                <Text style={[s.placeTitle, { color: c.text.primary }]}>
                  {order.endAddr}
                </Text>
                <Text style={[s.placeDetail, { color: c.text.secondary }]}>
                  {order.endPlace}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 화물 정보 */}
        <View style={[s.sectionCard, { backgroundColor: c.bg.surface }]}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            화물 정보
          </Text>
          <View style={s.gridContainer}>
            <GridItem
              label="화물종류"
              value={order.cargoContent || "일반화물"}
            />
            <GridItem label="운송방식" value={order.driveMode || "독차"} />
            <GridItem label="상하차방법" value={order.loadMethod || "지게차"} />
            <GridItem label="요청차종" value={order.reqCarType || "카고"} />
            <GridItem label="요청톤수" value={order.reqTonnage || "1톤"} />
            <GridItem label="작업유형" value={order.workType || "일반"} />
          </View>
        </View>

        {/* 요청 사항 */}
        <View style={[s.sectionCard, { backgroundColor: c.bg.surface }]}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            요청 사항
          </Text>
          <View
            style={[
              s.memoBox,
              {
                backgroundColor: "#FFFBEB", // 연한 노란색 배경 (포스트잇 느낌)
                borderColor: "#FDE68A", // 조금 더 진한 노란색 테두리
              },
            ]}
          >
            <Text style={[s.memoText, { color: c.text.primary }]}>
              {order.memo || "등록된 요청 사항이 없습니다."}
            </Text>
          </View>
        </View>

        {/* 화주 정보 */}
        <View style={[s.sectionCard, { backgroundColor: c.bg.surface }]}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            화주 정보
          </Text>
          <View
            style={[
              s.managerBox,
              { backgroundColor: c.bg.canvas, borderColor: c.border.default },
            ]}
          >
            <View style={s.managerRow}>
              <Ionicons
                name="business-outline"
                size={18}
                color={c.text.secondary}
              />
              <Text style={[s.managerLabel, { color: c.text.secondary }]}>
                업체명
              </Text>
              <Text style={[s.managerValue, { color: c.text.primary }]}>
                {order.user?.nickname || "개인화주"}
              </Text>
            </View>
            <View style={[s.managerRow, { marginTop: 12 }]}>
              <Ionicons
                name="person-circle-outline"
                size={18}
                color={c.text.secondary}
              />
              <Text style={[s.managerLabel, { color: c.text.secondary }]}>
                연락처
              </Text>
              <Text style={[s.managerValue, { color: c.text.primary }]}>
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
          s.bottomBar,
          { backgroundColor: c.bg.surface, borderTopColor: c.border.default },
        ]}
      >
        {!isCompleted ? (
          <>
            {/* 채팅 및 전화 버튼 */}
            <View style={s.iconBtnGroup}>
              <Pressable
                style={[s.circleBtn, { borderColor: c.border.default }]}
                onPress={handleStartChat}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={24}
                  color={c.text.primary}
                />
              </Pressable>
              <Pressable
                style={[s.circleBtn, { borderColor: c.border.default }]}
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
                s.mainActionBtn,
                {
                  backgroundColor: buttonConfig.color,
                  opacity: pressed || loading ? 0.7 : 1,
                },
              ]}
            >
              <View style={s.btnContent}>
                <Ionicons
                  name={buttonConfig.icon as any}
                  size={22}
                  color="#FFF"
                />
                <Text style={s.mainActionText}>{buttonConfig.text}</Text>
              </View>
            </Pressable>
          </>
        ) : (
          <>
            <View style={s.iconBtnGroup}>
              <Pressable
                style={[s.circleBtn, { borderColor: c.border.default }]}
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
              onPress={reviewSubmitted ? undefined : () => setReviewOpen(true)}
              disabled={reviewSubmitted || reviewLoading}
              style={({ pressed }) => [
                s.mainActionBtn,
                {
                  backgroundColor: reviewSubmitted ? c.status.success : c.brand.primary,
                  opacity: pressed || reviewLoading ? 0.75 : 1,
                },
              ]}
            >
              <Text style={s.mainActionText}>
                {reviewSubmitted ? "평점 완료" : "평점 남기기"}
              </Text>
            </Pressable>
          </>
        )}
      </View>

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
              placeholder="화주에 대한 후기를 남겨주세요."
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
      <ReceiptModal visible={modalOpen} onClose={() => setModalOpen(false)} />
      </OrderDetailPageFrame>
    </View>
  );
}

const GridItem = ({ label, value }: { label: string; value: string }) => {
  const { colors: c } = useAppTheme();
  return (
    <View style={[s.gridItem, { backgroundColor: c.bg.canvas }]}>
      <Text style={[s.gridLabel, { color: c.text.secondary }]}>{label}</Text>
      <Text style={[s.gridValue, { color: c.text.primary }]}>{value}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  statusHeader: { margin: 16, marginBottom: 0, padding: 14, borderRadius: 16 },
  statusHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusHeaderText: { fontSize: 14, fontWeight: "700", flex: 1 },
  scrollContent: { padding: 16 },
  card: { borderRadius: 24, padding: 20, marginBottom: 16 },
  sectionCard: { borderRadius: 24, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 16 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  badgeGroup: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  unifiedBadge: { alignItems: "center" },
  dateText: { fontSize: 12 },
  routeBigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  addrBox: { flex: 1 },
  addrBig: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  addrSmall: { fontSize: 14, marginTop: 2 },
  infoBar: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  divider: { width: 1, height: 12, marginHorizontal: 16 },
  infoText: { fontSize: 13, fontWeight: "700" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 18,
    borderTopWidth: 1,
  },
  priceLabel: { fontSize: 14, fontWeight: "600" },
  priceRight: { flexDirection: "row", alignItems: "center" },
  priceValue: { fontSize: 24, fontWeight: "900" },
  payMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  payMethodText: { fontSize: 12, fontWeight: "500" },
  timelineContainer: { position: "relative" },
  timelineLine: {
    position: "absolute",
    left: 14,
    top: 24,
    bottom: 24,
    width: 2,
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
  dotText: { fontSize: 12, fontWeight: "900", color: "#FFF" },
  timelineContent: { flex: 1 },
  timeLabel: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  placeTitle: { fontSize: 16, fontWeight: "800" },
  placeDetail: { fontSize: 13, marginTop: 2 },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: (width - 82) / 2, padding: 16, borderRadius: 16 },
  gridLabel: { fontSize: 12, marginBottom: 6, fontWeight: "600" },
  gridValue: { fontSize: 15, fontWeight: "800" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
  },
  iconBtnGroup: { flexDirection: "row", gap: 10 },
  circleBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mainActionBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  mainActionText: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  managerBox: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  managerRow: { flexDirection: "row", alignItems: "center" },
  managerLabel: { fontSize: 14, width: 60, marginLeft: 8, fontWeight: "700" },
  managerValue: { fontSize: 15, fontWeight: "800", flex: 1 },
  memoBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 80, // 내용이 짧아도 어느 정도 영역을 확보해서 눈에 띄게 함
  },
  memoText: {
    fontSize: 15,
    lineHeight: 22, // 줄 간격을 넓혀서 긴 글도 읽기 편하게 함
    fontWeight: "600", // 내용을 좀 더 두껍게 해서 강조
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
