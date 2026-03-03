import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { withAlpha } from "@/shared/utils/color";

type Role = "shipper" | "driver";
type Gender = "M" | "F";

function showMsg(title: string, msg: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}

export default function SignupProfileScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const params = useLocalSearchParams<{
    email: string;
    password: string;
    name: string;
    phone: string;
    role: Role;
    gender?: Gender;
    birthDate?: string;
  }>();

  const [profileImageUri, setProfileImageUri] = useState("");

  const s = useMemo(() => {
    return StyleSheet.create({
      screen: { flex: 1, backgroundColor: c.bg.surface } as ViewStyle,
      header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 } as ViewStyle,
      backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
      } as ViewStyle,
      content: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 140,
      } as ViewStyle,
      stepRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
      } as ViewStyle,
      stepChip: {
        paddingHorizontal: 12,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: c.border.default,
        backgroundColor: c.bg.muted,
        marginRight: 8,
      } as ViewStyle,
      stepChipActive: {
        backgroundColor: c.brand.primary,
        borderColor: c.brand.primary,
      } as ViewStyle,
      stepChipText: {
        fontSize: 13,
        fontWeight: "900",
        color: c.text.secondary,
      } as TextStyle,
      stepChipTextActive: {
        color: c.text.inverse,
      } as TextStyle,
      title: {
        fontSize: 30,
        fontWeight: "900",
        lineHeight: 38,
        color: c.text.primary,
      } as TextStyle,
      subtitle: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: "700",
        lineHeight: 22,
        color: c.text.secondary,
      } as TextStyle,
      profileCard: {
        marginTop: 28,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: c.border.default,
        backgroundColor: c.bg.surface,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: "center",
        shadowColor: withAlpha("#000000", 0.06),
        shadowOpacity: 1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      } as ViewStyle,
      avatarButton: {
        width: 136,
        height: 136,
        borderRadius: 68,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: c.border.default,
        backgroundColor: c.bg.muted,
      } as ViewStyle,
      avatarImage: {
        width: "100%",
        height: "100%",
      } as ImageStyle,
      avatarHint: {
        marginTop: 16,
        fontSize: 15,
        fontWeight: "800",
        color: c.text.primary,
      } as TextStyle,
      helper: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: "700",
        color: c.text.secondary,
        textAlign: "center",
        lineHeight: 20,
      } as TextStyle,
      actionRow: {
        marginTop: 18,
        flexDirection: "row",
        alignItems: "center",
      } as ViewStyle,
      actionText: {
        fontSize: 14,
        fontWeight: "900",
        color: c.brand.primary,
      } as TextStyle,
      divider: {
        width: 1,
        height: 12,
        marginHorizontal: 10,
        backgroundColor: c.border.default,
      } as ViewStyle,
      bottomBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 12,
        backgroundColor: withAlpha(c.bg.surface, 0.98),
        borderTopWidth: 1,
        borderTopColor: withAlpha(c.border.default, 0.7),
      } as ViewStyle,
      nextBtn: {
        height: 62,
        borderRadius: 18,
        alignSelf: "stretch",
        shadowColor: withAlpha(c.brand.primary, 0.35),
        shadowOpacity: 1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      } as ViewStyle,
      skipText: {
        marginTop: 14,
        fontSize: 14,
        fontWeight: "800",
        color: c.text.secondary,
        textAlign: "center",
      } as TextStyle,
    });
  }, [c]);

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showMsg("권한 필요", "갤러리 접근 권한을 허용해주세요.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    setProfileImageUri(result.assets[0].uri);
  };

  const goNext = () => {
    if (!params.role) return;

    const nextParams = {
      email: String(params.email ?? ""),
      password: String(params.password ?? ""),
      name: String(params.name ?? ""),
      phone: String(params.phone ?? ""),
      role: String(params.role ?? ""),
      gender: params.gender,
      birthDate: params.birthDate,
      profileImageUri,
    };

    router.push({
      pathname: params.role === "shipper" ? "/(auth)/signup-shipper" : "/(auth)/signup-driver",
      params: nextParams,
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={26} color={c.text.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <Text style={s.title}>프로필 사진을{"\n"}선택해주세요.</Text>
          <Text style={s.subtitle}>건너뛸 수 있어요. 다음 단계에서 상세 정보를 입력합니다.</Text>

          <View style={s.profileCard}>
            <Pressable onPress={() => void pickProfileImage()} style={s.avatarButton}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={s.avatarImage} resizeMode="cover" />
              ) : (
                <Ionicons name="camera-outline" size={34} color={c.text.secondary} />
              )}
            </Pressable>
            <Text style={s.avatarHint}>{profileImageUri ? "선택한 사진을 확인하세요" : "프로필 사진 추가"}</Text>
            <Text style={s.helper}> 회원가입 후에도 언제든 변경할 수 있습니다.</Text>

            <View style={s.actionRow}>
              <Pressable onPress={() => void pickProfileImage()}>
                <Text style={s.actionText}>{profileImageUri ? "사진 변경" : "사진 선택"}</Text>
              </Pressable>
              {profileImageUri ? (
                <>
                  <View style={s.divider} />
                  <Pressable onPress={() => setProfileImageUri("")}>
                    <Text style={s.actionText}>삭제</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={s.bottomBar} pointerEvents="box-none">
          <Button title="다음" variant="primary" size="lg" fullWidth onPress={goNext} style={s.nextBtn} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
