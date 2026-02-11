import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function DriverOrdersScreen() {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: c.bg.surface }]} edges={["top", "bottom"]}>
      <View style={s.pad}>
        <Text style={[s.title, { color: c.text.primary }]}>오더</Text>
        <Text style={[s.sub, { color: c.text.secondary }]}>일감 리스트(목업)</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  pad: { padding: 20 },
  title: { fontSize: 24, fontWeight: "900" },
  sub: { marginTop: 8, fontSize: 14, fontWeight: "700" },
});
