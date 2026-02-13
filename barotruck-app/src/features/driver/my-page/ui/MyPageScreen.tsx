import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useRouter } from "expo-router";
import { AuthService } from "@/shared/api/authService";
import { clearCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

export default function MyPageScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const onLogout = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await AuthService.logout();
      await clearCurrentUserSnapshot();
      router.dismissAll();
      router.replace("/(auth)/login");
    } finally {
      setLoading(false);
    }
  };

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
      <Button title={loading ? "로그아웃 중..." : "로그아웃"} onPress={onLogout} disabled={loading} />
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
