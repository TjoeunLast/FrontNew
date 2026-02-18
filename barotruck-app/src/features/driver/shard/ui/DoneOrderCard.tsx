import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

interface DoneOrderCardProps {
  order: any;
  onDetail: (id: string) => void;
}

export const DoneOrderCard = ({ order, onDetail }: DoneOrderCardProps) => {
  const { colors: c } = useAppTheme();

  // [1] 정산 상태 체크 (DB 데이터에 따라 'COMPLETED' 혹은 'Y' 등으로 매칭)
  const isSettled = order.settlementStatus === "COMPLETED";

  // [2] 주소 포맷팅 함수 (에러 방지를 위해 Optional Chaining 사용)
  const getShortAddr = (addr: string) => {
    if (!addr) return "주소 정보 없음";
    const parts = addr.split(" ");
    return `${parts[0]} ${parts[1] || ""}`;
  };

  return (
    <View style={s.container}>
      {/* --- 상단부: 정산 상태 및 상세보기 --- */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={isSettled ? "정산 완료" : "정산 대기"}
            tone={isSettled ? "success" : "warning"}
          />
          <View style={s.receiptBadge}>
            <Ionicons name="document-text-outline" size={12} color="#64748B" />
            <Text style={s.receiptText}>인수증 확인됨</Text>
          </View>
        </View>

        <Pressable
          style={s.detailLink}
          onPress={() => onDetail(order.orderId?.toString())}
        >
          <Text style={s.detailText}>상세보기</Text>
          <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
        </Pressable>
      </View>

      {/* --- 중단부: 운행 경로 요약 --- */}
      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={s.locName}>{getShortAddr(order.startAddr)}</Text>
          {/* DB 데이터의 startSchedule 활용 */}
          <Text style={s.dateText}>{order.startSchedule || "00:00"} 상차</Text>
        </View>

        <Ionicons
          name="arrow-forward"
          size={16}
          color="#CBD5E1"
          style={s.arrow}
        />

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={[s.locName, { textAlign: "right" }]}>
            {getShortAddr(order.endAddr)}
          </Text>
          {/* 하차 완료 시간 표시 (데이터가 없을 경우 하드코딩 대체) */}
          <Text style={s.dateText}>하차 완료</Text>
        </View>
      </View>

      {/* --- 하단부: 금액 및 결제 수단 --- */}
      <View style={s.priceRow}>
        <View>
          <Text style={s.payMethodText}>
            {order.payMethod || "결제 수단 미지정"}
          </Text>
          <Text style={s.carInfoText}>
            {order.reqTonnage} {order.reqCarType}
          </Text>
        </View>

        <View style={s.amountGroup}>
          <Text style={[s.priceText, isSettled && { color: "#10B981" }]}>
            {order.basePrice?.toLocaleString() ?? "0"}원
          </Text>
          <Text style={s.vatText}>(VAT 포함)</Text>
        </View>
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  receiptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  receiptText: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  detailLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailText: { fontSize: 13, color: "#94A3B8", marginRight: 2 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  locGroup: { flex: 1 },
  locName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  dateText: { fontSize: 12, color: "#94A3B8" },
  arrow: { marginHorizontal: 10 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  payMethodText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4E46E5",
    marginBottom: 2,
  },
  carInfoText: { fontSize: 12, color: "#94A3B8" },
  amountGroup: { alignItems: "flex-end" },
  priceText: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  vatText: { fontSize: 10, color: "#CBD5E1", marginTop: 2 },
});
