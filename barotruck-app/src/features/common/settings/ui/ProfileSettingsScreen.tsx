import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import apiClient from "@/shared/api/apiClient";
import { ReviewService } from "@/shared/api/reviewService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";
import { buildProfileImageFileStem, buildProfileImageStorageKey } from "@/shared/utils/profileImageStorage";

type ProfileState = {
  name: string;
  nickname: string;
  gender: string;
  ageLabel: string;
  shipperType: string;
  role: string;
  email: string;
  phone: string;
  imageUrl: string;
  ratingAvg: number;
  ratingCount: number;
  activityAddress: string;
  activityLat?: number;
  activityLng?: number;
  driverCarNum?: string;
  driverCarType?: string;
  driverType?: string;
  driverTonnage?: number;
  driverCareer?: number;
  driverBankName?: string;
  driverAccountNum?: string;
  driverNbhId?: number;
  shipperCompanyName?: string;
  shipperBizRegNum?: string;
  shipperRepresentative?: string;
  shipperIsCorporate?: "Y" | "N";
};

function toShipperTypeLabel(raw?: string) {
  const v = String(raw ?? "").trim().toUpperCase();
  if (!v) return "-";
  if (
    v === "Y" ||
    v === "TRUE" ||
    v === "T" ||
    v === "1" ||
    v === "CORPORATE" ||
    v === "BUSINESS" ||
    v === "BIZ" ||
    v === "사업자"
  ) {
    return "사업자";
  }
  if (
    v === "N" ||
    v === "FALSE" ||
    v === "F" ||
    v === "0" ||
    v === "PERSONAL" ||
    v === "INDIVIDUAL" ||
    v === "개인"
  ) {
    return "개인";
  }
  return "-";
}

function resolveShipperType(me: any, detail?: any, cached?: { shipperType?: "Y" | "N" }) {
  const explicitType = toShipperTypeLabel(
    me?.isCorporate ??
      detail?.isCorporate ??
      me?.is_corporate ??
      detail?.is_corporate ??
      me?.user?.isCorporate ??
      detail?.user?.isCorporate ??
      me?.user?.is_corporate ??
      detail?.user?.is_corporate ??
      me?.shipper?.isCorporate ??
      detail?.shipper?.isCorporate ??
      me?.shipper?.is_corporate ??
      detail?.shipper?.is_corporate ??
      me?.user?.shipper?.isCorporate ??
      detail?.user?.shipper?.isCorporate ??
      me?.user?.shipper?.is_corporate ??
      detail?.user?.shipper?.is_corporate ??
      me?.shipperInfo?.isCorporate ??
      detail?.shipperInfo?.isCorporate ??
      me?.shipperInfo?.is_corporate ??
      detail?.shipperInfo?.is_corporate ??
      me?.shipperDto?.isCorporate ??
      me?.shipperType ??
      cached?.shipperType
  );
  if (explicitType !== "-") return explicitType;

  const hasBizInfo = Boolean(
    me?.bizRegNum ??
      detail?.bizRegNum ??
      me?.biz_reg_num ??
      detail?.biz_reg_num ??
      me?.shipper?.bizRegNum ??
      detail?.shipper?.bizRegNum ??
      me?.shipper?.biz_reg_num ??
      detail?.shipper?.biz_reg_num ??
      me?.shipperInfo?.bizRegNum ??
      detail?.shipperInfo?.bizRegNum ??
      me?.shipperInfo?.biz_reg_num ??
      detail?.shipperInfo?.biz_reg_num ??
      me?.companyName ??
      detail?.companyName ??
      me?.company_name ??
      detail?.company_name ??
      me?.shipper?.companyName ??
      detail?.shipper?.companyName ??
      me?.shipper?.company_name ??
      detail?.shipper?.company_name ??
      me?.shipperInfo?.companyName
  );
  return hasBizInfo ? "사업자" : "개인";
}

function normalizeGender(input?: string) {
  const v = String(input ?? "").trim().toUpperCase();
  if (!v) return "-";
  if (v === "M" || v === "MALE" || v === "남" || v === "남성") return "남성";
  if (v === "F" || v === "FEMALE" || v === "여" || v === "여성") return "여성";
  return String(input).trim();
}

function normalizeBirthDate(input?: string) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return "-";
  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return "-";
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

