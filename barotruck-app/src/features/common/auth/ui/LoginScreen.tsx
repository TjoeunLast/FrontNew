import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthService } from "@/shared/api/authService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { TextField } from "@/shared/ui/form/TextField";
import { saveCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

const ROUTES = {
  signup: "/(auth)/signup" as const,
  findEmail: "/(auth)/find-email" as const,
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

  const canLogin =
    email.trim().length > 0 && pw.trim().length > 0 && !submitting;

  const showError = (msg: string) => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert("로그인 실패", msg);
  };

  const executeLogin = async (nextEmail: string, nextPw: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await AuthService.login(nextEmail, nextPw);
      const me = (await UserService.getMyInfo()) as any;

      void saveCurrentUserSnapshot({
        email: me.email,
        nickname: me.nickname,
        role: me.role,
        level: Number.isFinite(Number(me.level ?? me.user_level))
          ? Number(me.level ?? me.user_level)
          : undefined,
        gender: me.gender ?? me.sex,
        age: Number.isFinite(Number(me.age)) ? Number(me.age) : undefined,
        birthDate:
          String(
            me.birthDate ??
              me.birthday ??
              me.birth ??
              me.dateOfBirth ??
              me.dob ??
              "",
          ).trim() || undefined,
      }).catch(() => {});

      if (me.role === "DRIVER") {
        router.replace(ROUTES.driverTabs);
      } else if (me.role === "SHIPPER") {
        router.replace(ROUTES.shipperTabs);
      } else {
        throw new Error("정의되지 않은 사용자 권한입니다.");
      }
    } catch (e: any) {
      const errorMsg =
        e.response?.data?.error ||
        e.response?.data?.message ||
        "로그인 정보를 확인해주세요.";
      showError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const onLogin = async () => {
    if (!canLogin || submitting) return;
    await executeLogin(email, pw);
  };

  return (
    <SafeAreaView
      style={[s.screen, { backgroundColor: c.bg.surface }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <View style={s.container}>
            {/* 상단 폼 영역 */}
            <View style={s.formArea}>
              <View style={s.brandWrap}>
                <Image
                  source={require("../../../../../assets/images/logo-text.png")}
                  style={s.iconImage}
                  resizeMode="contain"
                />
                <Text style={[s.brandSubtitle, { color: c.text.secondary }]}>
                  빠르고 간편한 화물 배차를 시작하세요
                </Text>
              </View>

              <View style={{ height: 32 }} />

              <TextField
                value={email}
                onChangeText={setEmail}
                placeholder="이메일"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!submitting}
                inputWrapStyle={[
                  s.inputWrap,
                  {
                    backgroundColor: c.bg.surface,
                    borderColor: c.border.default,
                  },
                ]}
                inputStyle={s.tfInput}
              />

              <View style={{ height: 16 }} />

              <TextField
                value={pw}
                onChangeText={setPw}
                placeholder="비밀번호"
                secureTextEntry
                autoCapitalize="none"
                editable={!submitting}
                inputWrapStyle={[
                  s.inputWrap,
                  {
                    backgroundColor: c.bg.surface,
                    borderColor: c.border.default,
                  },
                ]}
                inputStyle={s.tfInput}
              />

              <View style={s.row}>
                <Pressable
                  onPress={() => setAutoLogin((v) => !v)}
                  style={s.checkboxRow}
                  disabled={submitting}
                >
                  <View
                    style={[
                      s.checkboxBox,
                      {
                        borderColor: autoLogin
                          ? c.brand.primary
                          : c.border.default,
                        backgroundColor: autoLogin
                          ? c.brand.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {autoLogin && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={[s.checkboxLabel, { color: c.text.primary }]}>
                    자동 로그인
                  </Text>
                </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    onPress={() => router.push(ROUTES.findEmail)}
                    disabled={submitting}
                  >
                    <Text style={[s.link, { color: c.text.secondary }]}>
                      이메일 찾기
                    </Text>
                  </Pressable>
                  <Text
                    style={{ marginHorizontal: 8, color: c.border.default }}
                  >
                    |
                  </Text>
                  <Pressable
                    onPress={() => router.push(ROUTES.resetPw)}
                    disabled={submitting}
                  >
                    <Text style={[s.link, { color: c.text.secondary }]}>
                      비밀번호 찾기
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ height: 16 }} />

              <Button
                title={submitting ? "로그인 중..." : "로그인"}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canLogin || submitting}
                loading={submitting}
                onPress={onLogin}
                style={[s.loginBtn, !canLogin && s.disabledBtn]}
              />
            </View>

            {/* 하단 회원가입 영역 */}
            <View style={s.bottom}>
              <Text style={[s.bottomText, { color: c.text.secondary }]}>
                아직 계정이 없으신가요?
              </Text>
              <Pressable
                onPress={() => router.push(ROUTES.signup)}
                disabled={submitting}
              >
                <Text style={[s.bottomLink, { color: c.brand.primary }]}>
                  회원가입
                </Text>
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
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 400,
    minHeight: "70%",
    justifyContent: "space-between",
    paddingVertical: 40,
  },
  iconImage: {
    height: 40,
  },
  formArea: {
    width: "100%",
    justifyContent: "center",
  },

  brandWrap: { alignItems: "center", marginBottom: 16 },
  brandTitle: { fontSize: 44, fontWeight: "900", letterSpacing: -0.5 },
  brandSubtitle: { marginTop: 12, fontSize: 15, fontWeight: "600" },

  inputWrap: {
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    borderWidth: 1.5,
  },
  tfInput: { fontSize: 16, fontWeight: "600", paddingVertical: 0 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxLabel: { fontSize: 14, fontWeight: "600" },
  link: { fontSize: 13, fontWeight: "600" },

  loginBtn: {
    height: 60,
    borderRadius: 12,
  },
  disabledBtn: {
    opacity: 0.6,
  },

  bottom: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  bottomText: { fontSize: 15, fontWeight: "500" },
  bottomLink: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
