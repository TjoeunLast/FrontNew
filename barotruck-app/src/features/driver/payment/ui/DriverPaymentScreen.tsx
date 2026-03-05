import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

export default function DriverPaymentScreen() {
  const { colors: c } = useAppTheme();

  return (
    <View style={s.page}>
      {/* 차주 입장에서 현재 결제 정책(토스/착불)만 노출 */}
      <ShipperScreenHeader title="Payment" hideBackButton />
      <View style={s.content}>
        <Text style={[s.title, { color: c.text.primary }]}>Payment methods in use</Text>
        <Text style={[s.desc, { color: c.text.secondary }]}>Enabled for create-order:</Text>
        <Text style={[s.item, { color: c.text.primary }]}>- Card Payment (Toss)</Text>
        <Text style={[s.item, { color: c.text.primary }]}>- Cash Payment (after delivery)</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F5F9" },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  desc: {
    fontSize: 13,
    marginBottom: 6,
  },
  item: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
});
