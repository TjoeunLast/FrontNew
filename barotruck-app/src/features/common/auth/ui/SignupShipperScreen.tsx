import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import apiClient from "@/shared/api/apiClient";
import { AuthService } from "@/shared/api/authService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { RegisterRequest } from "@/shared/models/auth";
import { Button } from "@/shared/ui/base/Button";
import { TextField } from "@/shared/ui/form/TextField";
import { withAlpha } from "@/shared/utils/color";
import { saveCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

type ShipperType = "personal" | "business";
const PROFILE_IMAGE_STORAGE_KEY = "baro_profile_image_url_v1";

async function persistProfileImage(uri: string): Promise<string> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return uri;

  const cleanUri = uri.split("?")[0] || uri;
  const ext = cleanUri.includes(".")
    ? cleanUri.substring(cleanUri.lastIndexOf("."))
    : ".jpg";
  const safeExt = ext.length >= 2 && ext.length <= 5 ? ext : ".jpg";
  const targetUri = `${docDir}profile-image${safeExt}`;

  const targetInfo = await FileSystem.getInfoAsync(targetUri);
  if (targetInfo.exists) {
    await FileSystem.deleteAsync(targetUri, { idempotent: true });
  }

  await FileSystem.copyAsync({ from: uri, to: targetUri });
  return targetUri;
}

function toUploadFile(uri: string) {
  const normalized = uri.split("?")[0] || uri;
  const ext = normalized.includes(".")
    ? normalized.substring(normalized.lastIndexOf(".") + 1).toLowerCase()
    : "jpg";
  const type =
    ext === "png"
      ? "image/png"
      : ext === "heic"
        ? "image/heic"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

  return {
    uri,
    name: `profile.${ext || "jpg"}`,
    type,
  } as any;
}

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
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d)
    return undefined;
  const today = new Date();
  let age = today.getFullYear() - y;
  const hasNotHadBirthday =
    today.getMonth() + 1 < mo ||
    (today.getMonth() + 1 === mo && today.getDate() < d);
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
    source?.companyName ??
      source?.corpName ??
      source?.businessName ??
      source?.name ??
      "",
  ).trim();
  const representative = String(
    source?.representative ??
      source?.ceoName ??
      source?.ownerName ??
      source?.nameOfRep ??
      "",
  ).trim();
  return { companyName, representative };
}

