import { useState, useCallback, useMemo, useEffect } from "react";

import { OrderService } from "@/shared/api/orderService";
import { OrderResponse } from "@/shared/models/order";

export interface IncomeSummary {
  month: number;
  amount: number;
  targetDiff: number;
  growthRate: number;
}

const DEFAULT_INCOME: IncomeSummary = {
  month: new Date().getMonth() + 1,
  amount: 0,
  targetDiff: 0,
  growthRate: 0,
};

export const useDriverHome = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [income] = useState<IncomeSummary>(DEFAULT_INCOME);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    const [available, driving] = await Promise.all([
      OrderService.getAvailableOrders().catch(() => [] as OrderResponse[]),
      OrderService.getMyDrivingOrders().catch(() => [] as OrderResponse[]),
    ]);

    const merged = [...available, ...driving];
    const byId = new Map<number, OrderResponse>();
    for (const o of merged) {
      byId.set(Number(o.orderId), o);
    }
    setOrders(Array.from(byId.values()));
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const statusCounts = useMemo(() => {
    return {
      pending: orders.filter((o) => o.status === "REQUESTED" || o.status === "PENDING").length,
      confirmed: orders.filter((o) => o.status === "ACCEPTED").length,
      shipping: orders.filter((o) => ["LOADING", "IN_TRANSIT", "UNLOADING"].includes(o.status)).length,
      completed: orders.filter((o) => o.status === "COMPLETED").length,
    };
  }, [orders]);

  const recommendedOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === "REQUESTED" || o.status === "PENDING")
      .sort((a, b) => {
        if (a.instant === true && b.instant !== true) return -1;
        if (a.instant !== true && b.instant === true) return 1;
        return 0;
      });
  }, [orders]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadOrders();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadOrders]);

  return {
    orders,
    recommendedOrders,
    income,
    statusCounts,
    isRefreshing,
    onRefresh,
  };
};
