import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useMemo } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// 거리 계산 함수
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

export const ActiveOrderCard = ({
  order,
  onNext,
  onNav,
  onDetail,
  myLocation,
}: any) => {
  const { colors: c } = useAppTheme();

  // 상태별 설정
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "LOADING":
        return {
          icon: "arrow-forward-circle-outline",
          label: "상차 완료",
          actionColor: c.status.success,
          badge: "상차 작업 중",
          next: "IN_TRANSIT",
          target: `목적지: ${order.startPlace}`,
          goal: "상차지로 이동하여 물건을 실으세요",
          showDistance: true,
          destLat: order.startLat,
          destLng: order.startLng,
        };
      case "IN_TRANSIT":
        return {
          icon: "location-outline",
          label: "하차지 도착",
          actionColor: c.status.warning,
          badge: "운송 이동 중",
          next: "UNLOADING",
          target: `목적지: ${order.endPlace}`,
          goal: "하차지로 이동하여 배송을 진행하세요",
          showDistance: false,
          destLat: order.endLat,
          destLng: order.endLng,
        };
      case "UNLOADING":
        return {
          icon: "flag-outline",
          label: "하차 완료",
          actionColor: c.status.success,
          badge: "하차 작업 중",
          next: "COMPLETED",
          target: `목적지: ${order.endPlace}`,
          goal: "하차지에 도착했습니다. 물건을 내리세요",
          showDistance: false,
          destLat: order.endLat,
          destLng: order.endLng,
        };
      default:
        return {
          icon: "play-circle-outline",
          label: "운송 시작",
          actionColor: c.status.info,
          badge: "대기 중",
          next: "LOADING",
          target: `목적지: ${order.startPlace}`,
          goal: "상차지로 이동을 시작하세요",
          showDistance: true,
          destLat: order.startLat,
          destLng: order.startLng,
        };
    }
  };

  const ui = getStatusConfig(order.status);

  // 주소 요약
  const getShortAddr = (addr: string) =>
    addr ? `${addr.split(" ")[0]} ${addr.split(" ")[1] || ""}` : "";

  return (
    <Pressable
      style={[
        s.container,
        { borderColor: c.border.default, backgroundColor: c.bg.surface },
      ]}
      onPress={() => onDetail(Number(order.orderId))}
    >
      {/* 상단  */}
      <View style={s.topRow}>
        <Badge label={ui.badge} tone="neutral" />
        <Pressable
          style={[
            s.callBtn,
            {
              backgroundColor: c.bg.muted,
              borderWidth: 1,
              borderColor: c.border.default,
            },
          ]}
          onPress={() => Linking.openURL(`tel:${order.user?.phone || ""}`)}
        >
          <Ionicons name="call" size={14} color={c.text.secondary} />
          <Text style={[s.callBtnText, { color: c.text.secondary }]}>
            {" "}
            화주연락
          </Text>
        </Pressable>
      </View>

      {/* 중단 영역 */}
      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={[s.locLabel, { color: c.text.secondary }]}>상차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(order.startAddr)}
          </Text>
          <Text
            style={[s.placeText, { color: c.text.secondary }]}
            numberOfLines={1}
          >
            {order.startPlace}
          </Text>
        </View>

        <View style={s.arrowArea}>
          <View
            style={[
              s.distBadge,
              { backgroundColor: c.bg.canvas, borderColor: c.border.default },
            ]}
          >
            <Text style={[s.distText, { color: c.text.secondary }]}>
              {order.distance ? `${order.distance}km` : "-"}
            </Text>
          </View>
          <View style={[s.line, { backgroundColor: c.border.default }]}>
            <View style={[s.arrowHead, { borderColor: c.border.default }]} />
          </View>
        </View>

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={[s.locLabel, { color: c.text.secondary }]}>하차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
            numberOfLines={1}
          >
            {getShortAddr(order.endAddr)}
          </Text>
          <Text
            style={[
              s.placeText,
              { textAlign: "right", color: c.text.secondary },
            ]}
            numberOfLines={1}
          >
            {order.endPlace}
          </Text>
        </View>
      </View>

      {/* 가이드 박스 */}
      <View
        style={[
          s.goalSection,
          { backgroundColor: c.bg.canvas, borderColor: c.border.default },
        ]}
      >
        <View style={s.goalHeader}>
          <Ionicons name="location" size={14} color={ui.actionColor} />
          <Text style={[s.goalTitle, { color: ui.actionColor }]}>
            {order.status === "LOADING"
              ? `${order.startSchedule} 상차`
              : ui.goal}
          </Text>
        </View>
        <Text
          style={[s.goalTargetName, { color: c.text.primary }]}
          numberOfLines={1}
        >
          {ui.target}
        </Text>
      </View>

      {/* 하단 액션 버튼 */}
      <View style={s.actionRowSplit}>
        {/* 길안내 버튼 */}
        <Pressable
          style={[s.btnNav, { borderColor: c.border.default }]}
          onPress={onNav}
        >
          <Ionicons name="map-outline" size={18} color={c.text.primary} />
          <Text style={[s.btnNavText, { color: c.text.primary }]}> 길안내</Text>
        </Pressable>
        {/* 메인 액션 버튼 */}
        <Pressable
          style={[
            s.btnPrimary,
            { backgroundColor: ui.actionColor, flex: 2, flexDirection: "row" },
          ]}
          onPress={() => onNext(order.orderId, ui.next)}
        >
          <Ionicons
            name={ui.icon as any}
            size={20}
            color={c.text.inverse}
            style={{ marginRight: 6 }}
          />
          <Text style={[s.btnPrimaryText, { color: c.text.inverse }]}>
            {ui.label}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const s = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  callBtnText: { fontSize: 12, fontWeight: "700" },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locGroup: { flex: 1.5 },
  locLabel: { fontSize: 11, marginBottom: 4 },
  locName: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  placeText: { fontSize: 12, marginTop: 4 },
  arrowArea: { flex: 0.8, alignItems: "center", marginTop: 18 },
  distBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  distText: { fontSize: 11, fontWeight: "700" },
  line: { width: "100%", height: 1, position: "relative" },
  arrowHead: {
    position: "absolute",
    right: 0,
    top: -3,
    width: 7,
    height: 7,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    transform: [{ rotate: "45deg" }],
  },
  goalSection: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  goalTitle: { fontSize: 13, fontWeight: "800" },
  goalTargetName: { fontSize: 16, fontWeight: "900" },
  actionRowSplit: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  btnNav: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnNavText: { fontSize: 14, fontWeight: "600" },
  btnPrimary: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "700" },
});
