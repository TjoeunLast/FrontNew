import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { AuthService } from "@/shared/api/authService";
import apiClient from "@/shared/api/apiClient";
import { UserService } from "@/shared/api/userService";
import { USE_MOCK } from "@/shared/config/mock";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";
import {
  clearCurrentUserSnapshot,
  getCurrentUserSnapshot,
  saveCurrentUserSnapshot,
} from "@/shared/utils/currentUserStorage";

const PROFILE_IMAGE_STORAGE_KEY = "baro_profile_image_url_v1";

type ProfileView = {
  email: string;
  name: string;
  nickname: string;
  role: string;
  shipperType: string;
  gender: string;
  birthDate: string;
};

function roleToKorean(role: string) {
  if (role === "SHIPPER") return "화주";
  if (role === "DRIVER") return "차주";
  if (role === "ADMIN") return "관리자";
  return role || "-";
}

function toShipperTypeLabel(raw?: unknown) {
  const v = String(raw ?? "").trim().toUpperCase();
  if (!v) return "-";
  if (
    v === "Y" ||
    v === "TRUE" ||
    v === "T" ||
    v === "1" ||
    v === "CORPORATE" ||
    v === "BUSINESS" ||
    v === "BIZ" ||
    v === "사업자"
  ) {
    return "사업자";
  }
  if (
    v === "N" ||
    v === "FALSE" ||
    v === "F" ||
    v === "0" ||
    v === "PERSONAL" ||
    v === "INDIVIDUAL" ||
    v === "개인"
  ) {
    return "개인";
  }
  return "-";
}

function resolveShipperType(...sources: any[]) {
  const explicit = toShipperTypeLabel(
    sources.find((s) => s?.isCorporate != null)?.isCorporate ??
      sources.find((s) => s?.is_corporate != null)?.is_corporate ??
      sources.find((s) => s?.shipper?.isCorporate != null)?.shipper?.isCorporate ??
      sources.find((s) => s?.shipper?.is_corporate != null)?.shipper?.is_corporate ??
      sources.find((s) => s?.shipperInfo?.isCorporate != null)?.shipperInfo?.isCorporate ??
      sources.find((s) => s?.shipperInfo?.is_corporate != null)?.shipperInfo?.is_corporate ??
      sources.find((s) => s?.shipperDto?.isCorporate != null)?.shipperDto?.isCorporate
  );
  if (explicit !== "-") return explicit;

  const hasBusinessInfo = Boolean(
    sources.some((s) => String(s?.bizRegNum ?? s?.biz_reg_num ?? "").trim().length > 0) ||
      sources.some((s) => String(s?.companyName ?? s?.company_name ?? "").trim().length > 0)
  );
  return hasBusinessInfo ? "사업자" : "개인";
}

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

async function fetchShipperDetailFromServer(baseMe: any) {
  if (USE_MOCK) return null;
  try {
    const role = String(baseMe?.role ?? "").trim().toUpperCase();
    if (role && role !== "SHIPPER") return null;
    const res = await apiClient.get("/api/v1/shippers/me");
    return res.data;
  } catch {
    return null;
  }
}

