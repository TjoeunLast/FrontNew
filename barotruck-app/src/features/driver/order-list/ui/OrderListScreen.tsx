import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function OrderListScreen() {
  return (
    <View style={s.container}>
      <Text style={s.text}>📋 오더 목록 페이지</Text>
      <Text>배차 가능한 오더들이 여기에 표시됩니다.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
});
