import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { OrderService } from "@/shared/api/orderService";
import { OrderResponse } from "@/shared/models/order";

export const useDrivingList = () => {
  const [activeTab, setActiveTab] = useState<"READY" | "ING" | "DONE">("READY");
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
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
    refresh: fetchMyOrders, //  새로고침 함수 반환
  };
};
