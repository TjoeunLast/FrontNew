import { useState } from "react";
import { MOCK_ORDERS } from "@/shared/mockData";

export const useDrivingList = () => {
  // READY: 배차관리, ING: 운송 중, DONE: 운송 완료
  const [activeTab, setActiveTab] = useState<"READY" | "ING" | "DONE">("READY");

  // 1. 배차관리: 화주 승인 대기(REQUESTED) 또는 배차 확정(ACCEPTED) 상태
  const pendingOrders = MOCK_ORDERS.filter(
    (o) => o.status === "REQUESTED" || o.status === "ACCEPTED",
  );

  // 2. 운송 중: 실제 운행 중(IN_TRANSIT) 상태
  const activeOrders = MOCK_ORDERS.filter((o) => o.status === "IN_TRANSIT");

  // 3. 운송 완료: 운송이 끝난(COMPLETED) 상태
  const completedOrders = MOCK_ORDERS.filter((o) => o.status === "COMPLETED");

  return {
    activeTab,
    setActiveTab,
    pendingOrders,
    activeOrders,
    completedOrders,
  };
};
