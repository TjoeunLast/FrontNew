import React from "react";
import type { TextStyle, ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Badge } from "@/shared/ui/feedback/Badge";

export type DispatchStatusKey = "WAITING" | "CONFIRMED" | "DRIVING" | "COMPLETED";

function labelByKey(key: DispatchStatusKey) {
  if (key === "WAITING") return "대기";
  if (key === "CONFIRMED") return "확정";
  if (key === "DRIVING") return "운행중";
  return "완료";
}

export function DispatchStatusBadge({
  status,
  style,
  textStyle,
}: {
  status: DispatchStatusKey;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const { colors: c } = useAppTheme();
  const bg =
    status === "WAITING" || status === "CONFIRMED"
      ? c.brand.primary
      : status === "DRIVING"
        ? c.status.danger
        : c.text.secondary;

  return (
    <Badge
      label={labelByKey(status)}
      tone="neutral"
      style={[{ backgroundColor: bg, borderColor: bg }, style]}
      textStyle={[{ color: c.text.inverse, fontWeight: "800" }, textStyle]}
    />
  );
}
