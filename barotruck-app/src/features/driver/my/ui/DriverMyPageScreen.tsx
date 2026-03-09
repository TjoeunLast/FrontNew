import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import apiClient from "@/shared/api/apiClient";
import { AuthService } from "@/shared/api/authService";
import { UserService } from "@/shared/api/userService";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import {
  clearCurrentUserSnapshot,
  getCurrentUserSnapshot
} from "@/shared/utils/currentUserStorage";

const PROFILE_IMAGE_STORAGE_KEY = "baro_profile_image_url_v1";

type DriverProfileView = {
  nickname: string;
  gender: string;
  ageLabel: string;
  carNum: string;
  bankName: string;
  activityAddress: string;
};

function toText(v: unknown, fallback = "-") {
  const text = String(v ?? "").trim();
  return text || fallback;
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function pickPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return undefined;
}

function normalizeGenderLabel(input?: unknown) {
  const value = String(input ?? "").trim().toUpperCase();
  if (!value) return "-";
  if (value === "M" || value === "MALE" || value === "남" || value === "남성") return "남성";
  if (value === "F" || value === "FEMALE" || value === "여" || value === "여성") return "여성";
  return String(input ?? "").trim() || "-";
}

function normalizeAgeLabel(input?: unknown) {
  const age = Number(input);
  if (!Number.isFinite(age) || age <= 0) return "-";
  return `${Math.floor(age)}세`;
}

function toOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : undefined;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "y", "yes", "on", "enabled", "active"].includes(normalized)) return true;
    if (["false", "0", "n", "no", "off", "disabled", "inactive"].includes(normalized)) return false;
  }
  return undefined;
}

function resolveInstantDispatchEnabled(detail?: any, cached?: Awaited<ReturnType<typeof getCurrentUserSnapshot>>) {
  const values = [
    detail?.instantDispatchEnabled,
    detail?.isInstantDispatchEnabled,
    detail?.quickDispatchEnabled,
    detail?.isQuickDispatchEnabled,
    detail?.immediateDispatchEnabled,
    detail?.isImmediateDispatchEnabled,
    detail?.adminDispatchEnabled,
    detail?.isAdminDispatchEnabled,
    detail?.autoAssignEnabled,
    detail?.isAutoAssignEnabled,
    detail?.driver?.instantDispatchEnabled,
    detail?.driver?.isInstantDispatchEnabled,
    detail?.driver?.quickDispatchEnabled,
    detail?.driver?.isQuickDispatchEnabled,
    detail?.driver?.immediateDispatchEnabled,
    detail?.driver?.isImmediateDispatchEnabled,
    detail?.driver?.adminDispatchEnabled,
    detail?.driver?.isAdminDispatchEnabled,
    detail?.driver?.autoAssignEnabled,
    detail?.driver?.isAutoAssignEnabled,
    cached?.instantDispatchEnabled,
  ];

  for (const value of values) {
    const normalized = toOptionalBoolean(value);
    if (normalized !== undefined) return normalized;
  }

  return false;
}

