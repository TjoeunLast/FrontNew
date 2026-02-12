import { OrderService } from "@/shared/api/orderService"; // [추가] 서비스 임포트
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { OrderResponse } from "@/shared/models/order";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Card } from "../base/Card";
import { Badge } from "../feedback/Badge";

export type OrderCardProps = OrderResponse & {
  isDirect?: boolean;
  isInstant?: boolean;
};

export default function OrderCard(props: OrderCardProps) {
  const {
    isDirect,
    isInstant,
    orderId,
    status,
    createdAt,
    updated,

    startAddr,
    startPlace,
    startType,
    startSchedule,
  // 상차지 전체 주소 (예: 서울특별시 강남구 테헤란로 123)
  // 상차지 특정 명칭 (예: OO물류센터 A동 3번 도크) - 기사가 위치를 정확히 찾는 데 활용
  // 상차 방식 (예: 당상-당일 상차, 익상-다음날 상차, 야간상차)
  // 상차 예정 시간 (예: "2024-05-20 14:00" 또는 "오전 중")
  // 상차지 광역 자치단체명 (예: 서울, 경기, 부산) - 지역별 오더 필터링용

    endAddr,
    endPlace,
    endType,
    endSchedule,
      // --- [하차지 정보: 물건을 내리는 곳] ---
  // 하차지 전체 주소 (예: 경기도 용인시 처인구 ...)
  // 하차지 특정 명칭 (예: XX빌딩 후문 하역장)
  // 하차 방식 (예: 당착-당일 도착, 내착-내일 도착)
  // 하차 예정 시간
  // 하차지 광역 자치단체명 (예: 경기, 강원, 전남)

    cargoContent,
    loadMethod,
    workType,
    tonnage,
    reqCarType,
    reqTonnage,
    driveMode,
    // remark,
    // --- [화물 및 작업 세부 정보] ---
    // 화물 내용물 (예: 정밀 기계, 파레트 짐, 농산물 등)
    // 적재 방식 (예: 독차-차 한 대 전체 사용, 혼적-다른 짐과 같이 적재)
    // 상하차 작업 도구 (예: 지게차, 수작업, 크레인 등)
    // 화물 무게 단위 (예: 2.5 - 톤 단위)
    // 요청 차량 종류 (예: 카고, 윙바디, 냉동탑차, 라보 등)
    // 요청 차량 톤수 (예: 1톤, 5톤, 11톤 등)
    // 운행 모드 (예: 편도, 왕복, 경유 있음)

    basePrice,
    laborFee,
    packagingPrice,
    payMethod,
     // --- [금액 및 결제 정보] ---
    // 기본 운송료 (거리 및 톤수 기준 표준 운임)
    // 결제 방식 (예: 신용카드, 계좌이체, 인수증/후불, 선불)
    // 수작업비 (기사님이 직접 상하차를 도울 경우 발생하는 수고비)
    // 포장비용 (물건 보호를 위한 래핑, 파레트 제공 등 실비)

    distance,
  } = props;

  const [isDispatched, setIsDispatched] = useState(false);
  const { colors: c } = useAppTheme();
  const [loading, setLoading] = useState(false); // [추가] 로딩 상태 관리

  // 강조 색상 설정
  const highlightColor = isInstant ? "#4E46E5" : c.brand.primary;
  const [totalPrice] = useState(
    basePrice + (laborFee || 0) + (packagingPrice || 0),
  );

  // 실제 API 연동 로직
  const handleDispatch = async () => {
    try {
      setLoading(true);
      // 1. 서버에 배차 수락 요청 (PATCH /api/v1/orders/{orderId}/accept)
      await OrderService.acceptOrder(orderId); 
      
      // 2. 성공 시 UI 상태 변경
      setIsDispatched(true);
      Alert.alert("신청 완료", "배차 신청이 성공적으로 접수되었습니다.");
    } catch (error) {
      // 3. 실패 시 에러 처리
      console.error(error);
      Alert.alert("알림", "배차 신청 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 주소 요약 헬퍼 함수
  const getShortAddr = (addr: string) => {
    const parts = addr.split(" ");
    return `${parts[0]} ${parts[1] || ""}`;
  };

  // 날짜를 상대적 시간으로 변환하는 함수
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

    // 24시간이 지났다면 날짜 표시 (예: 02.11)
    return dateString.substring(5, 10).replace("-", ".");
  };

  const router = useRouter();

  // 카드 클릭 시 페이지 이동 로직
  const handlePress = () => {
    router.push({
      pathname: "/(driver)/order-detail",
      params: { orderData: JSON.stringify(props) },
    });
  };

  return (
    <>
      <Card
        onPress={handlePress}
        style={[
          s.container,
          isInstant && { borderColor: "#ffb1b1", backgroundColor: "#fdfdfd" },
        ]}
      >
        <View style={s.topRow}>
          <View style={s.badgeRow}>
            {isInstant ? (
              <Badge
                label="바로배차"
                tone="urgent"
                style={{ marginRight: 8 }}
              />
            ) : (
              <Badge
                label="직접배차"
                tone="direct"
                style={{ marginRight: 8 }}
              />
            )}
            <Badge
              label={driveMode === "왕복" ? "왕복" : "편도"}
              tone={driveMode === "왕복" ? "roundTrip" : "oneWay"}
            />
          </View>
          <Text style={[s.timeText, { color: c.text.secondary }]}>
            {formatRelativeTime(createdAt)}
          </Text>
        </View>

        <View style={s.routeRow}>
          <View style={s.locGroup}>
            <Text style={[s.locLabel, { color: "#94A3B8" }]}>상차지</Text>
            <Text
              style={[s.locName, { color: c.text.primary }]}
              numberOfLines={1}
            >
              {getShortAddr(startAddr)}
            </Text>
            <Text
              style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}
              numberOfLines={1}
            >
              {startPlace}
            </Text>
          </View>

          <View style={s.arrowArea}>
            <View
              style={[
                s.distBadge,
                {
                  backgroundColor: "#F8FAFC",
                  borderColor: "#F1F5F9",
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={s.distText}>{distance + "km" || "-"}</Text>
            </View>
            <View style={[s.line, { backgroundColor: "#E2E8F0" }]}>
              <View style={[s.arrowHead, { borderColor: "#CBD5E1" }]} />
            </View>
          </View>

          <View style={[s.locGroup, { alignItems: "flex-end" }]}>
            <Text style={[s.locLabel, { color: "#94A3B8" }]}>하차지</Text>
            <Text
              style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
              numberOfLines={1}
            >
              {getShortAddr(endAddr)}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#64748B",
                marginTop: 2,
                textAlign: "right",
              }}
              numberOfLines={1}
            >
              {endPlace}
            </Text>
          </View>
        </View>

        <View style={s.bottomRow}>
          <View style={s.infoColumn}>
            <Text style={[s.loadDateText, { color: c.text.primary }]}>
              {startSchedule} 상차
            </Text>
            <Text style={[s.carText, { color: c.text.secondary }]}>
              {reqTonnage} {reqCarType} • {workType || "지게차"} • {startType}
            </Text>
          </View>

          <View style={s.priceColumn}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "flex-end",
              }}
            >
              <Text
                style={[
                  s.priceText,
                  { color: isInstant ? "#EF4444" : c.brand.primary },
                ]}
              >
                {totalPrice.toLocaleString()}원
              </Text>
              {laborFee && laborFee > 0 && (
                <Text
                  style={{
                    fontSize: 13,
                    color: "#EF4444",
                    fontWeight: "bold",
                    marginLeft: 4,
                  }}
                >
                  (수)
                </Text>
              )}
            </View>
            <Badge
              label={payMethod}
              tone={payMethod.includes("선착불") ? "payPrepaid" : "payDeferred"}
              style={{ marginTop: 6, alignSelf: "flex-end" }}
            />
          </View>
        </View>
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  timeText: { fontSize: 12, opacity: 0.6 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  locGroup: { flex: 1.5 },
  locLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 2 },
  locName: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  arrowArea: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  distBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  distText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  line: { width: "100%", height: 1, position: "relative" },
  arrowHead: {
    position: "absolute",
    right: 0,
    top: -3,
    width: 7,
    height: 7,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    transform: [{ rotate: "45deg" }],
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  infoColumn: { flex: 1.5 },
  loadDateText: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  carText: { fontSize: 12, fontWeight: "500", opacity: 0.8 },
  priceColumn: { flex: 1, alignItems: "flex-end" },
  priceText: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "right",
  },
});
