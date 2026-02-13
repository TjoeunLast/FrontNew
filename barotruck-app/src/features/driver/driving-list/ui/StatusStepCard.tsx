// src/features/driver/driving-list/ui/StatusStepCard.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Ionicons } from "@expo/vector-icons";

export const StatusStepCard = ({ step, onNext }: any) => {
  const { colors: c } = useAppTheme();

  // 단계별 버튼 설정
  const getStepInfo = () => {
    switch (step) {
      case 1:
        return { text: "상차지 도착", icon: "location", color: "#0F172A" };
      case 2:
        return {
          text: "상차 완료 (출발)",
          icon: "cube",
          color: c.brand.primary,
        };
      case 3:
        return { text: "하차지 도착", icon: "map", color: "#0F172A" };
      case 4:
        return {
          text: "하차 완료 (종료)",
          icon: "checkmark-circle",
          color: "#10B981",
        };
      default:
        return { text: "운행 종료", icon: "flag", color: "#64748B" };
    }
  };

  const info = getStepInfo();

  return (
    <View
      style={[
        s.card,
        { backgroundColor: c.bg.surface, borderColor: c.border.default },
      ]}
    >
      <View style={s.statusRow}>
        <View style={s.badge}>
          <Text style={s.badgeText}>이동 중</Text>
        </View>
        <Text style={{ color: c.brand.primary, fontWeight: "700" }}>#2491</Text>
      </View>
      <Text style={s.route}>경기 평택 → 부산 강서</Text>

      <View style={s.btnGroup}>
        <Pressable style={s.btnNav}>
          <Ionicons name="navigate" size={16} /> <Text>길안내</Text>
        </Pressable>
        <Pressable
          style={[s.btnMain, { backgroundColor: info.color }]}
          onPress={onNext}
        >
          <Ionicons name={info.icon as any} size={18} color="#FFF" />
          <Text style={s.btnMainText}>{info.text}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, borderWidth: 1, elevation: 2 },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { color: "#4E46E5", fontSize: 11, fontWeight: "700" },
  route: { fontSize: 18, fontWeight: "800", marginBottom: 20 },
  btnGroup: { flexDirection: "row", gap: 10 },
  btnNav: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  btnMain: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnMainText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
