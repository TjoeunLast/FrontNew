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

import { UserService } from "@/shared/api/userService";
import apiClient from "@/shared/api/apiClient";
import { USE_MOCK } from "@/shared/config/mock";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";


type ProfileState = {
  nickname: string;
  gender: string;
  shipperType: string;
  email: string;
  age: string;
  imageUrl: string;
};

function toShipperTypeLabel(raw?: string) {
  const v = String(raw ?? "").trim().toUpperCase();
  if (!v) return "-";
  if (v === "Y" || v === "CORPORATE" || v === "BUSINESS" || v === "BIZ" || v === "사업자") return "사업자";
  if (v === "N" || v === "PERSONAL" || v === "INDIVIDUAL" || v === "개인") return "개인";
  return "-";
}

function resolveShipperType(me: any) {
  const role = String(me?.role ?? "").toUpperCase();
  if (role !== "SHIPPER") return "-";

  const explicitType = toShipperTypeLabel(
    me?.isCorporate ??
      me?.is_corporate ??
      me?.shipper?.isCorporate ??
      me?.shipper?.is_corporate ??
      me?.shipperInfo?.isCorporate ??
      me?.shipperInfo?.is_corporate ??
      me?.shipperDto?.isCorporate
  );
  if (explicitType !== "-") return explicitType;

  const hasBizInfo = Boolean(
    me?.bizRegNum ??
      me?.biz_reg_num ??
      me?.shipper?.bizRegNum ??
      me?.shipper?.biz_reg_num ??
      me?.shipperInfo?.bizRegNum ??
      me?.shipperInfo?.biz_reg_num ??
      me?.companyName ??
      me?.company_name ??
      me?.shipper?.companyName ??
      me?.shipper?.company_name ??
      me?.shipperInfo?.companyName ??
      me?.shipperInfo?.company_name
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

function normalizeAge(input?: number | string) {
  if (typeof input === "number" && Number.isFinite(input) && input > 0) return `만 ${Math.floor(input)}세`;
  if (typeof input === "string" && input.trim()) {
    const onlyNum = Number(input.replace(/[^\d]/g, ""));
    if (Number.isFinite(onlyNum) && onlyNum > 0) return `만 ${Math.floor(onlyNum)}세`;
  }
  return "-";
}

function calcAgeFromBirthDate(value?: string | number | Date) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  const dayDiff = today.getDate() - d.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age > 0 ? age : undefined;
}

function resolveGenderFromPayload(node: any): string {
  const raw =
    node?.gender ??
    node?.sex ??
    node?.GENDER ??
    node?.SEX ??
    node?.gender_cd ??
    node?.shipper?.gender ??
    node?.shipper?.sex ??
    node?.shipper?.GENDER ??
    node?.shipper?.SEX ??
    node?.shipper?.gender_cd ??
    node?.shipperInfo?.gender ??
    node?.shipperInfo?.sex ??
    node?.shipperInfo?.GENDER ??
    node?.shipperInfo?.SEX ??
    node?.shipperInfo?.gender_cd ??
    node?.shipperDto?.gender ??
    node?.shipperDto?.sex ??
    node?.shipperDto?.GENDER ??
    node?.shipperDto?.SEX ??
    node?.shipperDto?.gender_cd;
  return normalizeGender(raw);
}

function resolveAgeFromPayload(node: any): string {
  const ageRaw =
    node?.age ??
    node?.AGE ??
    node?.user_age ??
    node?.shipper?.age ??
    node?.shipper?.AGE ??
    node?.shipper?.user_age ??
    node?.shipperInfo?.age ??
    node?.shipperInfo?.AGE ??
    node?.shipperInfo?.user_age ??
    node?.shipperDto?.age ??
    node?.shipperDto?.AGE;
  const normalizedAge = normalizeAge(ageRaw);
  if (normalizedAge !== "-") return normalizedAge;

  const birthRaw =
    node?.birthDate ??
    node?.birth ??
    node?.birthday ??
    node?.dob ??
    node?.BIRTH_DATE ??
    node?.BIRTHDATE ??
    node?.BIRTH ??
    node?.BIRTHDAY ??
    node?.DOB ??
    node?.shipper?.birthDate ??
    node?.shipper?.birth ??
    node?.shipper?.BIRTH_DATE ??
    node?.shipper?.BIRTHDATE ??
    node?.shipperInfo?.birthDate ??
    node?.shipperInfo?.BIRTH_DATE ??
    node?.shipperDto?.birthDate ??
    node?.shipperDto?.BIRTH_DATE;
  const birthAge = calcAgeFromBirthDate(birthRaw);
  return birthAge ? `만 ${birthAge}세` : "-";
}

function toProfileOwnerKey(email?: string, userId?: number | string) {
  const emailKey = String(email ?? "").trim().toLowerCase();
  if (emailKey) return emailKey.replace(/[^a-z0-9@._-]/g, "_");
  const idKey = String(userId ?? "").trim();
  if (idKey) return `uid_${idKey.replace(/[^a-z0-9_-]/gi, "_")}`;
  return "guest";
}

function toProfileImageStorageKey(ownerKey: string) {
  return `baro_profile_image_url_v1:${ownerKey}`;
}

async function persistProfileImageByOwner(uri: string, ownerKey: string): Promise<string> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return uri;

  const cleanUri = uri.split("?")[0] || uri;
  const ext = cleanUri.includes(".") ? cleanUri.substring(cleanUri.lastIndexOf(".")) : ".jpg";
  const safeExt = ext.length >= 2 && ext.length <= 5 ? ext : ".jpg";
  const targetUri = `${docDir}profile-image-${ownerKey}${safeExt}`;

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
    shipperType: "-",
    email: "-",
    age: "-",
    imageUrl: "",
  });
  const [draftImageUri, setDraftImageUri] = React.useState("");
  const [loadingImage, setLoadingImage] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
        const cached = await getCurrentUserSnapshot();
        let me: any = null;
        try {
          me = await UserService.getMyInfo();
        } catch {
          me = null;
        }
        let shipperMe: any = null;
        try {
          const role = String(me?.role ?? "").toUpperCase();
          if (!USE_MOCK && role === "SHIPPER") {
            const res = await apiClient.get("/api/v1/shippers/me");
            shipperMe =
              res.data?.data ??
              res.data?.user ??
              res.data?.result ??
              res.data;
          }
        } catch {
          shipperMe = null;
        }
        // Keep `me` as the root source and attach shipper payload as nested fallback.
        // Some shipper endpoints return null user fields and can overwrite valid values.
        const profileSource = shipperMe ? { ...me, shipper: shipperMe } : me;

        const ownerKey = toProfileOwnerKey(profileSource?.email ?? cached?.email, profileSource?.userId);
        const scopedStorageKey = toProfileImageStorageKey(ownerKey);
        const scopedImageUrl = (await AsyncStorage.getItem(scopedStorageKey)) ?? "";
        const localImageUrl = scopedImageUrl;

        try {
          if (!profileSource) throw new Error("empty me");
          const next: ProfileState = {
            nickname: profileSource.nickname || "-",
            gender:
              resolveGenderFromPayload(profileSource) !== "-"
                ? resolveGenderFromPayload(profileSource)
                : normalizeGender(cached?.gender),
            shipperType: resolveShipperType(profileSource),
            email: profileSource.email || "-",
            age:
              resolveAgeFromPayload(profileSource) !== "-"
                ? resolveAgeFromPayload(profileSource)
                : normalizeAge(cached?.age),
            imageUrl: localImageUrl || profileSource.profileImageUrl || "",
          };
          if (!active) return;
          setProfile(next);
          setDraftImageUri(next.imageUrl);
          return;
        } catch {
          if (!active) return;
          const next: ProfileState = {
            nickname: cached?.nickname || "-",
            gender: normalizeGender(cached?.gender),
            shipperType: cached?.role === "SHIPPER" ? "개인" : "-",
            email: cached?.email || "-",
            age: normalizeAge(cached?.age),
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
      const ownerKey = toProfileOwnerKey(profile.email);
      const targetStorageKey = toProfileImageStorageKey(ownerKey);
      if (!draftImageUri) {
        await AsyncStorage.removeItem(targetStorageKey);
        setProfile((prev) => ({ ...prev, imageUrl: "" }));
        Alert.alert("수정 완료", "프로필 사진이 기본 이미지로 변경되었습니다.");
        return;
      }

      const persistedUri = await persistProfileImageByOwner(draftImageUri, ownerKey);
      await AsyncStorage.setItem(targetStorageKey, persistedUri);
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
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.label}>화주 구분</Text>
              <Text style={s.value}>{profile.shipperType}</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.label}>이메일</Text>
              <Text style={s.value}>{profile.email}</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.label}>나이</Text>
              <Text style={s.value}>{profile.age}</Text>
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
