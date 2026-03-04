// src/features/common/auth/ui/SignupDriverScreen.tsx
import React, { useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { TextField } from "@/shared/ui/form/TextField";
import { Button } from "@/shared/ui/base/Button";
import { withAlpha } from "@/shared/utils/color";
import { AuthService } from "@/shared/api/authService";
import { UserService } from "@/shared/api/userService";
import { RegisterRequest } from "@/shared/models/auth";
import AddressSearch from "@/shared/utils/AddressSearch";
import { saveCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

const PROFILE_IMAGE_STORAGE_KEY = "baro_profile_image_url_v1";

async function persistProfileImage(uri: string): Promise<string> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return uri;

  const cleanUri = uri.split("?")[0] || uri;
  const ext = cleanUri.includes(".") ? cleanUri.substring(cleanUri.lastIndexOf(".")) : ".jpg";
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
  const ext = normalized.includes(".") ? normalized.substring(normalized.lastIndexOf(".") + 1).toLowerCase() : "jpg";
  const type =
    ext === "png" ? "image/png" :
    ext === "heic" ? "image/heic" :
    ext === "webp" ? "image/webp" :
    "image/jpeg";

  return {
    uri,
    name: `profile.${ext || "jpg"}`,
    type,
  } as any;
}

function showMsg(title: string, msg: string) {
  if (Platform.OS === "web") globalThis.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}

function digitsOnly(v: string) {
  return v.replaceAll(/\D/g, ""); // S7781, S6353 최적화
}

function normalizePlate(v: string) {
  return v.trim().replaceAll(/\s+/g, " ");
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

function mapTon(v: string | null) {
  if (!v) return "1t";
  switch (v) {
    case "1T":
      return "1t";
    case "1_4T":
      return "1.4t";
    case "2_5T":
      return "2.5t";
    case "3_5T":
      return "3.5t";
    case "5T":
      return "5t";
    case "11T":
      return "11t";
    case "25T":
      return "25t";
    default:
      return "1t";
  }
}

type Option = { readonly label: string; readonly value: string };

// SelectField 컴포넌트 외부 정의
function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly value: string | null;
  readonly placeholder: string;
  readonly options: Option[];
  readonly onChange: (v: string) => void;
  readonly disabled?: boolean;
}) {
  const t = useAppTheme();
  const c = t.colors;
  const [open, setOpen] = useState(false);
  const selectedLabel = value
    ? options.find((o) => o.value === value)?.label
    : null;

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          minHeight: 56,
          borderRadius: 16,
          paddingHorizontal: 16,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        text: { fontSize: 16, fontWeight: "800", color: c.text.primary },
        placeholder: { color: c.text.secondary },
        sheetBackdrop: {
          flex: 1,
          backgroundColor: withAlpha("#000000", 0.35),
          alignItems: "center",
          justifyContent: "flex-end",
        },
        sheet: {
          width: "100%",
          backgroundColor: c.bg.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingTop: 10,
          paddingBottom: 16,
          borderTopWidth: 1,
          borderTopColor: withAlpha(c.border.default, 0.8),
        },
        sheetTitleRow: {
          paddingHorizontal: 18,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        sheetTitle: { fontSize: 16, fontWeight: "900", color: c.text.primary },
        option: {
          paddingHorizontal: 18,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        optionText: { fontSize: 16, fontWeight: "800", color: c.text.primary },
        divider: {
          height: 1,
          backgroundColor: withAlpha(c.border.default, 0.6),
        },
      }),
    [c],
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={({ pressed }) => [
          s.wrap,
          disabled && { opacity: 0.6 },
          pressed && !disabled && { backgroundColor: c.bg.muted },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[s.text, !selectedLabel && s.placeholder]}>
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.text.secondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.sheetBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetTitleRow}>
              <Text style={s.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={c.text.secondary} />
              </Pressable>
            </View>

            <View style={s.divider} />

            {options.map((o) => {
              const active = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    s.option,
                    pressed && { backgroundColor: c.bg.muted },
                  ]}
                >
                  <Text style={s.optionText}>{o.label}</Text>
                  {active ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={c.brand.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
export default function SignupDriverScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const {
    email = "",
    password = "",
    name = "",
    phone = "",
    profileImageUri = "",
    gender,
    birthDate,
  } = useLocalSearchParams<{
    email: string;
    password: string;
    name: string;
    phone: string;
    profileImageUri?: string;
    gender?: "M" | "F";
    birthDate?: string;
  }>();

  const [nickname, setNickname] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [carType, setCarType] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [ton, setTon] = useState<string | null>(null);
  const [expYears, setExpYears] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState("");
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);

  // ✅ 1. 유효성 검사 변수 추가 (에러 해결 핵심)
  const nickFormatOk = nickname.trim().length >= 2;
  const plateOk = normalizePlate(plateNo).length >= 6;
  const expOk = digitsOnly(expYears).length > 0;
  const addressOk = address.trim().length > 0;
  const addressCoordsOk = addressLat !== null && addressLng !== null;
  const canSubmit =
    nickFormatOk &&
    plateOk &&
    !!carType &&
    !!vehicleType &&
    !!ton &&
    expOk &&
    addressOk &&
    addressCoordsOk &&
    !submitting;

  const s = useMemo(() => {
    const S = { lg: 20, md: 16, xl: 24 };
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
      titleWrap: { paddingHorizontal: S.lg, paddingTop: 12 },
      title: {
        fontSize: 30,
        fontWeight: "900",
        color: c.text.primary,
        lineHeight: 38,
      },
      subtitle: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: "700",
        color: c.text.secondary,
        lineHeight: 22,
      },
      form: { paddingHorizontal: S.lg, paddingTop: S.xl, paddingBottom: 140 },
      label: {
        fontSize: 14,
        fontWeight: "900",
        color: c.text.secondary,
        marginBottom: 8,
      },
      row: { flexDirection: "row", alignItems: "center" },
      rowGap: { width: 12 },
      tfWrap: {
        minHeight: 56,
        borderRadius: 16,
        paddingHorizontal: 16,
        backgroundColor: c.bg.surface,
        borderWidth: 1,
      },
      tfInput: { fontSize: 16, fontWeight: "800", paddingVertical: 0 },
      miniBtn: {
        height: 56,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border.default,
        backgroundColor: c.bg.muted,
        alignItems: "center",
        justifyContent: "center",
      },
      miniBtnText: { fontSize: 15, fontWeight: "900", color: c.text.primary },
      helper: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: "800",
        color: c.text.secondary,
      },
      grid2: { flexDirection: "row", alignItems: "center" },
      col: { flex: 1 },
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
      },
      submitBtn: {
        height: 62,
        borderRadius: 18,
        shadowColor: withAlpha(c.brand.primary, 0.35),
        shadowOpacity: 1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      },
    });
  }, [c]);

  const onSubmit = async () => {
    // [추가] 이미 제출 중이면 함수를 실행하지 않고 종료
    if (submitting) return;
    setSubmitting(true);
    try {
      const driverProfilePayload = {
        carNum: normalizePlate(plateNo),
        carType: carType || "CARGO",
        tonnage: Number.parseFloat(mapTon(ton).replace("t", "")),
        type: vehicleType || "NORMAL",
        career: Number.parseInt(digitsOnly(expYears), 10) || 0,
        address,
        lat: addressLat ?? undefined,
        lng: addressLng ?? undefined,
        bankName: "",
        accountNum: "",
      };

      const payload: RegisterRequest = {
        email: email.trim(),
        password,
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        role: "DRIVER",
        gender,
        age: parseBirthDateToAge(String(birthDate ?? "")),
        delflag: "N",
        regflag: "Y",
        ratingAvg: 0,
        user_level: 0,
        driver: driverProfilePayload,
      };

      await AuthService.register(payload);
      await UserService.saveDriverProfile(driverProfilePayload);

      if (profileImageUri) {
        try {
          const persistedUri = await persistProfileImage(String(profileImageUri));
          await UserService.uploadProfileImage(toUploadFile(persistedUri));
          await AsyncStorage.setItem(PROFILE_IMAGE_STORAGE_KEY, persistedUri);
        } catch (imageError) {
          console.error("signup profile image upload failed", imageError);
        }
      }
      await saveCurrentUserSnapshot({
        email,
        name,
        nickname: nickname.trim(),
        role: "DRIVER",
        gender,
        birthDate: String(birthDate ?? "").trim() || undefined,
        activityAddress: address,
        activityLat: addressLat ?? undefined,
        activityLng: addressLng ?? undefined,
        driverCarNum: normalizePlate(plateNo),
        driverCarType: carType || "CARGO",
        driverType: vehicleType || "NORMAL",
        driverTonnage: Number.parseFloat(mapTon(ton).replace("t", "")),
        driverCareer: Number.parseInt(digitsOnly(expYears), 10) || 0,
      });

      router.replace("/(driver)/(tabs)");
    } catch (e: any) {
      showMsg("오류", e.response?.data?.message ?? "가입 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const carTypeOptions = [
    { label: "카고", value: "CARGO" },
    { label: "윙바디", value: "WING" },
    { label: "탑차", value: "TOP" },
  ];
  const vehicleTypeOptions = [
    { label: "일반", value: "NORMAL" },
    { label: "냉동/냉장", value: "COLD" },
    { label: "리프트", value: "LIFT" },
  ];
  const tonOptions = [
    { label: "1톤", value: "1T" },
    { label: "1.4톤", value: "1_4T" },
    { label: "2.5톤", value: "2_5T" },
    { label: "5톤", value: "5T" },
    { label: "11톤", value: "11T" },
  ];

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <AddressSearch
        visible={isPostcodeOpen}
        onClose={() => setIsPostcodeOpen(false)}
        onComplete={({ address: selectedAddress, lat, lng }) => {
          setAddress(selectedAddress);
          setAddressLat(typeof lat === "number" ? lat : null);
          setAddressLng(typeof lng === "number" ? lng : null);

          if (typeof lat !== "number" || typeof lng !== "number") {
            showMsg("좌표 확인 필요", "주소는 선택됐지만 좌표를 가져오지 못했습니다. 다시 선택해주세요.");
          }
        }}
      />


      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={26} color={c.text.primary} />
        </Pressable>
      </View>

      <View style={s.titleWrap}>
        <Text style={s.title}>차량 정보를{"\n"}입력해주세요.</Text>
        <Text style={s.subtitle}>정확한 배차를 위해 필수입니다.</Text>
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
          <Text style={s.label}>닉네임</Text>
          <TextField
            value={nickname}
            onChangeText={setNickname}
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

          <View style={{ height: 16 }} />

          {/* 차량 번호 */}
          <Text style={s.label}>차량 번호</Text>
          <TextField
            value={plateNo}
            onChangeText={setPlateNo}
            placeholder="예: 80아 1234"
            autoCapitalize="none"
            inputWrapStyle={s.tfWrap}
            inputStyle={s.tfInput}
          />

          <View style={{ height: 16 }} />

          {/* 차종 / 차량 타입 / 톤수 */}
          <View style={s.grid2}>
            <View style={s.col}>
              <Text style={s.label}>차종</Text>
              <SelectField
                label="차종"
                value={carType}
                placeholder="카고"
                options={carTypeOptions}
                onChange={setCarType}
              />
            </View>
            <View style={s.rowGap} />
            <View style={s.col}>
              <Text style={s.label}>차량 타입</Text>
              <SelectField
                label="차량 타입"
                value={vehicleType}
                placeholder="일반"
                options={vehicleTypeOptions}
                onChange={setVehicleType}
              />
            </View>
          </View>

          <View style={{ height: 16 }} />

          <Text style={s.label}>톤수</Text>
          <SelectField
            label="톤수"
            value={ton}
            placeholder="1톤"
            options={tonOptions}
            onChange={setTon}
          />

          <View style={{ height: 16 }} />

          {/* 경력(년) */}
          <Text style={s.label}>경력 (년)</Text>
          <TextField
            value={expYears}
            onChangeText={setExpYears}
            placeholder="예: 3"
            keyboardType="number-pad"
            inputWrapStyle={s.tfWrap}
            inputStyle={s.tfInput}
            errorText={
              expYears.length > 0 && digitsOnly(expYears).length === 0
                ? "숫자만 입력해주세요."
                : undefined
            }
          />

          <View style={{ height: 16 }} />

          {/* 주소 입력 필드 추가 */}
          <Text style={s.label}>활동 지역 (주소)</Text>
          <Pressable onPress={() => setIsPostcodeOpen(true)}>
            <View pointerEvents="none">
              <TextField
                value={address}
                placeholder="주소 검색"
                inputWrapStyle={s.tfWrap}
                inputStyle={s.tfInput}
                errorText={
                  address.length > 0 && !addressCoordsOk
                    ? "주소 좌표를 확인하지 못했습니다. 다시 선택해주세요."
                    : undefined
                }
              />
            </View>
          </Pressable>
          <Text style={s.helper}>
            {addressCoordsOk
              ? `좌표 저장됨: ${addressLat?.toFixed(6)}, ${addressLng?.toFixed(6)}`
              : "기사님의 활동 거점을 기준으로 오더가 추천됩니다."}
          </Text>

        </ScrollView>

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
