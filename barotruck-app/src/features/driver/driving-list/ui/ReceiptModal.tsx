import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Ionicons } from "@expo/vector-icons";

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
}

const { height } = Dimensions.get("window");

export const ReceiptModal = ({ visible, onClose }: ReceiptModalProps) => {
  const { colors: c } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide" // 아래에서 위로 올라오는 효과
      onRequestClose={onClose}
    >
      {/* 배경 어둡게 처리 */}
      <View style={s.overlay}>
        <Pressable style={s.flex1} onPress={onClose} />

        {/* 모달 본체 (Sheet) */}
        <View style={[s.sheet, { backgroundColor: c.bg.surface }]}>
          {/* 상단 핸들러 바 (디자인용) */}
          <View style={[s.handle, { backgroundColor: c.border.default }]} />

          <Text style={[s.title, { color: c.text.primary }]}>인수증 등록</Text>
          <Text style={[s.subTitle, { color: c.text.secondary }]}>
            종이 인수증 혹은 서명이 보이게 촬영해주세요.
          </Text>

          {/* 업로드 영역 (나중에 기능 넣을 곳) */}
          <Pressable
            style={[
              s.uploadArea,
              { backgroundColor: c.bg.canvas, borderColor: c.border.default },
            ]}
            onPress={() => console.log("카메라/갤러리 오픈 예정")}
          >
            <Ionicons
              name="camera-outline"
              size={32}
              color={c.text.secondary}
            />
            <Text style={[s.uploadText, { color: c.text.secondary }]}>
              사진 촬영 또는 파일 선택
            </Text>
          </Pressable>

          {/* 등록 버튼 */}
          <Pressable
            style={[s.submitBtn, { backgroundColor: c.brand.primary }]}
            onPress={() => {
              console.log("등록 프로세스 시작");
              onClose();
            }}
          >
            <Text style={s.submitBtnText}>등록 및 운행 종료</Text>
          </Pressable>

          {/* 닫기 버튼 */}
          <Pressable style={s.cancelBtn} onPress={onClose}>
            <Text style={[s.cancelBtnText, { color: c.text.secondary }]}>
              취소
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  flex1: { flex: 1 },
  sheet: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: height * 0.5, // 화면 높이의 절반 정도
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  uploadArea: {
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  uploadText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
  },
  submitBtn: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
