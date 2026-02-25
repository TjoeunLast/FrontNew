import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { OrderService } from "@/shared/api/orderService";
import { OrderResponse } from "@/shared/models/order";
import * as Location from "expo-location"; // 🚩 위치 라이브러리 추가

export const useDrivingList = () => {
  // 상태 관리
  const [activeTab, setActiveTab] = useState<"READY" | "ING" | "DONE">("READY");

  // order: 전체 오더 목록
  const [orders, setOrders] = useState<OrderResponse[]>([]);

  // loading: 로딩 상태
  const [loading, setLoading] = useState(true);

  // myLocation: 현재 위도, 경도 저장
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // 현재 내 위치 가져오기(GPS 권한 허용 여부, 좌표 저장)
  const getMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return; // 권한 없으면 중단

      const location = await Location.getCurrentPositionAsync({});
      setMyLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error("위치 획득 실패:", error);
    }
  };

  // 전체 목록 로드(위치 정보 파악 후 서버에서 오더 목록 가져오기)
  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      await getMyLocation(); // 내 위치 파악
      const data = await OrderService.getMyDrivingOrders(); // API 호출
      setOrders(data); // 데이터 저장
    } catch (error) {
      console.error("목록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 초기 실행
  useEffect(() => {
    fetchMyOrders();
  }, []);

  // 화면 복귀 시 갱신
  useFocusEffect(
    useCallback(() => {
      fetchMyOrders();
    }, []),
  );

  return {
    activeTab,
    setActiveTab,
    myLocation,

    // 배차 탭
    pendingOrders: orders.filter(
      (o) =>
        o.status === "APPLIED" ||
        (o.status === "ACCEPTED" && !o.status.includes("CANCELLED")),
    ),
    // 운송 중 탭
    activeOrders: orders.filter((o) =>
      ["LOADING", "IN_TRANSIT", "UNLOADING"].includes(o.status),
    ),
    // 완료 탭
    completedOrders: orders.filter((o) => o.status === "COMPLETED"),

    loading,
    refresh: fetchMyOrders, // 수동 새로고침
  };
};
