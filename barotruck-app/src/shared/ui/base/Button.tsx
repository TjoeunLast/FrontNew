import React, { memo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Button = memo(function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  fullWidth,
  style,
}: ButtonProps) {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.base,
        fullWidth && { width: "100%" },
        variant === "primary" && { backgroundColor: c.brand.primary },
        variant === "accent" && { backgroundColor: c.brand.accent },
        variant === "outline" && {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: c.border.default,
        },
        variant === "ghost" && { backgroundColor: "transparent" },
        variant === "danger" && { backgroundColor: c.status.danger },
        (disabled || loading) && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.8 },
        style,
      ]}
    >
      <View style={s.row}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === "outline" || variant === "ghost"
                ? c.brand.primary
                : "#FFFFFF"
            }
          />
        ) : (
          <Text
            style={[
              s.text,
              variant === "outline" || variant === "ghost"
                ? { color: c.text.primary }
                : { color: "#FFFFFF" },
            ]}
          >
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

const s = StyleSheet.create({
  base: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 48,
  },
  row: { flexDirection: "row", alignItems: "center" },
  text: { fontSize: 16, fontWeight: "700" },
});
