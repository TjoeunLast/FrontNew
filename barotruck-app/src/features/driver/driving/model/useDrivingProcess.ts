import { useState } from "react";
import { Alert } from "react-native";
import { OrderService } from "@/shared/api/orderService";

export const useDrivingProcess = (onRefresh?: () => void) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /** 1. 오더 상태 업데이트 (상차완료, 하차지 도착 등) */
  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    try {
      setIsLoading(true);
      await OrderService.updateStatus(orderId, nextStatus);

      if (nextStatus === "IN_TRANSIT") {
        Alert.alert(
          "알림",
          "상차 완료 처리가 되었습니다. 하차지로 이동하세요.",
        );
      }

      if (nextStatus === "COMPLETED") {
        setModalOpen(true); // 하차 완료 시 인수증 모달 오픈
      }

      if (onRefresh) onRefresh(); // 목록 새로고침
    } catch (error: any) {
      Alert.alert("오류", "운송 상태 변경에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  /** 2. 배차 신청 취소 */
  const handleCancelOrder = async (orderId: string | number) => {
    Alert.alert("배차 신청 취소", "정말로 이 배차 신청을 취소하시겠습니까?", [
      { text: "아니오", style: "cancel" },
      {
        text: "예, 취소합니다",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);
            await OrderService.cancelOrder(Number(orderId), "차주 직접 취소");
            Alert.alert("알림", "배차 신청이 성공적으로 취소되었습니다.");
            if (onRefresh) onRefresh();
          } catch (error: any) {
            const errorMsg =
              error.response?.data?.message || "취소할 수 없는 상태입니다.";
            Alert.alert("취소 실패", errorMsg);
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  /** 3. 운송 시작 로직 (배차 확정 상태에서 누를 때) */
  const handleStartTransport = async (orderId: string | number) => {
    try {
      setIsLoading(true);
      await OrderService.updateStatus(Number(orderId), "LOADING");
      Alert.alert("운송 시작", "성공적으로 운송이 시작되었습니다.");
      if (onRefresh) onRefresh();
    } catch (error) {
      Alert.alert("오류", "운송 시작 처리에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    modalOpen,
    setModalOpen,
    isLoading,
    handleUpdateStatus,
    handleCancelOrder,
    handleStartTransport,
  };
};
