import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

function toWon(v: number) {
  return `${v.toLocaleString("ko-KR")}원`;
}

interface SalesSummaryCardProps {
  title?: string;
  monthNumber?: number;
  totalAmount: number;
  settledAmount: number;
  pendingAmount: number;
  settledLabel?: string;
  pendingLabel?: string;
  size?: "regular" | "small";
  style?: StyleProp<ViewStyle>;
}

export const SalesSummaryCard = ({
  title,
  monthNumber,
  totalAmount,
  settledAmount,
  pendingAmount,
  settledLabel = "입금 완료",
  pendingLabel = "입금 예정",
  size = "regular",
  style,
}: SalesSummaryCardProps) => {
  const displayTitle =
    title || (monthNumber ? `${monthNumber}월 총 운송 매출` : "총 운송 매출");
  const isSmall = size === "small";

  return (
    <View style={[s.card, isSmall && s.cardSmall, style]}>
      <View style={s.bgCircle1} />
      <View style={s.bgCircle2} />
      <View style={s.bgCircle3} />

      <View style={[s.content, isSmall && s.contentSmall]}>
        <Text style={[s.caption, isSmall && s.captionSmall]}>{displayTitle}</Text>
        <Text style={[s.amount, isSmall && s.amountSmall]}>{toWon(totalAmount)}</Text>

        <View style={[s.divider, isSmall && s.dividerSmall]} />

        <View style={s.bottomRow}>
          <View style={s.col}>
            <Text style={[s.smallText, isSmall && s.smallTextSmall]}>
              {settledLabel}
            </Text>
            <Text style={[s.greenText, isSmall && s.valueSmall]}>
              {toWon(settledAmount)}
            </Text>
          </View>
          <View style={[s.colDivider, isSmall && s.colDividerSmall]} />
          <View style={s.col}>
            <Text style={[s.smallText, isSmall && s.smallTextSmall, s.rightAlign]}>
              {pendingLabel}
            </Text>
            <Text style={[s.whiteText, isSmall && s.valueSmall, s.rightAlign]}>
              {toWon(pendingAmount)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: "#4E46E5",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#4E46E5",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardSmall: {
    borderRadius: 16,
  },
  bgCircle1: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  bgCircle2: {
    position: "absolute",
    bottom: -50,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  bgCircle3: {
    position: "absolute",
    top: 40,
    right: 80,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  contentSmall: {
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  caption: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  captionSmall: {
    fontSize: 13,
  },
  amount: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  amountSmall: {
    marginTop: 5,
    fontSize: 24,
  },
  divider: {
    marginTop: 22,
    marginBottom: 18,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  dividerSmall: {
    marginTop: 16,
    marginBottom: 13,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  col: {
    flex: 1,
  },
  colDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 16,
  },
  colDividerSmall: {
    height: 32,
    marginHorizontal: 12,
  },
  smallText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
  },
  smallTextSmall: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  greenText: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    color: "#4ADE80",
  },
  whiteText: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  valueSmall: {
    marginTop: 4,
    fontSize: 16,
  },
  rightAlign: {
    textAlign: "right",
  },
});
