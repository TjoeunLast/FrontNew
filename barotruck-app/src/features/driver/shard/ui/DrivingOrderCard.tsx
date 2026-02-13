import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";

export const DrivingOrderCard = ({
  order,
  variant,
  onDetail,
  onStart,
}: any) => {
  const isRequested = order.status === "REQUESTED"; // 승인 대기
  const isAccepted = order.status === "ACCEPTED"; // 배차 확정

  return (
    <View style={[s.card, isRequested ? s.pendingCard : s.acceptedCard]}>
      {/* 상단: 상태 배지 & 상세보기 링크 */}
      <View style={s.cardHeader}>
        <View style={s.badgeRow}>
          <Badge
            label={
              isRequested ? "승인 대기" : isAccepted ? "배차 확정" : "운송 완료"
            }
            tone={isRequested ? "warning" : "success"}
          />
          {order.instant && <Badge label="바로배차" tone="urgent" />}
        </View>

        <Pressable onPress={onDetail} style={s.detailLink}>
          <Text style={s.detailLinkText}>상세보기</Text>
          <Ionicons name="chevron-forward" size={12} color="#64748B" />
        </Pressable>
      </View>

      {/* 중단: 경로 정보 (HTML 디자인 감성 반영) */}
      <View style={s.routeRow}>
        <View style={s.locInfo}>
          <Text style={s.locLabel}>상차</Text>
          <Text style={s.cityText}>{order.startAddr.split(" ")[1]}</Text>
          <Text style={s.placeText} numberOfLines={1}>
            {order.startPlace}
          </Text>
        </View>
        <Ionicons
          name="arrow-forward-outline"
          size={20}
          color="#CBD5E1"
          style={{ marginTop: 15 }}
        />
        <View style={s.locInfo}>
          <Text style={s.locLabel}>하차</Text>
          <Text style={s.cityText}>{order.endAddr.split(" ")[1]}</Text>
          <Text style={s.placeText} numberOfLines={1}>
            {order.endPlace}
          </Text>
        </View>
      </View>

      {/* 하단: 세부 정보 바 */}
      <View style={s.infoBar}>
        <View style={s.infoItem}>
          <Ionicons name="cube-outline" size={14} color="#64748B" />
          <Text style={s.infoText}>
            {order.reqTonnage} {order.reqCarType}
          </Text>
        </View>
        <Text style={s.priceText}>{order.basePrice?.toLocaleString()}원</Text>
      </View>

      {/* 버튼 영역: 상태에 따른 액션 분기 */}
      {isRequested && (
        <Pressable style={s.cancelBtn}>
          <Text style={s.cancelBtnText}>배차 신청 취소</Text>
        </Pressable>
      )}

      {isAccepted && (
        <Pressable style={s.startBtn} onPress={onStart}>
          <Ionicons name="play-circle" size={18} color="#FFF" />
          <Text style={s.startBtnText}>운송 시작하기</Text>
        </Pressable>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  pendingCard: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  acceptedCard: { backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  badgeRow: { flexDirection: "row", gap: 6 },
  detailLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  detailLinkText: { fontSize: 13, color: "#64748B", fontWeight: "500" },
  routeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locInfo: { flex: 1 },
  locLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4 },
  cityText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  placeText: { fontSize: 13, color: "#64748B" },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontSize: 13, color: "#475569", fontWeight: "500" },
  priceText: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  cancelBtn: {
    height: 44,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
    marginTop: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: { color: "#B45309", fontWeight: "700" },
  startBtn: {
    height: 48,
    backgroundColor: "#4E46E5",
    borderRadius: 12,
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  startBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
