import { useMemo, useState } from "react";
import { Alert, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { OrderService } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { MOCK_ORDERS } from "@/shared/mockData"; // 목업 데이터
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";

export const useOrderDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors: c } = useAppTheme();

  // 1. 데이터 파싱
  const { id } = useLocalSearchParams(); // URL에서 [id]를 가져옴
  const [order, setOrder] = useState<any>(null); // 찾은 오더 저장

  // ID를 기반으로 데이터 세팅
  useEffect(() => {
    // 실제로는 여기서 API를 호출(OrderService.getDetail(id))
    // 목업 데이터 호출
    const found = MOCK_ORDERS.find((o) => o.orderId.toString() === id);
    if (found) {
      setOrder(found);
    }
  }, [id]);

  // order가 로딩 중일 때를 대비해 나머지 로직에 방어 코드 추가
  const [isDispatched, setIsDispatched] = useState(false);
  const [loading, setLoading] = useState(false);

  // 2. 파생 데이터 계산 (Total Price 등)
  const totalPrice = useMemo(
    () => (order ? order.basePrice + (order.laborFee || 0) : 0),
    [order],
  );

  // 3. 주소 포맷팅 헬퍼
  const formatAddress = {
    big: (addr: string) => {
      const parts = addr?.split(" ") || [];
      return parts.length > 1 ? `${parts[0]} ${parts[1]}` : addr;
    },
    small: (addr: string) => {
      const parts = addr?.split(" ") || [];
      return parts.length > 2 ? parts.slice(2).join(" ") : "";
    },
  };

  // 4. 액션 핸들러들
  const actions = {
    goBack: () => router.back(),
    callPhone: (phoneNumber: string) => Linking.openURL(`tel:${phoneNumber}`),
    copyAddress: async (text: string) => {
      await Clipboard.setStringAsync(text);
      Alert.alert("알림", "주소가 복사되었습니다.");
    },
    dispatchOrder: async () => {
      if (!order) return;
      try {
        setLoading(true);
        await OrderService.acceptOrder(order.orderId);
        setIsDispatched(true);
        Alert.alert(
          "완료",
          order.isInstant
            ? "배차가 확정되었습니다."
            : "배차 신청이 접수되었습니다.",
        );
      } catch (error) {
        Alert.alert("알림", "처리에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    },
    startNavigation: () => {
      Alert.alert("길안내", "내비게이션을 실행합니다.");
    },
  };

  // 5. 버튼 상태 설정 (UI 로직)
  const buttonConfig = useMemo(() => {
    if (!order) return null;

    // 이미 배차 완료된 상태거나 로컬에서 배차 성공했을 때
    const isCompleted =
      isDispatched ||
      ["ACCEPTED", "IN_TRANSIT", "LOADING", "UNLOADING"].includes(order.status);

    if (isCompleted) {
      return {
        text: "길안내 시작",
        icon: "navigate-circle-outline",
        color: c.brand.primary,
        onPress: actions.startNavigation,
        isInstantStyle: false,
      };
    }

    // 바로 배차
    if (order.instant) {
      return {
        text: "배차 확정",
        icon: "checkmark-circle-outline",
        color: "#EF4444",
        onPress: actions.dispatchOrder,
        isInstantStyle: true, // 스타일 분기용 플래그
      };
    }

    // 일반 배차 신청
    return {
      text: "배차 신청",
      icon: "paper-plane-outline",
      color: c.brand.primary,
      onPress: actions.dispatchOrder,
      isInstantStyle: false,
    };
  }, [order, isDispatched, c.brand.primary]);

  return {
    order,
    loading,
    totalPrice,
    formatAddress,
    actions,
    buttonConfig,
  };
};
