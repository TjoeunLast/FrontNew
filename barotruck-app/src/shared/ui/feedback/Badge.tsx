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
  | "success" // 완료, 성공 (status.success)
  | "warning" // 하차 대기, 주의 (status.warning)
  | "danger" // 오류, 긴급 (status.danger)
  | "info" // 안내, 배차 확정 (status.info)
  | "neutral" // 일반 정보 (bg.muted)
  | "request" // 배차 신청 (badge.requestBg)
  | "ongoing" // 운송 중 (badge.ongoingBg)
  | "complete" // 최종 완료/정산 (badge.completeBg)
  | "cancel" // 취소됨 (badge.cancelBg)
  | "urgent" // 긴급/바로배차 (badge.urgentBg)
  | "direct" // 직접배차/브랜드 (brand.primary)
  | "payPrepaid" // 선착불 결제 (badge.payPrepaid)
  | "payDeferred"; // 인수증/후불 결제 (badge.payDeferred)

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
  const { colors: c } = useAppTheme();

  // 텍스트 기반 자동 톤 설정 로직
  const resolvedTone = useMemo<BadgeTone>(() => {
    const trimmed = label.trim();
    if (trimmed === "배차 완료" || trimmed === "운송 완료") return "success";
    if (trimmed === "완료") return "complete";
    return tone;
  }, [label, tone]);

  // 테마 변수 매핑 로직
  const tset = useMemo(() => {
    switch (resolvedTone) {
      case "success":
        return {
          bg: c.status.successSoft,
          fg: c.status.success,
          border: c.status.success,
        };
      case "warning":
        return {
          bg: c.status.warningSoft,
          fg: c.status.warning,
          border: c.status.warning,
        };
      case "danger":
      case "cancel":
        return {
          bg: c.badge.cancelBg,
          fg: c.badge.cancelText,
          border: c.badge.cancelText,
        };
      case "info":
        return {
          bg: c.status.infoSoft,
          fg: c.status.info,
          border: c.status.info,
        };
      case "ongoing":
        return {
          bg: c.badge.ongoingBg,
          fg: c.badge.ongoingText,
          border: "transparent",
        };
      case "request":
        return {
          bg: c.badge.requestBg,
          fg: c.badge.requestText,
          border: "transparent",
        };
      case "urgent":
        return {
          bg: c.badge.urgentBg,
          fg: c.badge.urgentText,
          border: c.badge.urgentBg,
        };
      case "direct":
        return {
          bg: c.brand.primary,
          fg: c.text.inverse,
          border: c.brand.primary,
        };
      case "payPrepaid":
        return {
          bg: "transparent",
          fg: c.badge.payPrepaid,
          border: c.badge.payPrepaid,
        };
      case "payDeferred":
        return {
          bg: "transparent",
          fg: c.badge.payDeferred,
          border: c.badge.payDeferred,
        };
      case "complete":
        return {
          bg: c.badge.completeBg,
          fg: c.badge.completeText,
          border: c.border.default,
        };
      case "neutral":
      default:
        return { bg: c.bg.muted, fg: c.text.secondary, border: "transparent" };
    }
  }, [resolvedTone, c]);

  return (
    <View
      style={[
        s.badge,
        { backgroundColor: tset.bg, borderColor: tset.border },
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
    justifyContent: "center",
    alignItems: "center",
  },
  text: { fontSize: 11, fontWeight: "800" },
});
