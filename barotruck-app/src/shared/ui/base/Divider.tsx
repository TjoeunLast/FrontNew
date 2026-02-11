import React, { memo } from "react";
import { View, type ViewStyle } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type DividerProps = {
  inset?: number;
  vertical?: boolean;
  style?: ViewStyle;
};

export const Divider = memo(function Divider({
  inset = 0,
  vertical = false,
  style,
}: DividerProps) {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View
      style={[
        { backgroundColor: c.border.default },
        vertical
          ? { width: 1, height: "100%", marginVertical: inset }
          : { height: 1, width: "100%", marginHorizontal: inset },
        style,
      ]}
    />
  );
});
