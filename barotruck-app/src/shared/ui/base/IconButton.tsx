import React, { memo } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type IconButtonVariant = "ghost" | "soft" | "outline";

type Props = Omit<PressableProps, "style"> & {
  children: React.ReactNode;
  size?: number;
  variant?: IconButtonVariant;
  style?: ViewStyle;
};

export const IconButton = memo(function IconButton({
  children,
  size = 40,
  variant = "ghost",
  disabled,
  style,
  ...props
}: Props) {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <Pressable
      disabled={disabled}
      hitSlop={8}
      {...props}
      style={({ pressed }) => {
        let backgroundColor = "transparent";
        let borderColor = "transparent";
        let borderWidth = 0;

        if (variant === "soft") {
          backgroundColor = c.bg.muted;
        } else if (variant === "outline") {
          borderColor = c.border.default;
          borderWidth = 1;
        }

        if (pressed && !disabled) {
          backgroundColor = c.brand.primarySoft;
        }

        return [
          s.base,
          {
            width: size,
            height: size,
            borderRadius: 12,
            backgroundColor,
            borderColor,
            borderWidth,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ];
      }}
    >
      <View style={s.center}>{children}</View>
    </Pressable>
  );
});

const s = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
});
