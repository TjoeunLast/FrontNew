import React, { memo } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
  type TouchableOpacityProps,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export type CardProps = TouchableOpacityProps & {
  variant?: "surface" | "softPrimary" | "softAccent";
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

export const Card = memo(function Card({
  variant = "surface",
  padding = 20,
  style,
  children,
  onPress,
  ...props
}: CardProps) {
  const t = useAppTheme();
  const c = t.colors;

  const bg =
    variant === "softPrimary"
      ? c.brand.primarySoft
      : variant === "softAccent"
        ? c.brand.accentSoft
        : c.bg.surface;

  if (onPress) {
    return (
      <TouchableOpacity
        {...props}
        activeOpacity={0.7}
        onPress={onPress}
        style={[
          s.base,
          { backgroundColor: bg, borderColor: c.border.default, padding },
          style,
        ]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        s.base,
        { backgroundColor: bg, borderColor: c.border.default, padding },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
});

const s = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
});
