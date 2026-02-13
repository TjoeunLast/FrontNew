// src/features/driver/driving-list/model/useDrivingProcess.ts
import { useState } from "react";
import { Alert } from "react-native";

export const useDrivingProcess = () => {
  const [step, setStep] = useState(1); // 1: 상차지도착, 2: 상차완료, 3: 하차지도착, 4: 하차완료
  const [modalOpen, setModalOpen] = useState(false);

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
      Alert.alert("알림", "상차지에 도착했습니다. 작업을 시작하세요.");
    } else if (step === 2) {
      setStep(3);
      Alert.alert("알림", "상차가 완료되었습니다. 하차지로 출발!");
    } else if (step === 3) {
      setStep(4);
      Alert.alert("알림", "하차지에 도착했습니다.");
    } else if (step === 4) {
      setModalOpen(true); // 마지막 단계에서 모달 오픈
    }
  };

  return { step, modalOpen, setModalOpen, handleNextStep };
};
