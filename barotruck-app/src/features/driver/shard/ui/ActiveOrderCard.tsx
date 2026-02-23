import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export const ActiveOrderCard = ({ order, onNext, onNav, onDetail }: any) => {
  const { colors: c } = useAppTheme();

  /**
   * SECTION 1: 상태별 설정
   */
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
        };
    }
  };

  const ui = getStatusConfig(order.status);
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
      {/* SECTION: 상단 */}
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
          onPress={() =>
            Linking.openURL(`tel:${order.user.phone || "01000000000"}`)
          }
        >
          <Ionicons name="call" size={14} color={c.text.secondary} />
          <Text style={[s.callBtnText, { color: c.text.secondary }]}>
            {" "}
            화주연락
          </Text>
        </Pressable>
      </View>

      {/* SECTION: 중단 (경로 정보) */}
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

      {/* SECTION: 가이드 박스 */}
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

      {/* SECTION: 하단 정보 */}
      <View style={[s.bottomRow, { borderTopColor: c.bg.canvas }]}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            운송 정보
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {order.reqTonnage} {order.reqCarType} •{" "}
            {order.cargoContent || "일반짐"}
          </Text>
        </View>
        <View style={s.priceColumn}>
          <Text style={[s.priceText, { color: c.text.primary }]}>
            {order.basePrice?.toLocaleString()}원
          </Text>
          <Badge
            label={order.payMethod === "PREPAID" ? "현금/선불" : "인수증/후불"}
            tone="neutral"
            style={{ marginTop: 6, alignSelf: "flex-end" }}
          />
        </View>
      </View>

      {/* SECTION: 하단 액션 버튼 */}
      <View style={[s.actionRowSplit, { borderTopColor: c.border.default }]}>
        {/* 길안내 버튼 */}
        <Pressable
          style={[s.btnNav, { borderColor: c.border.default }]}
          onPress={onNav}
        >
          <Ionicons name="map-outline" size={18} color={c.text.primary} />
          <Text style={[s.btnNavText, { color: c.text.primary }]}> 길안내</Text>
        </Pressable>
        {/* 프로세스 메인 액션 버튼 */}
        <Pressable
          style={[
            s.btnPrimary,
            { backgroundColor: ui.actionColor, flex: 2, flexDirection: "row" },
          ]} // 🚩 가로 정렬 추가
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
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  infoColumn: { flex: 1.5 },
  loadDateText: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  carText: { fontSize: 12, fontWeight: "500", opacity: 0.8 },
  priceColumn: { flex: 1.2, alignItems: "flex-end" },
  priceText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  actionRowSplit: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
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
