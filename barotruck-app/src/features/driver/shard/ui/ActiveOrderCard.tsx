import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export const ActiveOrderCard = ({ order, onNext, onNav, onDetail }: any) => {
  const { colors: c } = useAppTheme();
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "LOADING":
        return {
          label: "상차 완료",
          tone: "ongoing" as const,
          color: "#4E46E5",
          badge: "상차 작업 중",
          next: "IN_TRANSIT",
          target: `목적지: ${order.startPlace}`,
          goal: "상차지로 이동하여 물건을 실으세요",
        };
      case "IN_TRANSIT":
        return {
          label: "하차지 도착",
          tone: "ongoing" as const,
          color: "#1A2F4B",
          badge: "운송 이동 중",
          next: "UNLOADING",
          target: `목적지: ${order.endPlace}`,
          goal: "하차지로 이동하여 배송을 진행하세요",
        };
      case "UNLOADING":
        return {
          label: "하차 완료",
          tone: "ongoing" as const,
          color: "#059669",
          badge: "하차 작업 중",
          next: "COMPLETED",
          target: `목적지: ${order.endPlace}`,
          goal: "하차지에 도착했습니다. 물건을 내리세요",
        };
      default:
        return {
          label: "운송 시작",
          tone: "ongoing" as const,
          color: "#64748B",
          badge: "대기 중",
          next: "LOADING",
          target: `목적지: ${order.startPlace}`,
          goal: "상차지로 이동을 시작하세요",
        };
    }
  };

  const ui = getStatusConfig(order.status);
  const getShortAddr = (addr: string) =>
    addr ? `${addr.split(" ")[0]} ${addr.split(" ")[1] || ""}` : "";

  return (
    <Pressable
      style={s.container}
      onPress={() => onDetail(Number(order.orderId))}
    >
      <View style={s.topRow}>
        <Badge label={ui.badge} tone={ui.tone} />
        {/* 상세보기 링크 대신 전화 버튼 배치 */}
        <Pressable
          style={[s.callBtn, { backgroundColor: ui.color }]}
          onPress={() =>
            Linking.openURL(`tel:${order.shipperPhone || "01000000000"}`)
          }
        >
          <Ionicons name="call" size={14} color="#FFF" />
          <Text style={s.callBtnText}>화주연락</Text>
        </Pressable>
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

      {/* 가이드 박스: 상차 시간 정보 포함 가능 */}
      <View style={[s.goalSection, { borderColor: ui.color + "20" }]}>
        <View style={s.goalHeader}>
          <Ionicons name="location" size={14} color={ui.color} />
          <Text style={[s.goalTitle, { color: ui.color }]}>
            {order.status === "LOADING"
              ? `${order.startSchedule} 상차`
              : ui.goal}
          </Text>
        </View>
        <Text style={s.goalTargetName} numberOfLines={1}>
          {ui.target}
        </Text>
      </View>

      <View style={s.bottomRow}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            운송 정보
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {order.reqTonnage} {order.reqCarType} •{" "}
            {order.cargoContent || "일반짐"}
          </Text>
        </View>
        <View style={s.priceColumn}>
          <Text style={s.priceText}>{order.basePrice?.toLocaleString()}</Text>
          <Badge
            label={order.payMethod === "PREPAID" ? "현금/선불" : "인수증/후불"}
            tone={order.payMethod === "PREPAID" ? "payPrepaid" : "payDeferred"}
            style={{ marginTop: 6, alignSelf: "flex-end" }}
          />
        </View>
      </View>

      <View style={s.actionRowSplit}>
        <Pressable style={s.btnNav} onPress={onNav}>
          <Ionicons name="map-outline" size={16} color="#334155" />
          <Text style={s.btnNavText}> 길안내</Text>
        </Pressable>
        <Pressable
          style={[s.btnPrimary, { backgroundColor: ui.color, flex: 2 }]}
          onPress={() => onNext(order.orderId, ui.next)}
        >
          <Text style={s.btnPrimaryText}>{ui.label}</Text>
        </Pressable>
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
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  callBtnText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locGroup: { flex: 1.5 },
  locLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4 },
  locName: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
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
  goalSection: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  goalTitle: { fontSize: 13, fontWeight: "800" },
  goalTargetName: { fontSize: 16, fontWeight: "900", color: "#1A2F4B" },
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
  actionRowSplit: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnNav: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnNavText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  btnPrimary: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPrimaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
