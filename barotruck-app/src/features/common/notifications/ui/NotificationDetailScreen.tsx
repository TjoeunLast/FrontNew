import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";

const TXT_DETAIL = "공지 상세";
const TXT_DETAIL_TMP = "공지 상세 페이지 (임시)";

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View style={[s.wrap, { backgroundColor: c.bg.canvas }]}>
      <Text style={[s.title, { color: c.text.primary }]}>{TXT_DETAIL}</Text>
      <Text style={[s.desc, { color: c.text.secondary }]}>id: {id ?? "-"}</Text>
      <Text style={[s.desc, { color: c.text.secondary }]}>{TXT_DETAIL_TMP}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 20, justifyContent: "center", alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "900" },
  desc: { fontSize: 15, fontWeight: "600" },
});
