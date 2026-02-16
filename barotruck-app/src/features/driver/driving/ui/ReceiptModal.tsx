import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ReceiptModal = ({ visible, onClose }: ReceiptModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>인수증 등록</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          <View style={s.content}>
            <Text style={s.description}>
              운송이 완료되었습니다.{"\n"}물품 수령 확인을 위해 인수증을
              촬영해주세요.
            </Text>

            <TouchableOpacity style={s.photoBox}>
              <Ionicons name="camera" size={40} color="#CBD5E1" />
              <Text style={s.photoText}>인수증 사진 촬영</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s.submitBtn}
            onPress={() => {
              // 여기서 정산/완료 처리 로직 실행 가능
              onClose();
            }}
          >
            <Text style={s.submitBtnText}>등록 완료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  content: { alignItems: "center", marginBottom: 30 },
  description: {
    textAlign: "center",
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 24,
  },
  photoBox: {
    width: "100%",
    height: 160,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  photoText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  submitBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#4E46E5",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
