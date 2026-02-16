import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function ShipperSettlementScreen() {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View style={[s.wrap, { backgroundColor: c.bg.surface }]}>
      <Text style={[s.title, { color: c.text.primary }]}>정산내역</Text>
      <Text style={[s.sub, { color: c.text.secondary }]}>정산 리스트(목업)</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 20, paddingTop: 36 },
  title: { fontSize: 26, fontWeight: "900" },
  sub: { marginTop: 8, fontSize: 14, fontWeight: "700" },
});
