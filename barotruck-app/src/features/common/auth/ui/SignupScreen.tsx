import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { smsService } from "@/shared/api/smsService";
import { Button } from "@/shared/ui/base/Button";
import { TextField } from "@/shared/ui/form/TextField";
import { withAlpha } from "@/shared/utils/color";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type Role = "shipper" | "driver";
type Step = "role" | "account";
type Gender = "M" | "F";

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}
function isEmailLike(v: string) {
  const x = normalizeEmail(v);
  return x.includes("@") && x.includes(".");
}
function digitsOnly(v: string) {
  return v.replace(/[^0-9]/g, "");
}
function isPhoneLike(v: string) {
  return digitsOnly(v).length >= 10;
}
function parseBirthDate(v: string) {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(digitsOnly(v).slice(0, 8));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d)
    return null;
  return { y, mo, d };
}
function showMsg(title: string, msg: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}

export default function SignupScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDate, setBirthDate] = useState("");

  const [otpRequested, setOtpRequested] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (otpRequested && !phoneVerified) {
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [otpRequested, phoneVerified]);

  const onEditPhone = () => {
    setPhoneVerified(false);
    setOtpRequested(false);
    setOtpInput("");
  };

  const onRequestOtp = async () => {
    if (requestingOtp || verifyingOtp) return;
    if (!phoneFormatOk) {
      showMsg("휴대폰 확인", "휴대폰 번호를 확인해주세요.");
      return;
    }
    try {
      setRequestingOtp(true);
      const ok = await smsService.requestSmsCode(phone);
      if (!ok) {
        showMsg("인증요청 실패", "인증번호 전송에 실패했습니다. 다시 시도해주세요.");
        return;
      }
      setOtpRequested(true);
      setOtpInput("");
      setPhoneVerified(false);
      showMsg("인증요청 완료", "입력한 휴대폰 번호로 인증번호를 전송했습니다.");
    } catch (e: any) {
      const message =
        e?.response?.data?.message ?? "인증번호 요청 중 문제가 발생했습니다.";
      showMsg("오류", message);
    } finally {
      setRequestingOtp(false);
    }
  };

  const onChangeEmail = (v: string) => {
    setEmail(v);
  };
  const onChangePhone = (v: string) => {
    setPhone(v);
    setPhoneVerified(false);
    setOtpRequested(false);
    setOtpInput("");
  };

  const goBack = () => {
    if (step === "account") {
      setStep("role");
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const chooseRole = (r: Role) => {
    setRole(r);
    setStep("account");
  };

  const emailFormatOk = isEmailLike(email);
  const pwOk = pw.length >= 8;
  const pwMatch = pw.length > 0 && pw2.length > 0 && pw === pw2;
  const nameOk = name.trim().length > 0;
  const phoneFormatOk = isPhoneLike(phone);
  const birthDateOk = parseBirthDate(birthDate) !== null;
  const genderOk = gender !== null;

  const canNext =
    !!role &&
    emailFormatOk &&
    pwOk &&
    pwMatch &&
    nameOk &&
    phoneFormatOk &&
    genderOk &&
    birthDateOk &&
    phoneVerified;

  const onVerifyOtp = async () => {
    if (!otpRequested || requestingOtp || verifyingOtp) return;
    const trimmedCode = otpInput.trim();
    if (trimmedCode.length !== 6) {
      showMsg("입력 확인", "인증번호 6자리를 입력해주세요.");
      return;
    }
    try {
      setVerifyingOtp(true);
      const ok = await smsService.verifySmsCode(phone, trimmedCode);
      if (!ok) {
        setPhoneVerified(false);
        showMsg("인증 실패", "인증번호가 올바르지 않아요.");
        return;
      }
      setPhoneVerified(true);
      showMsg("인증 완료", "휴대폰 인증이 완료됐어요.");
    } catch (e: any) {
      const message =
        e?.response?.data?.message ?? "인증 확인 중 문제가 발생했습니다.";
      showMsg("오류", message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const onNext = () => {
    if (!role) return;
    if (!canNext) {
      showMsg("입력 확인", "필수 입력/인증이 완료됐는지 확인해주세요.");
      return;
    }

    const signupData = {
      email: normalizeEmail(email),
      password: pw,
      name: name.trim(),
      phone: digitsOnly(phone),
      role: role,
      gender: gender!,
      birthDate: birthDate.trim(),
    };

    router.push({
      pathname:
        role === "shipper" ? "/(auth)/signup-shipper" : "/(auth)/signup-driver",
      params: signupData,
    });
  };

  const s = getStyles(c);

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable onPress={goBack} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={26} color={c.text.primary} />
        </Pressable>
      </View>

      {step === "role" ? (
        <>
          <View style={s.titleWrap}>
            <Text style={s.title}>반갑습니다!{"\n"}어떤 분이신가요?</Text>
            <Text style={s.subtitle}>서비스 이용 목적을 선택해주세요.</Text>
          </View>

          <View style={s.cardList}>
            <Pressable
              onPress={() => chooseRole("shipper")}
              style={({ pressed }) => [
                s.roleCard,
                role === "shipper" && s.roleCardActive,
                pressed && { backgroundColor: c.bg.muted },
              ]}
            >
              <View
                style={[
                  s.roleIconCircle,
                  role === "shipper" && { borderColor: c.brand.primary },
                ]}
              >
                <Ionicons
                  name="cube-outline"
                  size={24}
                  color={role === "shipper" ? c.brand.primary : c.text.primary}
                />
              </View>
              <View style={s.roleTextWrap}>
                <Text style={s.roleTitle}>화주 (보내는 분)</Text>
                <Text style={s.roleDesc}>화물을 등록하고 배차를 요청해요</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={role === "shipper" ? c.brand.primary : c.text.secondary}
              />
            </Pressable>

            <Pressable
              onPress={() => chooseRole("driver")}
              style={({ pressed }) => [
                s.roleCard,
                role === "driver" && s.roleCardActive,
                pressed && { backgroundColor: c.bg.muted },
              ]}
            >
              <View
                style={[
                  s.roleIconCircle,
                  role === "driver" && { borderColor: c.brand.primary },
                ]}
              >
                <Ionicons
                  name="car-outline"
                  size={24}
                  color={role === "driver" ? c.brand.primary : c.text.primary}
                />
              </View>
              <View style={s.roleTextWrap}>
                <Text style={s.roleTitle}>차주 (기사님)</Text>
                <Text style={s.roleDesc}>오더를 수행하고 수익을 내요</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={role === "driver" ? c.brand.primary : c.text.secondary}
              />
            </Pressable>
          </View>
        </>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.form}
          >
            <View style={{ marginBottom: 24 }}>
              <Text style={s.title}>계정 정보를{"\n"}입력해주세요.</Text>
              {/* <Text style={s.subtitle}>로그인과 연락에 사용됩니다.</Text> */}
            </View>

            <Text style={s.label}>이메일 (아이디)</Text>
            <TextField
              value={email}
              onChangeText={onChangeEmail}
              placeholder="example@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              inputWrapStyle={[
                s.tfWrap,
                email.length > 0 && emailFormatOk && s.tfWrapSuccess,
              ]}
              inputStyle={s.tfInput}
              errorText={
                email.length > 0 && !emailFormatOk
                  ? "이메일 형식을 확인해주세요."
                  : undefined
              }
            />

            <View style={{ height: 20 }} />

            <Text style={s.label}>비밀번호</Text>
            <TextField
              value={pw}
              onChangeText={setPw}
              placeholder="8자리 이상 입력"
              secureTextEntry
              autoCapitalize="none"
              inputWrapStyle={[
                s.tfWrap,
                pw.length > 0 && pwOk && s.tfWrapSuccess,
              ]}
              inputStyle={s.tfInput}
              errorText={
                pw.length > 0 && !pwOk
                  ? "비밀번호는 8자리 이상이어야 해요."
                  : undefined
              }
            />

            <View style={{ height: 20 }} />

            <Text style={s.label}>비밀번호 확인</Text>
            <TextField
              value={pw2}
              onChangeText={setPw2}
              placeholder="한 번 더 입력"
              secureTextEntry
              autoCapitalize="none"
              inputWrapStyle={[
                s.tfWrap,
                pw2.length > 0 && pwMatch && s.tfWrapSuccess,
              ]}
              inputStyle={s.tfInput}
              errorText={
                pw2.length > 0 && !pwMatch
                  ? "비밀번호가 일치하지 않아요."
                  : undefined
              }
            />

            <View style={{ height: 24 }} />

            <Text style={s.label}>이름</Text>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="실명 입력"
              autoCapitalize="none"
              inputWrapStyle={[s.tfWrap, nameOk && s.tfWrapSuccess]}
              inputStyle={s.tfInput}
            />

            <View style={{ height: 24 }} />

            <Text style={s.label}>성별</Text>
            <View style={s.row}>
              <Pressable
                onPress={() => setGender("M")}
                style={[s.genderBtn, gender === "M" && s.genderBtnActive]}
              >
                <Text
                  style={[
                    s.genderBtnText,
                    gender === "M" && s.genderBtnTextActive,
                  ]}
                >
                  남성
                </Text>
              </Pressable>
              <View style={s.rowGap} />
              <Pressable
                onPress={() => setGender("F")}
                style={[s.genderBtn, gender === "F" && s.genderBtnActive]}
              >
                <Text
                  style={[
                    s.genderBtnText,
                    gender === "F" && s.genderBtnTextActive,
                  ]}
                >
                  여성
                </Text>
              </Pressable>
            </View>

            <View style={{ height: 24 }} />

            <Text style={s.label}>생년월일</Text>
            <TextField
              value={birthDate}
              onChangeText={(v) => setBirthDate(digitsOnly(v).slice(0, 8))}
              placeholder="YYYYMMDD (예: 19900101)"
              keyboardType="number-pad"
              inputWrapStyle={[s.tfWrap, birthDateOk && s.tfWrapSuccess]}
              inputStyle={s.tfInput}
              errorText={
                birthDate.length > 0 && !birthDateOk
                  ? "YYYYMMDD 숫자 8자리를 입력해주세요."
                  : undefined
              }
            />

            <View style={{ height: 24 }} />

            <Text style={s.label}>휴대폰 번호</Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={phone}
                  onChangeText={onChangePhone}
                  placeholder="010-1234-5678"
                  keyboardType="phone-pad"
                  inputWrapStyle={[
                    s.tfWrap,
                    phoneFormatOk && !phoneVerified && s.tfWrapSuccess,
                    phoneVerified && { borderColor: c.status.success },
                  ]}
                  editable={(!otpRequested || phoneVerified) && !requestingOtp && !verifyingOtp}
                  inputStyle={s.tfInput}
                  errorText={
                    phone.length > 0 && !phoneFormatOk
                      ? "휴대폰 번호를 확인해주세요."
                      : undefined
                  }
                />
              </View>
              <View style={s.rowGap} />
                <Pressable
                  style={[
                    s.miniBtn,
                    phoneVerified && s.miniBtnVerified,
                    ((otpRequested ? phoneVerified : !phoneFormatOk || phoneVerified) ||
                      requestingOtp ||
                      verifyingOtp) && { opacity: 0.6 },
                  ]}
                  onPress={
                    otpRequested && !phoneVerified
                      ? onEditPhone
                      : () => void onRequestOtp()
                  }
                  disabled={
                    (otpRequested ? phoneVerified : !phoneFormatOk || phoneVerified) ||
                    requestingOtp ||
                    verifyingOtp
                  }
                >
                  <Text
                    style={[
                      s.miniBtnText,
                      phoneVerified && s.miniBtnTextVerified,
                    ]}
                  >
                    {requestingOtp
                      ? "요청중..."
                      : phoneVerified
                        ? "인증완료"
                        : otpRequested
                          ? "번호수정"
                          : "인증요청"}
                  </Text>
                </Pressable>
              </View>

            {otpRequested && !phoneVerified ? (
              <View style={s.otpBox}>
                <Text style={s.label}>인증번호 입력</Text>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      ref={otpInputRef}
                      value={otpInput}
                      onChangeText={setOtpInput}
                      placeholder="6자리 숫자"
                      keyboardType="number-pad"
                      editable={!verifyingOtp}
                      inputWrapStyle={[
                        s.tfWrap,
                        otpInput.trim().length === 6 && s.tfWrapSuccess,
                      ]}
                      inputStyle={s.tfInput}
                    />
                  </View>
                  <View style={s.rowGap} />
                  <Pressable
                    style={[
                      s.miniBtn,
                      s.miniBtnActive,
                      (otpInput.trim().length !== 6 || requestingOtp || verifyingOtp) && { opacity: 0.5 },
                    ]}
                    onPress={() => void onVerifyOtp()}
                    disabled={otpInput.trim().length !== 6 || requestingOtp || verifyingOtp}
                  >
                    <Text style={s.miniBtnTextActive}>
                      {verifyingOtp ? "확인중..." : "확인"}
                    </Text>
                  </Pressable>
                </View>
                <Text style={s.helper}>
                  문자로 발송된 6자리 번호를 입력해주세요.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={s.bottomBar} pointerEvents="box-none">
            <Button
              title="다음"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canNext}
              onPress={onNext}
              style={s.nextBtn}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (c: any) => {
  const S = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 36 };

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg.surface },
    header: {
      paddingHorizontal: S.lg,
      paddingTop: S.md,
      paddingBottom: S.md,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    titleWrap: { paddingHorizontal: S.lg, paddingTop: S.xs },
    title: {
      fontSize: 32,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: c.text.primary,
      lineHeight: 40,
    },
    subtitle: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: "600",
      color: c.text.secondary,
      lineHeight: 22,
    },
    cardList: { paddingHorizontal: S.lg, paddingTop: S.xl },
    roleCard: {
      backgroundColor: c.bg.surface,
      borderWidth: 1,
      borderColor: c.border.default,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 24,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    roleCardActive: {
      borderColor: c.brand.primary,
      backgroundColor: withAlpha(c.brand.primary, 0.05),
      borderWidth: 1.5,
    },
    roleIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: c.border.default,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.bg.surface,
      marginRight: 16,
    },
    roleTextWrap: { flex: 1 },
    roleTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text.primary,
      marginBottom: 4,
    },
    roleDesc: {
      fontSize: 14,
      fontWeight: "500",
      color: c.text.secondary,
    },
    form: {
      paddingHorizontal: S.lg,
      paddingTop: S.sm,
      paddingBottom: 140,
    },
    label: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text.primary,
      marginBottom: 8,
    },
    row: { flexDirection: "row", alignItems: "flex-start" },
    rowGap: { width: 10 },
    tfWrap: {
      minHeight: 56,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: c.bg.surface,
      borderWidth: 1,
      borderColor: c.border.default,
    },
    tfWrapSuccess: {
      borderColor: c.brand.primary,
      borderWidth: 1.5,
    },
    tfInput: {
      fontSize: 16,
      fontWeight: "600",
      paddingVertical: 0,
      height: 56,
    },
    miniBtn: {
      height: 56,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border.default,
      backgroundColor: c.bg.surface,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 88,
    },
    miniBtnActive: {
      backgroundColor: c.brand.primary,
      borderColor: c.brand.primary,
    },
    miniBtnVerified: {
      backgroundColor: c.bg.muted,
      borderColor: c.border.default,
    },
    miniBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text.primary,
    },
    miniBtnTextActive: {
      fontSize: 15,
      fontWeight: "700",
      color: "#FFF",
    },
    miniBtnTextVerified: {
      color: c.text.secondary,
    },
    genderBtn: {
      flex: 1,
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border.default,
      backgroundColor: c.bg.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    genderBtnActive: {
      borderColor: c.brand.primary,
      backgroundColor: withAlpha(c.brand.primary, 0.05),
      borderWidth: 1.5,
    },
    genderBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text.secondary,
    },
    genderBtnTextActive: {
      color: c.brand.primary,
      fontWeight: "800",
    },
    otpBox: {
      marginTop: 16,
    },
    helper: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: "600",
      color: c.text.secondary,
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: S.lg,
      paddingBottom: Platform.OS === "ios" ? 34 : S.lg,
      paddingTop: 16,
      backgroundColor: c.bg.surface,
      borderTopWidth: 1,
      borderTopColor: c.border.default,
    },
    nextBtn: {
      height: 60,
      borderRadius: 12,
      alignSelf: "stretch",
    },
  });
};
