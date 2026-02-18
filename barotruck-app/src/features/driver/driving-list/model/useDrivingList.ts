import { useState, useEffect } from "react";
import { OrderService } from "@/shared/api/orderService";
import { OrderResponse } from "@/shared/models/order";

export const useDrivingList = () => {
  const [activeTab, setActiveTab] = useState<"READY" | "ING" | "DONE">("READY");
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyOrders = async () => {
      try {
        setLoading(true);
        const data = await OrderService.getMyDrivingOrders();
        console.log("서버에서 넘어온 전체 데이터:", data);
        setOrders(data);
      } catch (error) {
        console.error("오더 목록을 가져오는데 실패했습니다:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyOrders();
  }, []);

  // 1. 배차 탭: APPLIED(승인대기) 또는 ACCEPTED(배차확정)
  const pendingOrders = orders.filter(
    (o) => o.status === "APPLIED" || o.status === "ACCEPTED",
  );

  // 2. 운송 중 탭: ING
  const activeStatuses = ["LOADING", "IN_TRANSIT", "UNLOADING"];
  const activeOrders = orders.filter((o) => activeStatuses.includes(o.status));

  // 3. 완료 탭: COMPLETED
  const completedOrders = orders.filter((o) => o.status === "COMPLETED");

  return {
    activeTab,
    setActiveTab,
    pendingOrders,
    activeOrders,
    completedOrders,
    loading,
  };
};
