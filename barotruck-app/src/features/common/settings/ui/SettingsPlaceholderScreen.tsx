import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";

type SettingsPlaceholderScreenProps = {
  title: string;
  description: string;
};

export default function SettingsPlaceholderScreen({ title, description }: SettingsPlaceholderScreenProps) {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        body: { padding: 20, paddingTop: 14 } as ViewStyle,
        card: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 16,
          gap: 8,
        } as ViewStyle,
        badge: {
          alignSelf: "flex-start",
          height: 24,
          borderRadius: 12,
          paddingHorizontal: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        badgeText: { fontSize: 11, fontWeight: "800", color: c.brand.primary } as TextStyle,
        title: { fontSize: 18, fontWeight: "900", color: c.text.primary } as TextStyle,
        desc: { fontSize: 14, fontWeight: "600", color: c.text.secondary, lineHeight: 20 } as TextStyle,
        actionBtn: {
          marginTop: 14,
          height: 42,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.canvas,
        } as ViewStyle,
        actionBtnText: { fontSize: 14, fontWeight: "800", color: c.text.primary } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title={title}
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/(shipper)/(tabs)/my" as any);
        }}
      />
      <View style={s.body}>
        <View style={s.card}>
          <View style={s.badge}>
            <Text style={s.badgeText}>준비 중</Text>
          </View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.desc}>{description}</Text>
          <Pressable
            style={s.actionBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace("/(shipper)/(tabs)/my" as any);
            }}
          >
            <Text style={s.actionBtnText}>이전 화면으로</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
