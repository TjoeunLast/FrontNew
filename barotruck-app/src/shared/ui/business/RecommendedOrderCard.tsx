import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Badge } from "@/shared/ui/feedback/Badge";
import { orderCardStyles as s } from "@/shared/ui/business/orderCardStyles";

export type RecommendedOrderCardProps = {
  statusKey: "MATCHING" | "DISPATCHED" | "DRIVING" | "DONE";
  from: string;
  to: string;
  fromDetail?: string;
  toDetail?: string;
  distanceKm: number;
  statusLabel: string;
  etaHHmm?: string;
  isEtaUrgent?: boolean;
  isHighlighted?: boolean;
  actionLabel?: string;
  actionVariant?: "primary" | "outline";
  onPressAction?: () => void;
  onPress: () => void;
};

export function RecommendedOrderCard({
  statusKey,
  from,
  to,
  fromDetail,
  toDetail,
  distanceKm,
  statusLabel,
  etaHHmm,
  isEtaUrgent,
  isHighlighted,
  actionLabel,
  actionVariant = "primary",
  onPressAction,
  onPress,
}: RecommendedOrderCardProps) {
  const t = useAppTheme();
  const c = t.colors;
  const isDone = statusKey === "DONE";
  const cardTint = isDone
    ? { bg: "#F3F5F8", border: "#D8DFE8", text: "#8B96A8", borderWidth: 1 }
    : isHighlighted
      ? { bg: c.bg.surface, border: c.brand.primary, text: c.brand.primary, borderWidth: 2 }
      : { bg: c.bg.surface, border: c.border.default, text: c.text.secondary, borderWidth: 1 };
  const badgeMeta =
    statusKey === "MATCHING"
      ? { label: "대기", bg: c.brand.primary }
      : statusKey === "DISPATCHED"
        ? { label: "확정", bg: c.brand.primary }
        : statusKey === "DRIVING"
          ? { label: "운송중", bg: c.status.danger }
          : { label: "완료", bg: c.text.secondary };
  const normalizeText = (v?: string) => (v || "").trim().replace(/\s+/g, " ");
  const formatMainText = (addr?: string) => {
    const parts = normalizeText(addr).split(" ").filter(Boolean);
    if (!parts.length) return "-";
    const first = (parts[0] || "")
      .replace("특별시", "")
      .replace("광역시", "")
      .replace("특별자치시", "")
      .replace("특별자치도", "");
    return [first, parts[1] || ""].filter(Boolean).join(" ");
  };
  const formatSubText = (addr?: string, detail?: string) => {
    const parts = normalizeText(addr).split(" ").filter(Boolean);
    const roadText = parts.slice(2).join(" ");
    const detailText = normalizeText(detail);
    return [roadText, detailText].filter(Boolean).join(" ") || "-";
  };
  const fromMainText = formatMainText(from);
  const toMainText = formatMainText(to);
  const fromSubText = formatSubText(from, fromDetail);
  const toSubText = formatSubText(to, toDetail);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.container,
        {
          backgroundColor: cardTint.bg,
          borderColor: cardTint.border,
          borderWidth: cardTint.borderWidth,
          elevation: 0,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={s.topRow}>
        <Badge
          label={badgeMeta.label}
          tone="neutral"
          style={{ backgroundColor: badgeMeta.bg, borderColor: badgeMeta.bg }}
          textStyle={{ color: c.text.inverse, fontWeight: "800" }}
        />
        <Text style={[s.timeText, { color: cardTint.text }]}>
          도착 예정 {etaHHmm || "--:--"}
        </Text>
      </View>

      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={s.locLabel}>상차지</Text>
          <Text style={[s.locName, { color: isDone ? c.text.secondary : c.text.primary }]} numberOfLines={1}>
            {fromMainText}
          </Text>
          <Text style={[s.placeText, { color: isDone ? "#94A3B8" : c.text.secondary }]} numberOfLines={1}>
            {fromSubText}
          </Text>
        </View>

        <View style={s.arrowArea}>
          <View style={s.distBadge}>
            <Text style={s.distText}>{distanceKm}km</Text>
          </View>
          <View style={[s.line, { backgroundColor: "#E2E8F0" }]}>
            <View style={[s.arrowHead, { borderColor: "#CBD5E1" }]} />
          </View>
        </View>

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={s.locLabel}>하차지</Text>
          <Text style={[s.locName, { color: isDone ? c.text.secondary : c.text.primary, textAlign: "right" }]} numberOfLines={1}>
            {toMainText}
          </Text>
          <Text style={[s.placeText, { textAlign: "right", color: isDone ? "#94A3B8" : c.text.secondary }]} numberOfLines={1}>
            {toSubText}
          </Text>
        </View>
      </View>

      <View style={s.bottomRow}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: isDone ? c.text.secondary : c.text.primary }]}>운송 현황</Text>
          <Text style={[s.carText, { color: isDone ? "#8B96A8" : c.text.secondary }]}>{statusLabel}</Text>
        </View>
        <View style={s.priceColumn}>
          <Ionicons name="chevron-forward" size={18} color={isDone ? "#9AA5B5" : c.text.secondary} />
        </View>
      </View>

      {actionLabel && onPressAction ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onPressAction();
          }}
          style={{
            marginTop: 10,
            height: 44,
            borderRadius: 12,
            backgroundColor: actionVariant === "outline" ? c.bg.surface : c.brand.primary,
            borderWidth: 1,
            borderColor: actionVariant === "outline" ? c.border.default : c.brand.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: actionVariant === "outline" ? c.text.secondary : c.text.inverse,
              fontWeight: "900",
              fontSize: 15,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}
