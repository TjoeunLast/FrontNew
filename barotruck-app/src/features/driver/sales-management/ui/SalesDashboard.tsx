import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SalesDashboard() {
  return (
    <View style={s.container}>
      <Text style={s.text}>💰 매출 관리 (정산)</Text>
      <Text>월별 수입 내역을 확인하세요.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
});
