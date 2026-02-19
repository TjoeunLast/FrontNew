import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { AuthService } from "@/shared/api/authService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
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
  const [receiveDispatchAlert, setReceiveDispatchAlert] = useState(true);
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
      wrap: { flex: 1, padding: 20, paddingTop: 28, backgroundColor: c.bg.canvas } as ViewStyle,
      title: { fontSize: 26, fontWeight: "900", color: c.text.primary } as TextStyle,
      profileCard: {
        marginTop: 18,
        padding: 16,
        borderRadius: 20,
        backgroundColor: c.bg.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      } as ViewStyle,
      profileIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: withAlpha(c.brand.primary, 0.12),
      } as ViewStyle,
      profileInfo: { flex: 1, gap: 2 } as ViewStyle,
      profileName: { fontSize: 20, fontWeight: "900", color: c.text.primary } as TextStyle,
      profileSub: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
      arrowCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: c.bg.muted,
      } as ViewStyle,
      sectionTitle: {
        marginTop: 26,
        marginBottom: 10,
        fontSize: 14,
        fontWeight: "900",
        color: c.text.secondary,
      } as TextStyle,
      sectionCard: {
        borderWidth: 1,
        borderColor: c.border.default,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: c.bg.surface,
      } as ViewStyle,
      row: {
        minHeight: 58,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
      } as ViewStyle,
      rowIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
      } as ViewStyle,
      rowLabel: { flex: 1, fontSize: 14, fontWeight: "800", color: c.text.primary } as TextStyle,
      rowValue: { marginRight: 8, fontSize: 13, fontWeight: "700", color: c.text.secondary } as TextStyle,
      rowValueActive: { color: c.brand.primary } as TextStyle,
      divider: { height: 1, backgroundColor: withAlpha(c.border.default, 0.9), marginLeft: 54 } as ViewStyle,
      logoutRow: { marginTop: 22, paddingVertical: 8 } as ViewStyle,
      logoutText: {
        fontSize: 16,
        fontWeight: "900",
        textAlign: "center",
        color: c.status.danger,
      } as TextStyle,
      versionText: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: c.text.secondary,
      } as TextStyle,
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
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>내 정보</Text>

      <Pressable style={s.profileCard} onPress={() => router.push("/(common)/settings/profile" as any)}>
        <View style={s.profileIcon}>
          <MaterialCommunityIcons name="warehouse" size={28} color={c.brand.primary} />
        </View>
        <View style={s.profileInfo}>
          <Text style={s.profileName}>{profile.name === "-" ? "화주 님" : `${profile.name} 님`}</Text>
          <Text style={s.profileSub}>{profile.email}</Text>
          <Text style={s.profileSub}>{profile.role}</Text>
        </View>
        <View style={s.arrowCircle}>
          <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
        </View>
      </Pressable>

      <Text style={s.sectionTitle}>화주 관리</Text>
      <View style={s.sectionCard}>
        <Pressable style={s.row} onPress={() => router.push("/(common)/settings/shipper/payment" as any)}>
          <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.brand.primary, 0.12) }]}>
            <Ionicons name="card-outline" size={18} color={c.brand.primary} />
          </View>
          <Text style={s.rowLabel}>결제 수단 관리</Text>
          <Text style={[s.rowValue, s.rowValueActive]}>신한카드</Text>
          <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
        </Pressable>
        <View style={s.divider} />
        <Pressable style={s.row} onPress={() => router.push("/(common)/settings/shipper/addresses" as any)}>
          <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.status.success, 0.16) }]}>
            <Ionicons name="location-outline" size={18} color={c.status.success} />
          </View>
          <Text style={s.rowLabel}>자주 쓰는 주소지</Text>
          <Text style={s.rowValue}>3곳</Text>
          <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
        </Pressable>
        <View style={s.divider} />
        <Pressable style={s.row} onPress={() => router.push("/(common)/settings/shipper/business" as any)}>
          <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.text.secondary, 0.16) }]}>
            <Ionicons name="document-text-outline" size={18} color={c.text.secondary} />
          </View>
          <Text style={s.rowLabel}>세금계산서 관리</Text>
          <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
        </Pressable>
      </View>

      <Text style={s.sectionTitle}>고객 지원</Text>
      <View style={s.sectionCard}>
        <Pressable style={s.row} onPress={() => router.push("/(common)/settings/account" as any)}>
          <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.text.secondary, 0.12) }]}>
            <Ionicons name="headset-outline" size={18} color={c.text.secondary} />
          </View>
          <Text style={s.rowLabel}>1:1 문의하기</Text>
          <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
        </Pressable>
      </View>

      <Text style={s.sectionTitle}>앱 설정</Text>
      <View style={s.sectionCard}>
        <View style={s.row}>
          <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.text.secondary, 0.12) }]}>
            <Ionicons name="notifications-outline" size={18} color={c.text.secondary} />
          </View>
          <Text style={s.rowLabel}>배차 알림 받기</Text>
          <Switch
            value={receiveDispatchAlert}
            onValueChange={setReceiveDispatchAlert}
            trackColor={{ false: withAlpha(c.text.secondary, 0.24), true: withAlpha(c.brand.primary, 0.45) }}
            thumbColor={receiveDispatchAlert ? c.brand.primary : c.bg.surface}
          />
        </View>
        <View style={s.divider} />
        <Pressable style={s.row} onPress={() => router.push("/(common)/settings/index" as any)}>
          <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.text.secondary, 0.12) }]}>
            <Ionicons name="document-text-outline" size={18} color={c.text.secondary} />
          </View>
          <Text style={s.rowLabel}>이용약관 및 정책</Text>
          <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
        </Pressable>
      </View>

      <Pressable style={s.logoutRow} onPress={onLogout} disabled={loading}>
        <Text style={s.logoutText}>{loading ? "로그아웃 중..." : "로그아웃"}</Text>
      </Pressable>
      <Text style={s.versionText}>현재 버전 1.0.2</Text>
    </ScrollView>
  );
}
