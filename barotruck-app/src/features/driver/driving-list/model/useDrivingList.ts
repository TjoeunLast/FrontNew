import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { OrderService } from "@/shared/api/orderService";
import { OrderResponse } from "@/shared/models/order";

export const useDrivingList = () => {
  // 상태 관리
  const [activeTab, setActiveTab] = useState<"READY" | "ING" | "DONE">("READY");

  // order: 전체 오더 목록
  const [orders, setOrders] = useState<OrderResponse[]>([]);

  // loading: 로딩 상태
  const [loading, setLoading] = useState(true);

  // 전체 목록 로드(위치 정보 파악 후 서버에서 오더 목록 가져오기)
  const fetchMyOrders = async () => {
    try {
      setLoading(true);
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
