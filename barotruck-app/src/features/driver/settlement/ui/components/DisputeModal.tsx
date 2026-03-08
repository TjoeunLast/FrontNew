import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { PaymentDisputeReason } from "@/shared/models/payment";
import {
  DISPUTE_REASON_OPTIONS,
  type SettlementItem,
} from "../../model/driverSettlementUtils";

interface Props {
  disputeTarget: SettlementItem | null;
  disputeReason: PaymentDisputeReason;
  disputeDescription: string;
  isSubmittingDispute: boolean;
  setDisputeReason: (v: PaymentDisputeReason) => void;
  setDisputeDescription: (v: string) => void;
  closeDisputeModal: () => void;
  submitDispute: () => void;
}

export function DisputeModal({
  disputeTarget,
  disputeReason,
  disputeDescription,
  isSubmittingDispute,
  setDisputeReason,
  setDisputeDescription,
  closeDisputeModal,
  submitDispute,
}: Props) {
  const { colors: c } = useAppTheme();
  const s = getStyles(c);
  const hint =
    DISPUTE_REASON_OPTIONS.find((r) => r.value === disputeReason)?.hint ?? "";

  return (
    <Modal
      visible={!!disputeTarget}
      transparent
      animationType="fade"
      onRequestClose={closeDisputeModal}
    >
      <Pressable style={s.backdrop} onPress={closeDisputeModal}>
        <Pressable style={s.card} onPress={(e) => e.stopPropagation()}>
          <Text style={s.title}>결제 이의제기</Text>
          <Text style={s.subTitle}>
            {disputeTarget
              ? `주문 #${disputeTarget.orderId} (${disputeTarget.payMethodLabel})`
              : ""}
          </Text>
          <View style={s.chipRow}>
            {DISPUTE_REASON_OPTIONS.map((r) => (
              <Pressable
                key={r.value}
                style={[s.chip, disputeReason === r.value && s.chipActive]}
                onPress={() => setDisputeReason(r.value)}
              >
                <Text
                  style={[
                    s.chipText,
                    disputeReason === r.value && s.chipTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.hint}>{hint}</Text>
          <TextInput
            style={s.input}
            value={disputeDescription}
            onChangeText={setDisputeDescription}
            placeholder="사유를 상세히 입력해 주세요."
            multiline
            maxLength={300}
          />
          <View style={s.footer}>
            <Pressable style={s.cancelBtn} onPress={closeDisputeModal}>
              <Text style={s.cancelBtnText}>취소</Text>
            </Pressable>
            <Pressable
              style={[
                s.submitBtn,
                (!disputeDescription.trim() || isSubmittingDispute) &&
                  s.btnDisabled,
              ]}
              disabled={!disputeDescription.trim() || isSubmittingDispute}
              onPress={submitDispute}
            >
              <Text style={s.submitBtnText}>접수하기</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (c: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 20,
    },
    card: { backgroundColor: "#FFF", borderRadius: 20, padding: 20 },
    title: { fontSize: 18, fontWeight: "900", color: "#1E293B" },
    subTitle: {
      fontSize: 13,
      color: "#64748B",
      marginTop: 4,
      marginBottom: 16,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 99,
      backgroundColor: "#F1F5F9",
    },
    chipActive: { backgroundColor: "#1E293B" },
    chipText: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
    chipTextActive: { color: "#FFF" },
    hint: {
      fontSize: 12,
      color: "#64748B",
      marginVertical: 12,
      lineHeight: 18,
    },
    input: {
      height: 100,
      backgroundColor: "#F8FAFC",
      borderRadius: 12,
      padding: 12,
      textAlignVertical: "top",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 20,
    },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    cancelBtnText: { color: "#64748B", fontWeight: "700" },
    submitBtn: {
      backgroundColor: "#E11D48",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
    },
    btnDisabled: { backgroundColor: "#FDA4AF" },
    submitBtnText: { color: "#FFF", fontWeight: "800" },
  });
