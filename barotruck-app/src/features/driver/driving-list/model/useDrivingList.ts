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

// 현재 내 위치 가져오기 (최대 5초 대기)
  const getMyLocation = async () => {
    try {
      // 1. 권한 확인
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("위치 권한 거부됨");
        return;
      }

      // 2. 위치 서비스 활성화 확인 (GPS 스위치)
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        console.log("위치 서비스 비활성화 상태");
        return;
      }

      console.log("위치 획득 시도 (최대 5초)...");

      // 3. 5초 타임아웃과 위치 획득 간의 경주(Race)
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("timeout")), 3000)
        )
      ]) as Location.LocationObject;

      console.log("위치 획득 성공:", location.coords);
      setMyLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

    } catch (error) {
      // 5초가 지났거나 기타 에러 발생 시
      console.log("위치 정보를 가져올 수 없어 기본 목록만 표시합니다.");
      // myLocation은 null로 유지됨
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
