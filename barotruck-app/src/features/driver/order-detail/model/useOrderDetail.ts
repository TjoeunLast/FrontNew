import { useMemo, useState, useEffect, useCallback } from "react";
import { Alert, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

import { OrderService } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useDrivingProcess } from "@/features/driver/driving/model/useDrivingProcess";

export const useOrderDetail = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors: c } = useAppTheme(); // 시스템 공통 테마 컬러 사용

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /**
   * SECTION 1: 데이터 패칭 및 동기화
   * - 상세 페이지 진입 시 및 상태 업데이트 후 호출하여 데이터를 리프레시함
   */
  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      // 내 운행 목록에서 먼저 조회
      const myOrders = await OrderService.getMyDrivingOrders();
      let found = myOrders.find((o) => o.orderId.toString() === id);

      // 내 목록에 없으면 전체 배차 목록에서 조회 (상세 진입 대응)
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

  /**
   * SECTION 2: 물류 운행 프로세스 훅 연결
   * - 상차, 하차, 운송 시작 등 상태 변경 로직과 인수증 모달 제어 포함
   */
  const {
    handleUpdateStatus,
    handleCancelOrder,
    handleStartTransport,
    modalOpen,
    setModalOpen,
  } = useDrivingProcess(fetchDetail); // 액션 성공 시 fetchDetail 실행

  useEffect(() => {
    if (id) fetchDetail();
  }, [id, fetchDetail]);

  /**
   * SECTION 3: 하단 액션 버튼 설정 (UI 매핑)
   * - order.status 값에 따라 텍스트, 아이콘, 테마 컬러, 실행 함수를 결정함
   */
  const buttonConfig = useMemo(() => {
    if (!order) return null;
    const s = order.status;

    switch (s) {
      case "REQUESTED":
        // 바로배차(urgent)인 경우 강조 레드, 일반배차인 경우 브랜드 블루 적용
        return {
          text: order.instant ? "바로배차 확정" : "배차 신청하기",
          icon: "checkmark-circle-outline",
          color: order.instant ? c.badge.urgentBg : c.brand.primary,
          onPress: () =>
            OrderService.acceptOrder(order.orderId).then(fetchDetail),
        };
      case "APPLIED":
        // 배차 신청 대기 중 취소 액션
        return {
          text: "배차 신청 취소",
          icon: "close-circle-outline",
          color: c.status.warning,
          onPress: () => handleCancelOrder(order.orderId),
        };
      case "ACCEPTED":
        // 배차 확정 후 운송 시작 액션 (안내 색상)
        return {
          text: "운송 시작하기",
          icon: "play-circle-outline",
          color: c.brand.primary,
          onPress: () => handleStartTransport(order.orderId),
        };
      case "LOADING":
        // 상차지로 이동 후 상차 완료 액션 (성공 색상)
        return {
          text: "상차 완료",
          icon: "arrow-forward-circle-outline",
          color: c.status.success,
          onPress: () => handleUpdateStatus(order.orderId, "IN_TRANSIT"),
        };
      case "IN_TRANSIT":
        // 운행 중 하차지 도착 알림 (주의 색상)
        return {
          text: "하차지 도착",
          icon: "location-outline",
          color: c.status.warning,
          onPress: () => handleUpdateStatus(order.orderId, "UNLOADING"),
        };
      case "UNLOADING":
        // 하차 완료 및 운송 종료 (성공 색상)
        return {
          text: "하차 완료",
          icon: "flag-outline",
          color: c.status.success,
          onPress: () => handleUpdateStatus(order.orderId, "COMPLETED"),
        };
      case "COMPLETED":
        // 모든 운송 종료 후 비활성 상태 (회색 텍스트 컬러)
        return {
          text: "운송 완료됨",
          icon: "ribbon-outline",
          color: c.badge.completeText,
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

  /**
   * SECTION 4: View 전용 헬퍼 및 액션
   */
  return {
    order,
    loading,
    modalOpen,
    setModalOpen,
    totalPrice: order ? (order.basePrice || 0) + (order.laborFee || 0) : 0,
    // 주소 가공 함수 (시/도 단위 분리)
    formatAddress: {
      big: (addr: string) => addr?.split(" ").slice(0, 2).join(" ") || "",
      small: (addr: string) => addr?.split(" ").slice(2).join(" ") || "",
    },
    // 화면 조작 기능
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
