import { useState, useEffect, useCallback, useMemo } from "react";
import { OrderResponse } from "@/shared/models/order";
import { OrderService } from "@/shared/api/orderService";

export type SortType = "LATEST" | "PRICE_HIGH" | "NEARBY";

export const useOrderList = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [recommendedOrders, setRecommendedOrders] = useState<OrderResponse[]>(
    [],
  ); // 🚩 홈 화면 추천 오더 저장용
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState({
    dispatchType: "ALL", // ALL | RECOMMENDED | INSTANT | DIRECT
    region: "지역",
    tonnage: "톤 수",
    carType: "차종",
  });

  const [sortBy, setSortBy] = useState<SortType>("LATEST");

  /** [함수] 홈 화면 추천 데이터와 전체 오더 데이터를 동시에 가져옴 */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [recommendedResult, availableResult] = await Promise.allSettled([
        OrderService.getRecommendedOrders(),
        OrderService.getAvailableOrders(),
      ]);

      if (recommendedResult.status === "fulfilled") {
        setRecommendedOrders(
          recommendedResult.value.filter((o) => o.status === "REQUESTED"),
        );
      } else {
        console.warn("추천 오더 로드 실패:", recommendedResult.reason);
        setRecommendedOrders([]);
      }

      if (availableResult.status === "fulfilled") {
        setOrders(availableResult.value);
      } else {
        console.warn("배차 가능 오더 로드 실패:", availableResult.reason);
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /** 추천 탭 선택 시 홈 화면 데이터(`recommendedOrders`)를 사용 */
  const filteredAndSortedOrders = useMemo(() => {
    let sourceData = [...orders];

    // 추천 탭인 경우 홈 화면의 로직을 그대로 가져온 리스트를 소스로 사용
    if (filter.dispatchType === "RECOMMENDED") {
      sourceData = [...recommendedOrders];
    }

    let result = sourceData.filter((o) => {
      if (o.status !== "REQUESTED") return false;

      // 배차 방식 필터 (전체/추천 외의 탭일 때)
      if (filter.dispatchType === "INSTANT") return o.instant === true;
      if (filter.dispatchType === "DIRECT") return o.instant === false;

      return true;
    });

    // 정렬 로직 (최신순, 단가순, 가까운순)
    result.sort((a, b) => {
      const getFullPrice = (o: any) =>
        o.basePrice + (o.laborFee || 0) + (o.packagingPrice || 0);
      switch (sortBy) {
        case "PRICE_HIGH":
          return getFullPrice(b) - getFullPrice(a);
        case "NEARBY":
          return (a.distance || 0) - (b.distance || 0);
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return result;
  }, [orders, recommendedOrders, filter.dispatchType, sortBy]);

  return {
    filteredOrders: filteredAndSortedOrders,
    loading,
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      fetchOrders();
    },
    filter,
    setFilter,
    sortBy,
    setSortBy,
  };
};
