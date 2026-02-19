import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { TextField } from "@/shared/ui/form/TextField";
import { Button } from "@/shared/ui/base/Button";
import { UserService } from "@/shared/api/userService";
import { AuthService } from "@/shared/api/authService";
import { saveCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

const ROUTES = {
  signup: "/(auth)/signup" as const,
  resetPw: "/(auth)/reset-password" as const,
  shipperTabs: "/(shipper)/(tabs)" as const,
  driverTabs: "/(driver)/(tabs)" as const,
};

export default function LoginScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [autoLogin, setAutoLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canLogin = email.trim().length > 0 && pw.trim().length > 0 && !submitting;

  const showError = (msg: string) => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert("로그인 실패", msg);
  };

  const onLogin = async () => {
    if (!canLogin || submitting) return;

    setSubmitting(true);
    try {
      await AuthService.login(email, pw);
      const me = await UserService.getMyInfo();

      void saveCurrentUserSnapshot({
        email: me.email,
        nickname: me.nickname,
        role: me.role,
      }).catch(() => {});

      if (me.role === "DRIVER") {
        router.replace(ROUTES.driverTabs);
      } else if (me.role === "SHIPPER") {
        router.replace(ROUTES.shipperTabs);
      } else {
        throw new Error("정의되지 않은 사용자 권한입니다.");
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.response?.data?.message || "로그인 정보를 확인해주세요.";
      showError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: c.bg.surface }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <View style={s.container}>
            <View style={s.brandWrap}>
              <Text style={[s.brandTitle, { color: c.brand.primary }]}>Baro Truck</Text>
              <Text style={[s.brandSubtitle, { color: c.text.secondary }]}>빠르고 간편한 화물 배차를 시작하세요</Text>
            </View>

            <View style={{ height: 14 }} />

            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitting}
              inputWrapStyle={[
                s.inputWrap,
                { backgroundColor: c.bg.surface, borderColor: c.border.default },
              ]}
              inputStyle={s.tfInput}
            />

            <View style={{ height: 12 }} />

            <TextField
              value={pw}
              onChangeText={setPw}
              placeholder="비밀번호"
              secureTextEntry
              autoCapitalize="none"
              editable={!submitting}
              inputWrapStyle={[
                s.inputWrap,
                { backgroundColor: c.bg.surface, borderColor: c.border.default },
              ]}
              inputStyle={s.tfInput}
            />

            <View style={s.row}>
              <Pressable onPress={() => setAutoLogin((v) => !v)} style={s.checkboxRow} disabled={submitting}>
                <View style={[s.checkboxBox, { borderColor: c.border.default }]}>
                  {autoLogin && <Ionicons name="checkmark" size={16} color={c.brand.primary} />}
                </View>
                <Text style={[s.checkboxLabel, { color: c.text.primary }]}>자동 로그인</Text>
              </Pressable>

              <Pressable onPress={() => router.push(ROUTES.resetPw)} disabled={submitting}>
                <Text style={[s.link, { color: c.text.secondary }]}>비밀번호 찾기</Text>
              </Pressable>
            </View>

            <Button
              title={submitting ? "로그인 중..." : "로그인"}
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canLogin || submitting}
              loading={submitting}
              onPress={onLogin}
              style={s.loginBtn}
            />

            <View style={s.bottom}>
              <Text style={[s.bottomText, { color: c.text.secondary }]}>아직 계정이 없으신가요?</Text>
              <Pressable onPress={() => router.push(ROUTES.signup)} disabled={submitting}>
                <Text style={[s.bottomLink, { color: c.brand.primary }]}>회원가입</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 28,
    alignItems: "center",
  },
  container: { width: "100%", maxWidth: 520 },

  brandWrap: { alignItems: "center", marginTop: 16, marginBottom: 18 },
  brandTitle: { fontSize: 42, fontWeight: "900", letterSpacing: -0.4 },
  brandSubtitle: { marginTop: 10, fontSize: 16, fontWeight: "700" },

  inputWrap: {
    borderRadius: 18,
    paddingHorizontal: 18,
    minHeight: 60,
    borderWidth: 1,
  },
  tfInput: { fontSize: 18, fontWeight: "800", paddingVertical: 0 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 18,
  },
  checkboxRow: { flexDirection: "row", alignItems: "center" },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxLabel: { fontSize: 16, fontWeight: "700" },
  link: { fontSize: 16, fontWeight: "700", textDecorationLine: "underline" },

  bottom: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomText: { fontSize: 16, fontWeight: "700" },
  bottomLink: { marginLeft: 10, fontSize: 16, fontWeight: "900", textDecorationLine: "underline" },

  loginBtn: {
    height: 64,
    borderRadius: 18,
    marginTop: 20,
  },
});
