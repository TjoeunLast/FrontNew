import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import {
  statusText,
  toWon,
} from "@/features/common/settlement/lib/settlementHelpers";
import {
  toDriverActionLabel,
  type SettlementItem,
} from "../../model/driverSettlementUtils";

interface Props {
  item: SettlementItem;
  isSubmitting: boolean;
  isSubmittingDispute: boolean;
  onPressConfirm: (item: SettlementItem) => void;
  openDisputeModal: (item: SettlementItem) => void;
}

export function DriverSettlementItem({
  item,
  isSubmitting,
  isSubmittingDispute,
  onPressConfirm,
  openDisputeModal,
}: Props) {
  const { colors: c } = useAppTheme();
  const s = getStyles(c);

  const isPaid = item.status === "PAID";
  const statusColor = isPaid
    ? "#DCFCE7"
    : item.status === "PENDING"
      ? "#FEF9C3"
      : "#FEE2E2";
  const textColor = isPaid
    ? "#15803D"
    : item.status === "PENDING"
      ? "#A16207"
      : "#EF4444";

  const actionText = isPaid ? "결제완료" : toDriverActionLabel(item);
  const actionDisabled =
    isPaid || !item.canConfirmByDriver || isSubmitting || isSubmittingDispute;

  // 버튼 아이콘 설정
  const actionIconName = isPaid
    ? "check-decagram-outline"
    : item.canConfirmByDriver
      ? "clipboard-check-multiple-outline"
      : "lock-outline";

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
          <View style={[s.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={[s.statusText, { color: textColor }]}>
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
        <View style={s.actionGroup}>
          {/* 메인 액션 버튼 (결제확인 등) */}
          <Pressable
            style={[
              s.actionBtn,
              actionDisabled ? s.actionBtnNeutral : s.actionBtnPrimary,
            ]}
            disabled={actionDisabled}
            onPress={() => onPressConfirm(item)}
          >
            <MaterialCommunityIcons
              name={actionIconName}
              size={16}
              color={actionDisabled ? "#64748B" : "#FFFFFF"}
            />
            <Text
              style={[
                s.baseActionText,
                actionDisabled ? s.actionTextNeutral : s.actionTextPrimary,
              ]}
            >
              {isSubmitting ? "처리중..." : actionText}
            </Text>
          </Pressable>

          {/* 이의제기 버튼*/}
          {!isPaid && item.canDispute && (
            <Pressable
              style={[
                s.disputeBtn,
                (isSubmitting || isSubmittingDispute) && s.disputeBtnDisabled,
              ]}
              disabled={isSubmitting || isSubmittingDispute}
              onPress={() => openDisputeModal(item)}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color={
                  isSubmitting || isSubmittingDispute ? "#94A3B8" : "#E11D48"
                }
              />
              <Text
                style={[
                  s.baseActionText,
                  s.disputeText,
                  (isSubmitting || isSubmittingDispute) && s.actionTextNeutral,
                ]}
              >
                이의제기
              </Text>
            </Pressable>
          )}
        </View>
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
    actionGroup: {
      flexDirection: "row",
      gap: 8,
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
    actionBtnPrimary: {
      backgroundColor: "#4E46E5",
    },
    disputeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#E11D48",
      backgroundColor: "#FFFFFF",
    },
    disputeBtnDisabled: {
      borderColor: "#E2E8F0",
      backgroundColor: "#F8FAFC",
    },

    baseActionText: {
      fontSize: 13,
      fontWeight: "800",
      marginLeft: 6,
    },
    actionTextNeutral: { color: "#64748B" },
    actionTextPrimary: { color: "#FFFFFF" },
    disputeText: { color: "#E11D48" },
  });
