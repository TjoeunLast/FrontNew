import React, { memo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type AppTopBarProps = {
  title?: string;
  onPressBack?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export const AppTopBar = memo(function AppTopBar({
  title,
  onPressBack,
  right,
  style,
}: AppTopBarProps) {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View
      style={[
        s.wrap,
        { backgroundColor: c.bg.surface, borderBottomColor: c.border.default },
        style,
      ]}
    >
      <View style={s.side}>
        {onPressBack ? (
          <Pressable
            onPress={onPressBack}
            hitSlop={10}
            style={({ pressed }) => [
              s.iconBtn,
              pressed && { backgroundColor: c.bg.muted },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={c.text.primary} />
          </Pressable>
        ) : (
          <View style={s.placeholder} />
        )}
      </View>

      <View style={s.center}>
        {title ? (
          <Text numberOfLines={1} style={[s.title, { color: c.text.primary }]}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={s.side}>{right ?? <View style={s.placeholder} />}</View>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  side: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 40,
    height: 40,
  },
});
