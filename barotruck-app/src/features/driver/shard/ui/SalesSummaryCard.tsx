import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";

// 유틸 함수 (컴포넌트 내부에서만 사용)
function toWon(v: number) {
  return `${v.toLocaleString("ko-KR")}원`;
}

interface SalesSummaryCardProps {
  title?: string; // 직접 타이틀을 지정하고 싶을 때 (예: "이번 달 총 매출")
  monthNumber?: number; // 월 숫자만 넘겨서 "X월 총 운송 매출"로 표시하고 싶을 때
  totalAmount: number;
  settledAmount: number;
  pendingAmount: number;
  style?: StyleProp<ViewStyle>; // 외부에서 여백(margin) 등을 조정하고 싶을 때
}

export const SalesSummaryCard = ({
  title,
  monthNumber,
  totalAmount,
  settledAmount,
  pendingAmount,
  style,
}: SalesSummaryCardProps) => {
  // title prop이 있으면 그걸 쓰고, 없으면 monthNumber를 조합해서 사용, 둘 다 없으면 기본 문구
  const displayTitle =
    title || (monthNumber ? `${monthNumber}월 총 운송 매출` : "총 운송 매출");

  return (
    <View style={[s.summaryCard, style]}>
      <Text style={s.summaryCaption}>{displayTitle}</Text>
      <Text style={s.summaryAmount}>{toWon(totalAmount)}</Text>
      <View style={s.summaryDivider} />
      <View style={s.summaryBottomRow}>
        <View style={s.summaryCol}>
          <Text style={s.summarySmall}>입금 완료</Text>
          <Text style={s.summaryGreen}>{toWon(settledAmount)}</Text>
        </View>
        <View style={s.summaryColDivider} />
        <View style={s.summaryCol}>
          <Text style={[s.summarySmall, s.summaryRight]}>입금 예정</Text>
          <Text style={[s.summaryWhite, s.summaryRight]}>
            {toWon(pendingAmount)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  summaryCard: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "#4E46E5",
  },
  summaryCaption: { fontSize: 12, fontWeight: "700", color: "#DCD9FF" },
  summaryAmount: {
    marginTop: 8,
    fontSize: 21,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  summaryDivider: {
    marginTop: 14,
    marginBottom: 12,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  summaryBottomRow: { flexDirection: "row", alignItems: "center" },
  summaryCol: { flex: 1 },
  summaryColDivider: {
    width: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  summarySmall: { fontSize: 12, fontWeight: "700", color: "#DCD9FF" },
  summaryGreen: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
    color: "#74D39E",
  },
  summaryWhite: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  summaryRight: { textAlign: "right" },
});
