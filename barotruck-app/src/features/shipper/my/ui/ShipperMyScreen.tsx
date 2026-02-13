import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { AuthService } from "@/shared/api/authService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { withAlpha } from "@/shared/utils/color";
import {
  clearCurrentUserSnapshot,
  getCurrentUserSnapshot,
  saveCurrentUserSnapshot,
} from "@/shared/utils/currentUserStorage";

type ProfileView = {
  email: string;
  name: string;
  nickname: string;
  role: string;
};

function roleToKorean(role: string) {
  if (role === "SHIPPER") return "화주";
  if (role === "DRIVER") return "차주";
  if (role === "ADMIN") return "관리자";
  return role || "-";
}

export default function ShipperMyScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileView>({
    email: "-",
    name: "-",
    nickname: "-",
    role: "-",
  });

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
        try {
          const me = await UserService.getMyInfo();
          const cached = await getCurrentUserSnapshot();
          const next: ProfileView = {
            email: me.email || "-",
            name: cached?.name || "-",
            nickname: me.nickname || cached?.nickname || "-",
            role: roleToKorean(me.role || cached?.role || ""),
          };
          if (!active) return;
          setProfile(next);
          await saveCurrentUserSnapshot({
            email: me.email,
            nickname: me.nickname,
            name: cached?.name,
            role: me.role,
          });
        } catch {
          const cached = await getCurrentUserSnapshot();
          if (!active || !cached) return;
          setProfile({
            email: cached.email || "-",
            name: cached.name || "-",
            nickname: cached.nickname || "-",
            role: roleToKorean(cached.role || ""),
          });
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const s = useMemo(() => {
    return StyleSheet.create({
      wrap: { flex: 1, padding: 20, paddingTop: 36, backgroundColor: c.bg.surface } as ViewStyle,
      title: { fontSize: 26, fontWeight: "900", color: c.text.primary } as TextStyle,
      sub: { marginTop: 8, fontSize: 14, fontWeight: "700", color: c.text.secondary } as TextStyle,
      card: {
        marginTop: 18,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border.default,
        backgroundColor: c.bg.surface,
      } as ViewStyle,
      row: {
        paddingVertical: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      } as ViewStyle,
      rowLabel: { fontSize: 14, fontWeight: "900", color: c.text.secondary } as TextStyle,
      rowValue: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
      divider: { height: 1, backgroundColor: withAlpha(c.border.default, 0.9), marginVertical: 12 } as ViewStyle,
      logoutBtn: {
        height: 56,
        borderRadius: 16,
        marginTop: 14,
        backgroundColor: c.status.dangerSoft,
        borderWidth: 1,
        borderColor: withAlpha(c.status.danger, 0.55),
      } as ViewStyle,
    });
  }, [c]);

  const doLogout = async () => {
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

  const onLogout = () => {
    if (Platform.OS === "web") {
      const ok = window.confirm("정말 로그아웃할까요?");
      if (!ok) return;
      void doLogout();
      return;
    }

    Alert.alert("로그아웃", "정말 로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: () => void doLogout() },
    ]);
  };

  return (
    <View style={s.wrap}>
      <Text style={s.title}>내 정보</Text>
      <Text style={s.sub}>마이페이지 (임시)</Text>

      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.rowLabel}>이메일</Text>
          <Text style={s.rowValue}>{profile.email}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>이름</Text>
          <Text style={s.rowValue}>{profile.name}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>닉네임</Text>
          <Text style={s.rowValue}>{profile.nickname}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>회원 유형</Text>
          <Text style={s.rowValue}>{profile.role}</Text>
        </View>

        <View style={s.divider} />

        <Button
          title="로그아웃"
          variant="outline"
          size="lg"
          fullWidth
          loading={loading}
          onPress={onLogout}
          disabled={loading}
          style={s.logoutBtn}
        />
      </View>
    </View>
  );
}
