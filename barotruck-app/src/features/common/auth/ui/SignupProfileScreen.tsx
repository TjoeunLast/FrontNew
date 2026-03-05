import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";

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
      pathname:
        params.role === "shipper"
          ? "/(auth)/signup-shipper"
          : "/(auth)/signup-driver",
      params: nextParams,
    });
  };

  const s = getStyles(c);

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
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
          contentContainerStyle={s.content}
        >
          <Text style={s.title}>프로필 사진을{"\n"}선택해주세요.</Text>
          {/* <Text style={s.subtitle}>
            건너뛸 수 있어요. 다음 단계에서 상세 정보를 입력합니다.
          </Text> */}

          <View style={s.profileCard}>
            <Pressable
              onPress={() => void pickProfileImage()}
              style={s.avatarButton}
            >
              {profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  style={s.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="camera-outline"
                  size={36}
                  color={c.text.secondary}
                />
              )}
            </Pressable>
            <Text style={s.avatarHint}>
              {profileImageUri ? "멋진 사진이네요!" : "프로필 사진 추가"}
            </Text>
            <Text style={s.helper}>
              회원가입 후에도 언제든 변경할 수 있습니다.
            </Text>

            <View style={s.actionRow}>
              <Pressable onPress={() => void pickProfileImage()}>
                <Text style={s.actionText}>
                  {profileImageUri ? "사진 변경" : "사진 선택"}
                </Text>
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
          <Button
            title={profileImageUri ? "다음" : "건너뛰고 다음"}
            variant="primary"
            size="lg"
            fullWidth
            onPress={goNext}
            style={s.nextBtn}
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
    content: {
      flexGrow: 1,
      paddingHorizontal: S.lg,
      paddingTop: S.sm,
      paddingBottom: 140,
    },
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
    profileCard: {
      flex: 1,
      marginTop: 80,
      marginBottom: 80,
      justifyContent: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border.default,
      backgroundColor: c.bg.surface,
      paddingVertical: 32,
      paddingHorizontal: 20,
      alignItems: "center",
    },
    avatarButton: {
      width: 140,
      height: 140,
      borderRadius: 70,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: c.border.default,
      backgroundColor: c.bg.muted,
      marginBottom: 20,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarHint: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text.primary,
      marginBottom: 6,
    },
    helper: {
      fontSize: 14,
      fontWeight: "500",
      color: c.text.secondary,
      textAlign: "center",
    },
    actionRow: {
      marginTop: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    actionText: {
      fontSize: 15,
      fontWeight: "800",
      color: c.brand.primary,
    },
    divider: {
      width: 1,
      height: 14,
      marginHorizontal: 16,
      backgroundColor: c.border.default,
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
