import { OrderService } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { Badge } from "@/shared/ui/feedback/Badge";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

export default function OrderDetailScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const params = useLocalSearchParams();

  /**
   * 1. 데이터 파싱 로직
   * OrderCard에서 전달된 JSON 문자열 데이터를 객체로 변환합니다.
   */
  const data = useMemo(() => {
    try {
      return params.orderData ? JSON.parse(params.orderData as string) : null;
    } catch (e) {
      return null;
    }
  }, [params.orderData]);

  const [isDispatched, setIsDispatched] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * 2. 비즈니스 로직: 배차 액션 핸들러
   * 서버 API를 호출하여 배차 신청 또는 확정을 처리합니다.
   */
  const handleDispatchAction = async () => {
    try {
      setLoading(true);
      await OrderService.acceptOrder(data.orderId);
      setIsDispatched(true);
      Alert.alert(
        "완료",
        data.isInstant
          ? "배차가 확정되었습니다."
          : "배차 신청이 접수되었습니다.",
      );
    } catch (error) {
      Alert.alert("알림", "처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 3. 유틸리티: 날짜 변환 함수
   * createdAt 날짜를 '방금 전', 'N분 전' 형태의 상대적 시간으로 표시합니다.
   */
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "";
    const now = new Date();
    const created = new Date(dateString);
    const diffInMs = now.getTime() - created.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);

    if (diffInMins < 1) return "방금 전";
    if (diffInMins < 60) return `${diffInMins}분 전`;
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return dateString.substring(5, 10).replace("-", ".");
  };

  if (!data) return null;

  return (
    <View style={[s.container, { backgroundColor: "#F8FAFC" }]}>
      {/* --- 상단 헤더 섹션 --- */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <Text style={s.headerTitle}>오더 상세 정보</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* --- 메인 요약 카드 섹션 --- */}
        <View
          style={[
            s.mainCard,
            data.isInstant && {
              borderColor: "#ffb1b1",
              borderWidth: 1.5,
              backgroundColor: "#fdfdfd",
            },
          ]}
        >
          {/* 배지 및 업로드 시간 */}
          <View style={s.topRow}>
            <View style={s.badgeRow}>
              <Badge
                label={data.isInstant ? "바로배차" : "직접배차"}
                tone={data.isInstant ? "urgent" : "direct"}
                style={{ marginRight: 8 }}
              />
            </View>
            <Text style={[s.timeText, { color: c.text.secondary }]}>
              {formatRelativeTime(data.createdAt)}
            </Text>
          </View>

          {/* 상/하차지 및 거리 화살표 */}
          <View style={s.routeRow}>
            <View style={s.locGroup}>
              <Text style={s.locLabel}>상차지</Text>
              <Text style={s.cityName}>
                {data.startAddr?.split(" ")[0]} {data.startAddr?.split(" ")[1]}
              </Text>
              <Text style={s.dongName}>{data.startPlace}</Text>
            </View>

            <View style={s.arrowArea}>
              <View style={s.distBadge}>
                <Text style={s.distText}>{data.distance}km</Text>
              </View>
              <View style={s.line}>
                <View style={s.arrowHead} />
              </View>
            </View>

            <View style={[s.locGroup, { alignItems: "flex-end" }]}>
              <Text style={[s.locLabel, { textAlign: "right" }]}>하차지</Text>
              <Text style={[s.cityName, { textAlign: "right" }]}>
                {data.endAddr?.split(" ")[0]} {data.endAddr?.split(" ")[1]}
              </Text>
              <Text style={[s.dongName, { textAlign: "right" }]}>
                {data.endPlace}
              </Text>
            </View>
          </View>

          {/* 운송료 및 결제 방식 */}
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>운송료</Text>
            <View style={s.priceValGroup}>
              <Text
                style={[
                  s.priceVal,
                  { color: data.isInstant ? "#EF4444" : c.brand.primary },
                ]}
              >
                {(data.basePrice + (data.laborFee || 0)).toLocaleString()}원
              </Text>
              <Badge
                label={data.payMethod}
                tone={
                  data.payMethod.includes("선착불")
                    ? "payPrepaid"
                    : "payDeferred"
                }
                style={{ marginLeft: 8 }}
              />
            </View>
          </View>
        </View>

        {/* --- 운행 경로 상세 타임라인 섹션 --- */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="location-sharp" size={18} color="#1E293B" />
            <Text style={s.sectionTitle}>운행 경로</Text>
          </View>
          <View style={s.timelineContainer}>
            {/* 상차 지점 */}
            <View style={s.timelineItem}>
              <View style={[s.timelineDot, { backgroundColor: "#1E293B" }]}>
                <Text style={s.dotInText}>상</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={s.timelineLabel}>{data.startSchedule} 상차</Text>
                <Text style={s.timelineAddr}>
                  {data.startAddr} {data.startPlace}
                </Text>
                <Pressable
                  style={s.copyBtn}
                  onPress={() => Alert.alert("복사", "주소가 복사되었습니다.")}
                >
                  <Text style={s.copyText}>주소복사</Text>
                </Pressable>
              </View>
            </View>
            {/* 하차 지점 */}
            <View style={s.timelineItem}>
              <View style={[s.timelineDot, { backgroundColor: "#4F46E5" }]}>
                <Text style={s.dotInText}>하</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={[s.timelineLabel, { color: "#4F46E5" }]}>
                  하차 예정
                </Text>
                <Text style={s.timelineAddr}>
                  {data.endAddr} {data.endPlace}
                </Text>
                <Pressable
                  style={s.copyBtn}
                  onPress={() => Alert.alert("복사", "주소가 복사되었습니다.")}
                >
                  <Text style={s.copyText}>주소복사</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* --- 화물 상세 정보 그리드 섹션 --- */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="cube" size={18} color="#1E293B" />
            <Text style={s.sectionTitle}>화물 정보</Text>
          </View>
          <View style={s.grid}>
            <InfoBox
              label="차종/톤수"
              value={`${data.reqTonnage} ${data.reqCarType}`}
            />
            <InfoBox label="운송구분" value={data.driveMode || "독차 (단독)"} />
            <InfoBox label="화물종류" value={data.cargoContent} />
            <InfoBox label="중량" value="약 8톤" />
          </View>
        </View>

        {/* --- 요청 사항 섹션 --- */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons
              name="text-box-search"
              size={18}
              color="#1E293B"
            />
            <Text style={s.sectionTitle}>요청사항</Text>
          </View>
          <View style={s.memoBox}>
            <Text style={s.memoText}>{data.remark}</Text>
          </View>
        </View>
      </ScrollView>

      {/* --- F. 하단 액션 바 (고정 영역) --- */}
      <View style={s.bottomBar}>
        <View style={s.subButtons}>
          <Pressable style={s.iconBtn}>
            <Ionicons name="chatbubble-outline" size={24} color="#475569" />
          </Pressable>
          <Pressable
            style={s.iconBtn}
            onPress={() => Linking.openURL("tel:01012341234")}
          >
            <Ionicons name="call-outline" size={24} color="#475569" />
          </Pressable>
        </View>
        {/* 상태에 따라 텍스트와 변형(Variant)이 변화하는 메인 버튼 */}
        <Button
          style={s.mainActionBtn}
          title={
            isDispatched
              ? "길안내 시작"
              : data.isInstant
                ? "배차 확정"
                : "배차 신청"
          }
          onPress={
            isDispatched
              ? () => Alert.alert("내비게이션 실행")
              : handleDispatchAction
          }
          loading={loading}
          variant={isDispatched || data.isInstant ? "primary" : "outline"}
        />
      </View>
    </View>
  );
}

/**
 * 재사용 가능한 화물 정보 박스 컴포넌트
 */
const InfoBox = ({ label, value }: any) => (
  <View style={s.gridBox}>
    <Text style={s.gridLabel}>{label}</Text>
    <Text style={s.gridVal}>{value}</Text>
  </View>
);

/**
 * 스타일 정의 (StyleSheet)
 */
const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // 메인 카드 스타일
  mainCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  badgeRow: { flexDirection: "row" },
  timeText: { fontSize: 12, opacity: 0.6 },

  // 경로 및 거리 스타일
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  locGroup: { flex: 1.2 },
  locLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 4 },
  cityName: { fontSize: 22, fontWeight: "900", color: "#1E293B" },
  dongName: { fontSize: 14, color: "#64748B", marginTop: 4 },
  arrowArea: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  distBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    marginBottom: 6,
  },
  distText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  line: {
    width: "100%",
    height: 1,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  arrowHead: {
    position: "absolute",
    right: 0,
    top: -3,
    width: 7,
    height: 7,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "#CBD5E1",
    transform: [{ rotate: "45deg" }],
  },

  // 가격 정보 스타일
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  priceLabel: { fontSize: 14, color: "#64748B" },
  priceValGroup: { flexDirection: "row", alignItems: "center" },
  priceVal: { fontSize: 24, fontWeight: "900" },

  // 타임라인 스타일
  section: { marginBottom: 25 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  timelineContainer: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  timelineItem: { flexDirection: "row", gap: 15, marginBottom: 20 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dotInText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  timelineContent: { flex: 1 },
  timelineLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  timelineAddr: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  copyBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyText: { fontSize: 12, color: "#475569", fontWeight: "600" },

  // 그리드 및 기타 스타일
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridBox: {
    width: "48.5%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  gridLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 5 },
  gridVal: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  memoBox: {
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  memoText: { fontSize: 14, color: "#92400E", lineHeight: 22 },

  // 하단 바 스타일
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 24,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  subButtons: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  mainActionBtn: { flex: 1, height: 54, borderRadius: 16 },
});
