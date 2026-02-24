// src/features/common/auth/ui/SignupShipperScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthService } from "@/shared/api/authService";
import apiClient from "@/shared/api/apiClient";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { RegisterRequest } from "@/shared/models/auth";
import { Button } from "@/shared/ui/base/Button";
import { TextField } from "@/shared/ui/form/TextField";
import { withAlpha } from "@/shared/utils/color";
import { saveCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

type ShipperType = "personal" | "business";

function digitsOnly(v: string) {
  return v.replace(/[^0-9]/g, "");
}
function parseBirthDateToAge(v: string): number | undefined {
  const only = v.replace(/[^0-9]/g, "").slice(0, 8);
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(only);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return undefined;
  const today = new Date();
  let age = today.getFullYear() - y;
  const hasNotHadBirthday = today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d);
  if (hasNotHadBirthday) age -= 1;
  return age >= 0 ? age : undefined;
}
function showMsg(title: string, msg: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}

function readBizLookupFields(payload: any) {
  const source = payload?.data ?? payload ?? {};
  const companyName = String(
    source?.companyName ?? source?.corpName ?? source?.businessName ?? source?.name ?? ""
  ).trim();
  const representative = String(
    source?.representative ?? source?.ceoName ?? source?.ownerName ?? source?.nameOfRep ?? ""
  ).trim();
  return { companyName, representative };
}

