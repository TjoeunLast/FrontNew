import { type Href, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { AppTopBar } from "@/shared/ui/layout/AppTopBar";

type ShipperScreenHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  hideBackButton?: boolean;
  onPressBack?: () => void;
  fallbackHref?: Href;
};

export default function ShipperScreenHeader({
  title,
  subtitle,
  right,
  hideBackButton = false,
  onPressBack,
  fallbackHref,
}: ShipperScreenHeaderProps) {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const handleBack = React.useCallback(() => {
    if (onPressBack) {
      onPressBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (fallbackHref) {
      router.replace(fallbackHref);
    }
  }, [fallbackHref, onPressBack, router]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        wrap: { backgroundColor: c.bg.canvas } as ViewStyle,
        subtitleWrap: {
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: c.bg.canvas,
        } as ViewStyle,
        subtitle: { fontSize: 13, fontWeight: "600", color: c.text.secondary } as TextStyle,
      }),
    [c]
  );

  return (
    <SafeAreaView style={s.wrap} edges={["top"]}>
      <AppTopBar title={title} onPressBack={hideBackButton ? undefined : handleBack} right={right} />
      {subtitle ? (
        <View style={s.subtitleWrap}>
          <Text style={s.subtitle}>{subtitle}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
