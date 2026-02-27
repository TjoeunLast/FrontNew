import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import apiClient from "@/shared/api/apiClient";
import { AuthService } from "@/shared/api/authService";
import { UserService } from "@/shared/api/userService";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { clearCurrentUserSnapshot, getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

type DriverProfileView = {
  nickname: string;
  vehicleLabel: string;
  carNum: string;
  bankName: string;
};

function toText(v: unknown, fallback = "-") {
  const text = String(v ?? "").trim();
  return text || fallback;
}

function toVehicleLabel(inputType?: unknown, inputTonnage?: unknown) {
  const typeRaw = String(inputType ?? "").trim();
  const tonnageRaw = String(inputTonnage ?? "").trim();

  const normalizedType =
    typeRaw.toUpperCase() === "WING"
      ? "윙바디"
      : typeRaw.toUpperCase() === "CARGO"
        ? "카고"
        : typeRaw.toUpperCase() === "TOP"
          ? "탑차"
          : typeRaw || "윙바디";

  const tonDigits = tonnageRaw.replace(/[^\d.]/g, "");
  const tonLabel = tonDigits ? `${tonDigits}톤` : "1톤";
  return `${tonLabel} ${normalizedType}`.trim();
}

export default function DriverMyPageScreen() {
  const router = useRouter();

  const [loggingOut, setLoggingOut] = React.useState(false);
  const [receiveOrderAlarm, setReceiveOrderAlarm] = React.useState(true);
  const [profile, setProfile] = React.useState<DriverProfileView>({
    nickname: "차주",
    vehicleLabel: "1톤 윙바디",
    carNum: "-",
    bankName: "-",
  });

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
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
          setProfile({
            nickname: toText(me?.nickname ?? cached?.nickname, "차주"),
            vehicleLabel: toVehicleLabel(
              detail?.carType ?? detail?.driver?.carType,
              detail?.tonnage ?? detail?.driver?.tonnage
            ),
            carNum: toText(detail?.carNum ?? detail?.driver?.carNum),
            bankName: toText(detail?.bankName ?? detail?.driver?.bankName),
          });
        } catch {
          if (!active) return;
          setProfile((prev) => prev);
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
      router.dismissAll();
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
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
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
        divider: { height: 1, marginLeft: 54, backgroundColor: "#EEF2F7" } as ViewStyle,
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
          borderColor: "rgba(78, 70, 229, 0.36)",
          backgroundColor: "rgba(78, 70, 229, 0.14)",
        } as ViewStyle,
        headerAlertBtnOff: {
          borderColor: "#D5DCE6",
          backgroundColor: "#FFFFFF",
        } as ViewStyle,
        headerAlertText: { fontSize: 10, fontWeight: "900" } as TextStyle,
        headerAlertTextOn: { color: "#4E46E5" } as TextStyle,
        headerAlertTextOff: { color: "#64748B" } as TextStyle,
        logoutWrap: { marginTop: 22, paddingVertical: 8 } as ViewStyle,
        logoutText: { textAlign: "center", fontSize: 16, fontWeight: "900", color: "#E14B42" } as TextStyle,
        versionText: { marginTop: 8, textAlign: "center", fontSize: 13, fontWeight: "700", color: "#A0ABBB" } as TextStyle,
      }),
    []
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="내 정보"
        hideBackButton
        right={
          <Pressable
            onPress={() => setReceiveOrderAlarm((prev) => !prev)}
            style={[s.headerAlertBtn, receiveOrderAlarm ? s.headerAlertBtnOn : s.headerAlertBtnOff]}
            hitSlop={8}
          >
            <Ionicons
              name={receiveOrderAlarm ? "notifications" : "notifications-off-outline"}
              size={12}
              color={receiveOrderAlarm ? "#4E46E5" : "#64748B"}
            />
            <Text style={[s.headerAlertText, receiveOrderAlarm ? s.headerAlertTextOn : s.headerAlertTextOff]}>
              {receiveOrderAlarm ? "ON" : "OFF"}
            </Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Pressable style={s.profileCard} onPress={() => router.push("/(common)/settings/profile" as any)}>
          <View style={s.profileAvatar}>
            <MaterialCommunityIcons name="steering" size={28} color="#4E46E5" />
          </View>
            <View style={s.profileInfo}>
              <Text style={s.profileName}>{profile.nickname} 님</Text>
              <View style={s.profileSubRow}>
                <Text style={s.profileSub}>{profile.vehicleLabel}</Text>
                <View style={s.driverBadge}>
                  <Text style={s.driverBadgeText}>차주</Text>
                </View>
              </View>
            </View>
          <View style={s.profileChevronWrap}>
            <Ionicons name="chevron-forward" size={20} color="#7C8797" />
          </View>
        </Pressable>

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
          <Pressable style={s.row} onPress={() => router.push("/(common)/notifications" as any)}>
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
            <Text style={s.rowLabel}>고객센터 / 문의</Text>
            <Ionicons name="chevron-forward" size={20} color="#9BA7B7" />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={() => router.push("/(common)/terms-policies" as any)}>
            <View style={s.iconWrap}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#718197" />
            </View>
            <Text style={s.rowLabel}>약관 및 정책</Text>
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