export default function SignupShipperScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  // 이전 화면(SignupScreen)에서 넘겨받은 파라미터들
  const params = useLocalSearchParams<{
    email: string;
    password: string;
    name: string;
    phone: string;
    gender?: "M" | "F";
    birthDate?: string;
  }>();

  const [shipperType, setShipperType] = useState<ShipperType>("business");

  // 닉네임 상태
  const [nickname, setNickname] = useState("");
  const [nickChecked, setNickChecked] = useState(false);
  const [nickOkChecked, setNickOkChecked] = useState(false);
  // const [checkingNick, setCheckingNick] = useState(false); // (중복확인 버튼이 없으므로 주석 처리)

  // 사업자 정보 상태
  const [bizNo, setBizNo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [ceoName, setCeoName] = useState("");

  const [checkingBiz, setCheckingBiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 스타일 정의
  const s = useMemo(() => {
    const S = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 36 } as const;

    return StyleSheet.create({
      screen: { flex: 1, backgroundColor: c.bg.surface } as ViewStyle,
      header: { paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.md } as ViewStyle,
      backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" } as ViewStyle,
      titleWrap: { paddingHorizontal: S.lg, paddingTop: S.sm } as ViewStyle,
      title: { fontSize: 30, fontWeight: "900", letterSpacing: -0.4, color: c.text.primary, lineHeight: 38 } as TextStyle,
      subtitle: { marginTop: 10, fontSize: 16, fontWeight: "700", color: c.text.secondary, lineHeight: 22 } as TextStyle,
      form: { paddingHorizontal: S.lg, paddingTop: S.xl, paddingBottom: 140 } as ViewStyle,
      segmentWrap: {
        height: 56,
        borderRadius: 16,
        padding: 6,
        backgroundColor: c.bg.muted,
        borderWidth: 1,
        borderColor: c.border.default,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
      } as ViewStyle,
      segBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" } as ViewStyle,
      segBtnActive: {
        backgroundColor: c.bg.surface,
        borderWidth: 1,
        borderColor: withAlpha(c.border.default, 0.7),
        shadowColor: withAlpha("#000000", 0.08),
        shadowOpacity: 1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      } as ViewStyle,
      segText: { fontSize: 15, fontWeight: "900", color: c.text.secondary } as TextStyle,
      segTextActive: { color: c.brand.primary } as TextStyle,
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
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border.default,
        backgroundColor: c.bg.muted,
        alignItems: "center",
        justifyContent: "center",
      } as ViewStyle,
      miniBtnText: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
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
      submitBtn: {
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

  const goBack = () => router.back();

  // 유효성 검사 로직
  const bizNoDigits = digitsOnly(bizNo);
  const nickFormatOk = nickname.trim().length >= 2;

  const bizNoOk = shipperType === "personal" ? true : bizNoDigits.length >= 10;
  const companyOk = shipperType === "personal" ? true : companyName.trim().length > 0;
  const ceoOk = shipperType === "personal" ? true : ceoName.trim().length > 0;

  const canSubmit = nickFormatOk && bizNoOk && companyOk && ceoOk;

  // --------------------------------------------------------------------------
  // 회원가입 제출 함수 (수정됨)
  // --------------------------------------------------------------------------
  const onSubmit = async () => {
    if (submitting) return;

    if (!canSubmit) {
      showMsg("입력 확인", "필수 정보를 모두 입력해주세요.");
      return;
    }

    // 파라미터 체크 (새로고침 등으로 인해 데이터가 날아갔을 경우 방지)
    if (!params.email || !params.password || !params.phone) {
      showMsg("계정 정보 없음", "기본 계정 정보를 먼저 입력해주세요.");
      router.replace("/(auth)/signup");
      return;
    }

    setSubmitting(true);
    try {
      const payload: RegisterRequest = {
        nickname: nickname.trim(),
        email: params.email,
        password: params.password,
        phone: params.phone,
        role: "SHIPPER",
        gender: params.gender,
        age: parseBirthDateToAge(String(params.birthDate ?? "")),
        shipper:
          shipperType === "business"
            ? {
                companyName: companyName.trim(),
                bizRegNum: bizNoDigits,
                representative: ceoName.trim(),
                bizAddress: "",
                isCorporate: "Y",
              }
            : undefined,
      };

      // 1. 회원가입 요청 (DB 저장)
      const reponse = await AuthService.register(payload);
      await saveCurrentUserSnapshot({
        email: params.email,
        name: params.name,
        nickname: nickname.trim(),
        role: "SHIPPER",
        gender: params.gender,
        birthDate: String(params.birthDate ?? "").trim() || undefined,
      });

      // 4. 메인 탭으로 이동
      router.replace("/(shipper)/(tabs)");
    } catch (e: any) {
      console.log("❌ 서버 응답 에러 데이터:", e.response?.data);
      
      // 1. 변수 선언(const)을 확실히 하여 'errorMsg' 찾을 수 없음 에러 해결
      // 2. 백엔드 구조에 맞춰 error 또는 message 필드 추출
      const serverError = e.response?.data?.error || e.response?.data?.message;
      const errorMsg = serverError || "회원가입 처리 중 오류가 발생했습니다.";
      
      showMsg("오류", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // 사업자 조회 (목업)
  const onLookupBiz = async () => {
    if (shipperType !== "business") return;

    if (bizNoDigits.length < 10) {
      showMsg("사업자 등록번호", "숫자 10자리 이상 입력해주세요.");
      return;
    }

    try {
      setCheckingBiz(true);
      const paramCandidates = [
        { bizRegNum: bizNoDigits },
        { bizNum: bizNoDigits },
        { bizNo: bizNoDigits },
      ];

      let responseData: any = null;
      for (const params of paramCandidates) {
        try {
          const res = await apiClient.get("/api/v1/shippers/check-biz-num", { params });
          responseData = res.data;
          break;
        } catch {
          // 다음 파라미터 후보 시도
        }
      }

      if (!responseData) {
        showMsg("조회 실패", "사업자번호 조회 API 응답을 확인하지 못했습니다. 회사명/대표자명을 직접 입력해주세요.");
        return;
      }

      const { companyName: foundCompanyName, representative: foundRepresentative } = readBizLookupFields(responseData);
      if (foundCompanyName) setCompanyName(foundCompanyName);
      if (foundRepresentative) setCeoName(foundRepresentative);

      if (foundCompanyName || foundRepresentative) {
        showMsg("조회 성공", "사업자 정보가 반영되었습니다.");
      } else {
        showMsg("조회 완료", "사업자번호는 확인됐습니다. 회사명/대표자명은 직접 입력해주세요.");
      }
    } catch (e: any) {
      console.log("❌ 사업자 조회 오류:", e?.response?.data ?? e);
      const msg = e?.response?.data?.error || e?.response?.data?.message || "사업자 조회 중 문제가 발생했습니다.";
      showMsg("오류", msg);
    } finally {
      setCheckingBiz(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable onPress={goBack} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={26} color={c.text.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.form}
        >
          <View style={{ marginBottom: 18 }}>
            <Text style={s.title}>화주 정보를{"\n"}입력해주세요.</Text>
            <Text style={s.subtitle}>개인 화주인지 사업자 화주인지 선택해주세요.</Text>
          </View>

          {/* 개인/사업자 선택 탭 */}
          <View style={s.segmentWrap}>
            <Pressable
              onPress={() => setShipperType("personal")}
              style={[s.segBtn, shipperType === "personal" && s.segBtnActive]}
            >
              <Text style={[s.segText, shipperType === "personal" && s.segTextActive]}>개인</Text>
            </Pressable>
            <Pressable
              onPress={() => setShipperType("business")}
              style={[s.segBtn, shipperType === "business" && s.segBtnActive]}
            >
              <Text style={[s.segText, shipperType === "business" && s.segTextActive]}>사업자</Text>
            </Pressable>
          </View>

          {/* 닉네임 입력 */}
          <Text style={s.label}>닉네임</Text>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <TextField
                value={nickname}
                onChangeText={(v) => {
                  setNickname(v);
                  setNickChecked(false);
                  setNickOkChecked(false);
                }}
                placeholder="앱에서 사용할 닉네임"
                autoCapitalize="none"
                inputWrapStyle={s.tfWrap}
                inputStyle={s.tfInput}
                errorText={
                  nickname.length > 0 && !nickFormatOk
                    ? "닉네임은 2글자 이상 입력해주세요."
                    : undefined
                }
              />
            </View>
          </View>

          {/* 닉네임 상태 메시지 (필요 시 UI 부활 가능) */}
          {nickChecked ? (
            <Text
              style={[
                s.helper,
                { color: nickOkChecked ? c.status.success : c.status.danger },
              ]}
            >
              {nickOkChecked
                ? "사용 가능한 닉네임이에요."
                : "이미 사용 중인 닉네임이에요."}
            </Text>
          ) : null}

          {/* 사업자 정보 입력 필드 */}
          {shipperType === "business" ? (
            <>
              <View style={{ height: 16 }} />

              <Text style={s.label}>사업자 등록번호</Text>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <TextField
                    value={bizNo}
                    onChangeText={setBizNo}
                    placeholder="숫자만 입력"
                    keyboardType="number-pad"
                    inputWrapStyle={s.tfWrap}
                    inputStyle={s.tfInput}
                  />
                </View>
                <View style={s.rowGap} />
                <Pressable
                  style={[
                    s.miniBtn,
                    (checkingBiz || bizNoDigits.length < 10) && { opacity: 0.6 },
                  ]}
                  onPress={onLookupBiz}
                  disabled={checkingBiz || bizNoDigits.length < 10}
                >
                  <Text style={s.miniBtnText}>{checkingBiz ? "조회중" : "조회"}</Text>
                </Pressable>
              </View>

              <View style={{ height: 16 }} />

              <Text style={s.label}>회사명 (상호)</Text>
              <TextField
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="예: (주)대한물류"
                autoCapitalize="none"
                inputWrapStyle={s.tfWrap}
                inputStyle={s.tfInput}
              />

              <View style={{ height: 16 }} />

              <Text style={s.label}>대표자명</Text>
              <TextField
                value={ceoName}
                onChangeText={setCeoName}
                placeholder="대표자 성함"
                autoCapitalize="none"
                inputWrapStyle={s.tfWrap}
                inputStyle={s.tfInput}
              />
            </>
          ) : (
            <Text style={s.helper} />
          )}
        </ScrollView>

        {/* 하단 버튼 */}
        <View style={s.bottomBar} pointerEvents="box-none">
          <Button
            title="가입 완료"
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canSubmit || submitting}
            onPress={onSubmit}
            style={s.submitBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
