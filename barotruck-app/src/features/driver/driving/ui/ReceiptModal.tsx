import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ProofService } from "@/shared/api/proofService";

interface ReceiptModalProps {
  visible: boolean;
  orderId?: number | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

const guessMimeType = (uri: string) => {
  const normalizedUri = uri.toLowerCase();
  if (normalizedUri.endsWith(".png")) return "image/png";
  if (normalizedUri.endsWith(".heic")) return "image/heic";
  if (normalizedUri.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

export const ReceiptModal = ({
  visible,
  orderId,
  onClose,
  onSubmitted,
}: ReceiptModalProps) => {
  const [receiptUri, setReceiptUri] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) return;
    setReceiptUri("");
    setRecipientName("");
    setSubmitting(false);
  }, [visible]);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "카메라 접근 권한을 허용해 주세요.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    setReceiptUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!orderId) {
      Alert.alert("오류", "주문 정보를 찾을 수 없습니다.");
      return;
    }

    const trimmedRecipientName = recipientName.trim();
    if (!receiptUri) {
      Alert.alert("확인", "배송 완료 인증 사진을 먼저 촬영해 주세요.");
      return;
    }

    if (!trimmedRecipientName) {
      Alert.alert("확인", "수령인 이름을 입력해 주세요.");
      return;
    }

    try {
      setSubmitting(true);
      const extension = receiptUri.split(".").pop()?.split("?")[0] || "jpg";

      await ProofService.uploadProof({
        orderId,
        recipientName: trimmedRecipientName,
        receipt: {
          uri: receiptUri,
          name: `receipt-${orderId}.${extension}`,
          type: guessMimeType(receiptUri),
        } as any,
      });

      Alert.alert("등록 완료", "배송 완료 인증이 등록되었습니다.", [
        {
          text: "확인",
          onPress: () => {
            onSubmitted?.();
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "배송 완료 인증 등록에 실패했습니다. 다시 시도해 주세요.";
      Alert.alert("등록 실패", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={submitting ? undefined : onClose}
    >
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>배송 완료 등록</Text>
            <Pressable disabled={submitting} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          <View style={s.content}>
            <Text style={s.description}>
              운송이 완료되었습니다.{"\n"}배송 완료 인증 사진을 촬영하고 수령인 정보를 입력해 주세요.
            </Text>

            <TouchableOpacity
              style={[s.photoBox, receiptUri ? s.photoBoxFilled : null]}
              onPress={() => void takePhoto()}
              activeOpacity={0.9}
              disabled={submitting}
            >
              {receiptUri ? (
                <>
                  <Image source={{ uri: receiptUri }} style={s.previewImage} />
                  <View style={s.previewBadge}>
                    <Ionicons name="camera" size={16} color="#FFF" />
                    <Text style={s.previewBadgeText}>다시 촬영</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="camera" size={40} color="#CBD5E1" />
                  <Text style={s.photoText}>배송 완료 인증 사진 촬영</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>수령인 이름</Text>
              <TextInput
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="예: 홍길동"
                placeholderTextColor="#94A3B8"
                editable={!submitting}
                style={s.input}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[s.submitBtn, submitting && s.submitBtnDisabled]}
            onPress={() => void handleSubmit()}
            activeOpacity={0.9}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.submitBtnText}>등록 완료</Text>
            )}
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
  content: { marginBottom: 24 },
  description: {
    textAlign: "center",
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 24,
  },
  photoBox: {
    width: "100%",
    height: 180,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  photoBoxFilled: {
    borderStyle: "solid",
    borderColor: "#CBD5E1",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  previewBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  photoText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  fieldBlock: {
    marginTop: 18,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFF",
  },
  submitBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#4E46E5",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
