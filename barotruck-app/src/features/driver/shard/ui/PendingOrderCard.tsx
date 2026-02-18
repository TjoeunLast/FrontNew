import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

interface PendingOrderCardProps {
  order: any;
  onCancel: (id: string) => void;
  onStart: (id: string) => void;
  onDetail: (id: string) => void;
}

export const PendingOrderCard = ({
  order,
  onCancel,
  onStart,
  onDetail,
}: PendingOrderCardProps) => {
  const { colors: c } = useAppTheme();

  const isApplied = order.status === "APPLIED"; // 승인 대기
  const isAccepted = order.status === "ACCEPTED"; // 배차 확정

  // 주소 요약 함수
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0]} ${parts[1] || ""}`;
  };

  return (
    <View
      style={[
        s.container,
        isApplied && { backgroundColor: "#fffdf9", borderColor: "#FFD9A0" },
        isAccepted && { borderColor: c.brand.primary },
      ]}
    >
      {/* --- 상단: 상태 배지 및 상세정보 --- */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={isApplied ? "승인 대기" : "배차 확정"}
            tone={isApplied ? "warning" : "success"}
            style={{ marginRight: 8 }}
          />
          {order.instant && <Badge label="바로배차" tone="urgent" />}
        </View>
        <Pressable style={s.detailLink} onPress={() => onDetail(order.orderId)}>
          <Text style={s.detailText}>상세정보</Text>
          <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
        </Pressable>
      </View>

      {/* --- 중단: 경로 (DrOrderCard 화살표 디자인 통일) --- */}
      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={s.locLabel}>상차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(order.startAddr)}
          </Text>
          <Text style={s.placeText} numberOfLines={1}>
            {order.startPlace}
          </Text>
        </View>

        <View style={s.arrowArea}>
          <View style={s.distBadge}>
            <Text style={s.distText}>
              {order.distance ? `${order.distance}km` : "-"}
            </Text>
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
            {getShortAddr(order.endAddr)}
          </Text>
          <Text style={[s.placeText, { textAlign: "right" }]} numberOfLines={1}>
            {order.endPlace}
          </Text>
        </View>
      </View>

      {/* --- 하단: 정보 및 금액 --- */}
      <View style={s.bottomRow}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            {order.startSchedule}{" "}
            {order.startType === "TODAY" ? "오늘" : "내일"} 상차
          </Text>
          <Text style={[s.carText, { color: c.text.secondary }]}>
            {order.reqTonnage} {order.reqCarType} • {order.workType || "지게차"}
          </Text>
        </View>

        <View style={s.priceColumn}>
          <Text
            style={[
              s.priceText,
              { color: isAccepted ? "#1A2F4B" : c.text.primary },
            ]}
          >
            {(order.basePrice + (order.laborFee || 0)).toLocaleString()}원
          </Text>
          <Text style={s.payMethodText}>{order.payMethod}</Text>
        </View>
      </View>

      {/* --- 액션 영역: 버튼 추가 --- */}
      <View style={s.actionArea}>
        {isApplied ? (
          <Pressable
            style={s.btnCancel}
            onPress={() => onCancel(order.orderId)}
          >
            <Ionicons name="close-circle-outline" size={16} color="#B45309" />
            <Text style={s.btnCancelText}>배차 신청 취소</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[s.btnStart, { backgroundColor: "#1A2F4B" }]}
            onPress={() => onStart(order.orderId)}
          >
            <Ionicons name="play" size={18} color="#FFF" />
            <Text style={s.btnStartText}>운송 시작하기 (상차완료)</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  detailLink: { flexDirection: "row", alignItems: "center", padding: 4 },
  detailText: { fontSize: 13, color: "#94A3B8", marginRight: 2 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  locGroup: { flex: 1.5 },
  locLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 2 },
  locName: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
  placeText: { fontSize: 12, color: "#64748B", marginTop: 2 },
  arrowArea: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  distBadge: {
    backgroundColor: "#F8FAFC",
    borderColor: "#F1F5F9",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  distText: { fontSize: 11, fontWeight: "700", color: "#64748B" },
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
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  infoColumn: { flex: 1.5 },
  loadDateText: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  carText: { fontSize: 12, fontWeight: "500", opacity: 0.8 },
  priceColumn: { flex: 1.2, alignItems: "flex-end" },
  priceText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  payMethodText: { fontSize: 11, color: "#94A3B8", marginTop: 4 },
  actionArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  btnCancel: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FCD34D",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  btnCancelText: { fontSize: 14, fontWeight: "700", color: "#B45309" },
  btnStart: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    elevation: 2,
  },
  btnStartText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});
