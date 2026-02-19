import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export const DoneOrderCard = ({ order, onDetail }: any) => {
  const { colors: c } = useAppTheme();
  const isSettled = order.settlementStatus === "COMPLETED";
  const getShortAddr = (addr: string) =>
    addr ? `${addr.split(" ")[0]} ${addr.split(" ")[1] || ""}` : "";

  return (
    <Pressable
      style={s.container}
      onPress={() => onDetail(Number(order.orderId))}
    >
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={isSettled ? "정산 완료" : "정산 대기"}
            tone={isSettled ? "success" : "warning"}
          />
          <View style={s.receiptBadge}>
            <Text style={s.receiptText}>인수증 확인됨</Text>
          </View>
        </View>
        <View style={s.detailLink}>
          <Text style={s.detailText}>상세보기</Text>
          <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
        </View>
      </View>

      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={s.locLabel}>상차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(order.startAddr)}
          </Text>
          <Text style={s.placeText} numberOfLines={1}>
            {order.startPlace}
          </Text>
        </View>
        <View style={s.arrowArea}>
          <View style={s.distBadge}>
            <Text style={s.distText}>{order.distance}km</Text>
          </View>
          <View style={s.line}>
            <View style={s.arrowHead} />
          </View>
        </View>
        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={s.locLabel}>하차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
            numberOfLines={1}
          >
            {getShortAddr(order.endAddr)}
          </Text>
          <Text style={[s.placeText, { textAlign: "right" }]} numberOfLines={1}>
            {order.endPlace}
          </Text>
        </View>
      </View>

      <View style={s.bottomRow}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            운송 완료
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {order.reqTonnage} {order.reqCarType} •{" "}
            {order.cargoContent || "일반짐"}
          </Text>
        </View>
        <View style={s.priceColumn}>
          <Text
            style={[s.priceText, { color: isSettled ? "#10B981" : "#0F172A" }]}
          >
            {order.basePrice?.toLocaleString()}
          </Text>
          <Badge
            label={order.payMethod === "PREPAID" ? "현금/선불" : "인수증/후불"}
            tone={order.payMethod === "PREPAID" ? "payPrepaid" : "payDeferred"}
            style={{ marginTop: 6, alignSelf: "flex-end" }}
          />
        </View>
      </View>
    </Pressable>
  );
};

const s = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  receiptBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  receiptText: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  detailLink: { flexDirection: "row", alignItems: "center" },
  detailText: { fontSize: 13, color: "#94A3B8", marginRight: 2 },
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
  line: {
    width: "100%",
    height: 1,
    backgroundColor: "#E2E8F0",
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
    borderColor: "#CBD5E1",
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
  priceText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
});
