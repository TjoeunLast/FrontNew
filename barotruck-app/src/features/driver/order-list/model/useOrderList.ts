import { useState, useEffect, useCallback, useMemo } from "react";
import { OrderResponse } from "@/shared/models/order";
import { OrderService } from "@/shared/api/orderService";
import * as Location from "expo-location";
export type SortType = "LATEST" | "PRICE_HIGH" | "NEARBY";

// 거리 계산 공식
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const useOrderList = () => {
  // 상태 관리
  const [orders, setOrders] = useState<OrderResponse[]>([]); // 전체 오더
  const [recommendedOrders, setRecommendedOrders] = useState<OrderResponse[]>(
    [], // 맞춤 오더
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState({
    dispatchType: "ALL",
  });

  const [sortBy, setSortBy] = useState<SortType>("LATEST");
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // 내 위치 가져오기
  const getMyLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({});
      setMyLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error("위치 가져오기 실패:", error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      // 1. 추천 오더를 일단 찌릅니다.
      const recommendedPromise = OrderService.getRecommendedOrders()
        .then((data) => {
          // 성공하면 데이터 반환
          return Array.isArray(data) ? data : [];
        })
        .catch((err) => {
          // 실패(400 에러 등)하면 "아, 이 사람은 기사가 아니구나" 하고 빈 배열 반환
          console.log("추천 대상이 아니거나 에러 발생 (무시됨)");
          return [];
        });

      // 2. 전체 오더는 누구나 볼 수 있으니 그냥 가져옵니다.
      const availablePromise = OrderService.getAvailableOrders();

      const [recommended, allOrders] = await Promise.all([
        recommendedPromise,
        availablePromise,
      ]);

      setRecommendedOrders(recommended);
      setOrders(allOrders);
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드 시 실행 (데이터 + 내 위치)
  useEffect(() => {
    fetchOrders();
    getMyLocation();
  }, [fetchOrders, getMyLocation]);

  // 필터링 및 정렬
  const filteredAndSortedOrders = useMemo(() => {
    // 1. 필터 유형에 따라 원본 데이터 소스를 결정합니다.
    const sourceData =
      filter.dispatchType === "RECOMMENDED"
        ? recommendedOrders
        : orders;

    // 2. 상태("REQUESTED") 및 배차 유형에 따라 데이터를 필터링합니다.
    const filtered = sourceData.filter((o) => {
      // "REQUESTED" 상태가 아닌 오더는 항상 제외합니다.
      if (o.status !== "REQUESTED") return false;

      // 'INSTANT' 또는 'DIRECT' 필터가 활성화된 경우, 해당 조건으로 필터링합니다.
      if (filter.dispatchType === "INSTANT") return o.instant;
      if (filter.dispatchType === "DIRECT") return !o.instant;

      // 'ALL' 또는 'RECOMMENDED'의 경우, 추가적인 배차 유형 필터링을 하지 않습니다.
      return true;
    });

    // 3. 정렬 로직을 적용합니다. (새로운 배열을 만들어 원본 상태를 변경하지 않도록 함)
    const sorted = [...filtered].sort((a, b) => {
      const getTotalPrice = (o: any) =>
        (o.basePrice || 0) + (o.laborFee || 0) + (o.packagingPrice || 0);

      switch (sortBy) {
        case "PRICE_HIGH":
          return getTotalPrice(b) - getTotalPrice(a);

        case "NEARBY":
          if (
            myLocation &&
            a.startLat &&
            a.startLng &&
            b.startLat &&
            b.startLng
          ) {
            const distA = getDistance(
              myLocation.lat,
              myLocation.lng,
              a.startLat,
              a.startLng,
            );
            const distB = getDistance(
              myLocation.lat,
              myLocation.lng,
              b.startLat,
              b.startLng,
            );
            return distA - distB; // 가까운 순(오름차순) 정렬
          }
          return 0;

        default:
          // 날짜 데이터가 유효하지 않을 경우를 대비한 방어 코드
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
      }
    });

    console.log(`[DEBUG] Final Filtered Orders: ${sorted.length}`);
    return sorted;
  }, [orders, recommendedOrders, filter.dispatchType, sortBy, myLocation]);

  return {
    filteredOrders: filteredAndSortedOrders,
    loading,
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      fetchOrders();
      getMyLocation();
    },
    filter,
    setFilter,
    sortBy,
    setSortBy,
    myLocation,
  };
};
