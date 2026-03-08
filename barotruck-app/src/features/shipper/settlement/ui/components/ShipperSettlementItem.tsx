import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import {
  statusText,
  toWon,
} from "@/features/common/settlement/lib/settlementHelpers";
import type { SettlementItem } from "../../model/shipperSettlementUtils";

interface Props {
  item: SettlementItem;
  isSubmitting: boolean;
  onPressAction: (item: SettlementItem) => void;
}

export function ShipperSettlementItem({
  item,
  isSubmitting,
  onPressAction,
}: Props) {
  const { colors: c } = useAppTheme();
  const s = getStyles(c);

  const isUnpaid = item.status === "UNPAID";
  const isPending = item.status === "PENDING";
  const isPaid = item.status === "PAID";
  const paymentBlocked = isUnpaid && !item.isTransportCompleted;

  return (
    <View
      style={[
        s.itemCard,
        {
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        },
      ]}
    >
      <View style={s.itemTop}>
        <View style={s.dateRow}>
          <Text style={s.dateText}>{item.dateLabel}</Text>
          <View
            style={[
              s.statusBadge,
              {
                backgroundColor: isUnpaid
                  ? "#FEE2E2"
                  : isPending
                    ? "#FEF9C3"
                    : isPaid
                      ? "#DCFCE7"
                      : "#F1F5F9",
              },
            ]}
          >
            <Text
              style={[
                s.statusText,
                {
                  color: isUnpaid
                    ? "#EF4444"
                    : isPending
                      ? "#A16207"
                      : isPaid
                        ? "#15803D"
                        : "#64748B",
                },
              ]}
            >
              {statusText(item.status)}
            </Text>
          </View>
        </View>
        <Text style={s.amountText}>{toWon(item.amount)}</Text>
      </View>

      <Text style={s.routeText}>
        {item.from} <Text style={s.arrowText}>→</Text> {item.to}
      </Text>
      <Text style={s.payMethodText}>결제 방식: {item.payMethodLabel}</Text>

      <View style={s.actionRow}>
        <Pressable
          style={[
            s.actionBtn,
            isUnpaid && !paymentBlocked
              ? s.actionBtnPrimary
              : s.actionBtnNeutral,
          ]}
          disabled={isSubmitting || isPending || paymentBlocked}
          onPress={() => onPressAction(item)}
        >
          <MaterialCommunityIcons
            name={
              paymentBlocked
                ? "lock-outline"
                : isPaid
                  ? "file-document-outline"
                  : isPending
                    ? "timer-sand"
                    : item.status === "TAX_INVOICE"
                      ? "file-outline"
                      : "credit-card-outline"
            }
            size={16}
            color={
              isUnpaid && !paymentBlocked
                ? "#FFFFFF"
                : paymentBlocked
                  ? "#94A3B8"
                  : isPending
                    ? "#A16207"
                    : "#64748B"
            }
          />
          <Text
            style={[
              s.baseActionText,
              isUnpaid && !paymentBlocked
                ? s.actionTextPrimary
                : s.actionTextNeutral,
            ]}
          >
            {isSubmitting ? "요청중..." : item.actionLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (c: any) =>
  StyleSheet.create({
    itemCard: {
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      marginBottom: 12,
    },
    itemTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    dateText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 11, fontWeight: "800" },
    amountText: {
      fontSize: 18,
      fontWeight: "900",
      color: "#1E293B",
      letterSpacing: -0.5,
    },
    routeText: {
      marginTop: 12,
      fontSize: 15,
      fontWeight: "800",
      color: "#334155",
    },
    payMethodText: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "600",
      color: "#94A3B8",
    },
    arrowText: { color: "#CBD5E1", marginHorizontal: 4 },

    actionRow: {
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "flex-end",
    },

    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    actionBtnNeutral: {
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    actionBtnPrimary: { backgroundColor: "#4E46E5" },

    baseActionText: {
      fontSize: 13,
      fontWeight: "800",
      marginLeft: 6,
    },
    actionTextNeutral: { color: "#475569" },
    actionTextPrimary: { color: "#FFFFFF" },
  });
