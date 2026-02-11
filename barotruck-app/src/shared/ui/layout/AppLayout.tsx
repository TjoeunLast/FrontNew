import React, { memo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  KeyboardAvoidingView,
  type ViewProps,
  type ViewStyle,
  type ScrollViewProps,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type AppLayoutProps = ViewProps & {
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle">;
  padding?: number;
};

export const AppLayout = memo(function AppLayout({
  scroll,
  contentContainerStyle,
  scrollProps,
  padding = 12,
  style,
  children,
  ...props
}: AppLayoutProps) {
  const t = useAppTheme();
  const c = t.colors;

  if (scroll) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.bg.canvas }]}>
        <ScrollView
          {...scrollProps}
          contentContainerStyle={[
            { padding, paddingBottom: padding + 16 },
            contentContainerStyle,
          ]}
        >
          <View {...props} style={style}>
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg.canvas }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View {...props} style={[{ padding }, style, { flex: 1 }]}>
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
});
