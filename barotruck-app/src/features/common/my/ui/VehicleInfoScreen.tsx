import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

export default function VehicleInfoScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const [vehicleNo, setVehicleNo] = React.useState("");
  const [vehicleType, setVehicleType] = React.useState("");

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(driver)/(tabs)/mypage" as any);
  }, [router]);

  const onSave = React.useCallback(() => {
    Alert.alert("저장 완료", "차량 정보가 저장되었습니다.");
    goBack();
  }, [goBack]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 20, paddingTop: 14, gap: 10 } as ViewStyle,
        card: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 8,
        } as ViewStyle,
        label: { fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        input: {
          minHeight: 42,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.border.default,
          paddingHorizontal: 12,
          color: c.text.primary,
          backgroundColor: c.bg.surface,
          fontSize: 14,
          fontWeight: "700",
        } as TextStyle,
        saveBtn: {
          height: 44,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.brand.primary,
          marginTop: 6,
        } as ViewStyle,
        saveBtnText: { color: c.text.inverse, fontSize: 14, fontWeight: "800" } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="차량 정보" onPressBack={goBack} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.label}>차량번호</Text>
          <TextInput
            value={vehicleNo}
            onChangeText={setVehicleNo}
            style={s.input}
            placeholder="예: 12가3456"
            placeholderTextColor={c.text.secondary}
          />
          <Text style={s.label}>차종</Text>
          <TextInput
            value={vehicleType}
            onChangeText={setVehicleType}
            style={s.input}
            placeholder="예: 5톤 윙바디"
            placeholderTextColor={c.text.secondary}
          />
          <Pressable style={s.saveBtn} onPress={onSave}>
            <Text style={s.saveBtnText}>저장</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
