import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { TextField } from "@/shared/ui/form/TextField";
import { Button } from "@/shared/ui/base/Button";
import { AuthService } from "@/shared/api/authService";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();

  const [email, setEmail] = useState("");
  
  // 이메일 인증 관련 상태
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailOk = email.includes("@") && email.includes(".");
  const pwOk = pw.length >= 8;
  const pwMatch = pw.length > 0 && pw === pw2;
  const canSubmit = otpVerified && pwOk && pwMatch && !submitting;

  // 1. 이메일로 인증번호 발송
  const onSendAuthCode = async () => {
    if (!emailOk) return Alert.alert("확인", "올바른 이메일 형식을 입력해주세요.");

    try {
      setSubmitting(true);
      await AuthService.requestEmailAuth(email);
      
      Alert.alert("전송 완료", "입력하신 이메일로 인증번호를 보냈습니다.");
      setOtpSent(true);
      setOtpVerified(false);
      setOtpInput("");
    } catch (e) {
      Alert.alert("오류", "인증번호 전송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. 인증번호 검증
  const onVerifyAuthCode = async () => {
    if (otpInput.length < 6) return Alert.alert("확인", "인증번호 6자리를 입력해주세요.");
    
    try {
      setSubmitting(true);
      const isVerified = await AuthService.verifyEmailCode(email, otpInput);
      
      if (isVerified) {
        setOtpVerified(true);
        Alert.alert("인증 성공", "인증되었습니다. 새 비밀번호를 입력해주세요.");
      } else {
        Alert.alert("인증 실패", "인증번호가 올바르지 않습니다.");
      }
    } catch (e) {
      Alert.alert("오류", "인증 확인 중 문제가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. 비밀번호 변경 요청
  const onSubmit = async () => {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      await AuthService.resetPassword({ email, code: otpInput, newPassword: pw });

      Alert.alert("성공", "비밀번호가 변경되었습니다.\n로그인해주세요.", [
        { text: "확인", onPress: () => router.replace("/(auth)/login") }
      ]);
    } catch (e) {
      Alert.alert("오류", "비밀번호 변경에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.surface }} edges={["top", "bottom"]}>
      <View style={{ padding: 18 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={26} color={c.text.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 100 }}>
          <Text style={s.title}>비밀번호 재설정</Text>
          <Text style={s.subtitle}>가입하신 이메일을 입력하여 비밀번호를 변경하세요.</Text>

          <View style={{ height: 24 }} />

          <Text style={s.label}>이메일 주소</Text>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              <TextField
                value={email}
                onChangeText={(v) => { 
                  setEmail(v); 
                  setOtpSent(false); 
                  setOtpVerified(false); 
                }}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!otpVerified && !submitting}
              />
            </View>
            <Pressable 
              style={[s.checkBtn, otpSent && { backgroundColor: "#fff", borderWidth: 1, borderColor: c.border.default }]} 
              onPress={onSendAuthCode}
              disabled={otpVerified || submitting}
            >
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 14 }}>
                {otpSent ? "재전송" : "인증요청"}
              </Text>
            </Pressable>
          </View>

          {/* 인증번호 입력 (발송됨 && 미인증 상태) */}
          {otpSent && !otpVerified && (
            <View style={{ marginTop: 12 }}>
              <Text style={s.label}>인증번호</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    value={otpInput}
                    onChangeText={setOtpInput}
                    placeholder="인증번호 6자리"
                    keyboardType="number-pad"
                  />
                </View>
                <Pressable style={[s.checkBtn, { backgroundColor: c.brand.primary }]} onPress={onVerifyAuthCode}>
                  <Text style={{ color: "#fff", fontWeight: "800" }}>확인</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* 인증 완료 시 비밀번호 입력창 노출 */}
          {otpVerified && (
            <View style={{ marginTop: 24 }}>
              <Text style={s.label}>새 비밀번호</Text>
              <TextField
                value={pw}
                onChangeText={setPw}
                placeholder="8자리 이상"
                secureTextEntry
              />
              <View style={{ height: 12 }} />
              <Text style={s.label}>새 비밀번호 확인</Text>
              <TextField
                value={pw2}
                onChangeText={setPw2}
                placeholder="다시 한번 입력"
                secureTextEntry
              />
            </View>
          )}
        </ScrollView>

        <View style={s.bottomBar}>
          <Button
            title="비밀번호 변경하기"
            disabled={!canSubmit}
            loading={submitting}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 8 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  checkBtn: { 
    marginLeft: 8, 
    width: 80, 
    height: 56, 
    backgroundColor: "#F1F5F9", 
    borderRadius: 12, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  bottomBar: { padding: 18, borderTopWidth: 1, borderTopColor: "#F1F5F9" }
});