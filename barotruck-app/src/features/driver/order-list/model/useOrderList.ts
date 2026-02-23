import { useState, useEffect, useCallback, useMemo } from "react";
import { OrderResponse } from "@/shared/models/order";
import { OrderService } from "@/shared/api/orderService";
import * as Location from "expo-location";

export type SortType = "LATEST" | "PRICE_HIGH" | "NEARBY";

// [거리 계산 함수] 하버사인 공식
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

  // 1. 기사님 현재 위치 상태
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // 2. 테스트용 가짜 데이터
  const MOCK_ORDERS: any[] = [
    {
      orderId: 101,
      startAddr: "강남역",
      startLat: 37.4979,
      startLng: 127.0276,
      status: "REQUESTED",
      basePrice: 50000,
      createdAt: new Date().toISOString(),
    },
    {
      orderId: 102,
      startAddr: "서울역",
      startLat: 37.5546,
      startLng: 126.9706,
      status: "REQUESTED",
      basePrice: 60000,
      createdAt: new Date().toISOString(),
    },
    {
      orderId: 103,
      startAddr: "평택역",
      startLat: 36.9922,
      startLng: 127.0851,
      status: "REQUESTED",
      basePrice: 80000,
      createdAt: new Date().toISOString(),
    },
  ];

  /** [함수] 내 위치 가져오기 */
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

  /** [함수] 오더 데이터 패칭 */
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

  // 초기 로드 시 실행
  useEffect(() => {
    fetchOrders();
    getMyLocation(); // 🚩 위치 정보도 함께 가져옴
  }, [fetchOrders, getMyLocation]);

  /** [로직] 필터링 및 정렬 */
  const filteredAndSortedOrders = useMemo(() => {
    // 🚩 '가까운 순' 테스트 중일 때는 가짜 데이터를 사용하거나,
    // 실제 데이터에 좌표가 없을 경우를 대비해 MOCK을 섞어 쓸 수 있습니다.
    let sourceData = sortBy === "NEARBY" ? [...MOCK_ORDERS] : [...orders];

    if (filter.dispatchType === "RECOMMENDED") {
      sourceData = [...recommendedOrders];
    }

    let result = sourceData.filter((o) => {
      if (o.status !== "REQUESTED") return false;
      if (filter.dispatchType === "INSTANT") return o.instant === true;
      if (filter.dispatchType === "DIRECT") return o.instant === false;
      return true;
    });

    result.sort((a, b) => {
      const getFullPrice = (o: any) =>
        (o.basePrice || 0) + (o.laborFee || 0) + (o.packagingPrice || 0);

      switch (sortBy) {
        case "PRICE_HIGH":
          return getFullPrice(b) - getFullPrice(a);

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
            return distA - distB; // 가까운 순 정렬
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
    myLocation, // 필요 시 현재 위치 정보를 UI에 띄울 수 있음
  };
};
