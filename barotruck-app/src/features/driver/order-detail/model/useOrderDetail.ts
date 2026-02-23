import { useMemo, useState, useEffect } from "react";
import { Alert, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

import { OrderService } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export const useOrderDetail = () => {
  const router = useRouter();
  const { colors: c } = useAppTheme();

  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const idNum = Number(id);
      if (!Number.isFinite(idNum)) {
        if (active) setOrder(null);
        return;
      }

      const [available, driving] = await Promise.all([
        OrderService.getAvailableOrders().catch(() => []),
        OrderService.getMyDrivingOrders().catch(() => []),
      ]);

      const merged = [...available, ...driving];
      const found = merged.find((o: any) => Number(o.orderId) === idNum) ?? null;
      if (active) setOrder(found);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const [isDispatched, setIsDispatched] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalPrice = useMemo(
    () => (order ? order.basePrice + (order.laborFee || 0) : 0),
    [order],
  );

  const formatAddress = {
    big: (addr: string) => {
      const parts = addr?.split(" ") || [];
      return parts.length > 1 ? `${parts[0]} ${parts[1]}` : addr;
    },
    small: (addr: string) => {
      const parts = addr?.split(" ") || [];
      return parts.length > 2 ? parts.slice(2).join(" ") : "";
    },
  };

  const actions = {
    goBack: () => router.back(),
    callPhone: (phoneNumber: string) => Linking.openURL(`tel:${phoneNumber}`),
    copyAddress: async (text: string) => {
      await Clipboard.setStringAsync(text);
      Alert.alert("알림", "주소가 복사되었습니다.");
    },
    dispatchOrder: async () => {
      if (!order) return;
      try {
        setLoading(true);
        await OrderService.acceptOrder(order.orderId);
        setIsDispatched(true);
        Alert.alert(
          "완료",
          order.instant
            ? "배차가 확정되었습니다."
            : "배차 신청이 접수되었습니다.",
        );
      } catch {
        Alert.alert("알림", "처리에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    },
    startNavigation: () => {
      Alert.alert("길안내", "내비게이션을 실행합니다.");
    },
  };

  const buttonConfig = useMemo(() => {
    if (!order) return null;

    const isCompleted =
      isDispatched ||
      ["ACCEPTED", "IN_TRANSIT", "LOADING", "UNLOADING"].includes(order.status);

    if (isCompleted) {
      return {
        text: "길안내 시작",
        icon: "navigate-circle-outline",
        color: c.brand.primary,
        onPress: actions.startNavigation,
        isInstantStyle: false,
      };
    }

    if (order.instant) {
      return {
        text: "배차 확정",
        icon: "checkmark-circle-outline",
        color: "#EF4444",
        onPress: actions.dispatchOrder,
        isInstantStyle: true,
      };
    }

    return {
      text: "배차 신청",
      icon: "paper-plane-outline",
      color: c.brand.primary,
      onPress: actions.dispatchOrder,
      isInstantStyle: false,
    };
  }, [order, isDispatched, c.brand.primary]);

  return {
    order,
    loading,
    totalPrice,
    formatAddress,
    actions,
    buttonConfig,
  };
};
