import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { TextField } from "@/shared/ui/form/TextField";
import { Button } from "@/shared/ui/base/Button";
import { UserService } from "@/shared/api/userService";
import { AuthService } from "@/shared/api/authService";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();

  const [email, setEmail] = useState("");
  const [isUserFound, setIsUserFound] = useState(false); // 이메일 확인 여부
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailOk = email.includes("@") && email.includes(".");
  const pwOk = pw.length >= 8;
  const pwMatch = pw.length > 0 && pw === pw2;
  const canSubmit = isUserFound && pwOk && pwMatch && !submitting;

  // 1. 이메일 존재 여부 확인 (checkNickname 로직 응용)
  const onCheckEmail = async () => {
    if (!emailOk) return Alert.alert("확인", "올바른 이메일 형식을 입력해주세요.");

    try {
      setSubmitting(true);
      // 백엔드의 checkNickname이 이메일 중복 체크도 겸한다면 이를 활용
      const isDuplicated = await UserService.checkNickname(email);
      
      if (isDuplicated) {
        // 중복됨 = 가입된 계정이 있음
        setIsUserFound(true);
        Alert.alert("확인 완료", "계정이 확인되었습니다. 새 비밀번호를 입력하세요.");
      } else {
        Alert.alert("알림", "가입되지 않은 이메일입니다.");
        setIsUserFound(false);
      }
    } catch (e) {
      Alert.alert("오류", "사용자 확인 중 문제가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. 비밀번호 즉시 변경
  const onSubmit = async () => {
    if (!canSubmit) return;

    // try {
    //   setSubmitting(true);
    //   // 인증코드 없이 이메일과 새 비번만 보내는 별도 API가 필요할 수 있습니다.
    //   // 여기서는 기존 메서드 형식을 빌려 쓰되 코드는 빈 값이나 특정 더미값을 보낸다고 가정합니다.
    //   await AuthService.resetPasswordWithCode({
    //     email: email.trim().toLowerCase(),
    //     code: "NONE", // 인증 생략용 더미 코드
    //     newPassword: pw,
    //   });

    //   Alert.alert("성공", "비밀번호가 변경되었습니다.");
    //   router.replace("/(auth)/login");
    // } catch (e) {
    //   Alert.alert("오류", "비밀번호 변경에 실패했습니다.");
    // } finally {
    //   setSubmitting(false);
    // }
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
                onChangeText={(v) => { setEmail(v); setIsUserFound(false); }}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isUserFound}
              />
            </View>
            <Pressable 
              style={[s.checkBtn, isUserFound && { backgroundColor: c.brand.primary }]} 
              onPress={onCheckEmail}
              disabled={isUserFound || submitting}
            >
              <Text style={{ color: isUserFound ? "#fff" : c.text.primary, fontWeight: "800" }}>
                {isUserFound ? "확인됨" : "계정확인"}
              </Text>
            </Pressable>
          </View>

          {/* 계정이 확인된 경우에만 비번 입력창 노출 */}
          {isUserFound && (
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
    marginLeft: 10, 
    width: 80, 
    height: 56, 
    backgroundColor: "#F1F5F9", 
    borderRadius: 12, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  bottomBar: { padding: 18, borderTopWidth: 1, borderTopColor: "#F1F5F9" }
});