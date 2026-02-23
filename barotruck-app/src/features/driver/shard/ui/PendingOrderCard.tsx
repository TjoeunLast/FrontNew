import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export const PendingOrderCard = ({
  order,
  onCancel,
  onStart,
  onDetail,
}: any) => {
  const { colors: c } = useAppTheme();

  // 1. 비즈니스 로직: 상태 플래그 및 금액 합산
  const isAccepted = order.status === "ACCEPTED";
  const totalPrice = order.basePrice + (order.laborFee || 0);

  // 2. 비즈니스 로직: 주소 요약
  const getShortAddr = (addr: string) =>
    addr ? `${addr.split(" ")[0]} ${addr.split(" ")[1] || ""}` : "";

  return (
    <Pressable
      onPress={() => onDetail(Number(order.orderId))}
      style={[
        s.container,
        { borderColor: c.border.default, backgroundColor: c.bg.surface },
        // [강조 스타일] 배차 확정 시 브랜드 컬러 테두리 적용
        // isAccepted && { borderColor: c.brand.primary, borderWidth: 2 },
      ]}
    >
      {/* SECTION: 상단 영역 (배차 상태 배지 및 상세 링크) */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={isAccepted ? "배차 확정" : "승인 대기"}
            tone={isAccepted ? "info" : "warning"}
            style={{ marginRight: 8 }}
          />
          {order.instant && <Badge label="바로배차" tone="urgent" />}
        </View>
        <View style={s.detailLink}>
          <Text style={[s.detailText, { color: c.text.secondary }]}>
            #{order.orderId}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={c.text.secondary} />
        </View>
      </View>

      {/* SECTION: 중단 영역 (운송 경로 시각화) */}
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

      {/* SECTION: 하단 영역 (작업 일정 및 운송료 정보) */}
      <View style={[s.bottomRow, { borderTopColor: c.bg.canvas }]}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            {order.startSchedule} 상차
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {order.reqTonnage} {order.reqCarType} •{" "}
            {order.cargoContent || "일반짐"}
          </Text>
        </View>
        <View style={s.priceColumn}>
          <Text
            style={[
              s.priceText,
              { color: isAccepted ? c.brand.primary : c.text.primary },
            ]}
          >
            {totalPrice.toLocaleString()}원
          </Text>
          <Badge
            label={order.payMethod === "PREPAID" ? "현금/선불" : "인수증/후불"}
            tone={order.payMethod === "PREPAID" ? "payPrepaid" : "payDeferred"}
            style={{ marginTop: 6, alignSelf: "flex-end" }}
          />
        </View>
      </View>

      {/* SECTION: 액션 버튼 영역 (신청 취소 또는 운송 시작) */}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
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
  btnSecondary: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: "700" },
});
