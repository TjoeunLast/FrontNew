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
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

const PROFILE_IMAGE_STORAGE_KEY = "baro_profile_image_url_v1";

type ProfileState = {
  nickname: string;
  gender: string;
  birthDate: string;
  shipperType: string;
  role: string;
  email: string;
  imageUrl: string;
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

function resolveShipperType(me: any, detail?: any) {
  const explicitType = toShipperTypeLabel(
    me?.isCorporate ??
      detail?.isCorporate ??
      me?.is_corporate ??
      detail?.is_corporate ??
      me?.shipper?.isCorporate ??
      detail?.shipper?.isCorporate ??
      me?.shipper?.is_corporate ??
      detail?.shipper?.is_corporate ??
      me?.shipperInfo?.isCorporate ??
      detail?.shipperInfo?.isCorporate ??
      me?.shipperInfo?.is_corporate ??
      detail?.shipperInfo?.is_corporate ??
      me?.shipperDto?.isCorporate
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

function normalizeNickname(input?: string) {
  const v = String(input ?? "").trim();
  if (!v) return "-";
  return v;
}

async function persistProfileImage(uri: string): Promise<string> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return uri;

  const cleanUri = uri.split("?")[0] || uri;
  const ext = cleanUri.includes(".") ? cleanUri.substring(cleanUri.lastIndexOf(".")) : ".jpg";
  const safeExt = ext.length >= 2 && ext.length <= 5 ? ext : ".jpg";
  const targetUri = `${docDir}profile-image${safeExt}`;

  await FileSystem.copyAsync({ from: uri, to: targetUri });
  return targetUri;
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = React.useState<ProfileState>({
    nickname: "-",
    gender: "-",
    birthDate: "-",
    shipperType: "-",
    role: "",
    email: "-",
    imageUrl: "",
  });
  const [draftImageUri, setDraftImageUri] = React.useState("");
  const [loadingImage, setLoadingImage] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
        const localImageUrl = (await AsyncStorage.getItem(PROFILE_IMAGE_STORAGE_KEY)) ?? "";

        try {
          const me = (await UserService.getMyInfo()) as any;
          const detail = await fetchRoleDetail(me?.role);
          const cached = await getCurrentUserSnapshot();
          const next: ProfileState = {
            nickname: normalizeNickname(me.nickname ?? cached?.nickname),
            gender: normalizeGenderFromAny(pickGender(me, detail, cached ?? undefined)),
            birthDate: normalizeBirthDateFromAny(pickBirthDate(me, detail, cached ?? undefined)),
            shipperType: resolveShipperType(me, detail),
            role: String(me?.role ?? cached?.role ?? "").trim().toUpperCase(),
            email: normalizeEmail(me.email ?? cached?.email),
            imageUrl: localImageUrl || me.profileImageUrl || "",
          };
          if (!active) return;
          setProfile(next);
          setDraftImageUri(next.imageUrl);
          return;
        } catch {
          const cached = await getCurrentUserSnapshot();
          if (!active) return;
          const next: ProfileState = {
            nickname: normalizeNickname(cached?.nickname),
            gender: normalizeGenderFromAny(cached?.gender),
            birthDate: normalizeBirthDateFromAny(cached?.birthDate),
            shipperType: "-",
            role: String(cached?.role ?? "").trim().toUpperCase(),
            email: normalizeEmail(cached?.email),
            imageUrl: localImageUrl,
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

  const onSaveImage = async () => {
    if (!hasImageChange || loadingImage) return;
    setLoadingImage(true);
    try {
      if (!draftImageUri) {
        await AsyncStorage.removeItem(PROFILE_IMAGE_STORAGE_KEY);
        setProfile((prev) => ({ ...prev, imageUrl: "" }));
        Alert.alert("수정 완료", "프로필 사진이 기본 이미지로 변경되었습니다.");
        return;
      }

      const persistedUri = await persistProfileImage(draftImageUri);
      await AsyncStorage.setItem(PROFILE_IMAGE_STORAGE_KEY, persistedUri);
      setProfile((prev) => ({ ...prev, imageUrl: persistedUri }));
      setDraftImageUri(persistedUri);
      Alert.alert("수정 완료", "프로필 사진이 저장되었습니다.");
    } catch {
      Alert.alert("수정 실패", "이미지 저장 중 문제가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoadingImage(false);
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
          backgroundColor: hasImageChange ? c.brand.primary : c.bg.muted,
          opacity: loadingImage ? 0.7 : 1,
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
          color: hasImageChange ? c.text.inverse : c.text.secondary,
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
      }),
    [c, hasImageChange, loadingImage]
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
          router.replace("/(shipper)/(tabs)/my" as any);
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
              <Text style={s.label}>성별</Text>
              <Text style={s.value}>{profile.gender}</Text>
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
              <Text style={s.label}>생년월일</Text>
              <Text style={s.value}>{profile.birthDate}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={[s.bottomActionBar, { paddingBottom: Math.max(10, insets.bottom + 6) }]}>
        <Pressable
          style={[s.saveBtn, s.saveBtnOutside]}
          onPress={() => void onSaveImage()}
          disabled={!hasImageChange || loadingImage}
        >
          <Text style={s.saveBtnText}>{loadingImage ? "처리 중..." : "수정"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
