import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Props = {
  title: string;
  description?: string;
};

const TXT_BACK = "뒤로";
const TXT_PAGE_TMP = "페이지 (임시)";

export default function SettingsPlaceholderScreen({ title, description }: Props) {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View style={[s.wrap, { backgroundColor: c.bg.canvas }]}> 
      <View style={[s.card, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
        <Pressable style={s.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={c.text.primary} />
          <Text style={[s.backText, { color: c.text.primary }]}>{TXT_BACK}</Text>
        </Pressable>
        <Text style={[s.title, { color: c.text.primary }]}>{title}</Text>
        <Text style={[s.desc, { color: c.text.secondary }]}>{description ?? `${title} ${TXT_PAGE_TMP}`}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 20, justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 10 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 14, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "900" },
  desc: { fontSize: 15, fontWeight: "600" },
});
