import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { toWon } from "@/features/common/settlement/lib/settlementHelpers";

interface Props {
  monthNumber: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  style?: StyleProp<ViewStyle>;
}

export function ShipperSummaryCard({
  monthNumber,
  totalAmount,
  paidAmount,
  unpaidAmount,
  style,
}: Props) {
  return (
    <View style={[s.card, style]}>
      <View style={s.bgCircle1} />
      <View style={s.bgCircle2} />
      <View style={s.bgCircle3} />

      <View style={s.content}>
        <Text style={s.caption}>{monthNumber}월 총 지출 금액</Text>
        <Text style={s.amount}>{toWon(totalAmount)}</Text>

        <View style={s.divider} />
        <View style={s.bottomRow}>
          <View style={s.bottomRow}>
            <View style={s.col}>
              <Text style={s.smallText}>결제 완료</Text>
              <Text style={s.greenText}>{toWon(paidAmount)}</Text>
            </View>

            <View style={s.colDivider} />

            <View style={s.col}>
              <Text style={[s.smallText, s.rightAlign]}>결제 예정</Text>
              <Text style={[s.whiteText, s.rightAlign]}>
                {toWon(unpaidAmount)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

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
  content: { paddingHorizontal: 24, paddingVertical: 24 },
  caption: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  amount: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  divider: {
    marginTop: 22,
    marginBottom: 18,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  bottomRow: { flexDirection: "row", alignItems: "center" },
  col: { flex: 1 },
  colDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 16,
  },
  smallText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
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
  rightAlign: { textAlign: "right" },
});
