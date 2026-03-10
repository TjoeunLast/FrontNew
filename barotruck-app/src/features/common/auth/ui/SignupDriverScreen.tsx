import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthService } from "@/shared/api/authService";
import { buildDriverProfilePayload, UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { RegisterRequest } from "@/shared/models/auth";
import { Button } from "@/shared/ui/base/Button";
import { TextField } from "@/shared/ui/form/TextField";
import AddressSearch from "@/shared/utils/AddressSearch";
import { withAlpha } from "@/shared/utils/color";
import { saveCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";
import { buildProfileImageFileStem, buildProfileImageStorageKey } from "@/shared/utils/profileImageStorage";

async function persistProfileImage(uri: string, identity?: string): Promise<string> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return uri;

  const cleanUri = uri.split("?")[0] || uri;
  const ext = cleanUri.includes(".")
    ? cleanUri.substring(cleanUri.lastIndexOf("."))
    : ".jpg";
  const safeExt = ext.length >= 2 && ext.length <= 5 ? ext : ".jpg";
  const targetUri = `${docDir}${buildProfileImageFileStem(identity)}${safeExt}`;

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

function showMsg(title: string, msg: string) {
  if (Platform.OS === "web") globalThis.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}

function digitsOnly(v: string) {
  return v.replaceAll(/\D/g, "");
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
          borderRadius: 12,
          paddingHorizontal: 16,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        wrapActive: {
          borderColor: c.brand.primary,
          borderWidth: 1.5,
        },
        text: { fontSize: 16, fontWeight: "600", color: c.text.primary },
        placeholder: { color: c.text.secondary },
        dropdownMenu: {
          marginTop: 8,
          borderRadius: 12,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        option: {
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: withAlpha(c.border.default, 0.4),
        },
        optionLast: {
          borderBottomWidth: 0,
        },
        optionText: { fontSize: 15, fontWeight: "600", color: c.text.primary },
        optionTextActive: { color: c.brand.primary, fontWeight: "800" },
      }),
    [c],
  );

  return (
    <View style={{ zIndex: open ? 10 : 1 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        disabled={disabled}
        style={({ pressed }) => [
          s.wrap,
          value && s.wrapActive,
          disabled && { opacity: 0.6 },
          pressed && !disabled && { backgroundColor: c.bg.muted },
        ]}
      >
        <Text style={[s.text, !selectedLabel && s.placeholder]}>
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={c.text.secondary}
        />
      </Pressable>

      {open && (
        <View style={s.dropdownMenu}>
          {options.map((o, index) => {
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
                  index === options.length - 1 && s.optionLast,
                  pressed && { backgroundColor: c.bg.muted },
                ]}
              >
                <Text style={[s.optionText, active && s.optionTextActive]}>
                  {o.label}
                </Text>
                {active && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={c.brand.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
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

  const onSubmit = async () => {
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
        driver: buildDriverProfilePayload(driverProfilePayload) as RegisterRequest["driver"],
      };

      await AuthService.register(payload);
      await UserService.saveDriverProfile(driverProfilePayload);

      if (profileImageUri) {
        try {
          const persistedUri = await persistProfileImage(
            String(profileImageUri),
            email,
          );
          const uploadedImageUrl = await UserService.uploadProfileImage(toUploadFile(persistedUri));
          await AsyncStorage.setItem(buildProfileImageStorageKey(email), uploadedImageUrl || persistedUri);
        } catch (imageError) {
          console.error("signup profile image upload failed", imageError);
        }
      }
      await saveCurrentUserSnapshot({
        email,
        name,
        nickname: nickname.trim(),
        phone: phone.trim(),
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

  const s = getStyles(c);

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
            showMsg(
              "좌표 확인 필요",
              "주소는 선택됐지만 좌표를 가져오지 못했습니다. 다시 선택해주세요.",
            );
          }
        }}
      />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
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
          <View style={s.titleWrap}>
            <Text style={s.title}>차량 정보를{"\n"}입력해주세요.</Text>
            {/* <Text style={s.subtitle}>정확한 배차를 위해 필수입니다.</Text> */}
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

          <View style={{ height: 24 }} />

          <Text style={s.label}>차량 번호</Text>
          <TextField
            value={plateNo}
            onChangeText={setPlateNo}
            placeholder="예: 80아 1234"
            autoCapitalize="none"
            inputWrapStyle={[
              s.tfWrap,
              plateNo.length > 0 && plateOk && s.tfWrapSuccess,
            ]}
            inputStyle={s.tfInput}
          />

          <View style={{ height: 24 }} />

          <View style={s.grid2}>
            <View style={[s.col, { zIndex: 10 }]}>
              <Text style={s.label}>차종</Text>
              <SelectField
                label="차종"
                value={carType}
                placeholder="선택"
                options={carTypeOptions}
                onChange={setCarType}
              />
            </View>
            <View style={s.rowGap} />
            <View style={[s.col, { zIndex: 9 }]}>
              <Text style={s.label}>차량 타입</Text>
              <SelectField
                label="차량 타입"
                value={vehicleType}
                placeholder="선택"
                options={vehicleTypeOptions}
                onChange={setVehicleType}
              />
            </View>
          </View>

          <View style={{ height: 24, zIndex: 8 }} />

          <View style={{ zIndex: 8 }}>
            <Text style={s.label}>톤수</Text>
            <SelectField
              label="톤수"
              value={ton}
              placeholder="선택"
              options={tonOptions}
              onChange={setTon}
            />
          </View>

          <View style={{ height: 24, zIndex: 7 }} />

          <Text style={s.label}>경력 (년)</Text>
          <TextField
            value={expYears}
            onChangeText={setExpYears}
            placeholder="예: 3"
            keyboardType="number-pad"
            inputWrapStyle={[
              s.tfWrap,
              expYears.length > 0 && expOk && s.tfWrapSuccess,
            ]}
            inputStyle={s.tfInput}
            errorText={
              expYears.length > 0 && digitsOnly(expYears).length === 0
                ? "숫자만 입력해주세요."
                : undefined
            }
          />

          <View style={{ height: 24 }} />

          <Text style={s.label}>활동 지역 (주소)</Text>
          <Pressable onPress={() => setIsPostcodeOpen(true)}>
            <View pointerEvents="none">
              <TextField
                value={address}
                placeholder="주소 검색"
                inputWrapStyle={[
                  s.tfWrap,
                  address.length > 0 && addressCoordsOk && s.tfWrapSuccess,
                ]}
                inputStyle={s.tfInput}
                errorText={
                  address.length > 0 && !addressCoordsOk
                    ? "주소 좌표를 확인하지 못했습니다. 다시 선택해주세요."
                    : undefined
                }
              />
            </View>
          </Pressable>
          <Text
            style={[s.helper, addressCoordsOk && { color: c.brand.primary }]}
          >
            {addressCoordsOk
              ? `✅ 선택하신 지역을 중심으로 배차가 추천됩니다.`
              : "기사님의 활동 거점을 기준으로 오더가 추천됩니다."}
          </Text>
        </ScrollView>

        <View style={s.bottomBar} pointerEvents="box-none">
          <Button
            title={submitting ? "가입 중..." : "가입 완료"}
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
    titleWrap: { marginBottom: 24 },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: c.text.primary,
      lineHeight: 40,
      letterSpacing: -0.5,
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
    label: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text.primary,
      marginBottom: 8,
    },
    row: { flexDirection: "row", alignItems: "center" },
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
    grid2: { flexDirection: "row", alignItems: "flex-start", zIndex: 10 },
    col: { flex: 1 },
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
