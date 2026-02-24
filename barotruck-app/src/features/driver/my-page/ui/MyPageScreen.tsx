import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { AuthService } from "@/shared/api/authService";
import { UserService } from "@/shared/api/userService";
import { clearCurrentUserSnapshot, getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

function normalizeGenderLabel(input?: string) {
  const v = String(input ?? "").trim().toUpperCase();
  if (!v) return "-";
  if (v === "M" || v === "MALE" || v === "남" || v === "남성") return "남성";
  if (v === "F" || v === "FEMALE" || v === "여" || v === "여성") return "여성";
  return String(input).trim() || "-";
}

function normalizeBirthDateLabel(input?: string) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return "-";
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

export default function MyPageScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [gender, setGender] = React.useState("-");
  const [birthDate, setBirthDate] = React.useState("-");

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void (async () => {
        try {
          const me = (await UserService.getMyInfo()) as any;
          const cached = await getCurrentUserSnapshot();
          if (!active) return;
          setGender(normalizeGenderLabel(me.gender ?? me.sex ?? cached?.gender));
          setBirthDate(normalizeBirthDateLabel(me.birthDate ?? me.birthday ?? me.birth ?? cached?.birthDate));
        } catch {
          const cached = await getCurrentUserSnapshot();
          if (!active) return;
          setGender(normalizeGenderLabel(cached?.gender));
          setBirthDate(normalizeBirthDateLabel(cached?.birthDate));
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

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
      <Text style={s.infoText}>성별: {gender}</Text>
      <Text style={s.infoText}>생년월일: {birthDate}</Text>
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
  infoText: { fontSize: 16 },
});
