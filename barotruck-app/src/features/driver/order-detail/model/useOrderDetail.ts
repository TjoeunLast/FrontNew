import { useMemo, useState, useEffect } from "react";
import { Alert, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";

import { OrderService } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useDrivingProcess } from "@/features/driver/driving/model/useDrivingProcess";

export const useOrderDetail = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors: c } = useAppTheme();

  // 상태 관리
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // 내 위치 가져오기 (임시 좌표 적용)
  const getMyLocation = async () => {
    // 임시 기본 좌표 (강남역 근처)
    const FALLBACK_LOCATION = { lat: 37.494461, lng: 127.029592 };

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      // 1. 권한 거부 시: 임시 좌표 세팅 후 종료
      if (status !== "granted") {
        console.log("위치 권한 거부됨. 기본 위치를 사용합니다.");
        setMyLocation(FALLBACK_LOCATION);
        return;
      }

      // 2. 캐시된 위치 먼저 확인
      let location = await Location.getLastKnownPositionAsync({});

      // 3. 캐시가 없으면 현재 위치 요청
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      if (location) {
        // 성공적으로 가져오면 실제 내 위치 세팅
        setMyLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        console.log("내 위치 가져오기 성공:", location.coords);
      } else {
        // 못 가져왔을 경우 임시 좌표
        setMyLocation(FALLBACK_LOCATION);
      }
    } catch (error) {
      // 4. 통신 에러, GPS 꺼짐 등 어떤 에러가 나도 임시 좌표를 띄워서 무한로딩 방지!
      console.warn("위치 가져오기 실패. 기본 위치로 대체합니다:", error);
      setMyLocation(FALLBACK_LOCATION);
    }
  };

  // 데이터 매칭
  const fetchDetail = async () => {
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
        console.log("✅ 데이터 동기화 완료:", found.status);
      }
    } catch (error) {
      console.error("데이터 매칭 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const {
    handleUpdateStatus,
    handleArriveWithPhoto,
    handleCancelOrder,
    handleStartTransport,
    modalOpen,
    setModalOpen,
    receiptOrderId,
    closeReceiptModal,
    arrivalPhotoModalOpen,
    arrivalPhotoOrderId,
    closeArrivalPhotoModal,
    handleAcceptOrder,
  } = useDrivingProcess(fetchDetail);

  // 초기 렌더링 시 데이터 패칭 (위치는 백그라운드로 실행)
  useEffect(() => {
    if (id) void fetchDetail();
    void getMyLocation();
  }, [id]);

  // 하단 액션 버튼
  const buttonConfig = useMemo(() => {
    if (!order) return null;
    const s = order.status;

    switch (s) {
      case "REQUESTED":
        return {
          text: order.instant ? "바로배차 확정" : "배차 신청하기",
          icon: "checkmark-circle-outline",
          color: order.instant ? c.badge.urgentBg : c.brand.primary,
          onPress: async () => {
            await handleAcceptOrder(order.orderId);
          },
        };
      case "APPLIED":
        return {
          text: "배차 신청 취소",
          icon: "close-circle-outline",
          color: c.status.warning,
          onPress: () => handleCancelOrder(order.orderId),
        };
      case "ACCEPTED":
        return {
          text: "운송 시작하기",
          icon: "play-circle-outline",
          color: c.brand.primary,
          onPress: () => handleStartTransport(order.orderId),
        };
      case "LOADING":
        return {
          text: "상차 완료",
          icon: "arrow-forward-circle-outline",
          color: c.status.success,
          onPress: () => handleUpdateStatus(order.orderId, "IN_TRANSIT"),
        };
      case "IN_TRANSIT":
        return {
          text: "하차지 도착",
          icon: "location-outline",
          color: c.status.warning,
          onPress: () => handleUpdateStatus(order.orderId, "UNLOADING"),
        };
      case "UNLOADING":
        return {
          text: "하차 완료",
          icon: "flag-outline",
          color: c.status.success,
          onPress: () => handleUpdateStatus(order.orderId, "COMPLETED"),
        };
      case "COMPLETED":
        return {
          text: "운송 완료됨",
          icon: "ribbon-outline",
          color: c.badge.completeText,
          onPress: () => Alert.alert("알림", "이미 완료된 운송입니다."),
        };
      default:
        return null;
    }
  }, [
    order,
    c,
    handleCancelOrder,
    handleStartTransport,
    handleUpdateStatus,
    handleAcceptOrder,
  ]);

  return {
    order,
    loading,
    modalOpen,
    setModalOpen,
    receiptOrderId,
    closeReceiptModal,
    arrivalPhotoModalOpen,
    arrivalPhotoOrderId,
    closeArrivalPhotoModal,
    handleArriveWithPhoto,
    myLocation,

    // 계산된 데이터
    totalPrice: order
      ? (order.basePrice || 0) +
        (order.laborFee || 0) +
        (order.packagingPrice || 0)
      : 0,
    startType: order?.startType || "",
    endType: order?.endType || "",

    // 헬퍼 함수
    formatAddress: {
      big: (addr: string) => addr?.split(" ").slice(0, 2).join(" ") || "",
      small: (addr: string) => addr?.split(" ").slice(2).join(" ") || "",
    },

    // 액션
    actions: {
      goBack: () => router.back(),
      copyAddress: async (t: string) => {
        await Clipboard.setStringAsync(t);
        Alert.alert("복사완료");
      },
      callPhone: (num: string) => Linking.openURL(`tel:${num}`),
    },

    // 하단 버튼 구성
    buttonConfig,
  };
};
