import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

interface PendingOrderCardProps {
  order: any;
  onCancel: (id: string) => void;
  onStart: (id: string) => void;
  onDetail: (id: string) => void; // 상세보기 페이지 이동용
}

export const PendingOrderCard = ({
  order,
  onCancel,
  onStart,
  onDetail,
}: PendingOrderCardProps) => {
  const { colors: c } = useAppTheme();

  const isRequested = order.status === "REQUESTED"; // 승인 대기
  const isAccepted = order.status === "ACCEPTED"; // 배차 확정

  // 주소 요약 함수 (디자인 가이드 반영)
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0]} ${parts[1] || ""}`;
  };

  return (
    <View style={[s.container, isRequested && s.pendingBg]}>
      {/* --- 상단부: 상태 배지 및 상세 가기 --- */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={isRequested ? "승인 대기" : "배차 확정"}
            tone={isRequested ? "warning" : "success"}
          />
          {order.instant && (
            <Badge label="바로배차" tone="urgent" style={{ marginLeft: 8 }} />
          )}
        </View>

        {/* 상세보기: 페이지 이동 연결 */}
        <Pressable style={s.detailLink} onPress={() => onDetail(order.orderId)}>
          <Text style={s.detailText}>상세보기</Text>
          <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
        </Pressable>
      </View>

      {/* --- 중단부: 경로 및 거리 (화살표 디자인) --- */}
      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={s.locLabel}>상차</Text>
          <Text style={s.locName}>{getShortAddr(order.startAddr)}</Text>
        </View>

        <View style={s.arrowArea}>
          <View style={s.distBadge}>
            <Text style={s.distText}>{order.distance || "-"}km</Text>
          </View>
          <View style={s.line}>
            <View style={s.arrowHead} />
          </View>
        </View>

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={s.locLabel}>하차</Text>
          <Text style={[s.locName, { textAlign: "right" }]}>
            {getShortAddr(order.endAddr)}
          </Text>
        </View>
      </View>

      {/* --- 하단부: 차량 정보 및 금액 --- */}
      <View style={s.infoRow}>
        <Text style={s.carText}>
          {order.reqTonnage} {order.reqCarType} · {order.workType || "지게차"}
        </Text>
        <Text style={s.priceText}>{order.basePrice?.toLocaleString()}원</Text>
      </View>

      {/* --- 최하단: 액션 버튼 (상태별 분기) --- */}
      <View style={s.actionArea}>
        {isRequested ? (
          /* 승인 대기 상태: 취소 버튼만 노출 */
          <Pressable
            style={s.btnCancel}
            onPress={() => onCancel(order.orderId)}
          >
            <Ionicons name="close-circle-outline" size={16} color="#B45309" />
            <Text style={s.btnCancelText}>배차 신청 취소</Text>
          </Pressable>
        ) : (
          /* 배차 확정 상태: 운송 시작 버튼 노출 */
          <Pressable style={s.btnStart} onPress={() => onStart(order.orderId)}>
            <Ionicons name="play" size={18} color="#FFF" />
            <Text style={s.btnStartText}>운송 시작하기</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  pendingBg: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  badgeRow: { flexDirection: "row" },
  detailLink: { flexDirection: "row", alignItems: "center", padding: 4 },
  detailText: { fontSize: 13, color: "#94A3B8", marginRight: 2 },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locGroup: { flex: 1 },
  locLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4 },
  locName: { fontSize: 18, fontWeight: "800", color: "#0F172A" },

  arrowArea: { flex: 0.8, alignItems: "center", paddingHorizontal: 10 },
  distBadge: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 4,
  },
  distText: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  line: {
    width: "100%",
    height: 1,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  arrowHead: {
    position: "absolute",
    right: 0,
    top: -3,
    width: 7,
    height: 7,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "#CBD5E1",
    transform: [{ rotate: "45deg" }],
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  carText: { fontSize: 13, color: "#64748B", fontWeight: "500" },
  priceText: { fontSize: 18, fontWeight: "900", color: "#0F172A" },

  actionArea: { paddingTop: 16 },
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
    height: 48,
    borderRadius: 14,
    backgroundColor: "#4E46E5",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    elevation: 2,
  },
  btnStartText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
