import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

export default function DriverPaymentScreen() {
  const { colors: c } = useAppTheme();

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="결제 방식" hideBackButton />
      <View style={s.content}>
        <Text style={[s.title, { color: c.text.primary }]}>현재 사용 중인 결제 방식</Text>
        <Text style={[s.desc, { color: c.text.secondary }]}>오더 생성에서 사용하는 방식:</Text>
        <Text style={[s.item, { color: c.text.primary }]}>- 토스 결제</Text>
        <Text style={[s.item, { color: c.text.primary }]}>- 착불 결제</Text>
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
