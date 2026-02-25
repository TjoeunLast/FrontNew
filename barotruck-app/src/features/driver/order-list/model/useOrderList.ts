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

  // 오더 데이터 패칭
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [recommended, allOrders] = await Promise.all([
        OrderService.getRecommendedOrders(),
        OrderService.getAvailableOrders(),
      ]);
      setRecommendedOrders(recommended.filter((o) => o.status === "REQUESTED"));
      setOrders(allOrders);
    } catch (error) {
      console.error("오더 로드 실패:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 초기 로드 시 실행 (데이터 + 내 위치)
  useEffect(() => {
    fetchOrders();
    getMyLocation();
  }, [fetchOrders, getMyLocation]);

  // 필터링 및 정렬
  const filteredAndSortedOrders = useMemo(() => {
    let sourceData =
      filter.dispatchType === "RECOMMENDED"
        ? [...recommendedOrders]
        : [...orders];

    if (filter.dispatchType === "RECOMMENDED") {
      sourceData = [...recommendedOrders];
    }

    // 배차 유형 필터링
    let result = sourceData.filter((o) => {
      if (o.status !== "REQUESTED") return false;
      if (filter.dispatchType === "INSTANT") return o.instant === true;
      if (filter.dispatchType === "DIRECT") return o.instant === false;
      return true;
    });

    // 정렬 로직 적용
    result.sort((a, b) => {
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
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return result;
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
