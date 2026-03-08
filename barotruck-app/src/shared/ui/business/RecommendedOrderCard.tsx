import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Badge } from "@/shared/ui/feedback/Badge";
import { orderCardStyles as s } from "@/shared/ui/business/orderCardStyles";

export type RecommendedOrderCardProps = {
  statusKey: "MATCHING" | "DISPATCHED" | "DRIVING" | "DONE" | "CANCELLED";
  from: string;
  to: string;
  fromDetail?: string;
  toDetail?: string;
  distanceKm: number;
  statusLabel: string;
  etaHHmm?: string;
  isEtaUrgent?: boolean;
  isHighlighted?: boolean; // 이 값이 true일 때 '승인 대기'로 처리
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
  const isDone = statusKey === "DONE" || statusKey === "CANCELLED";
  const cardTint = isDone
    ? {
        bg: c.bg.surface,
        border: c.border.default,
        text: "#94A3B8",
        borderWidth: 1,
      }
    : isHighlighted
      ? {
          bg: c.bg.surface,
          border: c.status.warning,
          text: c.status.warning,
          borderWidth: 1,
        }
      : {
          bg: c.bg.surface,
          border: c.border.default,
          text: "#64748B",
          borderWidth: 1,
        };

  const badgeMeta = isHighlighted
    ? { label: "승인 대기", bg: c.status.warning }
    : statusKey === "MATCHING"
      ? { label: "배차대기", bg: c.status.warning }
      : statusKey === "DISPATCHED"
        ? { label: "배차확정", bg: c.brand.primary }
        : statusKey === "DRIVING"
          ? { label: "운송중", bg: c.status.success }
          : statusKey === "CANCELLED"
            ? { label: "취소", bg: c.status.danger }
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
        },
      ]}
    >
      <View style={s.topRow}>
        <Badge
          label={badgeMeta.label}
          tone="neutral"
          style={{
            backgroundColor: badgeMeta.bg,
            borderColor: badgeMeta.bg,
            borderRadius: 6,
          }}
          textStyle={{ color: "#FFFFFF", fontWeight: "800", fontSize: 11 }}
        />
        <Text style={[s.timeText, { color: cardTint.text, fontWeight: "600" }]}>
          도착 예정 {etaHHmm || "--:--"}
        </Text>
      </View>

      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={s.locLabel}>상차지</Text>
          <Text
            style={[s.locName, { color: isDone ? "#94A3B8" : "#1E293B" }]}
            numberOfLines={1}
          >
            {fromMainText}
          </Text>
          <Text style={[s.placeText, { color: "#94A3B8" }]} numberOfLines={1}>
            {fromSubText}
          </Text>
        </View>

        <View style={s.arrowArea}>
          <View
            style={[
              s.distBadge,
              {
                backgroundColor: "#F8FAFC",
                borderColor: "transparent",
                borderWidth: 0,
                borderRadius: 99,
              },
            ]}
          >
            <Text style={[s.distText, { color: "#475569", fontWeight: "700" }]}>
              {distanceKm}km
            </Text>
          </View>
          <View style={[s.line, { backgroundColor: "#F1F5F9", height: 2 }]}>
            <View style={[s.arrowHead, { borderColor: "#CBD5E1" }]} />
          </View>
        </View>

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={s.locLabel}>하차지</Text>
          <Text
            style={[
              s.locName,
              { color: isDone ? "#94A3B8" : "#1E293B", textAlign: "right" },
            ]}
            numberOfLines={1}
          >
            {toMainText}
          </Text>
          <Text
            style={[s.placeText, { textAlign: "right", color: "#94A3B8" }]}
            numberOfLines={1}
          >
            {toSubText}
          </Text>
        </View>
      </View>

      <View
        style={[
          s.bottomRow,
          { borderTopColor: "#F1F5F9", alignItems: "center" },
        ]}
      >
        <View style={s.infoColumn}>
          <Text
            style={[
              s.loadDateText,
              { color: "#64748B", fontSize: 12, fontWeight: "600" },
            ]}
          >
            운송 현황
          </Text>
          <Text
            style={[
              s.carText,
              {
                color: isDone ? "#94A3B8" : "#334155",
                fontWeight: "700",
                opacity: 1,
              },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
        <View style={s.priceColumn}>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </View>
      </View>

      {actionLabel && onPressAction ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onPressAction();
          }}
          style={{
            marginTop: 14,
            height: 44,
            borderRadius: 12,
            backgroundColor:
              actionVariant === "outline" ? "#FFFFFF" : "#4E46E5",
            borderWidth: 1,
            borderColor: actionVariant === "outline" ? "#E2E8F0" : "#4E46E5",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: actionVariant === "outline" ? "#475569" : "#FFFFFF",
              fontWeight: "800",
              fontSize: 14,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}
