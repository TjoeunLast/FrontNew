import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function VehicleInfoScreen() {
  return (
    <View style={s.container}>
      <Text style={s.text}>🚚 차량 정보 관리 페이지</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20, fontWeight: "bold" },
});
