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
  hideDistance,
}: {
  order: OrderResponse;
  myLocation?: any;
  hideDistance?: boolean;
}) => {
  const {
    orderId,
    createdAt,
    startAddr,
    startSchedule,
    endAddr,
    reqCarType,
    reqTonnage,
    driveMode,
    basePrice,
    laborFee,
    packagingPrice,
    distance,
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

  const totalPrice = basePrice + (laborFee || 0) + (packagingPrice || 0);

  // 시/구 까지만 나오도록 짧게 자르기 (예: "서울특별시 강남구 역삼동" -> "서울 강남구")
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0].replace("특별시", "").replace("광역시", "").replace("특별자치도", "")} ${parts[1] || ""}`;
  };

  const distanceText = useMemo(() => {
    if (myLocation && startLat && startLng) {
      const d = getDistance(myLocation.lat, myLocation.lng, startLat, startLng);
      return `${d.toFixed(1)}km`;
    }
    return null;
  }, [myLocation, startLat, startLng]);

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
          elevation: 6,
        },
      ]}
    >
      {/* 1. 내 위치 거리 (옵션) */}
      {distanceText && !hideDistance && (
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

      {/* 2. 상단 헤더 (뱃지 & 등록시간) */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={instant ? "바로배차" : "직접배차"}
            tone={instant ? "urgent" : "direct"}
            style={{ marginRight: 6 }}
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

      {/* 3. 메인: 운송 경로 (큼직하게) */}
      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={[s.locType, { color: c.status.success }]}>
            {startType}
          </Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(startAddr)}
          </Text>
        </View>

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

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={[s.locType, { color: c.status.info }]}>{endType}</Text>
          <Text
            style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
            numberOfLines={1}
          >
            {getShortAddr(endAddr)}
          </Text>
        </View>
      </View>

      {/* 4. 하단: 요약 정보 & 단가 */}
      <View style={[s.bottomRow, { borderTopColor: c.bg.canvas }]}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            {startSchedule} 상차
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {`${reqTonnage} ${reqCarType} · `}

            <Text style={{ color: c.brand.primary, fontWeight: "800" }}>
              {loadMethod || "독차"}
            </Text>

            {order.laborFee && order.laborFee !== 0 ? (
              <Text style={{ color: c.status.danger, fontWeight: "800" }}>
                {" · 수작업"}
              </Text>
            ) : null}
          </Text>
        </View>

        <View style={s.priceColumn}>
          <Text
            style={[
              s.priceText,
              { color: instant ? c.status.danger : c.brand.primary },
            ]}
          >
            {totalPrice.toLocaleString()}원
          </Text>
          <Badge
            label={payMethod}
            tone={payMethod?.includes("선착불") ? "payPrepaid" : "payDeferred"}
            style={{ marginTop: 4, alignSelf: "flex-end" }}
          />
        </View>
      </View>
    </Pressable>
  );
};

const s = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    marginBottom: 16,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  timeText: { fontSize: 12, fontWeight: "500" },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locGroup: { flex: 1.5, justifyContent: "center" },
  locType: { fontSize: 12, fontWeight: "800", marginBottom: 4 },
  locName: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  arrowArea: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  distBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  distText: { fontSize: 11, fontWeight: "800" },
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
    paddingTop: 14,
    borderTopWidth: 1,
  },
  infoColumn: { flex: 1.5, justifyContent: "flex-end" },
  loadDateText: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  carText: { fontSize: 13, fontWeight: "600", letterSpacing: -0.2 },
  priceColumn: { flex: 1.2, alignItems: "flex-end" },
  priceText: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
});
