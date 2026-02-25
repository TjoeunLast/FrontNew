import { useState, useEffect, useCallback, useMemo } from "react";
import { OrderResponse } from "@/shared/models/order";
import { OrderService } from "@/shared/api/orderService";
import * as Location from "expo-location";

export interface IncomeSummary {
  month: number;
  amount: number;
  targetDiff: number;
  growthRate: number;
}

// 정산 카드 목업 (수정해야됨)
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

  // 차주 현재 위치 상태
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // 위치 가져오기 함수
  const getMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      setMyLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error("홈 화면 위치 획득 실패:", error);
    }
  };

  // 홈 데이터 로드(위치 정보 가져온 후 서버 데이터 가져오기)
  const fetchHomeData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // 내 위치 파악
      await getMyLocation();

      // 맞춤 오더 가져오기
      const recommended = await OrderService.getRecommendedOrders();
      const filteredRecommended = recommended.filter(
        (o) => o.status === "REQUESTED",
      );
      setRecommendedOrders(filteredRecommended);

      // 내 전체 운송 목록 가져오기 (상태 카운트용)
      const drivingOrders = await OrderService.getMyDrivingOrders();
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
    income,
    statusCounts,
    isRefreshing,
    myLocation,
    onRefresh: fetchHomeData,
  };
};
