import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { OrderResponse } from "@/shared/models/order"; //
import { Badge } from "@/shared/ui/feedback/Badge";
import { orderCardStyles as s } from "@/shared/ui/business/orderCardStyles";

export const DrOrderCard = (props: OrderResponse) => {
  const {
    orderId,
    status,
    createdAt,
    startAddr,
    startPlace,
    startSchedule,
    endAddr,
    endPlace,
    reqCarType,
    reqTonnage,
    driveMode,
    basePrice,
    laborFee,
    packagingPrice,
    distance,
    workType,
    instant,
    payMethod,
    startType,
  } = props;

  const { colors: c } = useAppTheme();
  const router = useRouter();

  // 1. 금액 계산
  const totalPrice = basePrice + (laborFee || 0) + (packagingPrice || 0);

  // 2. 주소 요약 함수
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0]} ${parts[1] || ""}`;
  };

  const handlePress = () => {
    router.push({
      pathname: "/(driver)/order-detail/[id]",
      params: { id: orderId.toString() },
    });
  };
  const createdDateLabel =
    typeof createdAt === "string" && createdAt.length >= 10
      ? createdAt.substring(5, 10).replace("-", ".")
      : "-";

  return (
    <Pressable
      onPress={handlePress}
      style={[
        s.container,
        instant && {
          borderColor: "#FFB1B1",
          backgroundColor: "#fff9f9",
          elevation: 6,
        },
      ]}
    >
      {/* --- 배지 및 시간 --- */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={instant ? "바로배차" : "직접배차"}
            tone={instant ? "urgent" : "direct"}
            style={{ marginRight: 8 }}
          />
          <Badge
            label={driveMode === "왕복" ? "왕복" : "편도"}
            tone={driveMode === "왕복" ? "roundTrip" : "oneWay"}
          />
        </View>
        <Text style={[s.timeText, { color: c.text.secondary }]}>
          {createdDateLabel}
        </Text>
      </View>

      {/* --- 경로 (화살표 디자인) --- */}
      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={s.locLabel}>상차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(startAddr)}
          </Text>
          <Text style={s.placeText} numberOfLines={1}>
            {startPlace}
          </Text>
        </View>

        <View style={s.arrowArea}>
          <View style={s.distBadge}>
            <Text style={s.distText}>{distance ? `${distance}km` : "-"}</Text>
          </View>
          <View style={[s.line, { backgroundColor: "#E2E8F0" }]}>
            <View style={[s.arrowHead, { borderColor: "#CBD5E1" }]} />
          </View>
        </View>

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={s.locLabel}>하차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
            numberOfLines={1}
          >
            {getShortAddr(endAddr)}
          </Text>
          <Text style={[s.placeText, { textAlign: "right" }]} numberOfLines={1}>
            {endPlace}
          </Text>
        </View>
      </View>

      {/* --- 작업정보 및 금액 --- */}
      <View style={s.bottomRow}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            {startSchedule} 상차
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {reqTonnage} {reqCarType} • {workType || "지게차"} • {startType}
          </Text>
        </View>

        <View style={s.priceColumn}>
          <View style={s.priceRow}>
            <Text
              style={[
                s.priceText,
                { color: instant ? "#EF4444" : c.brand.primary },
              ]}
            >
              {totalPrice.toLocaleString()}
            </Text>
            {laborFee && laborFee > 0 && <Text style={s.taxLabel}>(수)</Text>}
          </View>
          <Badge
            label={payMethod}
            tone={payMethod?.includes("선착불") ? "payPrepaid" : "payDeferred"}
            style={{ marginTop: 6, alignSelf: "flex-end" }}
          />
        </View>
      </View>
    </Pressable>
  );
};

