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
    status,
  } = order;

  const { colors: c } = useAppTheme();
  const router = useRouter();

  const totalPrice = basePrice + (laborFee || 0) + (packagingPrice || 0);

  // 내가 이미 신청한 오더인지 확인
  const isApplied = status === "APPLIED";

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
        {
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        },
        instant &&
          !isApplied && {
            borderColor: c.status.danger,
            borderWidth: 2,
          },
      ]}
    >
      {/* 1. 내 위치 거리 (옵션) */}
      {!isApplied && distanceText && !hideDistance && (
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
          {isApplied ? (
            // 승인 대기일 때는 이 뱃지만 딱 띄우기
            <Badge label="승인 대기" tone="warning" />
          ) : (
            <>
              <Badge
                label={instant ? "바로배차" : "직접배차"}
                tone={instant ? "urgent" : "direct"}
                style={{ marginRight: 6 }}
              />
              <Badge
                label={driveMode === "왕복" ? "왕복" : "편도"}
                tone="neutral"
              />
            </>
          )}
        </View>
        <Text
          style={[
            s.timeText,
            { color: c.text.secondary, opacity: isApplied ? 0.8 : 1 },
          ]}
        >
          {createdAt?.substring(5, 10).replace("-", ".")}
        </Text>
      </View>

      {/* 3. 메인: 운송 경로 */}
      <View style={[s.routeRow, { opacity: isApplied ? 0.8 : 1 }]}>
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
              { backgroundColor: c.bg.surface, borderColor: c.border.default },
            ]}
          >
            <Text style={[s.distText, { color: c.text.secondary }]}>
              {distance ? `${distance}km` : "-"}
            </Text>
          </View>
          <View style={[s.line, { backgroundColor: c.border.default }]} />
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
      <View
        style={[
          s.bottomRow,
          { borderTopColor: isApplied ? c.border.default : c.bg.canvas },
        ]}
      >
        <View style={[s.infoColumn, { opacity: isApplied ? 0.8 : 1 }]}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            {startSchedule} 상차
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {`${reqTonnage} ${reqCarType}`}
          </Text>
        </View>

        <View style={s.priceColumn}>
          <Text
            style={[
              s.priceText,
              {
                color: isApplied
                  ? c.text.secondary
                  : instant
                    ? c.status.danger
                    : c.brand.primary,
                opacity: isApplied ? 0.8 : 1,
              },
            ]}
          >
            {totalPrice.toLocaleString()}원
          </Text>
          {!isApplied && (
            <Badge
              label={payMethod}
              tone={
                payMethod?.includes("선착불") ? "payPrepaid" : "payDeferred"
              }
              style={{ marginTop: 4, alignSelf: "flex-end" }}
            />
          )}
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
