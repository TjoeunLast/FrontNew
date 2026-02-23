import { useState, useEffect, useCallback, useMemo } from "react";
import { OrderResponse } from "@/shared/models/order";
import { OrderService } from "@/shared/api/orderService";

export interface IncomeSummary {
  month: number;
  amount: number;
  targetDiff: number;
  growthRate: number;
}

// 수익 카드는 요청하신 대로 목업 유지
const MOCK_INCOME: IncomeSummary = {
  month: 2,
  amount: 3540000,
  targetDiff: 460000,
  growthRate: 8.5,
};

export const useDriverHome = () => {
  const [recommendedOrders, setRecommendedOrders] = useState<OrderResponse[]>(
    [],
  );
  const [myOrders, setMyOrders] = useState<OrderResponse[]>([]);
  const [income] = useState<IncomeSummary>(MOCK_INCOME);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHomeData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [recommendedResult, drivingResult] = await Promise.allSettled([
        OrderService.getRecommendedOrders(),
        OrderService.getMyDrivingOrders(),
      ]);

      if (recommendedResult.status === "fulfilled") {
        const filteredRecommended = recommendedResult.value.filter(
          (o) => o.status === "REQUESTED",
        );
        setRecommendedOrders(filteredRecommended);
      } else {
        console.warn("홈 추천 오더 로드 실패:", recommendedResult.reason);
        setRecommendedOrders([]);
      }

      if (drivingResult.status === "fulfilled") {
        setMyOrders(drivingResult.value);
      } else {
        console.warn("내 운행 목록 로드 실패:", drivingResult.reason);
        setMyOrders([]);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // 요청하신 상태값 기준 필터링 로직
  const statusCounts = useMemo(() => {
    return {
      // 승인대기: APPLIED
      pending: myOrders.filter((o) => o.status === "APPLIED").length,
      // 배차확정: ACCEPTED
      confirmed: myOrders.filter((o) => o.status === "ACCEPTED").length,
      // 운송중: LOADING, IN_TRANSIT, UNLOADING
      shipping: myOrders.filter((o) =>
        ["LOADING", "IN_TRANSIT", "UNLOADING"].includes(o.status),
      ).length,
      // 운송완료: COMPLETED
      completed: myOrders.filter((o) => o.status === "COMPLETED").length,
    };
  }, [myOrders]);

  return {
    recommendedOrders,
    income,
    statusCounts,
    isRefreshing,
    onRefresh: fetchHomeData,
  };
};
