import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DrivingListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🚚 운행 목록 (준비중)</Text>
      <Text>여기에 운행 완료 및 진행 중인 오더 내역이 표시됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1E293B",
  },
});
