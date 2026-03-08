import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { SettlementItem } from "../../model/shipperSettlementUtils";

interface Props {
  item: SettlementItem | null;
  onClose: () => void;
}

export function ReceiptModal({ item, onClose }: Props) {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = getStyles(c, insets);

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>운송 영수증</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color={c.text.primary} />
            </Pressable>
          </View>

          <View style={s.receiptCard}>
            <Text style={s.receiptAmount}>
              {item ? item.amount.toLocaleString("ko-KR") : "0"}
            </Text>
            <Text style={s.receiptPaid}>결제완료</Text>
            <View style={s.receiptDash} />

            <View style={s.receiptRow}>
              <Text style={s.receiptKey}>운송일시</Text>
              <Text style={s.receiptVal}>
                {item
                  ? `${item.scheduledAt.getFullYear()}.${String(item.scheduledAt.getMonth() + 1).padStart(2, "0")}.${String(item.scheduledAt.getDate()).padStart(2, "0")} ${String(item.scheduledAt.getHours()).padStart(2, "0")}:${String(item.scheduledAt.getMinutes()).padStart(2, "0")}`
                  : "-"}
              </Text>
            </View>
            <View style={s.receiptRow}>
              <Text style={s.receiptKey}>차량정보</Text>
              <Text style={s.receiptVal}>{item?.vehicleInfo ?? "-"}</Text>
            </View>
            <View style={s.receiptRow}>
              <Text style={s.receiptKey}>결제 방식</Text>
              <Text style={s.receiptVal}>{item?.payMethodLabel ?? "-"}</Text>
            </View>

            <View style={s.receiptBlockGap} />

            <View style={s.receiptRow}>
              <Text style={s.receiptKey}>공급가액</Text>
              <Text style={s.receiptVal}>
                {item ? item.amount.toLocaleString("ko-KR") : "0"}
              </Text>
            </View>
            <View style={s.receiptRow}>
              <Text style={s.receiptKey}>세액</Text>
              <Text style={s.receiptVal}>0원</Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (c: any, insets: any) =>
  StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.28)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: Math.max(14, insets.bottom + 6),
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalTitle: { fontSize: 18, fontWeight: "900", color: c.text.primary },
    receiptCard: {
      marginTop: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#E5EAF1",
      backgroundColor: "#FAFBFD",
      padding: 14,
    },
    receiptAmount: {
      fontSize: 20,
      fontWeight: "900",
      textAlign: "center",
      color: c.text.primary,
    },
    receiptPaid: {
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
      color: "#64748B",
      marginTop: 2,
    },
    receiptDash: {
      height: 1,
      borderStyle: "dashed",
      borderTopWidth: 2,
      borderColor: "#D9E0EA",
      marginTop: 14,
      marginBottom: 10,
    },
    receiptRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    receiptKey: { fontSize: 13, fontWeight: "700", color: "#64748B" },
    receiptVal: { fontSize: 13, fontWeight: "900", color: c.text.primary },
    receiptBlockGap: { height: 8 },
  });
