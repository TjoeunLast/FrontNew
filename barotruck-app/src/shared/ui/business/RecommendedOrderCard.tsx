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
    ? { bg: "#F3F5F8", border: "#D8DFE8", text: "#8B96A8" }
    : isEtaUrgent
      ? { bg: "#fff9f9", border: "#FFB1B1", text: "#DC2626" }
      : isHighlighted
        ? { bg: c.brand.primarySoft, border: c.brand.primary, text: c.brand.primary }
        : { bg: c.bg.surface, border: c.border.default, text: c.text.secondary };
  const badgeMeta =
    statusKey === "MATCHING"
      ? { label: "대기", bg: c.brand.primary }
      : statusKey === "DISPATCHED"
        ? { label: "확정", bg: c.brand.primary }
        : statusKey === "DRIVING"
          ? { label: "운송중", bg: c.status.danger }
          : { label: "완료", bg: c.text.secondary };
  const getShortAddr = (addr: string) => {
    const parts = (addr || "").trim().split(/\s+/);
    return `${parts[0] || ""} ${parts[1] || ""}`.trim() || "-";
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.container,
        {
          backgroundColor: cardTint.bg,
          borderColor: cardTint.border,
          borderWidth: 1,
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
            {getShortAddr(from)}
          </Text>
          <Text style={[s.placeText, { color: isDone ? "#94A3B8" : c.text.secondary }]} numberOfLines={1}>
            {from}
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
            {getShortAddr(to)}
          </Text>
          <Text style={[s.placeText, { textAlign: "right", color: isDone ? "#94A3B8" : c.text.secondary }]} numberOfLines={1}>
            {to}
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
