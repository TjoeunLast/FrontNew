import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function DrivingScreen() {
  const { orderId } = useLocalSearchParams();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>운송 상세 (길 안내)</Text>
      </View>
      <View style={s.mapPlaceholder}>
        <Text style={s.mapText}>
          이곳에 지도가 표시됩니다.{"\n"}오더 번호: {orderId}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: { fontSize: 16, fontWeight: "700" },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  mapText: { textAlign: "center", color: "#94A3B8", lineHeight: 24 },
});
