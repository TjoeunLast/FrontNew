import { useMemo, useState, useEffect, useCallback } from "react";
import { Alert, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { OrderService } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useDrivingProcess } from "@/features/driver/driving/model/useDrivingProcess";

export const useOrderDetail = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors: c } = useAppTheme();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. 데이터 리프레시 함수 (상태 변경 후 재조회용)
  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const myOrders = await OrderService.getMyDrivingOrders();
      let found = myOrders.find((o) => o.orderId.toString() === id);

      if (!found) {
        const available = await OrderService.getAvailableOrders();
        found = available.find((o) => o.orderId.toString() === id);
      }

      if (found) {
        setOrder({ ...found });
        console.log("✅ 데이터 동기화 완료 (현재 상태):", found.status);
      }
    } catch (error) {
      console.error("데이터 매칭 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 2. 프로세스 훅 연결 (액션 성공 시 fetchDetail 실행)
  const {
    handleUpdateStatus,
    handleCancelOrder,
    handleStartTransport,
    modalOpen,
    setModalOpen,
  } = useDrivingProcess(fetchDetail);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id, fetchDetail]);

  // 3. 버튼 설정
  const buttonConfig = useMemo(() => {
    if (!order) return null;
    const s = order.status;

    switch (s) {
      case "REQUESTED":
        return {
          text: order.instant ? "바로배차 확정" : "배차 신청하기",
          icon: "checkmark-circle-outline",
          color: order.instant ? "#EF4444" : c.brand.primary,
          onPress: () =>
            OrderService.acceptOrder(order.orderId).then(fetchDetail),
        };
      case "APPLIED":
        return {
          text: "배차 신청 취소",
          icon: "close-circle-outline",
          color: "#64748B",
          onPress: () => handleCancelOrder(order.orderId),
        };
      case "ACCEPTED":
        return {
          text: "운송 시작하기",
          icon: "play-circle-outline",
          color: "#4F46E5",
          onPress: () => handleStartTransport(order.orderId),
        };
      case "LOADING":
        return {
          text: "상차 완료",
          icon: "arrow-forward-circle-outline",
          color: "#10B981",
          onPress: () => handleUpdateStatus(order.orderId, "IN_TRANSIT"),
        };
      case "IN_TRANSIT":
        return {
          text: "하차지 도착",
          icon: "location-outline",
          color: "#6366F1",
          onPress: () => handleUpdateStatus(order.orderId, "UNLOADING"),
        };
      case "UNLOADING":
        return {
          text: "하차 완료",
          icon: "flag-outline",
          color: "#059669",
          onPress: () => handleUpdateStatus(order.orderId, "COMPLETED"),
        };
      case "COMPLETED":
        return {
          text: "운송 완료됨",
          icon: "ribbon-outline",
          color: "#94A3B8",
          onPress: () => Alert.alert("알림", "완료된 운송입니다."),
        };
      default:
        return null;
    }
  }, [
    order,
    c,
    fetchDetail,
    handleCancelOrder,
    handleStartTransport,
    handleUpdateStatus,
  ]);

  return {
    order,
    loading,
    modalOpen,
    setModalOpen,
    totalPrice: order ? (order.basePrice || 0) + (order.laborFee || 0) : 0,
    formatAddress: {
      big: (addr: string) => addr?.split(" ").slice(0, 2).join(" ") || "",
      small: (addr: string) => addr?.split(" ").slice(2).join(" ") || "",
    },
    actions: {
      goBack: () => router.back(),
      copyAddress: async (t: string) => {
        await Clipboard.setStringAsync(t);
        Alert.alert("복사완료");
      },
      callPhone: (num: string) => Linking.openURL(`tel:${num}`),
    },
    buttonConfig,
  };
};
