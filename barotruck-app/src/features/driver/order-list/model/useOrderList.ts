import { useState, useEffect, useCallback, useMemo } from "react";
import { OrderResponse } from "@/shared/models/order";
import { OrderService } from "@/shared/api/orderService";
import * as Location from "expo-location";
import { useOrderFilterStore } from "@/features/driver/order-filter/model/useOrderFilterStore";

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
    [],
  ); // 맞춤 오더
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [category, setCategory] = useState({
    dispatchType: "ALL",
  });

  // 상세 필터 스토어 구독
  const detailFilter = useOrderFilterStore();

  const [sortBy, setSortBy] = useState<SortType>("LATEST");
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // 내 위치 가져오기
  const getMyLocation = useCallback(async () => {
    const FALLBACK_LOCATION = { lat: 37.494461, lng: 127.029592 };
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setMyLocation(FALLBACK_LOCATION);
        return;
      }
      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }
      if (location) {
        setMyLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } else {
        setMyLocation(FALLBACK_LOCATION);
      }
    } catch (error) {
      setMyLocation(FALLBACK_LOCATION);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const recommendedPromise = OrderService.getRecommendedOrders()
        .then((data) => (Array.isArray(data) ? data : []))
        .catch(() => []);
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

  useEffect(() => {
    fetchOrders();
    getMyLocation();
  }, [fetchOrders, getMyLocation]);

  // 필터링 및 정렬 로직 최종 통합
  const filteredAndSortedOrders = useMemo(() => {
    const sourceData =
      category.dispatchType === "RECOMMENDED" ? recommendedOrders : orders;

    const filtered = sourceData.filter((o) => {
      // (1) 오더 상태 확인
      if (o.status !== "REQUESTED" && o.status !== "APPLIED") return false;

      // (2) 배차 유형(탭) 필터링
      if (category.dispatchType === "INSTANT" && !o.instant) return false;
      if (category.dispatchType === "DIRECT" && o.instant) return false;

      // (3) 상세 필터링 (Detail Filters) 적용

      // 1. 지역 필터링 (상차지)
      if (detailFilter.selectedRegions.length > 0) {
        const isRegionMatch = detailFilter.selectedRegions.some((region) => {
          const lastWord = region.split(" ").pop() || "";
          return o.startAddr.includes(lastWord) || o.startAddr.includes(region);
        });
        if (!isRegionMatch) return false;
      }

      // 2. 하차지 필터링 (destRegions 가 스토어에 있을 경우)
      if (detailFilter.destRegions && detailFilter.destRegions.length > 0) {
        const isDestMatch = detailFilter.destRegions.some((region) => {
          const lastWord = region.split(" ").pop() || "";
          return o.endAddr.includes(lastWord) || o.endAddr.includes(region);
        });
        if (!isDestMatch) return false;
      }

      // 3. 반경 필터링 (전국 999가 아닐 때)
      if (
        detailFilter.radius !== 999 &&
        myLocation &&
        o.startLat &&
        o.startLng
      ) {
        const dist = getDistance(
          myLocation.lat,
          myLocation.lng,
          o.startLat,
          o.startLng,
        );
        if (dist > detailFilter.radius) return false;
      }

      // 4. 차종/중량 필터링
      if (
        detailFilter.carTypes.length > 0 &&
        !detailFilter.carTypes.includes(o.reqCarType)
      )
        return false;
      if (
        detailFilter.tonnages.length > 0 &&
        !detailFilter.tonnages.includes(o.reqTonnage)
      )
        return false;

      // 5. 적재 방식 (독차/혼적)
      if (detailFilter.loadMethod && o.loadMethod !== detailFilter.loadMethod)
        return false;

      // 6. 운임 구분 (편도/왕복) 및 작업 조건
      if (detailFilter.driveMode && o.driveMode !== detailFilter.driveMode)
        return false;

      // 7. 수작업 여부 (laborFee가 0보다 크면 수작업 오더로 판단)
      if (detailFilter.isManualWork === false) {
        const hasLabor = o.laborFee && o.laborFee > 0;
        if (hasLabor) return false;
      }

      // 8. 상차 일정 (서버 데이터 필드명에 따라 매칭 필요)
      // 8. 상차 일정 필터링 로직 수정
      if (detailFilter.uploadDate) {
        const orderType = (o as any).startType; // DB의 START_TYPE (당상, 익상 등)
        const orderSchedule = (o as any).startSchedule; // DB의 START_SCHEDULE (2026-02-28 09:00 등)

        if (
          detailFilter.uploadDate === "당상" ||
          detailFilter.uploadDate === "익상"
        ) {
          // 1. 당상/익상 텍스트 매칭
          if (orderType !== detailFilter.uploadDate) return false;
        } else {
          // 2. 직접 지정 날짜 매칭 (START_SCHEDULE 날짜 부분만 비교)
          if (!orderSchedule) return false;
          const formattedOrderDate = orderSchedule.split(" ")[0]; // "2026-02-28" 추출
          if (formattedOrderDate !== detailFilter.uploadDate) return false;
        }
      }
      return false;

      // 9. 수익 및 결제 (최소 운임)
      const totalPrice =
        (o.basePrice || 0) + (o.laborFee || 0) + (o.packagingPrice || 0);
      if (detailFilter.minPrice > 0 && totalPrice < detailFilter.minPrice)
        return false;

      // 10. 결제 방식
      if (
        detailFilter.payMethods.length > 0 &&
        !detailFilter.payMethods.includes(o.payMethod)
      )
        return false;

      return true;
    });

    // 정렬 로직 적용
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
            return distA - distB;
          }
          return 0;
        default:
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
      }
    });

    return sorted;
  }, [
    orders,
    recommendedOrders,
    category.dispatchType,
    sortBy,
    myLocation,
    detailFilter.selectedRegions,
    detailFilter.destRegions,
    detailFilter.radius,
    detailFilter.carTypes,
    detailFilter.tonnages,
    detailFilter.loadMethod,
    detailFilter.driveMode,
    detailFilter.isManualWork,
    detailFilter.uploadDate,
    detailFilter.minPrice,
    detailFilter.payMethods,
  ]);

  return {
    filteredOrders: filteredAndSortedOrders,
    loading,
    refreshing,
    onRefresh: async () => {
      try {
        setRefreshing(true);
        await Promise.all([fetchOrders(), getMyLocation()]);
      } finally {
        setRefreshing(false);
      }
    },
    category,
    setCategory,
    sortBy,
    setSortBy,
    myLocation,
  };
};
