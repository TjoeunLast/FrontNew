import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { OrderResponse } from "@/shared/models/order";
import { Badge } from "@/shared/ui/feedback/Badge";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// 거리 계산 함수(하버사인 공식)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const DrOrderCard = ({
  order,
  myLocation,
}: {
  order: OrderResponse;
  myLocation?: any;
}) => {
  // 데이터 구조 분해 할당
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
    endType,
    startLat,
    startLng,
    loadMethod,
  } = order;

  const { colors: c } = useAppTheme();
  const router = useRouter();

  // totalPrice 계산(기본 운송료 + 수수료 + 포장비)
  const totalPrice = basePrice + (laborFee || 0) + (packagingPrice || 0);

  // 주소 요약
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0]} ${parts[1] || ""}`;
  };

  // 실시간 거리 계산
  const distanceText = useMemo(() => {
    if (myLocation && startLat && startLng) {
      const d = getDistance(myLocation.lat, myLocation.lng, startLat, startLng);
      return `${d.toFixed(1)}km`; // 소수점 첫째 자리까지 표시
    }
    return null;
  }, [myLocation, startLat, startLng]); // 이 값들이 바뀔 때만 재계산

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
        instant && {
          borderColor: c.status.danger,
          borderWidth: 2,
          elevation: 8,
        },
      ]}
    >
      {/* 내 위치 거리 표시 */}
      {distanceText && (
        <View style={s.centerDistance}>
          <MaterialCommunityIcons
            name="navigation-variant"
            size={14}
            color={c.brand.primary}
          />
          <Text style={[s.distanceText, { color: c.brand.primary }]}>
            내 위치에서 {distanceText}
          </Text>
        </View>
      )}

      {/* 상단 헤더 */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={instant ? "바로배차" : "직접배차"}
            tone={instant ? "urgent" : "direct"}
            style={{ marginRight: 8 }}
          />
          <Badge
            label={driveMode === "왕복" ? "왕복" : "편도"}
            tone="neutral"
          />
        </View>
        <Text style={[s.timeText, { color: c.text.secondary }]}>
          {createdAt?.substring(5, 10).replace("-", ".")}
        </Text>
      </View>

      {/* 운송 경로 */}
      <View style={s.routeRow}>
        {/* 상차지 섹션 */}
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

        {/* 경로 구분선 및 거리 정보 */}
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

        {/* 하차지 섹션 */}
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

      {/* 하단 정보 */}
      <View style={[s.bottomRow, { borderTopColor: c.bg.canvas }]}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            {startSchedule} 상차
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {/* 1. 당상 · 당착 (startType, endType) */}
            {order.startType} · {order.endType}
            {/* 2. 혼적 여부 (loadMethod) */}
            {` · ${order.loadMethod || "독차"}`}
            {/* 3. 수작업 여부 (laborFee가 존재하고 0이 아닐 때만 '수작업' 표시) */}
            {order.laborFee && order.laborFee !== 0 ? " · 수작업" : ""}
          </Text>
        </View>

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
  centerDistance: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 4,
  },
  distanceText: { fontSize: 13, fontWeight: "800" },
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
});