export default function MyPageScreen() {
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
    shipperType: "-",
    gender: "-",
    birthDate: "-",
  });
  const [profileImageUrl, setProfileImageUrl] = useState("");

  const roleLabel = profile.role === "-" ? "회원" : profile.role;
  const managementSectionTitle = roleLabel === "차주" ? "차주 관리" : "화주 관리";
  const profileGreetingFallback = roleLabel === "차주" ? "차주님" : "화주님";

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
        const localImageUrl = (await AsyncStorage.getItem(PROFILE_IMAGE_STORAGE_KEY)) ?? "";

        try {
          const me = (await UserService.getMyInfo()) as any;
          const cached = await getCurrentUserSnapshot();
          const shipperDetail = await fetchShipperDetailFromServer(me);
          const shipperType = resolveShipperType(
            me,
            shipperDetail,
            shipperDetail?.user,
            me?.shipper,
            me?.shipperInfo,
            me?.shipperDto
          );
          const next: ProfileView = {
            email: me.email || "-",
            name: me.name || cached?.name || "-",
            nickname: me.nickname || cached?.nickname || "-",
            role: roleToKorean(me.role || cached?.role || ""),
            shipperType,
            gender: normalizeGenderLabel(
              me.gender ??
                me.sex ??
                shipperDetail?.gender ??
                shipperDetail?.sex ??
                shipperDetail?.user?.gender ??
                shipperDetail?.user?.sex ??
                cached?.gender
            ),
            birthDate: normalizeBirthDateLabel(
              me.birthDate ??
                me.birthday ??
                me.birth ??
                me.dateOfBirth ??
                me.dob ??
                shipperDetail?.birthDate ??
                shipperDetail?.birthday ??
                shipperDetail?.birth ??
                shipperDetail?.dateOfBirth ??
                shipperDetail?.dob ??
                shipperDetail?.user?.birthDate ??
                shipperDetail?.user?.birthday ??
                shipperDetail?.user?.birth ??
                shipperDetail?.user?.dateOfBirth ??
                shipperDetail?.user?.dob ??
                cached?.birthDate
            ),
          };
          if (!active) return;
          setProfile(next);
          setProfileImageUrl(localImageUrl || me.profileImageUrl || "");
          try {
            await saveCurrentUserSnapshot({
              email: me.email,
              nickname: me.nickname,
              name: me.name || cached?.name,
              role: me.role,
              gender: me.gender ?? me.sex ?? shipperDetail?.user?.gender ?? cached?.gender,
              birthDate:
                String(
                  me.birthDate ??
                    me.birthday ??
                    me.birth ??
                    me.dateOfBirth ??
                    me.dob ??
                    shipperDetail?.user?.birthDate ??
                    shipperDetail?.user?.birthday ??
                    shipperDetail?.user?.birth ??
                    cached?.birthDate ??
                    ""
                ).trim() || undefined,
            });
          } catch {}
        } catch {
          const cached = await getCurrentUserSnapshot();
          if (!active) return;
          setProfileImageUrl(localImageUrl);
          if (!cached) return;
          setProfile({
            email: cached.email || "-",
            name: cached.name || "-",
            nickname: cached.nickname || "-",
            role: roleToKorean(cached.role || ""),
            shipperType: "-",
            gender: normalizeGenderLabel(cached.gender),
            birthDate: normalizeBirthDateLabel(cached.birthDate),
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
      page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
      content: { padding: 20, paddingTop: 14, paddingBottom: 30 } as ViewStyle,
      profileCard: {
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
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: withAlpha(c.brand.primary, 0.12),
      } as ViewStyle,
      profileImage: { width: "100%", height: "100%" } as ImageStyle,
      profileInfo: { flex: 1, gap: 6 } as ViewStyle,
      profileTopRow: { flexDirection: "row", alignItems: "center", gap: 8 } as ViewStyle,
      profileName: { fontSize: 18, fontWeight: "800", color: c.text.primary } as TextStyle,
      profileMeta: { fontSize: 13, fontWeight: "700", color: c.text.secondary } as TextStyle,
      shipperTypeBadge: {
        paddingHorizontal: 10,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EEF2FF",
        borderWidth: 1,
        borderColor: "#C7D2FE",
      } as ViewStyle,
      shipperTypeBadgeText: { fontSize: 12, fontWeight: "800", color: "#3730A3" } as TextStyle,
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
      headerAlertBtn: {
        width: 52,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 3,
        borderWidth: 1,
      } as ViewStyle,
      headerAlertBtnOn: {
        borderColor: withAlpha(c.brand.primary, 0.36),
        backgroundColor: withAlpha(c.brand.primary, 0.14),
      } as ViewStyle,
      headerAlertBtnOff: {
        borderColor: c.border.default,
        backgroundColor: c.bg.surface,
      } as ViewStyle,
      headerAlertText: { fontSize: 10, fontWeight: "900" } as TextStyle,
      headerAlertTextOn: { color: c.brand.primary } as TextStyle,
      headerAlertTextOff: { color: c.text.secondary } as TextStyle,
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
    <View style={s.page}>
      <ShipperScreenHeader
        title="내 정보"
        hideBackButton
        right={
          <Pressable
            onPress={() => setReceiveDispatchAlert((prev) => !prev)}
            style={[
              s.headerAlertBtn,
              receiveDispatchAlert ? s.headerAlertBtnOn : s.headerAlertBtnOff,
            ]}
            hitSlop={8}
          >
            <Ionicons
              name={receiveDispatchAlert ? "notifications" : "notifications-off-outline"}
              size={12}
              color={receiveDispatchAlert ? c.brand.primary : c.text.secondary}
            />
            <Text style={[s.headerAlertText, receiveDispatchAlert ? s.headerAlertTextOn : s.headerAlertTextOff]}>
              {receiveDispatchAlert ? "ON" : "OFF"}
            </Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Pressable style={s.profileCard} onPress={() => router.push("/(common)/settings/profile" as any)}>
          <View style={s.profileIcon}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={s.profileImage} resizeMode="cover" />
            ) : (
              <MaterialCommunityIcons name="warehouse" size={28} color={c.brand.primary} />
            )}
          </View>
          <View style={s.profileInfo}>
            <View style={s.profileTopRow}>
              <Text style={s.profileName}>
                {profile.nickname === "-" ? profileGreetingFallback : `${profile.nickname}님`}
              </Text>
              {profile.shipperType !== "-" ? (
                <View style={s.shipperTypeBadge}>
                  <Text style={s.shipperTypeBadgeText}>{profile.shipperType}</Text>
                </View>
              ) : null}
            </View>
            {(profile.gender !== "-" || profile.birthDate !== "-") ? (
              <Text style={s.profileMeta}>
                {[profile.gender, profile.birthDate].filter((v) => v !== "-").join(" · ")}
              </Text>
            ) : null}
          </View>
          <View style={s.arrowCircle}>
            <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
          </View>
        </Pressable>

        <Text style={s.sectionTitle}>{managementSectionTitle}</Text>
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
          <Pressable style={s.row} onPress={() => router.push("/(common)/settings/reviews" as any)}>
            <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.brand.primary, 0.12) }]}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color={c.brand.primary} />
            </View>
            <Text style={s.rowLabel}>리뷰 관리</Text>
            <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={() => router.push("/(common)/settings/account" as any)}>
            <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.text.secondary, 0.12) }]}>
              <Ionicons name="headset-outline" size={18} color={c.text.secondary} />
            </View>
            <Text style={s.rowLabel}>1:1 문의하기</Text>
            <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={() => router.push("/(common)/terms-policies" as any)}>
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
    </View>
  );
}
