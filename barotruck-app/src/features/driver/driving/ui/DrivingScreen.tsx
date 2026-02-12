import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function DrivingScreen() {
  const { orderId } = useLocalSearchParams();

  return (
    <View style={s.container}>
      <Text style={s.text}>🚗 운행 중 화면</Text>
      <Text>현재 운행 중인 오더 ID: {orderId}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
});