function normalizeBirthDateFromAny(input?: unknown) {
  if (input == null) return "-";
  const raw = String(input).trim();
  if (!raw) return "-";
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return normalizeBirthDate(`${iso[1]}${iso[2]}${iso[3]}`);
  return normalizeBirthDate(raw);
}

function getAgeFromBirthDate(input?: unknown) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return undefined;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  const today = new Date();
  let age = today.getFullYear() - year;
  const passed = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!passed) age -= 1;
  return age > 0 ? age : undefined;
}

function normalizeAgeFromAny(ageInput?: unknown, birthDateInput?: unknown) {
  const age = Number(ageInput);
  if (Number.isFinite(age) && age > 0) return `${Math.floor(age)}세`;
  const derivedAge = getAgeFromBirthDate(birthDateInput);
  return derivedAge ? `${derivedAge}세` : "-";
}

function normalizeGenderFromAny(input?: unknown) {
  if (input == null) return "-";
  const raw = String(input).trim();
  if (!raw) return "-";
  return normalizeGender(raw);
}

async function fetchRoleDetail(role?: string) {
  const normalized = String(role ?? "").trim().toUpperCase();
  if (!normalized) return null;
  try {
    if (normalized === "SHIPPER") {
      const res = await apiClient.get("/api/v1/shippers/me");
      return res.data;
    }
    if (normalized === "DRIVER") {
      const res = await apiClient.get("/api/v1/drivers/me");
      return res.data;
    }
  } catch {
    return null;
  }
  return null;
}

function pickBirthDate(me: any, detail: any, cached?: { birthDate?: string }) {
  return (
    me?.birthDate ??
    detail?.birthDate ??
    me?.birth_date ??
    detail?.birth_date ??
    me?.birthday ??
    detail?.birthday ??
    me?.birth ??
    detail?.birth ??
    me?.dateOfBirth ??
    detail?.dateOfBirth ??
    me?.dob ??
    detail?.dob ??
    detail?.user?.birthDate ??
    detail?.user?.birth_date ??
    detail?.user?.birthday ??
    detail?.user?.birth ??
    detail?.user?.dateOfBirth ??
    detail?.user?.dob ??
    cached?.birthDate
  );
}

function pickGender(me: any, detail: any, cached?: { gender?: "M" | "F" }) {
  return me?.gender ?? detail?.gender ?? me?.sex ?? detail?.sex ?? detail?.user?.gender ?? detail?.user?.sex ?? cached?.gender;
}

function normalizeEmail(input?: string) {
  const v = String(input ?? "").trim();
  if (!v) return "-";
  return v;
}

function normalizePhone(input?: string) {
  const raw = String(input ?? "").trim();
  if (!raw) return "-";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    if (digits.startsWith("02")) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return raw;
}

function resolveShipperCorporateValue(me: any, detail: any, cached?: { shipperType?: "Y" | "N" }): "Y" | "N" | undefined {
  const raw = String(
    me?.isCorporate ??
      detail?.isCorporate ??
      me?.is_corporate ??
      detail?.is_corporate ??
      me?.shipper?.isCorporate ??
      detail?.shipper?.isCorporate ??
      me?.shipperInfo?.isCorporate ??
      detail?.shipperInfo?.isCorporate ??
      cached?.shipperType ??
      ""
  )
    .trim()
    .toUpperCase();

  if (["Y", "TRUE", "T", "1", "CORPORATE", "BUSINESS", "BIZ", "사업자"].includes(raw)) return "Y";
  if (["N", "FALSE", "F", "0", "PERSONAL", "INDIVIDUAL", "개인"].includes(raw)) return "N";
  return undefined;
}

function normalizeNickname(input?: string) {
  const v = String(input ?? "").trim();
  if (!v) return "-";
  return v;
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function pickPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return undefined;
}

