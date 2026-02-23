import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { OrderService } from "@/shared/api/orderService";
import { OrderResponse } from "@/shared/models/order";
import * as Location from "expo-location"; // 🚩 위치 라이브러리 추가

export const useDrivingList = () => {
  const [activeTab, setActiveTab] = useState<"READY" | "ING" | "DONE">("READY");
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚩 기사님 현재 위치 상태 추가
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  /** [함수] 내 위치 가져오기 */
  const getMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      setMyLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error("위치 획득 실패:", error);
    }
  };

  /** [함수] 목록 로드 */
  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      await getMyLocation(); // 🚩 데이터를 받기 전에 내 위치부터 파악
      const data = await OrderService.getMyDrivingOrders();
      setOrders(data);
    } catch (error) {
      console.error("목록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyOrders();
    }, []),
  );

  return {
    activeTab,
    setActiveTab,
    myLocation, // 🚩 UI에서 쓸 수 있게 위치 정보 반환
    pendingOrders: orders.filter(
      (o) =>
        o.status === "APPLIED" ||
        (o.status === "ACCEPTED" && !o.status.includes("CANCELLED")),
    ),
    activeOrders: orders.filter((o) =>
      ["LOADING", "IN_TRANSIT", "UNLOADING"].includes(o.status),
    ),
    completedOrders: orders.filter((o) => o.status === "COMPLETED"),
    loading,
    refresh: fetchMyOrders,
  };
};
