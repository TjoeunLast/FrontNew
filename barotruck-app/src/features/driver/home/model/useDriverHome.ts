import { useState, useCallback, useMemo } from "react";
import { OrderResponse } from "@/shared/models/order";
import { MOCK_ORDERS } from "@/shared/mockData"; // 공통 목업 데이터 파일 연결

// 홈 화면에서만 쓰이는 수익 요약 데이터 타입 정의
export interface IncomeSummary {
  month: number;
  amount: number;
  targetDiff: number; // 목표까지 남은 금액
  growthRate: number; // 전월 대비 성장률
}

// 홈 화면 전용 목업 데이터 (수익 현황)
const MOCK_INCOME: IncomeSummary = {
  month: 2,
  amount: 3540000,
  targetDiff: 460000,
  growthRate: 8.5,
};

// 커스텀 훅 정의
export const useDriverHome = () => {
  // shared/mockData 10개의 데이터
  const [orders, setOrders] = useState<OrderResponse[]>(MOCK_ORDERS);
  const [income, setIncome] = useState<IncomeSummary>(MOCK_INCOME);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const statusCounts = useMemo(() => {
    return {
      // 접수됨 상태 (배차대기)
      pending: orders.filter((o) => o.status === "REQUESTED").length,
      // 배차수락 상태 (배차확정)
      confirmed: orders.filter((o) => o.status === "ACCEPTED").length,
      // 운행 중 상태 (운송중)
      shipping: orders.filter((o) => o.status === "IN_TRANSIT").length,
      // 완료 상태 (운송완료)
      completed: orders.filter((o) => o.status === "COMPLETED").length,
    };
  }, [orders]);

  // 맞춤 추천용 필터링 (REQUESTED 상태만 골라내기, 바로배차 우선 정렬)
  const recommendedOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === "REQUESTED") // 1. 배차대기만 골라내기
      .sort((a, b) => {
        // 2. 바로배차(instant: true)를 맨 위로 올리는 정렬 로직
        // a가 긴급이고 b가 아니면 a를 앞으로(-1)
        if (a.instant === true && b.instant !== true) return -1;
        // b가 긴급이고 a가 아니면 b를 앞으로(1)
        if (a.instant !== true && b.instant === true) return 1;
        // 둘 다 같으면 순서 유지(0)
        return 0;
      });
  }, [orders]);

  // 실제 api 호출 시 (Pull to Refresh 로직)
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);

    // 가상의 네트워크 지연 시간 (1초)
    setTimeout(() => {
      // 나중에 API 연동 시 실제 데이터를 setOrders(newData)로 갱신하면 됩니다.
      setIsRefreshing(false);
    }, 1000);
  }, []);

  return {
    orders,
    recommendedOrders,
    income,
    statusCounts,
    isRefreshing,
    onRefresh,
  };
};
