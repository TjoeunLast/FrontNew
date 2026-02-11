import React, { memo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  left?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const Chip = memo(function Chip({
  label,
  selected,
  onPress,
  left,
  disabled,
  style,
  textStyle,
}: ChipProps) {
  const t = useAppTheme();
  const c = t.colors;

  const bg = selected ? c.brand.primarySoft : c.bg.surface;
  const border = selected ? c.brand.primary : c.border.default;
  const fg = selected ? c.brand.primary : c.text.secondary;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : 1,
        },
        pressed &&
          !disabled && {
            backgroundColor: selected ? c.brand.primarySoft : c.bg.muted,
          },
        style,
      ]}
    >
      <View style={s.row}>
        {left ? <View style={s.slot}>{left}</View> : null}
        <Text style={[s.text, { color: fg }, textStyle]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
});

const s = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  slot: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
});
