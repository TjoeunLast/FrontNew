import { OrderService } from "@/shared/api/orderService";
import { OrderResponse } from "@/shared/models/order";
import { useCallback, useEffect, useMemo, useState } from "react";

export const useDriverHome = () => {
  const [recommendedOrders, setRecommendedOrders] = useState<OrderResponse[]>(
    [],
  );
  const [myOrders, setMyOrders] = useState<OrderResponse[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 홈 데이터 로드(위치 정보 가져온 후 서버 데이터 가져오기)
  const fetchHomeData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // 맞춤 오더 가져오기
      const recommendedPromise = OrderService.getRecommendedOrders();
      const drivingOrdersPromise = OrderService.getMyDrivingOrders();

      const [recommended, drivingOrders] = await Promise.all([
        recommendedPromise,
        drivingOrdersPromise,
      ]);

      const filteredRecommended = recommended.filter(
        (o) => o.status === "REQUESTED" || o.status === "APPLIED",
      );

      setRecommendedOrders(filteredRecommended);

      // 내 전체 운송 목록 가져오기 (상태 카운트용)
      setMyOrders(drivingOrders);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // 상태값 기준 필터링 로직
  const statusCounts = useMemo(() => {
    return {
      // 승인대기
      pending: myOrders.filter((o) => o.status === "APPLIED").length,
      // 배차확정
      confirmed: myOrders.filter((o) => o.status === "ACCEPTED").length,
      // 운송중
      shipping: myOrders.filter((o) =>
        ["LOADING", "IN_TRANSIT", "UNLOADING"].includes(o.status),
      ).length,
      // 운송완료
      completed: myOrders.filter((o) => o.status === "COMPLETED").length,
    };
  }, [myOrders]);

  return {
    recommendedOrders,
    statusCounts,
    isRefreshing,
    onRefresh: fetchHomeData,
  };
};