export default function DriverMyPageScreen() {
  const router = useRouter();

  const [loggingOut, setLoggingOut] = React.useState(false);
  const [receiveOrderAlarm, setReceiveOrderAlarm] = React.useState(true);
  const [adminForceAllocateBlocked, setAdminForceAllocateBlocked] = React.useState(false);
  const [savingAdminForceAllocateBlocked, setSavingAdminForceAllocateBlocked] = React.useState(false);
  const [profile, setProfile] = React.useState<DriverProfileView>({
    nickname: "차주",
    gender: "-",
    ageLabel: "-",
    carNum: "-",
    bankName: "-",
    activityAddress: "-",
  });
  const [profileImageUrl, setProfileImageUrl] = React.useState("");

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
        const localImageUrl = await AsyncStorage.getItem(PROFILE_IMAGE_STORAGE_KEY);
        try {
          const me = (await UserService.getMyInfo()) as any;
          const cached = await getCurrentUserSnapshot();
          let detail: any = null;
          try {
            const res = await apiClient.get("/api/v1/drivers/me");
            detail = res.data;
          } catch {
            detail = null;
          }

          if (!active) return;
          setProfileImageUrl((localImageUrl ?? "") || me?.profileImageUrl || "");
          setAdminForceAllocateBlocked(Boolean(me?.adminForceAllocateBlocked));
          setProfile({
            nickname: toText(me?.nickname ?? cached?.nickname, "차주"),
            gender: normalizeGenderLabel(me?.gender ?? me?.sex ?? detail?.gender ?? detail?.user?.gender ?? cached?.gender),
            ageLabel: normalizeAgeLabel(me?.age ?? detail?.age ?? detail?.user?.age ?? cached?.age),
            carNum: toText(pickFirstText(detail?.carNum, detail?.driver?.carNum, cached?.driverCarNum)),
            bankName: toText(detail?.bankName ?? detail?.driver?.bankName),
            activityAddress: toText(pickFirstText(detail?.address, detail?.driver?.address, cached?.activityAddress)),
          });
        } catch {
          if (!active) return;
          setProfileImageUrl(localImageUrl ?? "");
          const cached = await getCurrentUserSnapshot();
          setAdminForceAllocateBlocked(false);
          setProfile({
            nickname: toText(cached?.nickname, "차주"),
            gender: normalizeGenderLabel(cached?.gender),
            ageLabel: normalizeAgeLabel(cached?.age),
            carNum: toText(cached?.driverCarNum),
            bankName: "-",
            activityAddress: toText(cached?.activityAddress),
          });
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const doLogout = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await AuthService.logout();
      await clearCurrentUserSnapshot();
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace("/(auth)/login");
    } finally {
      setLoggingOut(false);
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

  const onToggleAdminForceAllocateBlocked = async (nextValue: boolean) => {
    if (savingAdminForceAllocateBlocked) return;
    const previousValue = adminForceAllocateBlocked;
    setAdminForceAllocateBlocked(nextValue);
    try {
      setSavingAdminForceAllocateBlocked(true);
      await UserService.updateAdminForceAllocateBlocked(nextValue);
    } catch {
      setAdminForceAllocateBlocked(previousValue);
      Alert.alert("저장 실패", "강제배차 설정을 저장하지 못했습니다.");
    } finally {
      setSavingAdminForceAllocateBlocked(false);
    }
  };

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: "#F3F5F9" } as ViewStyle,
        content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 34 } as ViewStyle,
        profileCard: {
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#E6EAF1",
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        } as ViewStyle,
        profileAvatar: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "rgba(78, 70, 229, 0.12)",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        profileImage: { width: "100%", height: "100%" } as ImageStyle,
        profileInfo: { flex: 1 } as ViewStyle,
        profileName: { fontSize: 16, fontWeight: "800", color: "#111827", letterSpacing: -0.1 } as TextStyle,
        profileSubRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 } as ViewStyle,
        profileSub: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0 } as TextStyle,
        driverBadge: {
          borderRadius: 7,
          paddingHorizontal: 7,
          height: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#E0E7FF",
        } as ViewStyle,
        driverBadgeText: { fontSize: 11, fontWeight: "900", color: "#3730A3" } as TextStyle,
        profileChevronWrap: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        sectionTitle: {
          marginTop: 8,
          marginBottom: 10,
          marginLeft: 4,
          fontSize: 14,
          fontWeight: "900",
          color: "#76839A",
        } as TextStyle,
        sectionCard: {
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#E0E6EF",
          overflow: "hidden",
          marginBottom: 14,
        } as ViewStyle,
        row: {
          minHeight: 64,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
        } as ViewStyle,
        iconWrap: {
          width: 30,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        } as ViewStyle,
        rowLabel: { flex: 1, fontSize: 14, fontWeight: "800", color: "#111827" } as TextStyle,
        rowValue: { fontSize: 14, fontWeight: "800", color: "#65758B", marginRight: 8 } as TextStyle,
        rowValuePrimary: { color: "#4E46E5" } as TextStyle,
        toggleValueWrap: { marginLeft: 12 } as ViewStyle,
        divider: { height: 1, marginLeft: 54, backgroundColor: "#EEF2F7" } as ViewStyle,
        settingRow: {
          minHeight: 72,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
        } as ViewStyle,
        settingLabelWrap: { flex: 1 } as ViewStyle,
        settingLabel: { fontSize: 15, fontWeight: "900", color: "#111827" } as TextStyle,
        settingSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#7B8794" } as TextStyle,
        settingActionWrap: { flexDirection: "row", alignItems: "center" } as ViewStyle,
        settingActionButton: {
          minWidth: 88,
          height: 40,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          borderWidth: 1.5,
          backgroundColor: "#FFFFFF",
        } as ViewStyle,
        settingActionButtonOn: {
          backgroundColor: "#EEF2FF",
          borderColor: "#4E46E5",
        } as ViewStyle,
        settingActionButtonOff: {
          backgroundColor: "#FFFFFF",
          borderColor: "#CBD5E1",
        } as ViewStyle,
        settingActionButtonDisabled: {
          opacity: 0.6,
        } as ViewStyle,
        settingActionText: { fontSize: 14, fontWeight: "900" } as TextStyle,
        settingActionTextOn: { color: "#4338CA" } as TextStyle,
        settingActionTextOff: { color: "#64748B" } as TextStyle,
        logoutWrap: { marginTop: 22, paddingVertical: 8 } as ViewStyle,
        logoutText: { textAlign: "center", fontSize: 16, fontWeight: "900", color: "#E14B42" } as TextStyle,
        versionText: { marginTop: 8, textAlign: "center", fontSize: 13, fontWeight: "700", color: "#A0ABBB" } as TextStyle,
      }),
    []
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="내 정보" hideBackButton />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Pressable style={s.profileCard} onPress={() => router.push("/(common)/settings/profile" as any)}>
          <View style={s.profileAvatar}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={s.profileImage} resizeMode="cover" />
            ) : (
              <MaterialCommunityIcons name="steering" size={28} color="#4E46E5" />
            )}
          </View>
            <View style={s.profileInfo}>
              <Text style={s.profileName}>{profile.nickname} 님</Text>
              <View style={s.profileSubRow}>
                {(profile.gender !== "-" || profile.ageLabel !== "-") ? (
                  <Text style={s.profileSub}>{[profile.gender, profile.ageLabel].filter((v) => v !== "-").join(" · ")}</Text>
                ) : null}
                <View style={s.driverBadge}>
                  <Text style={s.driverBadgeText}>차주</Text>
                </View>
              </View>
            </View>
          <View style={s.profileChevronWrap}>
            <Ionicons name="chevron-forward" size={20} color="#7C8797" />
          </View>
        </Pressable>

        <Text style={s.sectionTitle}>배차 설정</Text>
        <View style={s.sectionCard}>
          <View style={s.settingRow}>
            <View style={s.iconWrap}>
              <Ionicons
                name={receiveOrderAlarm ? "notifications" : "notifications-off-outline"}
                size={22}
                color="#4E46E5"
              />
            </View>
            <View style={s.settingLabelWrap}>
              <Text style={s.settingLabel}>배차 알림</Text>
              <Text style={s.settingSub}>새 배차 요청 알림 수신</Text>
            </View>
            <View style={s.settingActionWrap}>
              <Pressable
                onPress={() => setReceiveOrderAlarm((prev) => !prev)}
                style={[
                  s.settingActionButton,
                  receiveOrderAlarm ? s.settingActionButtonOn : s.settingActionButtonOff,
                ]}
                hitSlop={8}
              >
                <Text
                  style={[
                    s.settingActionText,
                    receiveOrderAlarm ? s.settingActionTextOn : s.settingActionTextOff,
                  ]}
                >
                  {receiveOrderAlarm ? "ON" : "OFF"}
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.settingRow}>
            <View style={s.iconWrap}>
              <Ionicons name="flash-outline" size={22} color="#DC2626" />
            </View>
            <View style={s.settingLabelWrap}>
              <Text style={s.settingLabel}>직접 배차</Text>
              <Text style={s.settingSub}>관리자 우선 배정 사용</Text>
            </View>
            <View style={s.settingActionWrap}>
              <Pressable
                onPress={() => void onToggleInstantDispatch()}
                disabled={updatingInstantDispatch}
                style={[
                  s.settingActionButton,
                  instantDispatchEnabled ? s.settingActionButtonOn : s.settingActionButtonOff,
                  updatingInstantDispatch && s.settingActionButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    s.settingActionText,
                    instantDispatchEnabled ? s.settingActionTextOn : s.settingActionTextOff,
                  ]}
                >
                  {updatingInstantDispatch ? "저장중" : instantDispatchEnabled ? "ON" : "OFF"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>운행 관리</Text>
        <View style={s.sectionCard}>
          <Pressable style={s.row} onPress={() => router.push("/(common)/settings/driver/vehicle" as any)}>
            <View style={s.iconWrap}>
              <Ionicons name="car-sport-outline" size={22} color="#4E46E5" />
            </View>
            <Text style={s.rowLabel}>내 차량 정보</Text>
            <Text style={[s.rowValue, s.rowValuePrimary]}>{profile.carNum}</Text>
            <Ionicons name="chevron-forward" size={20} color="#9BA7B7" />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={() => router.push("/(common)/settings/profile" as any)}>
            <View style={s.iconWrap}>
              <Ionicons name="location-outline" size={22} color="#7EA85B" />
            </View>
            <Text style={s.rowLabel}>활동 지역</Text>
            <Text style={s.rowValue} numberOfLines={1}>
              {profile.activityAddress}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9BA7B7" />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={() => router.push("/(common)/settings/driver/account" as any)}>
            <View style={s.iconWrap}>
              <Ionicons name="business-outline" size={22} color="#7EA85B" />
            </View>
            <Text style={s.rowLabel}>정산 계좌 관리</Text>
            <Text style={[s.rowValue, s.rowValuePrimary]}>{profile.bankName}</Text>
            <Ionicons name="chevron-forward" size={20} color="#9BA7B7" />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={() => router.push("/(common)/settings/driver/documents" as any)}>
            <View style={s.iconWrap}>
              <Ionicons name="document-text-outline" size={20} color="#E37A34" />
            </View>
            <Text style={s.rowLabel}>서류 관리 (사업자/자격증)</Text>
            <Ionicons name="chevron-forward" size={20} color="#9BA7B7" />
          </Pressable>
          <View style={s.divider} />
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Ionicons name="shield-outline" size={20} color="#E37A34" />
            </View>
            <Text style={s.rowLabel}>관리자 강제배차 차단</Text>
            <View style={s.toggleValueWrap}>
              <Switch
                value={adminForceAllocateBlocked}
                onValueChange={onToggleAdminForceAllocateBlocked}
                disabled={savingAdminForceAllocateBlocked}
                trackColor={{ false: "#D5DCE6", true: "rgba(78, 70, 229, 0.36)" }}
                thumbColor={adminForceAllocateBlocked ? "#4E46E5" : "#FFFFFF"}
              />
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>고객 지원</Text>
        <View style={s.sectionCard}>
          <Pressable style={s.row} onPress={() => router.push("/(common)/settings/reviews" as any)}>
            <View style={s.iconWrap}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color="#718197" />
            </View>
            <Text style={s.rowLabel}>리뷰 관리</Text>
            <Ionicons name="chevron-forward" size={20} color="#9BA7B7" />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={() => router.push("/(common)/settings/announcements" as any)}>
            <View style={s.iconWrap}>
              <Ionicons name="megaphone-outline" size={20} color="#718197" />
            </View>
            <Text style={s.rowLabel}>공지사항</Text>
            <Ionicons name="chevron-forward" size={20} color="#9BA7B7" />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={() => router.push("/(common)/settings/account" as any)}>
            <View style={s.iconWrap}>
              <Ionicons name="headset-outline" size={20} color="#718197" />
            </View>
            <Text style={s.rowLabel}>1:1 문의하기</Text>
            <Ionicons name="chevron-forward" size={20} color="#9BA7B7" />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={() => router.push("/(common)/terms-policies" as any)}>
            <View style={s.iconWrap}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#718197" />
            </View>
            <Text style={s.rowLabel}>이용약관 및 정책</Text>
            <Ionicons name="chevron-forward" size={20} color="#9BA7B7" />
          </Pressable>
        </View>

        <Pressable style={s.logoutWrap} onPress={onLogout} disabled={loggingOut}>
          <Text style={s.logoutText}>{loggingOut ? "로그아웃 중..." : "로그아웃"}</Text>
        </Pressable>
        <Text style={s.versionText}>현재 버전 1.0.2</Text>
      </ScrollView>
    </View>
  );
}
