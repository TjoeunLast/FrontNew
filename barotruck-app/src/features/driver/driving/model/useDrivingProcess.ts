import { useState } from "react";
import { Alert } from "react-native";
import { OrderService } from "@/shared/api/orderService"; // 서비스 임포트 확인!

export const useDrivingProcess = () => {
  const [step, setStep] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  // 1. 운행 단계 진행 로직 (운송 중 탭에서 사용)
  const handleNextStep = () => {
    if (step === 2) {
      Alert.alert("알림", "상차 완료 처리가 되었습니다. 하차지로 이동하세요.");
    }
    if (step < 4) {
      setStep((prev) => prev + 1);
    } else if (step === 4) {
      setStep(5);
      setModalOpen(true);
    }
  };

  // 2. 배차 취소 로직 (실제 서버 API 연동)
  const handleCancelOrder = (orderId: number) => {
    Alert.alert("배차 취소", `오더 #${orderId} 배차 신청을 취소하시겠습니까?`, [
      { text: "아니오", style: "cancel" },
      {
        text: "예, 취소합니다",
        onPress: async () => {
          try {
            // 🚩 [실제 API 호출] 사유는 "차주 신청 취소"로 고정해서 보냅니다.
            await OrderService.cancelOrder(orderId, "차주 신청 취소(테스트)");

            Alert.alert("알림", "배차 신청이 취소되었습니다.", [
              {
                text: "확인",
                onPress: () => {
                  // 여기서 목록을 새로고침하거나 탭을 다시 불러오는 로직이 필요할 수 있습니다.
                  // 현재 구조에서는 화면을 다시 그리면 사라질 거예요.
                },
              },
            ]);
          } catch (error) {
            console.error("취소 실패:", error);
            Alert.alert(
              "에러",
              "이미 확정된 오더이거나 취소할 수 없는 상태입니다.",
            );
          }
        },
        style: "destructive",
      },
    ]);
  };

  return {
    step,
    modalOpen,
    setModalOpen,
    handleNextStep,
    handleCancelOrder,
  };
};
