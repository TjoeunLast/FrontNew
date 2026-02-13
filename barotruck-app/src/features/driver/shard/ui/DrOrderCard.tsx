import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { OrderResponse } from "@/shared/models/order"; //
import { Badge } from "@/shared/ui/feedback/Badge";

export const DrOrderCard = (props: OrderResponse) => {
  const {
    orderId,
    status,
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

  // 1. 금액 계산
  const totalPrice = basePrice + (laborFee || 0) + (packagingPrice || 0);

  // 2. 주소 요약 함수
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0]} ${parts[1] || ""}`;
  };

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
        instant && {
          borderColor: "#FFB1B1",
          backgroundColor: "#fff9f9",
          elevation: 6,
        },
      ]}
    >
      {/* --- 배지 및 시간 --- */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={instant ? "바로배차" : "직접배차"}
            tone={instant ? "urgent" : "direct"}
            style={{ marginRight: 8 }}
          />
          <Badge
            label={driveMode === "왕복" ? "왕복" : "편도"}
            tone={driveMode === "왕복" ? "roundTrip" : "oneWay"}
          />
        </View>
        <Text style={[s.timeText, { color: c.text.secondary }]}>
          {createdAt.substring(5, 10).replace("-", ".")}
        </Text>
      </View>

      {/* --- 경로 (화살표 디자인) --- */}
      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={s.locLabel}>상차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(startAddr)}
          </Text>
          <Text style={s.placeText} numberOfLines={1}>
            {startPlace}
          </Text>
        </View>

        <View style={s.arrowArea}>
          <View style={s.distBadge}>
            <Text style={s.distText}>{distance ? `${distance}km` : "-"}</Text>
          </View>
          <View style={[s.line, { backgroundColor: "#E2E8F0" }]}>
            <View style={[s.arrowHead, { borderColor: "#CBD5E1" }]} />
          </View>
        </View>

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={s.locLabel}>하차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
            numberOfLines={1}
          >
            {getShortAddr(endAddr)}
          </Text>
          <Text style={[s.placeText, { textAlign: "right" }]} numberOfLines={1}>
            {endPlace}
          </Text>
        </View>
      </View>

      {/* --- 작업정보 및 금액 --- */}
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
          <View style={s.priceRow}>
            <Text
              style={[
                s.priceText,
                { color: instant ? "#EF4444" : c.brand.primary },
              ]}
            >
              {totalPrice.toLocaleString()}
            </Text>
            {laborFee && laborFee > 0 && <Text style={s.taxLabel}>(수)</Text>}
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

// 스타일 (생략 - 이전과 동일)
const s = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
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
  timeText: { fontSize: 12, opacity: 0.6 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  locGroup: { flex: 1.5 },
  locLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 2 },
  locName: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
  placeText: { fontSize: 12, color: "#64748B", marginTop: 2 },
  arrowArea: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  distBadge: {
    backgroundColor: "#F8FAFC",
    borderColor: "#F1F5F9",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  distText: { fontSize: 11, fontWeight: "700", color: "#64748B" },
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
    borderTopColor: "#F8FAFC",
  },
  infoColumn: { flex: 1.5 },
  loadDateText: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  carText: { fontSize: 12, fontWeight: "500", opacity: 0.8 },
  priceColumn: { flex: 1.2, alignItems: "flex-end" },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "flex-end",
  },
  priceText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  taxLabel: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "bold",
    marginLeft: 4,
  },
});
