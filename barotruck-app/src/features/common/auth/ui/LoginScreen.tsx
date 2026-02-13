// srv/festures/commen/auth//ui/Loginscrean.tsx
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

const MOCK = {
  shipper: { email: "shipper@barotruck.com", password: "12341234", name: "바로화주", role: "SHIPPER" as const },
  driver: { email: "driver@barotruck.com", password: "12341234", name: "바로기사", role: "DRIVER" as const },
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
    if (submitting) return;
  if (!canLogin) return;

  setSubmitting(true);
  try {
    console.log("로그인 시도:", { email, pw });
    // 1. 실제 로그인 수행 (토큰 저장까지 자동 처리됨)
    await AuthService.login(email, pw);

    console.log("로그인 성공, 사용자 정보 조회 중...");
    // 2. 로그인한 유저의 정보(Role 등) 가져오기
    const me = await UserService.getMyInfo();

    console.log("사용자 정보 조회 성공:", me);
    await saveCurrentUserSnapshot({
      email: me.email,
      nickname: me.nickname,
      role: me.role,
    });

    console.log("사용자 정보 저장 완료, 역할에 따른 화면 전환 시도...");
    
    // 3. 역할(Role)에 따른 화면 전환
    if (me.role === "DRIVER") {
      router.replace("/(driver)/(tabs)");
    } else if (me.role === "SHIPPER") {
      router.replace("/(shipper)/(tabs)");
    } else {
      throw new Error("정의되지 않은 사용자 권한입니다.");
    }
    console.log("화면 전환 완료.");

  } catch (e: any) {
    // 서버 에러 메시지 처리
    const errorMsg = e.response?.data?.error || e.response?.data?.message || "로그인 정보를 확인해주세요.";  
    showError(errorMsg);
  } finally {
    setSubmitting(false);
  }
};


return (
  <SafeAreaView style={[s.screen, { backgroundColor: c.bg.surface }]} edges={["top", "bottom"]}>
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
          {/* 로고 섹션 */}
          <View style={s.brandWrap}>
            <Text style={[s.brandTitle, { color: c.brand.primary }]}>Baro Truck</Text>
            <Text style={[s.brandSubtitle, { color: c.text.secondary }]}>
              빠르고 간편한 화물 배차의 시작
            </Text>
          </View>

          <View style={{ height: 14 }} />

          {/* 이메일 입력 */}
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="이메일"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!submitting} // 로딩 중 수정 불가
            inputWrapStyle={[
              s.inputWrap,
              { backgroundColor: c.bg.surface, borderColor: c.border.default },
            ]}
            inputStyle={s.tfInput}
          />

          <View style={{ height: 12 }} />

          {/* 비밀번호 입력 */}
          <TextField
            value={pw}
            onChangeText={setPw}
            placeholder="비밀번호"
            secureTextEntry
            autoCapitalize="none"
            editable={!submitting} // 로딩 중 수정 불가
            inputWrapStyle={[
              s.inputWrap,
              { backgroundColor: c.bg.surface, borderColor: c.border.default },
            ]}
            inputStyle={s.tfInput}
          />

          {/* 유틸리티 행 (자동로그인/비번찾기) */}
          <View style={s.row}>
            <Pressable 
              onPress={() => setAutoLogin((v) => !v)} 
              style={s.checkboxRow} 
              disabled={submitting}
            >
              <View style={[s.checkboxBox, { borderColor: c.border.default }]}>
                {autoLogin && <Ionicons name="checkmark" size={16} color={c.brand.primary} />}
              </View>
              <Text style={[s.checkboxLabel, { color: c.text.primary }]}>자동 로그인</Text>
            </Pressable>

            <Pressable onPress={() => router.push(ROUTES.resetPw)} disabled={submitting}>
              <Text style={[s.link, { color: c.text.secondary }]}>비밀번호 찾기</Text>
            </Pressable>
          </View>

          {/* 로그인 버튼 */}
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

          {/* 회원가입 유도 */}
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

  mockRow: { flexDirection: "row", width: "100%" },
  mockBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mockText: { fontSize: 14, fontWeight: "900" },

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

  // [추가] 로그인 버튼 스타일 (Cannot find name 'loginBtn' 해결)
  loginBtn: {
    height: 64,
    borderRadius: 18,
    marginTop: 20, // 버튼 간격 조정
    // 그림자 등 추가 스타일이 필요하면 여기에 작성하세요.
  },
});