function normalizeRating(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

async function persistProfileImage(uri: string, identity?: string): Promise<string> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return uri;

  const cleanUri = uri.split("?")[0] || uri;
  const ext = cleanUri.includes(".") ? cleanUri.substring(cleanUri.lastIndexOf(".")) : ".jpg";
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
  const ext = normalized.includes(".") ? normalized.substring(normalized.lastIndexOf(".") + 1).toLowerCase() : "jpg";
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

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = React.useState<ProfileState>({
    name: "-",
    nickname: "-",
    gender: "-",
    ageLabel: "-",
    shipperType: "-",
    role: "",
    email: "-",
    phone: "-",
    imageUrl: "",
    ratingAvg: 0,
    ratingCount: 0,
    activityAddress: "-",
  });
  const [draftImageUri, setDraftImageUri] = React.useState("");
  const [loadingImage, setLoadingImage] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
        const cached = await getCurrentUserSnapshot();

        try {
          const me = (await UserService.getMyInfo()) as any;
          const [detail, receivedReviews] = await Promise.all([
            fetchRoleDetail(me?.role),
            me?.userId ? ReviewService.getReviewsByTarget(Number(me.userId)).catch(() => []) : Promise.resolve([]),
          ]);
          const localImageUrl = (await AsyncStorage.getItem(buildProfileImageStorageKey(me?.email ?? cached?.email))) ?? "";
          const validRatings = (Array.isArray(receivedReviews) ? receivedReviews : [])
            .map((row: any) => Number(row?.rating))
            .filter((value: number) => Number.isFinite(value));
          const reviewBasedAvg =
            validRatings.length > 0
              ? validRatings.reduce((acc: number, cur: number) => acc + cur, 0) / validRatings.length
              : null;
          const ratingAvg = normalizeRating(reviewBasedAvg ?? me?.ratingAvg ?? detail?.ratingAvg ?? 0);
          const next: ProfileState = {
            name: normalizeNickname(me.name ?? cached?.name),
            nickname: normalizeNickname(me.nickname ?? cached?.nickname),
            gender: normalizeGenderFromAny(pickGender(me, detail, cached ?? undefined)),
            ageLabel: normalizeAgeFromAny(
              me?.age ?? detail?.age ?? detail?.user?.age ?? cached?.age,
              pickBirthDate(me, detail, cached ?? undefined)
            ),
            shipperType: resolveShipperType(me, detail, cached ?? undefined),
            role: String(me?.role ?? cached?.role ?? "").trim().toUpperCase(),
            email: normalizeEmail(me.email ?? cached?.email),
            phone: normalizePhone(
              pickFirstText(me?.phone, me?.user?.phone, detail?.phone, detail?.user?.phone, detail?.driver?.phone, cached?.phone)
            ),
            imageUrl: localImageUrl || me.profileImageUrl || "",
            ratingAvg,
            ratingCount: validRatings.length,
            activityAddress: normalizeNickname(
              pickFirstText(
                detail?.address,
                detail?.driver?.address,
                detail?.bizAddress,
                detail?.shipper?.bizAddress,
                detail?.shipperInfo?.bizAddress,
                cached?.activityAddress
              )
            ),
            activityLat: detail?.lat ?? detail?.driver?.lat ?? cached?.activityLat,
            activityLng: detail?.lng ?? detail?.driver?.lng ?? cached?.activityLng,
            driverCarNum: pickFirstText(detail?.carNum, detail?.driver?.carNum, cached?.driverCarNum),
            driverCarType: pickFirstText(detail?.carType, detail?.driver?.carType, cached?.driverCarType),
            driverType: pickFirstText(detail?.type, detail?.driver?.type, cached?.driverType),
            driverTonnage: pickPositiveNumber(detail?.tonnage, detail?.driver?.tonnage, cached?.driverTonnage),
            driverCareer: detail?.career ?? detail?.driver?.career ?? cached?.driverCareer,
            driverBankName: pickFirstText(detail?.bankName, detail?.driver?.bankName),
            driverAccountNum: pickFirstText(detail?.accountNum, detail?.driver?.accountNum),
            driverNbhId: detail?.nbhId ?? detail?.driver?.nbhId,
            shipperCompanyName: pickFirstText(
              detail?.companyName,
              detail?.company_name,
              detail?.shipper?.companyName,
              detail?.shipper?.company_name,
              detail?.shipperInfo?.companyName,
              detail?.shipperInfo?.company_name
            ),
            shipperBizRegNum: pickFirstText(
              detail?.bizRegNum,
              detail?.biz_reg_num,
              detail?.shipper?.bizRegNum,
              detail?.shipper?.biz_reg_num,
              detail?.shipperInfo?.bizRegNum,
              detail?.shipperInfo?.biz_reg_num
            ),
            shipperRepresentative: pickFirstText(
              detail?.representative,
              detail?.representative_name,
              detail?.shipper?.representative,
              detail?.shipper?.representative_name,
              detail?.shipperInfo?.representative,
              detail?.shipperInfo?.representative_name
            ),
            shipperIsCorporate: resolveShipperCorporateValue(me, detail, cached ?? undefined),
          };
          if (!active) return;
          setProfile(next);
          setDraftImageUri(next.imageUrl);
          return;
        } catch {
          if (!active) return;
          const localImageUrl = (await AsyncStorage.getItem(buildProfileImageStorageKey(cached?.email))) ?? "";
          const next: ProfileState = {
            name: normalizeNickname(cached?.name),
            nickname: normalizeNickname(cached?.nickname),
            gender: normalizeGenderFromAny(cached?.gender),
            ageLabel: normalizeAgeFromAny(cached?.age, cached?.birthDate),
            shipperType: resolveShipperType(cached, undefined, cached ?? undefined),
            role: String(cached?.role ?? "").trim().toUpperCase(),
            email: normalizeEmail(cached?.email),
            phone: normalizePhone(cached?.phone),
            imageUrl: localImageUrl,
            ratingAvg: 0,
            ratingCount: 0,
            activityAddress: normalizeNickname(cached?.activityAddress),
            activityLat: cached?.activityLat,
            activityLng: cached?.activityLng,
            driverCarNum: cached?.driverCarNum,
            driverCarType: cached?.driverCarType,
            driverType: cached?.driverType,
            driverTonnage: cached?.driverTonnage,
            driverCareer: cached?.driverCareer,
          };
          setProfile(next);
          setDraftImageUri(next.imageUrl);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "갤러리 접근 권한을 허용해 주세요.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setDraftImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "카메라 접근 권한을 허용해 주세요.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setDraftImageUri(result.assets[0].uri);
  };

  const openEditMenu = () => {
    if (loadingImage) return;
    Alert.alert("프로필 사진 수정", "원하는 방식을 선택하세요.", [
      {
        text: "갤러리에서 선택",
        onPress: () => {
          void (async () => {
            setLoadingImage(true);
            try {
              await pickFromGallery();
            } finally {
              setLoadingImage(false);
            }
          })();
        },
      },
      {
        text: "카메라로 촬영",
        onPress: () => {
          void (async () => {
            setLoadingImage(true);
            try {
              await takePhoto();
            } finally {
              setLoadingImage(false);
            }
          })();
        },
      },
      {
        text: "기본 이미지로 변경",
        style: "destructive",
        onPress: () => setDraftImageUri(""),
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  const hasImageChange = draftImageUri !== profile.imageUrl;
  const hasPendingChanges = hasImageChange;
  const isBusy = loadingImage || savingProfile;

  const saveImageChange = async () => {
    if (!hasImageChange) return "unchanged" as const;
    const storageKey = buildProfileImageStorageKey(profile.email);
    if (!draftImageUri) {
      await UserService.deleteProfileImage();
      await AsyncStorage.removeItem(storageKey);
      setProfile((prev) => ({ ...prev, imageUrl: "" }));
      setDraftImageUri("");
      return "reset" as const;
    }

    const persistedUri = await persistProfileImage(draftImageUri, profile.email);
    await UserService.uploadProfileImage(toUploadFile(persistedUri));
    await AsyncStorage.setItem(storageKey, persistedUri);
    setProfile((prev) => ({ ...prev, imageUrl: persistedUri }));
    setDraftImageUri(persistedUri);
    return "saved" as const;
  };

  const onSaveProfile = async () => {
    if (!hasPendingChanges || isBusy) return;
    setSavingProfile(true);
    try {
      const imageResult = await saveImageChange();

      if (imageResult === "reset") {
        Alert.alert("수정 완료", "프로필 사진이 기본 이미지로 변경되었습니다.");
        return;
      }
      if (imageResult === "saved") {
        Alert.alert("수정 완료", "프로필 사진이 저장되었습니다.");
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "프로필 저장 중 문제가 발생했습니다. 다시 시도해 주세요.";
      Alert.alert("수정 실패", message);
    } finally {
      setSavingProfile(false);
    }
  };

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 20, paddingTop: 12, paddingBottom: 36 } as ViewStyle,
        card: {
          padding: 18,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        avatarWrap: {
          width: 104,
          alignSelf: "center",
          alignItems: "center",
          marginTop: 2,
          marginBottom: 14,
          position: "relative",
        } as ViewStyle,
        avatarCircle: {
          width: 104,
          height: 104,
          borderRadius: 52,
          overflow: "hidden",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: c.bg.muted,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ViewStyle,
        avatarImage: { width: "100%", height: "100%" } as ImageStyle,
        editIconButton: {
          position: "absolute",
          top: -2,
          right: -2,
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        saveBtn: {
          height: 44,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: hasPendingChanges ? c.brand.primary : c.bg.muted,
          opacity: isBusy ? 0.7 : 1,
        } as ViewStyle,
        saveBtnOutside: {
          marginHorizontal: 20,
        } as ViewStyle,
        bottomActionBar: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: c.bg.canvas,
          borderTopWidth: 1,
          borderTopColor: c.border.default,
          paddingTop: 10,
        } as ViewStyle,
        saveBtnText: {
          color: hasPendingChanges ? c.text.inverse : c.text.secondary,
          fontSize: 14,
          fontWeight: "800",
        } as TextStyle,
        infoTitle: { marginTop: 20, color: c.text.secondary, fontSize: 12, fontWeight: "800" } as TextStyle,
        infoTable: {
          marginTop: 8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border.default,
          overflow: "hidden",
        } as ViewStyle,
        row: {
          minHeight: 48,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        rowDivider: { height: 1, backgroundColor: c.border.default } as ViewStyle,
        label: { color: c.text.secondary, fontSize: 13, fontWeight: "700" } as TextStyle,
        value: { color: c.text.primary, fontSize: 14, fontWeight: "800" } as TextStyle,
        valueRating: { color: "#B45309" } as TextStyle,
      }),
    [c, hasPendingChanges, isBusy]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="프로필 설정"
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace((profile.role === "DRIVER" ? "/(driver)/(tabs)/mypage" : "/(shipper)/(tabs)/my") as any);
        }}
      />
      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingBottom: Math.max(120, insets.bottom + 88),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <View style={s.avatarWrap}>
            <View style={s.avatarCircle}>
              {draftImageUri ? (
                <Image source={{ uri: draftImageUri }} style={s.avatarImage} resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={56} color={c.text.secondary} />
              )}
            </View>
            <Pressable style={s.editIconButton} onPress={openEditMenu} disabled={loadingImage}>
              <Ionicons name="create-outline" size={16} color={c.text.primary} />
            </Pressable>
          </View>

          <Text style={s.infoTitle}>기본 정보</Text>
          <View style={s.infoTable}>
            <View style={s.row}>
              <Text style={s.label}>닉네임</Text>
              <Text style={s.value}>{profile.nickname}</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.label}>평점</Text>
              <Text style={[s.value, s.valueRating]}>
                {`${profile.ratingAvg.toFixed(1)}점 (${profile.ratingCount}개 리뷰)`}
              </Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.label}>성별</Text>
              <Text style={s.value}>{profile.gender}</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.label}>활동 지역</Text>
              <Text style={s.value}>{profile.activityAddress}</Text>
            </View>
            {profile.role !== "DRIVER" ? (
              <>
                <View style={s.rowDivider} />
                <View style={s.row}>
                  <Text style={s.label}>화주 구분</Text>
                  <Text style={s.value}>{profile.shipperType}</Text>
                </View>
              </>
            ) : null}
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.label}>이메일</Text>
              <Text style={s.value}>{profile.email}</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.label}>전화번호</Text>
              <Text style={s.value}>{profile.phone}</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.label}>나이</Text>
              <Text style={s.value}>{profile.ageLabel}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={[s.bottomActionBar, { paddingBottom: Math.max(10, insets.bottom + 6) }]}>
        <Pressable
          style={[s.saveBtn, s.saveBtnOutside]}
          onPress={() => void onSaveProfile()}
          disabled={!hasPendingChanges || isBusy}
        >
          <Text style={s.saveBtnText}>{isBusy ? "처리 중..." : "수정"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
