import { OrderService } from "@/shared/api/orderService"; // [추가] 서비스 임포트
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { OrderResponse } from "@/shared/models/order";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Card } from "../base/Card";
import { Badge } from "../feedback/Badge";
import { OrderDetailModal } from "./OrderDetailModal";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const { colors: c } = useAppTheme();
  const [loading, setLoading] = useState(false); // [추가] 로딩 상태 관리
  const highlightColor = isInstant ? "#DC2626" : c.brand.primary;
  const [totalPrice, setTotalPrice] = useState(
    basePrice + (laborFee || 0) + (packagingPrice || 0) 
  );
  // [수정] 실제 API 연동 로직
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

  return (
    <>
      <Card
        onPress={() => setModalOpen(true)}
        style={[
          s.container,
          isInstant && { borderColor: "#FECACA", backgroundColor: "#FFFBFB" },
        ]}
      >
        <View style={s.topRow}>
          <View style={s.badgeRow}>
            {isInstant ? (
              <Badge
                label="바로 배차"
                tone="urgent"
                style={{
                  marginRight: 6,
                  height: 24,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              />
            ) : isDirect ? (
              <Badge
                label="직접 배차"
                tone="direct"
                style={{
                  marginRight: 6,
                  height: 24,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              />
            ) : null}
            <Badge
              label={driveMode === "왕복" ? "왕복" : "편도"}
              tone={driveMode === "왕복" ? "roundTrip" : "oneWay"}
              style={{
                height: 24,
                justifyContent: "center",
                alignItems: "center",
              }}
            />
          </View>
          <Text style={[s.timeText, { color: c.text.secondary }]}>
            {createdAt}
          </Text>
        </View>

        <View style={s.routeRow}>
          <View style={s.locGroup}>
            <Text style={[s.locLabel, { color: c.text.secondary }]}>
              상차지
            </Text>

            <Text
              style={[s.locName, { color: c.text.primary }]}
              numberOfLines={1}
            >
              {startAddr}
            </Text>
          </View>
          <View style={s.arrowArea}>
            <View style={[s.distBadge, { backgroundColor: "#F1F5F9" }]}>
              <Text style={s.distText}>{distance+"km" || "-"}</Text>
            </View>
            <View style={[s.line, { backgroundColor: "#E2E8F0" }]}>
              <View style={[s.arrowHead, { borderColor: "#E2E8F0" }]} />
            </View>
          </View>
          <View style={[s.locGroup, { alignItems: "flex-end" }]}>
            <Text style={[s.locLabel, { color: c.text.secondary }]}>
              하차지
            </Text>
            <Text
              style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
              numberOfLines={1}
            >
              {endAddr}
            </Text>
          </View>
        </View>
        <View style={s.bottomRow}>
          <View style={s.infoColumn}>
            <Text style={[s.loadDateText, { color: c.text.primary }]}>
              {startSchedule}
            </Text>

              {/* [수정] carInfo -> reqTonnage + reqCarType 조합 */}
            <Text style={[s.carText, { color: c.text.secondary }]}>
             {reqTonnage} {reqCarType}
            </Text>
          </View>

          <View style={s.priceColumn}>
            {/* [수정] price -> basePrice 활용 및 '수' 표시 추가 */}
            <Text style={[s.priceText, { color: highlightColor }]}>
              {totalPrice.toLocaleString()}원
              {/* 수작업비(laborFee)가 0보다 크면 '수' 표시 */}
              {laborFee && laborFee > 0 && (
                <Text style={{ fontSize: 14, color: '#EF4444' }}> (수)</Text>
              )}
            </Text>

            <Badge
              label={payMethod}
              tone={payMethod.includes("선착불") ? "payPrepaid" : "payDeferred"}
              style={{ alignSelf: "flex-end" }}
            />
          </View>
        </View>
      </Card>

      <OrderDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        isDispatched={isDispatched}
        onDispatch={handleDispatch}
        data={props}
        loading={loading} // [추가] 로딩 상태 전달
      />
    </>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  timeText: { fontSize: 12 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  locGroup: { flex: 1.2 },
  locLabel: { fontSize: 11, marginBottom: 4 },
  locName: { fontSize: 20, fontWeight: "800" },
  arrowArea: { flex: 1, alignItems: "center", paddingHorizontal: 10 },
  distBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  distText: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  line: { width: "100%", height: 1, position: "relative" },
  arrowHead: {
    position: "absolute",
    right: 0,
    top: -3,
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: "45deg" }],
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 4,
  },
  infoColumn: { flex: 1.5, justifyContent: "center" },
  loadDateText: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  carText: { fontSize: 13, fontWeight: "500" },
  priceColumn: { flex: 1, alignItems: "flex-end", justifyContent: "flex-end" },
  priceText: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "right",
  },
});
