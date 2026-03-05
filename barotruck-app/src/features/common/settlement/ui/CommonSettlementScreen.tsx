import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CommonSettlementScreen() {
  return (
    <View style={s.page}>
      {/* 공통 정산 정책 안내 화면: 실제 처리 화면은 화주/차주 전용 화면에서 수행 */}
      <Text style={s.title}>Common Settlement</Text>
      <Text style={s.desc}>Settlement is handled in driver and shipper dedicated screens.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F5F7FB",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
  },
});
