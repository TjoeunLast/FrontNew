import React, { useMemo, useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
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
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, mo, d };
}
function genCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDate, setBirthDate] = useState("");

  const [emailChecked, setEmailChecked] = useState(false);
  const [emailOkChecked, setEmailOkChecked] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const otpInputRef = useRef<TextInput>(null); // 1. 인증번호 입력창을 위한 ref 생성

  // 2. 번호 수정 기능 추가
  const onEditPhone = () => {
    setPhoneVerified(false);
    setOtpRequested(false);
    setOtpCode(null);
    setOtpInput("");
  };

  const onRequestOtp = () => {
    if (!phoneFormatOk) {
      showMsg("휴대폰 확인", "휴대폰 번호를 확인해주세요.");
      return;
    }
    const code = genCode6();
    setOtpRequested(true);
    setOtpCode(code);
    setOtpInput("");
    setPhoneVerified(false);
    showMsg("인증요청(목업)", `인증번호: ${code}\n(나중에 SMS 연동으로 교체)`);

    // 3. 인증 요청 후 인증번호 입력창으로 커서 이동 (약간의 지연시간 필요)
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 100);
  };

  const onChangeEmail = (v: string) => {
    setEmail(v);
    setEmailChecked(false);
    setEmailOkChecked(false);
  };
  const onChangePhone = (v: string) => {
    setPhone(v);
    setPhoneVerified(false);
    setOtpRequested(false);
    setOtpCode(null);
    setOtpInput("");
  };

  const s = useMemo(() => {
    const S = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 36 } as const;

    return StyleSheet.create({
      screen: { flex: 1, backgroundColor: c.bg.surface } as ViewStyle,

      header: { paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.md } as ViewStyle,
      backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" } as ViewStyle,

      titleWrap: { paddingHorizontal: S.lg, paddingTop: S.sm } as ViewStyle,
      title: { fontSize: 30, fontWeight: "900", letterSpacing: -0.4, color: c.text.primary, lineHeight: 38 } as TextStyle,
      subtitle: { marginTop: 10, fontSize: 16, fontWeight: "700", color: c.text.secondary, lineHeight: 22 } as TextStyle,

      cardList: { paddingHorizontal: S.lg, paddingTop: S.xl } as ViewStyle,

      roleCard: {
        backgroundColor: c.bg.surface,
        borderWidth: 1,
        borderColor: c.border.default,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 18,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        shadowColor: withAlpha("#000000", 0.06),
        shadowOpacity: 1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      } as ViewStyle,
      roleIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: c.border.default,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.bg.surface,
        marginRight: 14,
      } as ViewStyle,
      roleTextWrap: { flex: 1 } as ViewStyle,
      roleTitle: { fontSize: 18, fontWeight: "900", color: c.text.primary } as TextStyle,
      roleDesc: { marginTop: 6, fontSize: 15, fontWeight: "700", color: c.text.secondary } as TextStyle,

      form: { paddingHorizontal: S.lg, paddingTop: S.xl, paddingBottom: 140 } as ViewStyle,

      label: { fontSize: 14, fontWeight: "900", color: c.text.secondary, marginBottom: 8 } as TextStyle,

      row: { flexDirection: "row", alignItems: "center" } as ViewStyle,
      rowGap: { width: 12 } as ViewStyle,

      tfWrap: {
        minHeight: 56,
        borderRadius: 16,
        paddingHorizontal: 16,
        backgroundColor: c.bg.surface,
        borderWidth: 1,
      } as ViewStyle,
      tfInput: { fontSize: 16, fontWeight: "800", paddingVertical: 0 } as TextStyle,

      miniBtn: {
        height: 56,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border.default,
        backgroundColor: c.bg.muted,
        alignItems: "center",
        justifyContent: "center",
      } as ViewStyle,
      miniBtnText: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
      genderBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border.default,
        backgroundColor: c.bg.surface,
        alignItems: "center",
        justifyContent: "center",
      } as ViewStyle,
      genderBtnText: { fontSize: 14, fontWeight: "800", color: c.text.secondary } as TextStyle,

      helper: { marginTop: 8, fontSize: 13, fontWeight: "800", color: c.text.secondary } as TextStyle,

      bottomBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: S.lg,
        paddingBottom: S.lg,
        paddingTop: 12,
        backgroundColor: withAlpha(c.bg.surface, 0.98),
        borderTopWidth: 1,
        borderTopColor: withAlpha(c.border.default, 0.7),
      } as ViewStyle,
      nextBtn: {
        height: 76,
        borderRadius: 20,
        alignSelf: "stretch",
        shadowColor: withAlpha(c.brand.primary, 0.35),
        shadowOpacity: 1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      } as ViewStyle,
    });
  }, [c]);

  const goBack = () => {
    if (step === "account") {
      setStep("role");
      return;
    }
    router.back();
  };

  const chooseRole = (r: Role) => {
    setRole(r);
    setStep("account");
  };

  const emailFormatOk = isEmailLike(email);
  const pwOk = pw.length >= 8;
  const pwMatch = pw.length > 0 && pw2.length > 0 && pw === pw2;
  const nameOk = name.trim().length > 0;
  const nicknameOk = nickname.trim().length > 0;
  const phoneFormatOk = isPhoneLike(phone);
  const birthDateOk = parseBirthDate(birthDate) !== null;
  const genderOk = gender !== null;

  const canNext =
    !!role &&
    emailFormatOk &&
    pwOk &&
    pwMatch &&
    nameOk &&
    nicknameOk &&
    phoneFormatOk &&
    genderOk &&
    birthDateOk &&
    phoneVerified;


  

  const onVerifyOtp = () => {
    if (!otpRequested || !otpCode) return;
    if (otpInput.trim() === otpCode) {
      setPhoneVerified(true);
      showMsg("인증 완료", "휴대폰 인증이 완료됐어요.");
      return;
    }
    showMsg("인증 실패", "인증번호가 올바르지 않아요.");
  };




  /**
   * 2. 다음 단계로 (onNext)
   * 스토어를 사용하지 않으므로, expo-router의 push 기능을 이용해 
   * 입력된 데이터를 다음 화면으로 전달합니다.
   */
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
      nickname: nickname.trim(),
      phone: phone.trim(),
      role: role,
      gender: gender!,
      birthDate: birthDate.trim(),
    };

    // 데이터를 query params로 넘기거나, 다음 페이지에서 다시 입력받지 않도록 
    // 경로를 이동합니다. (상태 관리가 없으므로 router.push에 객체 전달)
    if (role === "shipper") {
      router.push({
        pathname: "/(auth)/signup-shipper",
        params: signupData,
      });
    } else {
      router.push({
        pathname: "/(auth)/signup-driver",
        params: signupData,
      });
    }
  };

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
              style={({ pressed }) => [s.roleCard, pressed && { backgroundColor: c.brand.primarySoft }]}
            >
              <View style={s.roleIconCircle}>
                <Ionicons name="cube-outline" size={24} color={c.text.primary} />
              </View>
              <View style={s.roleTextWrap}>
                <Text style={s.roleTitle}>화주 (보내는 분)</Text>
                <Text style={s.roleDesc}>화물을 등록하고 배차를 요청해요</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={c.text.secondary} />
            </Pressable>

            <Pressable
              onPress={() => chooseRole("driver")}
              style={({ pressed }) => [s.roleCard, pressed && { backgroundColor: c.brand.primarySoft }]}
            >
              <View style={s.roleIconCircle}>
                <Ionicons name="car-outline" size={24} color={c.text.primary} />
              </View>
              <View style={s.roleTextWrap}>
                <Text style={s.roleTitle}>차주 (기사님)</Text>
                <Text style={s.roleDesc}>오더를 수행하고 수익을 내요</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={c.text.secondary} />
            </Pressable>
          </View>
        </>
      ) : (
        <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.form}>
            <View style={{ marginBottom: 18 }}>
              <Text style={s.title}>계정 정보를{"\n"}입력해주세요.</Text>
              <Text style={s.subtitle}>로그인과 연락에 사용됩니다.</Text>
            </View>

            <Text style={s.label}>이메일 (아이디)</Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={email}
                  onChangeText={onChangeEmail}
                  placeholder="example@email.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  inputWrapStyle={s.tfWrap}
                  inputStyle={s.tfInput}
                  errorText={email.length > 0 && !emailFormatOk ? "이메일 형식을 확인해주세요." : undefined}
                />
              </View>
              {/* 버튼과 rowGap을 삭제했습니다. */}
            </View>

            {/* 이메일 체크 결과 메시지(emailChecked ?) 부분을 삭제했습니다. */}

            <View style={{ height: 16 }} />

            <Text style={s.label}>비밀번호</Text>
            <TextField
              value={pw}
              onChangeText={setPw}
              placeholder="8자리 이상 입력"
              secureTextEntry
              autoCapitalize="none"
              inputWrapStyle={s.tfWrap}
              inputStyle={s.tfInput}
              errorText={pw.length > 0 && !pwOk ? "비밀번호는 8자리 이상이어야 해요." : undefined}
            />

            <View style={{ height: 16 }} />

            <Text style={s.label}>비밀번호 확인</Text>
            <TextField
              value={pw2}
              onChangeText={setPw2}
              placeholder="한 번 더 입력"
              secureTextEntry
              autoCapitalize="none"
              inputWrapStyle={s.tfWrap}
              inputStyle={s.tfInput}
              errorText={pw2.length > 0 && !pwMatch ? "비밀번호가 일치하지 않아요." : undefined}
            />

            <View style={{ height: 16 }} />

            <Text style={s.label}>닉네임</Text>
            <TextField
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임 입력"
              autoCapitalize="none"
              inputWrapStyle={s.tfWrap}
              inputStyle={s.tfInput}
            />

            <View style={{ height: 16 }} />

            <Text style={s.label}>이름</Text>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="실명 입력"
              autoCapitalize="none"
              inputWrapStyle={s.tfWrap}
              inputStyle={s.tfInput}
            />

            <View style={{ height: 16 }} />

            <Text style={s.label}>성별</Text>
            <View style={s.row}>
              <Pressable
                onPress={() => setGender("M")}
                style={[
                  s.genderBtn,
                  gender === "M" && { borderColor: c.brand.primary },
                ]}
              >
                <Text style={[s.genderBtnText, gender === "M" && { color: c.text.primary }]}>남성</Text>
              </Pressable>
              <View style={s.rowGap} />
              <Pressable
                onPress={() => setGender("F")}
                style={[
                  s.genderBtn,
                  gender === "F" && { borderColor: c.brand.primary },
                ]}
              >
                <Text style={[s.genderBtnText, gender === "F" && { color: c.text.primary }]}>여성</Text>
              </Pressable>
            </View>

            <View style={{ height: 16 }} />

            <Text style={s.label}>생년월일</Text>
            <TextField
              value={birthDate}
              onChangeText={(v) => setBirthDate(digitsOnly(v).slice(0, 8))}
              placeholder="YYYYMMDD"
              keyboardType="number-pad"
              inputWrapStyle={s.tfWrap}
              inputStyle={s.tfInput}
              errorText={birthDate.length > 0 && !birthDateOk ? "YYYYMMDD 숫자 8자리를 입력해주세요." : undefined}
            />

            <View style={{ height: 16 }} />

            <Text style={s.label}>휴대폰 번호</Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={phone}
                  onChangeText={onChangePhone}
                  placeholder="010-1234-5678"
                  keyboardType="phone-pad"
                  inputWrapStyle={s.tfWrap}
                  editable={!otpRequested || phoneVerified} // 4. 인증 요청 중에는 수정 불가
                  inputStyle={s.tfInput}
                  errorText={phone.length > 0 && !phoneFormatOk ? "휴대폰 번호를 확인해주세요." : undefined}
                />
              </View>
              <View style={s.rowGap} />
              <Pressable
                style={[s.miniBtn, (!phoneFormatOk || phoneVerified) && { opacity: 0.6 }]}
                onPress={otpRequested && !phoneVerified ? onEditPhone : onRequestOtp} // 5. 상태에 따라 '인증요청' 또는 '번호수정'
                disabled={!phoneFormatOk || phoneVerified}
              >
                <Text style={s.miniBtnText}>{phoneVerified ? "인증완료" : "인증요청"}</Text>
              </Pressable>
            </View>

            {otpRequested && !phoneVerified ? (
              <>
                <View style={{ height: 12 }} />
                <Text style={s.label}>인증번호</Text>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      ref={otpInputRef} // 6. ref 연결
                      value={otpInput}
                      onChangeText={setOtpInput}
                      placeholder="6자리 입력"
                      keyboardType="number-pad"
                      inputWrapStyle={s.tfWrap}
                      inputStyle={s.tfInput}
                    />
                  </View>
                  <View style={s.rowGap} />
                  <Pressable
                    style={[s.miniBtn, otpInput.trim().length !== 6 && { opacity: 0.6 }]}
                    onPress={onVerifyOtp}
                    disabled={otpInput.trim().length !== 6}
                  >
                    <Text style={s.miniBtnText}>확인</Text>
                  </Pressable>
                </View>
                <Text style={s.helper}>인증요청 후 받은 6자리 번호를 입력해주세요.</Text>
              </>
            ) : null}

            {phoneVerified ? <Text style={[s.helper, { color: c.status.success }]}>휴대폰 인증이 완료됐어요.</Text> : null}
          </ScrollView>

          <View style={s.bottomBar} pointerEvents="box-none">
            <Button title="다음" variant="primary" size="lg" fullWidth disabled={!canNext} onPress={onNext} style={s.nextBtn} />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
