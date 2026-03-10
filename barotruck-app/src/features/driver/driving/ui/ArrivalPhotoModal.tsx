import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { OrderService } from "@/shared/api/orderService";

interface ArrivalPhotoModalProps {
  visible: boolean;
  orderId?: number | null;
  onClose: () => void;
  onSubmitted?: (orderId: number) => Promise<void> | void;
}

const guessMimeType = (uri: string) => {
  const normalizedUri = uri.toLowerCase();
  if (normalizedUri.endsWith(".png")) return "image/png";
  if (normalizedUri.endsWith(".heic")) return "image/heic";
  if (normalizedUri.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

export const ArrivalPhotoModal = ({
  visible,
  orderId,
  onClose,
  onSubmitted,
}: ArrivalPhotoModalProps) => {
  const [photoUri, setPhotoUri] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) return;
    setPhotoUri("");
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
    setPhotoUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!orderId) {
      Alert.alert("오류", "주문 정보를 찾을 수 없습니다.");
      return;
    }
    if (!photoUri) {
      Alert.alert("확인", "하차지 도착 사진을 먼저 촬영해 주세요.");
      return;
    }

    try {
      setSubmitting(true);
      const extension = photoUri.split(".").pop()?.split("?")[0] || "jpg";

      await OrderService.uploadArrivalPhoto(orderId, {
        uri: photoUri,
        name: `arrival-photo-${orderId}.${extension}`,
        type: guessMimeType(photoUri),
      } as any);

      await onSubmitted?.(orderId);

      Alert.alert("등록 완료", "하차지 도착 사진이 저장되었습니다.", [
        {
          text: "확인",
          onPress: () => {
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "하차지 도착 사진 저장에 실패했습니다. 다시 시도해 주세요.";
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
            <Text style={s.title}>하차지 도착 사진</Text>
            <Pressable disabled={submitting} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          <View style={s.content}>
            <Text style={s.description}>
              하차지에 도착한 위치 사진을 촬영해 주세요.
            </Text>

            <TouchableOpacity
              style={[s.photoBox, photoUri ? s.photoBoxFilled : null]}
              onPress={() => void takePhoto()}
              activeOpacity={0.9}
              disabled={submitting}
            >
              {photoUri ? (
                <>
                  <Image source={{ uri: photoUri }} style={s.previewImage} />
                  <View style={s.previewBadge}>
                    <Ionicons name="camera" size={16} color="#FFF" />
                    <Text style={s.previewBadgeText}>다시 촬영</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="camera" size={40} color="#CBD5E1" />
                  <Text style={s.photoText}>하차지 도착 사진 촬영</Text>
                </>
              )}
            </TouchableOpacity>
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
              <Text style={s.submitBtnText}>사진 저장</Text>
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
    height: 220,
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
