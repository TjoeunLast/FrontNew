import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useRouter } from "expo-router";

export default function MyPageScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Text style={s.text}>👤 내 정보 (마이페이지)</Text>
      <Button
        title="프로필 수정"
        onPress={() => router.push("/(driver)/my-page/profile-edit")}
      />
      <Button
        title="차량 정보"
        onPress={() => router.push("/(driver)/my-page/vehicle-info")}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  text: { fontSize: 20, fontWeight: "bold" },
});
