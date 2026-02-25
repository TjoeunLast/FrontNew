import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";

const INQUIRY_TYPE_ITEMS = ["서비스 이용", "결제/정산", "계정/인증", "기타"] as const;

export default function AccountInquiryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useAppTheme();
  const c = t.colors;

  const [type, setType] = React.useState<(typeof INQUIRY_TYPE_ITEMS)[number]>("서비스 이용");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [email, setEmail] = React.useState("");

  const canSubmit = title.trim().length >= 2 && content.trim().length >= 10;

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(shipper)/(tabs)/my" as any);
  }, [router]);

  const onSubmit = React.useCallback(() => {
    if (!canSubmit) {
      Alert.alert("입력 확인", "문의 제목 2자 이상, 내용 10자 이상 입력해 주세요.");
      return;
    }
    Alert.alert("접수 완료", "문의가 접수되었습니다. 영업일 기준 1~2일 내 답변드릴게요.", [
      {
        text: "확인",
        onPress: goBack,
      },
    ]);
  }, [canSubmit, goBack]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 20, paddingTop: 14, paddingBottom: 120, gap: 14 } as ViewStyle,
        sectionTitle: {
          marginBottom: 8,
          fontSize: 14,
          fontWeight: "900",
          color: c.text.secondary,
        } as TextStyle,
        sectionCard: {
          borderWidth: 1,
          borderColor: c.border.default,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        row: {
          minHeight: 54,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,
        rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 } as ViewStyle,
        rowIconWrap: {
          width: 28,
          height: 28,
          borderRadius: 8,
          justifyContent: "center",
          alignItems: "center",
        } as ViewStyle,
        rowLabel: { fontSize: 14, fontWeight: "800", color: c.text.primary } as TextStyle,
        rowValue: { fontSize: 13, fontWeight: "700", color: c.text.secondary } as TextStyle,
        divider: { height: 1, backgroundColor: withAlpha(c.border.default, 0.9), marginLeft: 16 } as ViewStyle,
        formCard: {
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 10,
        } as ViewStyle,
        typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as ViewStyle,
        typeChip: {
          height: 34,
          borderRadius: 17,
          borderWidth: 1,
          borderColor: c.border.default,
          paddingHorizontal: 12,
          justifyContent: "center",
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        typeChipActive: {
          borderColor: c.brand.primary,
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        typeChipText: { fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        typeChipTextActive: { color: c.brand.primary } as TextStyle,
        inputLabel: { marginTop: 6, fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        input: {
          minHeight: 44,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border.default,
          paddingHorizontal: 12,
          fontSize: 14,
          fontWeight: "700",
          color: c.text.primary,
          backgroundColor: c.bg.surface,
        } as TextStyle,
        textArea: {
          minHeight: 140,
          paddingTop: 12,
          textAlignVertical: "top",
        } as TextStyle,
        helperText: { fontSize: 12, fontWeight: "600", color: c.text.secondary } as TextStyle,
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
        submitBtn: {
          marginHorizontal: 20,
          height: 46,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: canSubmit ? c.brand.primary : c.bg.muted,
        } as ViewStyle,
        submitBtnText: {
          color: canSubmit ? c.text.inverse : c.text.secondary,
          fontSize: 14,
          fontWeight: "800",
        } as TextStyle,
      }),
    [c, canSubmit]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="1:1 문의"
        subtitle="문의 내용을 남겨주시면 빠르게 확인해 답변드릴게요."
        onPressBack={goBack}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.page}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View>
            <Text style={s.sectionTitle}>고객센터</Text>
            <View style={s.sectionCard}>
              <View style={s.row}>
                <View style={s.rowLeft}>
                  <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.brand.primary, 0.12) }]}>
                    <Ionicons name="call-outline" size={17} color={c.brand.primary} />
                  </View>
                  <Text style={s.rowLabel}>대표번호</Text>
                </View>
                <Text style={s.rowValue}>1588-0000</Text>
              </View>
              <View style={s.divider} />
              <View style={s.row}>
                <View style={s.rowLeft}>
                  <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.status.success, 0.16) }]}>
                    <Ionicons name="time-outline" size={17} color={c.status.success} />
                  </View>
                  <Text style={s.rowLabel}>운영시간</Text>
                </View>
                <Text style={s.rowValue}>평일 09:00 - 18:00</Text>
              </View>
            </View>
          </View>

          <View>
            <Text style={s.sectionTitle}>문의 작성</Text>
            <View style={s.formCard}>
              <Text style={s.inputLabel}>문의 유형</Text>
              <View style={s.typeWrap}>
                {INQUIRY_TYPE_ITEMS.map((item) => {
                  const active = item === type;
                  return (
                    <Pressable
                      key={item}
                      style={[s.typeChip, active && s.typeChipActive]}
                      onPress={() => setType(item)}
                    >
                      <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={s.inputLabel}>제목</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="문의 제목을 입력해 주세요"
                placeholderTextColor={c.text.secondary}
                style={s.input}
                maxLength={60}
              />

              <Text style={s.inputLabel}>내용</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="문의 내용을 자세히 입력해 주세요 (최소 10자)"
                placeholderTextColor={c.text.secondary}
                style={[s.input, s.textArea]}
                maxLength={1000}
                multiline
              />
              <Text style={s.helperText}>{content.trim().length}/1000</Text>

              <Text style={s.inputLabel}>답변 받을 이메일 (선택)</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor={c.text.secondary}
                style={s.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.bottomActionBar, { paddingBottom: Math.max(10, insets.bottom + 6) }]}>
        <Pressable style={s.submitBtn} onPress={onSubmit}>
          <Text style={s.submitBtnText}>문의 접수하기</Text>
        </Pressable>
      </View>
    </View>
  );
}
