import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { TextField } from "@/shared/ui/form/TextField";
import { Button } from "@/shared/ui/base/Button";
import { AuthService } from "@/shared/api/authService";

export default function FindEmailScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  // 휴대폰 인증 관련 상태
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // 결과 상태
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. 인증번호 요청 (Mock)
  const onRequestOtp = () => {
    if (phone.length < 10) return Alert.alert("알림", "휴대폰 번호를 올바르게 입력해주세요.");
    setOtpRequested(true);
    setPhoneVerified(false);
    Alert.alert("인증번호 발송", "인증번호가 발송되었습니다.\n(테스트용: 123456)");
  };

  // 2. 인증번호 확인 (Mock)
  const onVerifyOtp = () => {
    if (otpInput === "123456") {
      setPhoneVerified(true);
      Alert.alert("성공", "휴대폰 인증이 완료되었습니다.");
    } else {
      Alert.alert("실패", "인증번호가 올바르지 않습니다.");
    }
  };

  // 3. 이메일 찾기 실행
  const onFindEmail = async () => {
    if (!name || !phoneVerified) return;
    
    try {
      setLoading(true);
      const email = await AuthService.findEmail(name, phone);
      setFoundEmail(email);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || "일치하는 회원 정보를 찾을 수 없습니다.";
      Alert.alert("오류", msg);
    } finally {
      setLoading(false);
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
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}>
          <Text style={s.title}>이메일 찾기</Text>
          <Text style={s.subtitle}>가입 시 등록한 이름과 휴대폰 번호를 입력해주세요.</Text>

          {!foundEmail ? (
            <View style={{ marginTop: 30, gap: 16 }}>
              <View>
                <Text style={s.label}>이름</Text>
                <TextField
                  value={name}
                  onChangeText={setName}
                  placeholder="실명 입력"
                />
              </View>

              <View>
                <Text style={s.label}>휴대폰 번호</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      value={phone}
                      onChangeText={(v) => { setPhone(v); setOtpRequested(false); setPhoneVerified(false); }}
                      placeholder="숫자만 입력"
                      keyboardType="number-pad"
                      editable={!otpRequested && !phoneVerified}
                    />
                  </View>
                  <Pressable 
                    style={[s.smallBtn, { borderColor: c.border.default }]}
                    onPress={onRequestOtp}
                    disabled={otpRequested || phoneVerified}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.text.primary }}>인증요청</Text>
                  </Pressable>
                </View>
              </View>

              {otpRequested && !phoneVerified && (
                <View>
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
                    <Pressable 
                      style={[s.smallBtn, { backgroundColor: c.brand.primary, borderColor: c.brand.primary }]}
                      onPress={onVerifyOtp}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>확인</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={{ marginTop: 40, alignItems: "center", padding: 20, backgroundColor: c.bg.muted, borderRadius: 16 }}>
              <Ionicons name="mail-outline" size={48} color={c.brand.primary} />
              <Text style={{ marginTop: 16, fontSize: 16, fontWeight: "700", color: c.text.secondary }}>회원님의 이메일은</Text>
              <Text style={{ marginTop: 8, fontSize: 20, fontWeight: "900", color: c.text.primary }}>{foundEmail}</Text>
              <Text style={{ marginTop: 8, fontSize: 16, fontWeight: "700", color: c.text.secondary }}>입니다.</Text>
            </View>
          )}
        </ScrollView>

        <View style={s.bottomBar}>
          {!foundEmail ? (
            <Button
              title="이메일 찾기"
              disabled={!name || !phoneVerified}
              loading={loading}
              onPress={onFindEmail}
            />
          ) : (
            <View style={{ gap: 10 }}>
              <Button title="로그인하러 가기" onPress={() => router.replace("/(auth)/login")} />
              <Button title="비밀번호 찾기" variant="outline" onPress={() => router.push("/(auth)/reset-password")} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 8 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 6, color: "#64748B" },
  smallBtn: { height: 56, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  bottomBar: { padding: 18, borderTopWidth: 1, borderTopColor: "#F1F5F9" }
});