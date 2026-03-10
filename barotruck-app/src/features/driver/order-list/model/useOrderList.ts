import { useOrderFilterStore } from "@/features/driver/order-filter/model/useOrderFilterStore";
import { OrderService } from "@/shared/api/orderService";
import { UserService } from "@/shared/api/userService";
import { OrderResponse } from "@/shared/models/order";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [driverAddress, setDriverAddress] = useState<string | null>(null);

  // 내 위치 가져오기
  const getMyLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setMyLocation(null); // 권한 거부 시
        console.log("위치 권한 거부");
        return;
      }

      // 위치 가져오는 작업(Promise) 생성
      const locationPromise = (async () => {
        let location = await Location.getLastKnownPositionAsync({});
        if (!location) {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest,
          });
        }
        return location;
      })();

      // 2초 타임아웃용 Promise 생성
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 2000);
      });

      // 둘 중 먼저 끝나는 것을 가져옴
      const location = await Promise.race([locationPromise, timeoutPromise]);
      console.log("위치 가져오기 완료:", location);

      if (location) {
        setMyLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } else {
        console.log("위치 가져오기 2초 초과 -> 내 활동 기반 필터링");
        setMyLocation(null);
      }
    } catch (error) {
      console.log("위치 에러 -> 내 활동 기반 필터링");
      setMyLocation(null);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const recommendedPromise = OrderService.getRecommendedOrders()
        .then((data) => (Array.isArray(data) ? data : []))
        .catch((e) => {
          console.log("⚠️ 추천 오더 에러:", e.response?.data || e.message);
          return [];
        });

      const availablePromise = OrderService.getAvailableOrders();

      const myInfoPromise = UserService.getMyInfo().catch((e) => {
        console.log("⚠️ 내 정보 조회 에러:", e.response?.data || e.message);
        return null;
      });

      const [recommended, allOrders, myInfo] = await Promise.all([
        recommendedPromise,
        availablePromise,
        myInfoPromise,
      ]);

      console.log(myInfo);

      setRecommendedOrders(recommended);
      setOrders(allOrders);

      console.log("🕵️‍♂️ [내 정보 확인] myInfo 데이터:", myInfo);

      const fetchedAddress = myInfo?.DriverInfo?.address;

      if (fetchedAddress) {
        setDriverAddress(fetchedAddress);
        console.log("✅ [주소 세팅 완료] driverAddress:", fetchedAddress);
      } else {
        console.log("⚠️ [주소 없음] 백엔드에서 활동 주소를 받지 못했습니다.");
        setDriverAddress(null);
      }
    } catch (error: any) {
      // 🚨 범인 색출용 콘솔 로그!!
      console.log("🚨🚨🚨 [API 400 에러 발생] 🚨🚨🚨");
      if (error.response) {
        console.log("1. 실패한 API 주소 URL:", error.response.config?.url);
        console.log("2. 백엔드에서 보낸 에러 메시지:", error.response.data);
      } else {
        console.log("에러 내용:", error.message);
      }
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
      if (detailFilter.radius !== 999) {
        if (myLocation && o.startLat && o.startLng) {
          const dist = getDistance(
            myLocation.lat,
            myLocation.lng,
            o.startLat,
            o.startLng,
          );
          if (dist > detailFilter.radius) return false;
        } else {
          // GPS 획득 실패 시 -> 백엔드에서 받아온 기사님의 주소를 기준으로 필터링
          if (driverAddress) {
            // 예: "경기 안산시 상록구" -> "상록구" 추출
            const addressParts = driverAddress.split(" ");
            const lastWord = addressParts.pop() || "";
            // "경기 안산시"
            const cityAndGu = addressParts.join(" ") || "";

            const isAddressMatch =
              // o.startAddr가 null일 수도 있으니 안전하게 체크
              (o.startAddr && o.startAddr.includes(lastWord)) ||
              (o.startAddr && o.startAddr.includes(driverAddress)) ||
              (cityAndGu && o.startAddr && o.startAddr.includes(cityAndGu));

            if (!isAddressMatch) return false;
        } else {
          // GPS도 없고 활동 주소도 없으면 반경 필터를 강제하지 않습니다.
          return true;
        }
      }
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
