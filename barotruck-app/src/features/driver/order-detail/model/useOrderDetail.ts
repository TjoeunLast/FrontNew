import { useMemo, useState, useEffect, useCallback } from "react";
import { Alert, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import { OrderService } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useDrivingProcess } from "@/features/driver/driving/model/useDrivingProcess";

export const useOrderDetail = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors: c } = useAppTheme();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 기사님 현재 위치 상태
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  /**
   * SECTION 1: 데이터 패칭 및 동기화
   */
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
        console.log("✅ 데이터 동기화 완료:", found.status);
      }
    } catch (error) {
      console.error("데이터 매칭 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * SECTION 2: 물류 운행 프로세스 훅 연결
   */
  const {
    handleUpdateStatus,
    handleCancelOrder,
    handleStartTransport,
    modalOpen,
    setModalOpen,
  } = useDrivingProcess(fetchDetail);

  /**
   * SECTION 3: 위치 정보 가져오기
   */
  const getMyLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      setMyLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error("상세페이지 위치 획득 실패:", error);
    }
  }, []);

  useEffect(() => {
    if (id) fetchDetail();
    getMyLocation();
  }, [id, fetchDetail, getMyLocation]);

  /**
   * SECTION 4: 하단 액션 버튼 설정
   */
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
            try {
              if (order.instant) {
                await OrderService.acceptOrder(order.orderId);
                Alert.alert("성공", "배차가 즉시 확정되었습니다.");
              } else {
                await OrderService.applyOrder(order.orderId);
                Alert.alert("성공", "배차 신청이 완료되었습니다.");
              }
              fetchDetail();
            } catch (error) {
              Alert.alert("오류", "배차 처리 중 문제가 발생했습니다.");
            }
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
    fetchDetail,
    handleCancelOrder,
    handleStartTransport,
    handleUpdateStatus,
  ]);

  /**
   * SECTION 5: 반환 데이터 (에러 해결 포인트! 🚩)
   */
  return {
    order,
    loading,
    modalOpen,
    setModalOpen,
    myLocation,
    totalPrice: order
      ? (order.basePrice || 0) +
        (order.laborFee || 0) +
        (order.packagingPrice || 0)
      : 0,

    // 🚩 당상/당착 정보 반환 (UI에서 사용 예정)
    startType: order?.startType || "",
    endType: order?.endType || "",

    // 🚩 인수증/후불 배지 로직 (DrOrderCard와 동기화)
    payMethodLabel: order?.payMethod?.includes("선착불")
      ? "현금/선불"
      : "인수증/후불",
    payMethodTone: order?.payMethod?.includes("선착불")
      ? "payPrepaid"
      : "payDeferred",

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