export default function SignupShipperScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const params = useLocalSearchParams<{
    email: string;
    password: string;
    name: string;
    phone: string;
    profileImageUri?: string;
    gender?: "M" | "F";
    birthDate?: string;
  }>();

  const [shipperType, setShipperType] = useState<ShipperType>("business");

  const [nickname, setNickname] = useState("");
  const [bizNo, setBizNo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [ceoName, setCeoName] = useState("");

  const [checkingBiz, setCheckingBiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const goBack = () => router.back();

  const bizNoDigits = digitsOnly(bizNo);
  const nickFormatOk = nickname.trim().length >= 2;

  const bizNoOk = shipperType === "personal" ? true : bizNoDigits.length >= 10;
  const companyOk =
    shipperType === "personal" ? true : companyName.trim().length > 0;
  const ceoOk = shipperType === "personal" ? true : ceoName.trim().length > 0;

  const canSubmit = nickFormatOk && bizNoOk && companyOk && ceoOk;

  const onSubmit = async () => {
    if (submitting) return;

    if (!canSubmit) {
      showMsg("입력 확인", "필수 정보를 모두 입력해주세요.");
      return;
    }

    if (!params.email || !params.password || !params.phone) {
      showMsg("계정 정보 없음", "기본 계정 정보를 먼저 입력해주세요.");
      router.replace("/(auth)/signup");
      return;
    }

    setSubmitting(true);
    try {
      const payload: RegisterRequest = {
        name: params.name.trim(),
        nickname: nickname.trim(),
        email: params.email.trim(),
        password: params.password,
        phone: params.phone.trim(),
        role: "SHIPPER",
        gender: params.gender,
        age: parseBirthDateToAge(String(params.birthDate ?? "")),
        delflag: "N",
        regflag: "Y",
        ratingAvg: 0,
        user_level: 0,
        shipper: {
          companyName: companyName.trim(),
          bizRegNum: bizNoDigits,
          representative: ceoName.trim(),
          bizAddress: "",
          isCorporate: shipperType === "business" ? "Y" : "N",
        },
      };

      await AuthService.register(payload);
      if (params.profileImageUri) {
        try {
          const persistedUri = await persistProfileImage(
            String(params.profileImageUri),
          );
          await UserService.uploadProfileImage(toUploadFile(persistedUri));
          await AsyncStorage.setItem(PROFILE_IMAGE_STORAGE_KEY, persistedUri);
        } catch (imageError) {
          console.error("signup profile image upload failed", imageError);
        }
      }
      await saveCurrentUserSnapshot({
        email: params.email,
        name: params.name,
        nickname: nickname.trim(),
        role: "SHIPPER",
        level: 0,
        shipperType: shipperType === "business" ? "Y" : "N",
        gender: params.gender,
        birthDate: String(params.birthDate ?? "").trim() || undefined,
      });

      router.replace("/(shipper)/(tabs)");
    } catch (e: any) {
      console.log("❌ 서버 응답 에러 데이터:", e.response?.data);
      const serverError = e.response?.data?.error || e.response?.data?.message;
      const errorMsg = serverError || "회원가입 처리 중 오류가 발생했습니다.";
      showMsg("오류", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

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
      for (const req of paramCandidates) {
        try {
          const res = await apiClient.get("/api/v1/shippers/check-biz-num", {
            params: req,
          });
          responseData = res.data;
          break;
        } catch {
          // 다음 파라미터 후보 시도
        }
      }

      if (!responseData) {
        showMsg(
          "조회 실패",
          "사업자번호 조회에 실패했습니다. 회사명/대표자명을 직접 입력해주세요.",
        );
        return;
      }

      const {
        companyName: foundCompanyName,
        representative: foundRepresentative,
      } = readBizLookupFields(responseData);
      if (foundCompanyName) setCompanyName(foundCompanyName);
      if (foundRepresentative) setCeoName(foundRepresentative);

      if (foundCompanyName || foundRepresentative) {
        showMsg("조회 성공", "사업자 정보가 반영되었습니다.");
      } else {
        showMsg(
          "조회 완료",
          "사업자번호는 확인됐습니다. 회사명/대표자명은 직접 입력해주세요.",
        );
      }
    } catch (e: any) {
      console.log("❌ 사업자 조회 오류:", e?.response?.data ?? e);
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "사업자 조회 중 문제가 발생했습니다.";
      showMsg("오류", msg);
    } finally {
      setCheckingBiz(false);
    }
  };

  const s = getStyles(c);

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
          <View style={{ marginBottom: 24 }}>
            <Text style={s.title}>화주 정보를{"\n"}입력해주세요.</Text>
            {/* <Text style={s.subtitle}>
              개인 화주인지 사업자 화주인지 선택해주세요.
            </Text> */}
          </View>

          <View style={s.segmentWrap}>
            <Pressable
              onPress={() => setShipperType("personal")}
              style={[s.segBtn, shipperType === "personal" && s.segBtnActive]}
            >
              <Text
                style={[
                  s.segText,
                  shipperType === "personal" && s.segTextActive,
                ]}
              >
                개인
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShipperType("business")}
              style={[s.segBtn, shipperType === "business" && s.segBtnActive]}
            >
              <Text
                style={[
                  s.segText,
                  shipperType === "business" && s.segTextActive,
                ]}
              >
                사업자
              </Text>
            </Pressable>
          </View>

          <Text style={s.label}>닉네임</Text>
          <TextField
            value={nickname}
            onChangeText={setNickname}
            placeholder="앱에서 사용할 닉네임"
            autoCapitalize="none"
            inputWrapStyle={[
              s.tfWrap,
              nickname.length > 0 && nickFormatOk && s.tfWrapSuccess,
            ]}
            inputStyle={s.tfInput}
            errorText={
              nickname.length > 0 && !nickFormatOk
                ? "닉네임은 2글자 이상 입력해주세요."
                : undefined
            }
          />

          {shipperType === "business" ? (
            <>
              <View style={{ height: 24 }} />

              <Text style={s.label}>사업자 등록번호</Text>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <TextField
                    value={bizNo}
                    onChangeText={setBizNo}
                    placeholder="숫자만 입력"
                    keyboardType="number-pad"
                    inputWrapStyle={[
                      s.tfWrap,
                      bizNoDigits.length >= 10 && s.tfWrapSuccess,
                    ]}
                    inputStyle={s.tfInput}
                  />
                </View>
                <View style={s.rowGap} />
                <Pressable
                  style={[
                    s.miniBtn,
                    (checkingBiz || bizNoDigits.length < 10) && {
                      opacity: 0.6,
                    },
                  ]}
                  onPress={onLookupBiz}
                  disabled={checkingBiz || bizNoDigits.length < 10}
                >
                  <Text style={s.miniBtnText}>
                    {checkingBiz ? "조회중" : "조회"}
                  </Text>
                </Pressable>
              </View>

              <View style={{ height: 24 }} />

              <Text style={s.label}>회사명 (상호)</Text>
              <TextField
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="예: (주)대한물류"
                autoCapitalize="none"
                inputWrapStyle={[s.tfWrap, companyOk && s.tfWrapSuccess]}
                inputStyle={s.tfInput}
              />

              <View style={{ height: 24 }} />

              <Text style={s.label}>대표자명</Text>
              <TextField
                value={ceoName}
                onChangeText={setCeoName}
                placeholder="대표자 성함"
                autoCapitalize="none"
                inputWrapStyle={[s.tfWrap, ceoOk && s.tfWrapSuccess]}
                inputStyle={s.tfInput}
              />
            </>
          ) : (
            <Text style={s.helper} />
          )}
        </ScrollView>

        <View style={s.bottomBar} pointerEvents="box-none">
          <Button
            title={submitting ? "가입 중..." : "가입 완료"}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canSubmit || submitting}
            loading={submitting}
            onPress={onSubmit}
            style={s.submitBtn}
          />
        </View>
      </KeyboardAvoidingView>
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
    titleWrap: { paddingHorizontal: S.lg, paddingTop: S.sm },
    title: {
      fontSize: 32,
      fontWeight: "900",
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
    form: {
      paddingHorizontal: S.lg,
      paddingTop: S.xs,
      paddingBottom: 140,
    },
    segmentWrap: {
      height: 56,
      borderRadius: 16,
      padding: 6,
      backgroundColor: c.bg.muted,
      borderWidth: 1,
      borderColor: c.border.default,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    segBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    segBtnActive: {
      backgroundColor: c.bg.surface,
      borderWidth: 1,
      borderColor: withAlpha(c.border.default, 0.7),
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    segText: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text.secondary,
    },
    segTextActive: {
      color: c.text.primary,
      fontWeight: "800",
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
    miniBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text.primary,
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
    submitBtn: {
      height: 60,
      borderRadius: 12,
      alignSelf: "stretch",
    },
  });
};
