import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { ReviewService } from "@/shared/api/reviewService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { AssignedDriverInfoResponse, OrderResponse } from "@/shared/models/order";
import { Badge } from "@/shared/ui/feedback/Badge";

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

type ActionButtonConfig = {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  disabled?: boolean;
  isInstantStyle?: boolean;
};

function GridItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.gridItem}>
      <Text style={s.gridLabel}>{label}</Text>
      <Text style={s.gridValue}>{value}</Text>
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

  const buttonConfig = useMemo<ActionButtonConfig | null>(() => {
    if (!order) return null;

    if (order.status === "REQUESTED" || order.status === "PENDING") {
      if (order.instant) {
        return {
          text: "배차 대기중",
          icon: "time-outline",
          color: "#94A3B8",
          disabled: true,
          isInstantStyle: false,
        };
      }
      return {
        text: "기사 선택",
        icon: "people-outline",
        color: c.brand.primary,
        disabled: !hasApplicants,
        isInstantStyle: false,
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
      const list = await OrderApi.getApplicants(idNum);
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

  const handleCopyAddress = async (text?: string) => {
    const value = String(text ?? "").trim();
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
      if (!hasApplicants) return;
      if (!applicantList.length) {
        await loadApplicants(order.orderId);
      }
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
    const driverNo = Number(driver.driverId ?? driver.userId);
    if (!Number.isFinite(driverNo)) {
      Alert.alert("오류", "기사 정보를 확인할 수 없습니다.");
      return;
    }
    setActionLoading(true);
    try {
      await OrderApi.selectDriver(order.orderId, driverNo);
      setApplicantsOpen(false);
      setOrder({ ...order, status: "ACCEPTED", user: order.user ?? driver });
      Alert.alert("완료", `${driver.nickname} 기사로 배차가 확정되었습니다.`);
    } catch {
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
      setReviewOpen(false);
      Alert.alert("완료", "평점이 등록되었습니다.");
    } catch {
      Alert.alert("오류", "평점 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: c.bg.canvas }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text.secondary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: c.text.primary }]}>
          {order ? `오더 #${order.orderId}` : "오더 상세"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

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
              { paddingBottom: 112 + Math.max(insets.bottom, 10) },
            ]}
          >
            <View style={s.card}>
              <View style={s.cardTop}>
                <Badge
                  label={order.instant ? "바로배차" : "직접배차"}
                  tone={order.instant ? "urgent" : "direct"}
                />
                <Text style={s.dateText}>{formatYmd(order.createdAt)}</Text>
              </View>

              <View style={s.routeBigRow}>
                <View style={s.addrBox}>
                  <Text style={s.addrBig}>{formatAddressBig(order.startAddr)}</Text>
                  <Text style={s.addrSmall}>{formatAddressSmall(order.startAddr)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={24} color="#CBD5E1" />
                <View style={[s.addrBox, { alignItems: "flex-end" }]}>
                  <Text style={s.addrBig}>{formatAddressBig(order.endAddr)}</Text>
                  <Text style={s.addrSmall}>{formatAddressSmall(order.endAddr)}</Text>
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
                    style={{ marginLeft: 6 }}
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
                      onPress={() => void handleCopyAddress(order.startAddr)}
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
                      onPress={() => void handleCopyAddress(order.endAddr)}
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
                  label="차종/톤수"
                  value={`${order.reqTonnage || "-"} ${order.reqCarType || ""}`.trim()}
                />
                <GridItem label="운행구분" value={order.driveMode || "독차"} />
                <GridItem
                  label="화물종류"
                  value={order.cargoContent || order.memo || "-"}
                />
                <GridItem
                  label="중량"
                  value={order.loadWeight ? `${order.loadWeight}kg` : "정보 없음"}
                />
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
                    name="business-outline"
                    size={18}
                    color={c.text.secondary}
                  />
                  <Text style={[s.managerLabel, { color: c.text.secondary }]}>업체명</Text>
                  <Text style={[s.managerValue, { color: c.text.primary }]}>개인화주</Text>
                </View>

                <View style={[s.managerRow, { marginTop: 12 }]}>
                  <Ionicons
                    name="person-circle-outline"
                    size={18}
                    color={c.text.secondary}
                  />
                  <Text style={[s.managerLabel, { color: c.text.secondary }]}>화주명</Text>
                  <Text style={[s.managerValue, { color: c.text.primary }]}>
                    {order.user?.nickname || "닉네임 없음"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>요청사항</Text>
              <View style={s.remarkBox}>
                <Text style={s.remarkText}>
                  {order.remark?.trim() || order.memo?.trim() || "요청사항 없음"}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={[s.bottomBar, { height: 84 + insets.bottom, paddingBottom: insets.bottom || 10 }]}>
            {!isWaiting ? (
              <View style={s.iconBtnGroup}>
                <Pressable
                  style={s.circleBtn}
                  onPress={() => Alert.alert("안내", "채팅 기능은 준비 중입니다.")}
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
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
    marginBottom: 20,
  },
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
