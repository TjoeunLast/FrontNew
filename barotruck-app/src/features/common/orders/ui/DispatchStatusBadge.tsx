import React from "react";
import type { TextStyle, ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Badge } from "@/shared/ui/feedback/Badge";

export type DispatchStatusKey = "WAITING" | "CONFIRMED" | "DRIVING" | "COMPLETED";

function labelByKey(key: DispatchStatusKey) {
  if (key === "WAITING") return "대기";
  if (key === "CONFIRMED") return "확정";
  if (key === "DRIVING") return "운송중";
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
  const mergedStyle: ViewStyle = { backgroundColor: bg, borderColor: bg, ...(style ?? {}) };
  const mergedTextStyle: TextStyle = { color: c.text.inverse, fontWeight: "800", ...(textStyle ?? {}) };

  return (
    <Badge
      label={labelByKey(status)}
      tone="neutral"
      style={mergedStyle}
      textStyle={mergedTextStyle}
    />
  );
}
