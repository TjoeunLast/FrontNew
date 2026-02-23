import { useState, useEffect, useCallback, useMemo } from "react";
import { OrderResponse } from "@/shared/models/order";
import { OrderService } from "@/shared/api/orderService";
import * as Location from "expo-location";

export type SortType = "LATEST" | "PRICE_HIGH" | "NEARBY";

/**
 * [유틸] 두 좌표 사이의 거리를 km 단위로 계산 (하버사인 공식)
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // 지구 반지름 (km)
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
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [recommendedOrders, setRecommendedOrders] = useState<OrderResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState({
    dispatchType: "ALL", // ALL | RECOMMENDED | INSTANT | DIRECT
    region: "지역",
    tonnage: "톤 수",
    carType: "차종",
  });

  const [sortBy, setSortBy] = useState<SortType>("LATEST");

  // 🚩 기사님 현재 위치 상태
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  /**
   * [함수] 내 위치 가져오기
   */
  const getMyLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("위치 권한 거부됨");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setMyLocation(coords);
      console.log("📍 내 현재 위치 획득 성공:", coords);
    } catch (error) {
      console.error("위치 가져오기 실패:", error);
    }
  }, []);

  /**
   * [함수] 오더 데이터 패칭
   */
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

  /**
   * [로직] 필터링 및 정렬
   * - 내 위치(myLocation)나 정렬 기준(sortBy)이 바뀔 때마다 재계산됨
   */
  const filteredAndSortedOrders = useMemo(() => {
    // 🚩 이제 가짜 데이터(MOCK)를 쓰지 않고 DB에서 온 진짜 데이터를 사용합니다.
    let sourceData = [...orders];

    if (filter.dispatchType === "RECOMMENDED") {
      sourceData = [...recommendedOrders];
    }

    // 기본 필터링 로직
    let result = sourceData.filter((o) => {
      if (o.status !== "REQUESTED") return false;
      if (filter.dispatchType === "INSTANT") return o.instant === true;
      if (filter.dispatchType === "DIRECT") return o.instant === false;
      return true;
    });

    // 정렬 로직 적용
    result.sort((a, b) => {
      const getFullPrice = (o: any) =>
        (o.basePrice || 0) + (o.laborFee || 0) + (o.packagingPrice || 0);

      switch (sortBy) {
        case "PRICE_HIGH":
          return getFullPrice(b) - getFullPrice(a);

        case "NEARBY":
          // 🚩 DB에서 온 데이터(a, b)에 좌표가 있고 내 위치가 확보되었을 때만 계산
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
          // 최신순 (LATEST)
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
