import React from "react";
import { View, Text } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function ShipperOrdersScreen() {
  const { colors: c } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg.surface, padding: 16 }}>
      <Text style={{ color: c.text.primary, fontSize: 18, fontWeight: "900" }}>
        배차관리(목업)
      </Text>
    </View>
  );
}
