import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export const PendingOrderCard = ({
  order,
  onCancel,
  onStart,
  onDetail,
}: any) => {
  const { colors: c } = useAppTheme();

  const {
    startSchedule,
    reqTonnage,
    reqCarType,
    workType,
    startType,
    endType,
    loadMethod,
    instant,
    payMethod,
    startLat,
    startLng,
    distance,
  } = order;

  // 상태 및 총 금액 계산
  const isAccepted = order.status === "ACCEPTED";
  const totalPrice =
    (order.basePrice || 0) +
    (order.laborFee || 0) +
    (order.packagingPrice || 0);

  // 주소 요약: "서울특별시 강남구 역삼동" -> "서울 강남구"
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0].replace("특별시", "").replace("광역시", "").replace("특별자치도", "")} ${parts[1] || ""}`;
  };

  return (
    <Pressable
      onPress={() => onDetail(Number(order.orderId))}
      style={[
        s.container,
        { borderColor: c.border.default, backgroundColor: c.bg.surface },
        isAccepted && { borderColor: c.brand.primary, borderWidth: 1.5 },
      ]}
    >
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

      {/* 중단 영역 (운송 경로) */}
      <View style={s.routeRow}>
        {/* 상차지 */}
        <View style={s.locGroup}>
          <Text style={[s.locType, { color: c.status.success }]}>
            {startType}
          </Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(order.startAddr)}
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

        {/* 하차지 */}
        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={[s.locType, { color: c.status.info }]}>{endType}</Text>
          <Text
            style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
            numberOfLines={1}
          >
            {getShortAddr(order.endAddr)}
          </Text>
        </View>
      </View>

      {/* 하단 정보 (DrOrderCard 디자인 통일) */}
      <View style={[s.bottomRow, { borderTopColor: c.bg.canvas }]}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            {startSchedule} 상차
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {`${reqTonnage} ${reqCarType} · ${loadMethod || "독차"}`}
            {order.laborFee && order.laborFee !== 0 ? " · 수작업" : ""}
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
            style={{ marginTop: 4, alignSelf: "flex-end" }}
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
  detailLink: { flexDirection: "row", alignItems: "center" },
  detailText: { fontSize: 13, marginRight: 2 },
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
    paddingTop: 14,
    borderTopWidth: 1,
  },
  infoColumn: { flex: 1.5, justifyContent: "flex-end" },
  loadDateText: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  carText: { fontSize: 13, fontWeight: "600", letterSpacing: -0.2 },
  priceColumn: { flex: 1.2, alignItems: "flex-end" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  priceText: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
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
  btnSecondaryText: { fontSize: 15, fontWeight: "700" },
});
