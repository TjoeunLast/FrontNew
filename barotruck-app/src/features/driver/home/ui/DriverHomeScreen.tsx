import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DriverHomeScreen() {
  return (
    <View style={s.container}>
      <Text style={s.text}>🚛 기사님 홈 (대시보드)</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20, fontWeight: "bold" },
});
