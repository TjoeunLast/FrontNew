import React from "react";
import { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// 거리 계산 함수
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

export const PendingOrderCard = ({
  order,
  onCancel,
  onStart,
  onDetail,
  myLocation,
}: any) => {
  const { colors: c } = useAppTheme();

  const {
    startSchedule,
    reqTonnage,
    reqCarType,
    workType,
    startType,
    loadMethod,
    instant,
    payMethod,
    startLat,
    startLng,
  } = order;

  // 상태 및 총 금액 계산
  const isAccepted = order.status === "ACCEPTED";
  const totalPrice =
    (order.basePrice || 0) +
    (order.laborFee || 0) +
    (order.packagingPrice || 0);

  // 주소 요약
  const getShortAddr = (addr: string) =>
    addr ? `${addr.split(" ")[0]} ${addr.split(" ")[1] || ""}` : "";

  // 거리 계산 로직
  const distanceToStart = useMemo(() => {
    if (myLocation && startLat && startLng) {
      const d = getDistance(myLocation.lat, myLocation.lng, startLat, startLng);
      return `${d.toFixed(1)}km`;
    }
    return null;
  }, [myLocation, startLat, startLng]);

  return (
    <Pressable
      onPress={() => onDetail(Number(order.orderId))}
      style={[
        s.container,
        { borderColor: c.border.default, backgroundColor: c.bg.surface },
        isAccepted && { borderColor: c.brand.primary, borderWidth: 1.5 },
      ]}
    >
      {/* 내 위치에서 상차지 까지 거리 */}
      {distanceToStart && (
        <View style={s.centerDistance}>
          <MaterialCommunityIcons
            name="navigation-variant"
            size={14}
            color={c.brand.primary}
          />
          <Text style={[s.distanceText, { color: c.brand.primary }]}>
            상차지까지 {distanceToStart}
          </Text>
        </View>
      )}

      {/* 상단 영역 */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={isAccepted ? "배차 확정" : "승인 대기"}
            tone={isAccepted ? "info" : "warning"}
            style={{ marginRight: 8 }}
          />
        </View>
        <View style={s.detailLink}>
          <Text style={[s.detailText, { color: c.text.secondary }]}>
            #{order.orderId}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={c.text.secondary} />
        </View>
      </View>

      {/* 중단 영역 */}
      <View style={s.routeRow}>
        {/* 상차지 */}
        <View style={s.locGroup}>
          <Text style={[s.locLabel, { color: c.text.secondary }]}>상차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(order.startAddr)}
          </Text>
          <Text
            style={[s.placeText, { color: c.text.secondary }]}
            numberOfLines={1}
          >
            {order.startPlace}
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
              {order.distance ? `${order.distance}km` : "-"}
            </Text>
          </View>
          <View style={[s.line, { backgroundColor: c.border.default }]}>
            <View style={[s.arrowHead, { borderColor: c.border.default }]} />
          </View>
        </View>

        {/* 하차지 */}
        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={[s.locLabel, { color: c.text.secondary }]}>하차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
            numberOfLines={1}
          >
            {getShortAddr(order.endAddr)}
          </Text>
          <Text
            style={[
              s.placeText,
              { textAlign: "right", color: c.text.secondary },
            ]}
            numberOfLines={1}
          >
            {order.endPlace}
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
            {reqTonnage} {reqCarType} • {workType || "지게차"} • {startType} •{" "}
            {loadMethod}
          </Text>
        </View>

        <View style={s.priceColumn}>
          <View style={s.priceRow}>
            <Text style={[s.priceText, { color: c.brand.primary }]}>
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

      {/* 액션 버튼 영역*/}
      <View style={[s.actionArea, { borderTopColor: c.bg.canvas }]}>
        {order.status === "APPLIED" ? (
          <Pressable
            style={[s.btnPrimary, { backgroundColor: c.status.warning }]}
            onPress={() => onCancel(Number(order.orderId))}
          >
            <Ionicons
              name="close-circle-outline"
              size={18}
              color={c.text.inverse}
            />
            <Text style={[s.btnSecondaryText, { color: c.text.inverse }]}>
              배차 신청 취소
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[s.btnPrimary, { backgroundColor: c.brand.primary }]}
            onPress={() => onStart(Number(order.orderId))}
          >
            <Ionicons
              name="play-circle-outline"
              size={18}
              color={c.text.inverse}
            />
            <Text style={[s.btnPrimaryText, { color: c.text.inverse }]}>
              운송 시작하기
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

const s = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
  },
  centerDistance: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
  detailLink: { flexDirection: "row", alignItems: "center" },
  detailText: { fontSize: 13, marginRight: 2 },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locGroup: { flex: 1.5 },
  locLabel: { fontSize: 11, marginBottom: 4 },
  locName: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
  placeText: { fontSize: 12, marginTop: 4 },
  arrowArea: { flex: 0.8, alignItems: "center", marginTop: 18 },
  distBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  distText: { fontSize: 11, fontWeight: "700" },
  line: {
    width: "100%",
    height: 1,
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
  carText: { fontSize: 12, fontWeight: "500", opacity: 0.8 },
  priceColumn: { flex: 1.2, alignItems: "flex-end" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  priceText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  actionArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  btnPrimary: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "700" },
  btnSecondaryText: { fontSize: 15, fontWeight: "700" }, // 기존 스타일과 통합
});
