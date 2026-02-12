import React from "react";
import type { TextStyle, ViewStyle } from "react-native";

import { Badge, type BadgeTone } from "@/shared/ui/feedback/Badge";

export type DispatchStatusKey = "WAITING" | "CONFIRMED" | "DRIVING" | "COMPLETED";

function labelByKey(key: DispatchStatusKey) {
  if (key === "WAITING") return "대기";
  if (key === "CONFIRMED") return "확정";
  if (key === "DRIVING") return "운행중";
  return "완료";
}

function toneByKey(key: DispatchStatusKey): BadgeTone {
  if (key === "WAITING") return "warning";
  if (key === "CONFIRMED") return "warning";
  if (key === "DRIVING") return "info";
  return "complete";
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
  return <Badge label={labelByKey(status)} tone={toneByKey(status)} style={style} textStyle={textStyle} />;
}
