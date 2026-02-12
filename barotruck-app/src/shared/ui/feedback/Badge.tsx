import React, { memo, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export type BadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "request"
  | "ongoing"
  | "complete"
  | "cancel"
  | "roundTrip"
  | "oneWay"
  | "urgent"
  | "direct"
  | "payPrepaid"
  | "payDeferred";

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const Badge = memo(function Badge({
  label,
  tone = "neutral",
  style,
  textStyle,
}: BadgeProps) {
  const t = useAppTheme();
  const c = t.colors;
  const resolvedTone = useMemo<BadgeTone>(() => {
    if (label.trim() === "배차 완료") return "success";
    if (label.trim() === "완료") return "complete";
    return tone;
  }, [label, tone]);

  const tset = useMemo(() => {
    switch (resolvedTone) {
      case "success":
        return { bg: "#DCFCE7", fg: "#166534", border: "#BBF7D0" };
      case "warning":
        return { bg: "#FEF9C3", fg: "#854D0E", border: "#FEF08A" };
      case "danger":
        return { bg: "#FEE2E2", fg: "#991B1B", border: "#FECACA" };
      case "info":
        return { bg: "#E0F2FE", fg: "#075985", border: "#BAE6FD" };
      case "request":
        return { bg: "#F3E8FF", fg: "#6B21A8", border: "#E9D5FF" };
      case "ongoing":
        return { bg: "#E0E7FF", fg: "#3730A3", border: "#C7D2FE" };
      case "complete":
        return { bg: "#F1F5F9", fg: "#334155", border: "#E2E8F0" };
      case "cancel":
        return { bg: "#FFF1F2", fg: "#9F1239", border: "#FFE4E6" };
      case "urgent":
        return { bg: "#DC2626", fg: "#FFFFFF", border: "#DC2626" };
      case "direct":
        return { bg: "#4E46E5", fg: "#F3F4F6", border: "#647fa4" };
      case "roundTrip":
        return { bg: "#EEF2FF", fg: "#4338CA", border: "#EEF2FF" };
      case "oneWay":
        return { bg: "#F0F9FF", fg: "#0369A1", border: "#F0F9FF" };
      case "payPrepaid":
        return { bg: "transparent", fg: "#15803D", border: "#15803D" };
      case "payDeferred":
        return { bg: "transparent", fg: "#647fa4", border: "#647fa4" };
      case "neutral":
      default:
        return { bg: c.bg.muted, fg: c.text.secondary, border: c.bg.muted };
    }
  }, [resolvedTone, c]);

  return (
    <View
      style={[
        s.badge,
        {
          backgroundColor: tset.bg,
          borderColor: tset.border ?? tset.bg,
        },
        style,
      ]}
    >
      <Text style={[s.text, { color: tset.fg }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

const s = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
