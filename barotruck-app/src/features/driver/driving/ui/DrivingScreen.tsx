import React from "react";
import { View, Text, Pressable } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function DrivingScreen() {
  const { colors: c } = useAppTheme();
  const { orderId } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg.canvas,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "800", color: c.text.primary }}>
        운행 상세 페이지
      </Text>
      <Text style={{ color: c.text.secondary, marginTop: 10 }}>
        현재 선택된 오더 ID: {orderId}
      </Text>

      <Pressable
        onPress={() => router.back()}
        style={{
          marginTop: 30,
          padding: 15,
          backgroundColor: c.brand.primary,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#FFF" }}>목록으로 돌아가기</Text>
      </Pressable>
    </View>
  );
}
