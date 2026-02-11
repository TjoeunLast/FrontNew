import React, { memo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button, type ButtonProps } from "../base/Button";

type Action = Pick<
  ButtonProps,
  "title" | "variant" | "loading" | "disabled" | "onPress"
>;

type Props = {
  primary?: Action;
  secondary?: Action;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export const BottomCTA = memo(function BottomCTA({
  primary,
  secondary,
  children,
  style,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View
      style={[
        s.wrap,
        {
          backgroundColor: c.bg.surface,
          borderTopColor: c.border.default,
          paddingBottom: insets.bottom + 12,
        },
        style,
      ]}
    >
      <View style={[s.content, contentStyle]}>
        {children ? <View style={{ marginBottom: 12 }}>{children}</View> : null}
        <View style={s.row}>
          {secondary ? (
            <View style={{ flex: 1 }}>
              <Button
                title={secondary.title}
                variant={secondary.variant ?? "outline"}
                loading={secondary.loading}
                disabled={secondary.disabled}
                onPress={secondary.onPress}
                fullWidth
              />
            </View>
          ) : null}
          {primary ? (
            <View style={{ flex: 1 }}>
              <Button
                title={primary.title}
                variant={primary.variant ?? "primary"}
                loading={primary.loading}
                disabled={primary.disabled}
                onPress={primary.onPress}
                fullWidth
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  content: {
    width: "100%",
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
});
