import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const ActiveOrderCard = ({ order, step, onNext, onNav }: any) => {
  const getStepUI = () => {
    switch (step) {
      case 1:
        return {
          label: "상차지 도착",
          icon: "location-outline",
          color: "#0F172A",
          badge: "이동 중",
        };
      case 2:
        return {
          label: "상차 완료",
          icon: "cube-outline",
          color: "#4E46E5",
          badge: "상차 작업 중",
        };
      case 3:
        return {
          label: "하차지 도착",
          icon: "flag-outline",
          color: "#0F172A",
          badge: "하차 이동 중",
        };
      case 4:
        return {
          label: "하차 완료",
          icon: "checkmark-circle-outline",
          color: "#10B981",
          badge: "하차 작업 중",
        };
      default:
        return {
          label: "운송 시작",
          icon: "play-outline",
          color: "#0F172A",
          badge: "준비",
        };
    }
  };

  const ui = getStepUI();

  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <View style={s.statusPill}>
          <Ionicons name="speedometer-outline" size={14} color="#4E46E5" />
          <Text style={s.statusPillText}>{ui.badge}</Text>
        </View>
        <Text style={s.orderId}>#{order.orderId}</Text>
      </View>
      <View style={s.routeRow}>
        <Text style={s.cityText}>{order.startAddr.split(" ")[1]}</Text>
        <Ionicons name="arrow-forward" size={16} color="#CBD5E1" />
        <Text style={s.cityText}>{order.endAddr.split(" ")[1]}</Text>
      </View>
      <Text style={s.infoText}>
        {order.reqTonnage} {order.reqCarType} ·{" "}
        {order.basePrice?.toLocaleString()}원{"\n"}
        <Text style={{ fontWeight: "700", color: "#0F172A" }}>
          {step <= 2
            ? `상차지: ${order.startPlace}`
            : `하차지: ${order.endPlace}`}
        </Text>
      </Text>
      <View style={s.btnRow}>
        <Pressable style={s.btnNav} onPress={onNav}>
          <Ionicons name="map-outline" size={16} color="#0F172A" />
          <Text style={s.btnNavText}> 길안내</Text>
        </Pressable>
        <Pressable
          style={[s.btnStatus, { backgroundColor: ui.color }]}
          onPress={onNext}
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
    borderColor: "#E2E8F0",
    marginBottom: 16,
    elevation: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  orderId: { fontSize: 12, fontWeight: "600", color: "#4E46E5" },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  cityText: { fontSize: 19, fontWeight: "900", color: "#0F172A" },
  infoText: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 16,
  },
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
  btnNavText: { fontSize: 13, fontWeight: "600" },
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
