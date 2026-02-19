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
  const isAccepted = order.status === "ACCEPTED";
  const totalPrice = order.basePrice + (order.laborFee || 0);
  const getShortAddr = (addr: string) =>
    addr ? `${addr.split(" ")[0]} ${addr.split(" ")[1] || ""}` : "";

  return (
    <Pressable
      onPress={() => onDetail(Number(order.orderId))}
      style={[
        s.container,
        isAccepted && { borderColor: "#1A2F4B", borderWidth: 2 },
      ]}
    >
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={isAccepted ? "배차 확정" : "승인 대기"}
            tone={isAccepted ? "success" : "warning"}
            style={{ marginRight: 8 }}
          />
          {order.instant && <Badge label="바로배차" tone="urgent" />}
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
            <Text style={s.distText}>
              {order.distance ? `${order.distance}km` : "-"}
            </Text>
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
              { color: isAccepted ? "#1A2F4B" : c.text.primary },
            ]}
          >
            {totalPrice.toLocaleString()}
          </Text>
          <Badge
            label={order.payMethod === "PREPAID" ? "현금/선불" : "인수증/후불"}
            tone={order.payMethod === "PREPAID" ? "payPrepaid" : "payDeferred"}
            style={{ marginTop: 6, alignSelf: "flex-end" }}
          />
        </View>
      </View>

      <View style={s.actionArea}>
        {order.status === "APPLIED" ? (
          <Pressable
            style={s.btnSecondary}
            onPress={() => onCancel(Number(order.orderId))}
          >
            <Ionicons name="close-circle-outline" size={18} color="#B45309" />
            <Text style={s.btnSecondaryText}>배차 신청 취소</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[s.btnPrimary, { backgroundColor: "#1A2F4B" }]}
            onPress={() => onStart(Number(order.orderId))}
          >
            <Ionicons name="play" size={18} color="#FFF" />
            <Text style={s.btnPrimaryText}>운송 시작</Text>
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
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    elevation: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  detailLink: { flexDirection: "row", alignItems: "center" },
  detailText: { fontSize: 13, color: "#94A3B8", marginRight: 2 },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locGroup: { flex: 1.5 },
  locLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4 },
  locName: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
  placeText: { fontSize: 12, color: "#64748B", marginTop: 4 },
  arrowArea: { flex: 0.8, alignItems: "center", marginTop: 18 },
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
  actionArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnPrimary: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  btnSecondary: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: "#FEF9C3",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: "700", color: "#B45309" },
});
