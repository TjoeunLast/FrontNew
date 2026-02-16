import { useState } from "react";
import { Alert } from "react-native";

export const useDrivingProcess = () => {
  const [step, setStep] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  // 1. 운행 단계 진행 로직
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

  // 2. 배차 취소 로직 (추가된 부분)
  const handleCancelOrder = (orderId: number) => {
    Alert.alert("배차 취소", `오더 #${orderId} 배차 신청을 취소하시겠습니까?`, [
      { text: "아니오", style: "cancel" },
      {
        text: "예, 취소합니다",
        onPress: () => {
          // 여기에 나중에 서버 API 연동하면 됩니다.
          console.log(`${orderId}번 오더 취소 처리됨`);
          Alert.alert("알림", "배차 신청이 취소되었습니다.");
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
