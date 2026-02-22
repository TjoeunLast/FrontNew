import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { OrderResponse } from "@/shared/models/order";
import { Badge } from "@/shared/ui/feedback/Badge";

export const DrOrderCard = (props: OrderResponse) => {
  const {
    orderId,
    createdAt,
    startAddr,
    startPlace,
    startSchedule,
    endAddr,
    endPlace,
    reqCarType,
    reqTonnage,
    driveMode,
    basePrice,
    laborFee,
    packagingPrice,
    distance,
    workType,
    instant,
    payMethod,
    startType,
  } = props;

  const { colors: c } = useAppTheme();
  const router = useRouter();

  // 1. 비즈니스 로직: 총 금액 합산 (기본료 + 수수료 + 포장비)
  const totalPrice = basePrice + (laborFee || 0) + (packagingPrice || 0);

  // 2. 비즈니스 로직: 주소 요약 (시/도 + 시/군/구만 추출)
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0]} ${parts[1] || ""}`;
  };

  // 3. 내비게이션: 오더 상세 페이지 이동
  const handlePress = () => {
    router.push({
      pathname: "/(driver)/order-detail/[id]",
      params: { id: orderId.toString() },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        s.container,
        { borderColor: c.border.default, backgroundColor: c.bg.surface },
        // 강조 상태: 바로배차(instant)일 때 별도 스타일 적용
        instant && {
          borderColor: c.badge.urgentBorder,
          backgroundColor: c.status.dangerSoft,
          elevation: 6,
        },
      ]}
    >
      {/* SECTION: 상단 헤더 (배차유형, 편도/왕복, 등록일자) */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={instant ? "바로배차" : "직접배차"}
            tone={instant ? "urgent" : "direct"}
            style={{ marginRight: 8 }}
          />
          <Badge
            label={driveMode === "왕복" ? "왕복" : "편도"}
            tone={driveMode === "왕복" ? "neutral" : "neutral"}
          />
        </View>
        <Text style={[s.timeText, { color: c.text.secondary }]}>
          {createdAt.substring(5, 10).replace("-", ".")}
        </Text>
      </View>

      {/* SECTION: 운송 경로 (상차지 → 거리 → 하차지 시각화) */}
      <View style={s.routeRow}>
        {/* 상차지 정보 */}
        <View style={s.locGroup}>
          <Text style={s.locLabel}>상차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(startAddr)}
          </Text>
          <Text
            style={[s.placeText, { color: c.text.secondary }]}
            numberOfLines={1}
          >
            {startPlace}
          </Text>
        </View>

        {/* 경로 구분선 및 거리 배지 */}
        <View style={s.arrowArea}>
          <View
            style={[
              s.distBadge,
              { backgroundColor: c.bg.canvas, borderColor: c.border.default },
            ]}
          >
            <Text style={[s.distText, { color: c.text.secondary }]}>
              {distance ? `${distance}km` : "-"}
            </Text>
          </View>
          <View style={[s.line, { backgroundColor: c.border.default }]}>
            <View style={[s.arrowHead, { borderColor: c.border.default }]} />
          </View>
        </View>

        {/* 하차지 정보 */}
        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={s.locLabel}>하차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
            numberOfLines={1}
          >
            {getShortAddr(endAddr)}
          </Text>
          <Text
            style={[
              s.placeText,
              { color: c.text.secondary, textAlign: "right" },
            ]}
            numberOfLines={1}
          >
            {endPlace}
          </Text>
        </View>
      </View>

      {/* SECTION: 하단 정보 (상차 일정, 차량/화물 특성, 운송료) */}
      <View style={[s.bottomRow, { borderTopColor: c.bg.canvas }]}>
        {/* 좌측: 작업 상세 정보 */}
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            {startSchedule} 상차
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {reqTonnage} {reqCarType} • {workType || "지게차"} • {startType}
          </Text>
        </View>

        {/* 우측: 가격 및 결제 방식 */}
        <View style={s.priceColumn}>
          <View style={s.priceRow}>
            <Text
              style={[
                s.priceText,
                { color: instant ? c.status.danger : c.brand.primary },
              ]}
            >
              {totalPrice.toLocaleString()}원
            </Text>
            {/* 수수료 발생 여부 표시 */}
            {laborFee && laborFee > 0 && (
              <Text style={[s.taxLabel, { color: c.status.danger }]}>
                {" "}
                (수)
              </Text>
            )}
          </View>
          <Badge
            label={payMethod}
            tone={payMethod?.includes("선착불") ? "payPrepaid" : "payDeferred"}
            style={{ marginTop: 6, alignSelf: "flex-end" }}
          />
        </View>
      </View>
    </Pressable>
  );
};

const s = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  timeText: { fontSize: 12 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  locGroup: { flex: 1.5 },
  locLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 2 },
  locName: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
  placeText: { fontSize: 12, marginTop: 2 },
  arrowArea: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  distBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  distText: { fontSize: 11, fontWeight: "700" },
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
    paddingTop: 12,
    borderTopWidth: 1,
  },
  infoColumn: { flex: 1.5 },
  loadDateText: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  carText: { fontSize: 12, fontWeight: "500" },
  priceColumn: { flex: 1.2, alignItems: "flex-end" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  priceText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  taxLabel: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
