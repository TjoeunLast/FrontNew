import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthService } from "@/shared/api/authService";
import { ReportService } from "@/shared/api/reviewService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";
import { clearCurrentUserSnapshot, getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

const INQUIRY_TYPE_ITEMS = ["서비스 이용", "결제/정산", "계정/인증", "기타"] as const;
const PROFILE_IMAGE_STORAGE_KEY_PREFIX = "baro_profile_image_url_v2:";
const ACCOUNT_SCOPED_STORAGE_KEYS = [
  "baro_profile_image_url_v1",
  "baro_shipper_payment_methods_v1",
  "baro_driver_settlement_account_v1",
  "baro_driver_documents_status_v1",
  "baro_shipper_favorite_addresses_v1",
  "baro_local_shipper_orders_v1",
  "baro_shipper_reviewed_order_ids_v1",
  "baro_driver_extra_vehicles_v1",
] as const;

export default function AccountInquiryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useAppTheme();
  const c = t.colors;

  const [type, setType] = React.useState<(typeof INQUIRY_TYPE_ITEMS)[number]>("서비스 이용");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState(false);

  const canSubmit = title.trim().length >= 2 && content.trim().length >= 10;

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(shipper)/(tabs)/my" as any);
  }, [router]);

  React.useEffect(() => {
    let mounted = true;

    void (async () => {
      const snapshot = await getCurrentUserSnapshot().catch(() => null);
      if (!mounted || !snapshot?.email) return;
      setEmail((prev) => prev.trim() || snapshot.email);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const onSubmit = React.useCallback(async () => {
    if (submitting) return;
    if (!canSubmit) {
      Alert.alert("입력 확인", "문의 제목 2자 이상, 내용 10자 이상 입력해 주세요.");
      return;
    }

    const resolvedEmail = email.trim();
    const resolvedTitle = title.trim();
    const resolvedContent = content.trim();

    if (!resolvedEmail) {
      Alert.alert("입력 확인", "답변 받을 이메일을 입력해 주세요.");
      return;
    }

    try {
      setSubmitting(true);
      console.log("[AccountInquiryScreen.onSubmit] inquiry form:", {
        type: "DISCUSS",
        inquiryType: type,
        title: resolvedTitle,
        description: resolvedContent,
        email: resolvedEmail,
        orderId: null,
        reportType: "ETC",
      });
      await ReportService.createReport({
        type: "DISCUSS",
        orderId: null,
        reportType: "ETC",
        title: `[${type}] ${resolvedTitle}`,
        description: resolvedContent,
        email: resolvedEmail,
      });

      Alert.alert("접수 완료", "문의가 접수되었습니다. 영업일 기준 1~2일 내 답변드릴게요.", [
        {
          text: "확인",
          onPress: goBack,
        },
      ]);
    } catch (err) {
      const serverMessage =
        typeof (err as any)?.response?.data?.message === "string"
          ? (err as any).response.data.message
          : typeof (err as any)?.response?.data === "string"
            ? (err as any).response.data
            : "";
      console.error("1:1 문의 접수 실패:", (err as any)?.response?.data ?? err);
      Alert.alert("오류", serverMessage || "문의 접수에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, content, email, goBack, submitting, title, type]);

  const clearLocalAccountData = React.useCallback(async () => {
    const allKeys = await AsyncStorage.getAllKeys().catch(() => []);
    const profileImageKeys = allKeys.filter((key) => key.startsWith(PROFILE_IMAGE_STORAGE_KEY_PREFIX));
    await Promise.allSettled([
      ...ACCOUNT_SCOPED_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)),
      ...profileImageKeys.map((key) => AsyncStorage.removeItem(key)),
      clearCurrentUserSnapshot(),
      AuthService.logout(),
    ]);
  }, []);

  const doWithdraw = React.useCallback(async () => {
    if (withdrawing) return;

    try {
      setWithdrawing(true);
      await UserService.deleteUser();
      await clearLocalAccountData();

      if (Platform.OS === "web") {
        window.alert("회원 탈퇴가 처리되었습니다.");
        if (router.canDismiss()) {
          router.dismissAll();
        }
        router.replace("/(auth)/login");
        return;
      }

      Alert.alert("탈퇴 완료", "회원 탈퇴가 처리되었습니다.", [
        {
          text: "확인",
          onPress: () => {
            if (router.canDismiss()) {
              router.dismissAll();
            }
            router.replace("/(auth)/login");
          },
        },
      ]);
    } catch {
      Alert.alert("탈퇴 실패", "회원 탈퇴 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setWithdrawing(false);
    }
  }, [clearLocalAccountData, router, withdrawing]);

  const onWithdraw = React.useCallback(() => {
    if (withdrawing) return;

    if (Platform.OS === "web") {
      const first = window.confirm("회원 탈퇴를 진행할까요?");
      if (!first) return;
      const second = window.confirm("탈퇴 후에는 계정 정보가 복구되지 않을 수 있습니다. 계속할까요?");
      if (!second) return;
      void doWithdraw();
      return;
    }

    Alert.alert("회원 탈퇴", "탈퇴 후에는 계정 정보가 복구되지 않을 수 있습니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "계속",
        style: "destructive",
        onPress: () => {
          Alert.alert("회원 탈퇴", "정말로 회원 탈퇴를 진행할까요?", [
            { text: "취소", style: "cancel" },
            { text: "탈퇴", style: "destructive", onPress: () => void doWithdraw() },
          ]);
        },
      },
    ]);
  }, [doWithdraw, withdrawing]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 20, paddingTop: 14, paddingBottom: 120, gap: 14 } as ViewStyle,
        sectionTitle: {
          marginBottom: 8,
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
          minHeight: 54,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,
        rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 } as ViewStyle,
        rowIconWrap: {
          width: 28,
          height: 28,
          borderRadius: 8,
          justifyContent: "center",
          alignItems: "center",
        } as ViewStyle,
        rowLabel: { fontSize: 14, fontWeight: "800", color: c.text.primary } as TextStyle,
        rowValue: { fontSize: 13, fontWeight: "700", color: c.text.secondary } as TextStyle,
        divider: { height: 1, backgroundColor: withAlpha(c.border.default, 0.9), marginLeft: 16 } as ViewStyle,
        formCard: {
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 10,
        } as ViewStyle,
        typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as ViewStyle,
        typeChip: {
          height: 34,
          borderRadius: 17,
          borderWidth: 1,
          borderColor: c.border.default,
          paddingHorizontal: 12,
          justifyContent: "center",
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        typeChipActive: {
          borderColor: c.brand.primary,
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        typeChipText: { fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        typeChipTextActive: { color: c.brand.primary } as TextStyle,
        inputLabel: { marginTop: 6, fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        input: {
          minHeight: 44,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border.default,
          paddingHorizontal: 12,
          fontSize: 14,
          fontWeight: "700",
          color: c.text.primary,
          backgroundColor: c.bg.surface,
        } as TextStyle,
        textArea: {
          minHeight: 140,
          paddingTop: 12,
          textAlignVertical: "top",
        } as TextStyle,
        helperText: { fontSize: 12, fontWeight: "600", color: c.text.secondary } as TextStyle,
        bottomActionBar: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: c.bg.canvas,
          borderTopWidth: 1,
          borderTopColor: c.border.default,
          paddingTop: 10,
        } as ViewStyle,
        submitBtn: {
          marginHorizontal: 20,
          height: 46,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: canSubmit ? c.brand.primary : c.bg.muted,
        } as ViewStyle,
        submitBtnText: {
          color: canSubmit ? c.text.inverse : c.text.secondary,
          fontSize: 14,
          fontWeight: "800",
        } as TextStyle,
        withdrawWrap: {
          marginTop: 2,
          alignItems: "center",
        } as ViewStyle,
        withdrawText: {
          fontSize: 11,
          fontWeight: "700",
          color: withAlpha(c.text.secondary, 0.64),
          textDecorationLine: "underline",
        } as TextStyle,
      }),
    [c, canSubmit]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="1:1 문의"
        subtitle="문의 내용을 남겨주시면 빠르게 확인해 답변드릴게요."
        onPressBack={goBack}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.page}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View>
            <Text style={s.sectionTitle}>고객센터</Text>
            <View style={s.sectionCard}>
              <View style={s.row}>
                <View style={s.rowLeft}>
                  <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.brand.primary, 0.12) }]}>
                    <Ionicons name="call-outline" size={17} color={c.brand.primary} />
                  </View>
                  <Text style={s.rowLabel}>대표번호</Text>
                </View>
                <Text style={s.rowValue}>1588-0000</Text>
              </View>
              <View style={s.divider} />
              <View style={s.row}>
                <View style={s.rowLeft}>
                  <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.status.success, 0.16) }]}>
                    <Ionicons name="time-outline" size={17} color={c.status.success} />
                  </View>
                  <Text style={s.rowLabel}>운영시간</Text>
                </View>
                <Text style={s.rowValue}>평일 09:00 - 18:00</Text>
              </View>
            </View>
          </View>

          <View>
            <Text style={s.sectionTitle}>문의 작성</Text>
            <View style={s.formCard}>
              <Text style={s.inputLabel}>문의 유형</Text>
              <View style={s.typeWrap}>
                {INQUIRY_TYPE_ITEMS.map((item) => {
                  const active = item === type;
                  return (
                    <Pressable
                      key={item}
                      style={[s.typeChip, active && s.typeChipActive]}
                      onPress={() => setType(item)}
                    >
                      <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={s.inputLabel}>제목</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="문의 제목을 입력해 주세요"
                placeholderTextColor={c.text.secondary}
                style={s.input}
                maxLength={60}
              />

              <Text style={s.inputLabel}>내용</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="문의 내용을 자세히 입력해 주세요 (최소 10자)"
                placeholderTextColor={c.text.secondary}
                style={[s.input, s.textArea]}
                maxLength={1000}
                multiline
              />
              <Text style={s.helperText}>{content.trim().length}/1000</Text>

              <Text style={s.inputLabel}>답변 받을 이메일 (선택)</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor={c.text.secondary}
                style={s.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <Pressable style={s.withdrawWrap} onPress={onWithdraw} disabled={withdrawing} hitSlop={6}>
              <Text style={s.withdrawText}>{withdrawing ? "회원 탈퇴 처리 중..." : "회원 탈퇴"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.bottomActionBar, { paddingBottom: Math.max(10, insets.bottom + 6) }]}>
        <Pressable style={s.submitBtn} onPress={() => void onSubmit()} disabled={!canSubmit || submitting}>
          <Text style={s.submitBtnText}>{submitting ? "문의 접수 중..." : "문의 접수하기"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
