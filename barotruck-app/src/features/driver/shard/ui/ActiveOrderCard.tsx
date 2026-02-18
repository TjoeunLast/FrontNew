import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export const ActiveOrderCard = ({ order, onNext, onNav }: any) => {
  const { colors: c } = useAppTheme();

  // DB의 문자열 status를 기반으로 UI 정보 가져오기
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "LOADING": // 상차 중
        return {
          label: "상차 완료",
          icon: "cube-outline",
          color: "#4E46E5",
          badge: "상차 작업 중",
          nextStatus: "IN_TRANSIT",
          targetPlace: `상차지: ${order.startPlace}`,
        };
      case "IN_TRANSIT": // 이동 중
        return {
          label: "하차지 도착",
          icon: "flag-outline",
          color: "#1A2F4B",
          badge: "운송 이동 중",
          nextStatus: "UNLOADING",
          targetPlace: `하차지: ${order.endPlace}`,
        };
      case "UNLOADING": // 하차 중
        return {
          label: "하차 완료",
          icon: "checkmark-circle-outline",
          color: "#059669",
          badge: "하차 작업 중",
          nextStatus: "COMPLETED",
          targetPlace: `하차지: ${order.endPlace}`,
        };
      default:
        return {
          label: "상차지로 이동",
          icon: "location-outline",
          color: "#64748B",
          badge: "이동 중",
          nextStatus: "LOADING",
          targetPlace: `상차지: ${order.startPlace}`,
        };
    }
  };

  const ui = getStatusConfig(order.status);

  // 주소 요약
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0]} ${parts[1] || ""}`;
  };

  return (
    <View style={s.card}>
      {/* --- 상단부: 상태 배지 및 오더번호 --- */}
      <View style={s.topRow}>
        <View style={s.statusPill}>
          <Ionicons name="car-outline" size={14} color="#4E46E5" />
          <Text style={s.statusPillText}>{ui.badge}</Text>
        </View>
        <Text style={s.orderId}>#{order.orderId}</Text>
      </View>

      {/* --- 중단부: 경로 --- */}
      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={s.locName}>{getShortAddr(order.startAddr)}</Text>
        </View>

        <View style={s.arrowArea}>
          <Text style={s.distText}>{order.distance || "-"}km</Text>
          <View style={s.line}>
            <View style={s.arrowHead} />
          </View>
        </View>

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={[s.locName, { textAlign: "right" }]}>
            {getShortAddr(order.endAddr)}
          </Text>
        </View>
      </View>

      {/* --- 정보부: 현재 목적지 및 화물 정보 --- */}
      <View style={s.infoSection}>
        <Text style={s.targetPlaceText}>{ui.targetPlace}</Text>
        <Text style={s.cargoInfo}>
          {order.reqTonnage} {order.reqCarType} ·{" "}
          {order.basePrice?.toLocaleString()}원
        </Text>
      </View>

      {/* --- 버튼부: 길안내 및 상태변경 --- */}
      <View style={s.btnRow}>
        <Pressable style={s.btnNav} onPress={onNav}>
          <Ionicons name="map-outline" size={16} color="#0F172A" />
          <Text style={s.btnNavText}> 길안내</Text>
        </Pressable>

        <Pressable
          style={[s.btnStatus, { backgroundColor: ui.color }]}
          onPress={() => onNext(order.orderId, ui.nextStatus)}
        >
          <Ionicons name={ui.icon as any} size={18} color="#FFF" />
          <Text style={s.btnStatusText}> {ui.label}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: { fontSize: 11, fontWeight: "700", color: "#4E46E5" },
  orderId: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  locGroup: { flex: 1.5 },
  locName: { fontSize: 19, fontWeight: "900", color: "#0F172A" },
  arrowArea: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  distText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
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

  infoSection: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  targetPlaceText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A2F4B",
    marginBottom: 4,
  },
  cargoInfo: { fontSize: 13, color: "#64748B" },

  btnRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnNav: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnNavText: { fontSize: 14, fontWeight: "600" },
  btnStatus: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnStatusText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
