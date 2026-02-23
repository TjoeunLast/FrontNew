import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

const TXT_NOTICE = "공지사항";
const TXT_TMP_NOTICE = "[임시] 서비스 점검 안내";
const TXT_MOVE_DETAIL = "상세 화면으로 이동";

export default function NotificationsScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View style={[s.wrap, { backgroundColor: c.bg.canvas }]}>
      <ShipperScreenHeader title={TXT_NOTICE} hideBackButton />
      <View style={s.content}>
        <Pressable
          style={[s.item, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}
          onPress={() => router.push("/(common)/notifications/notice-1" as any)}
        >
          <Text style={[s.itemTitle, { color: c.text.primary }]}>{TXT_TMP_NOTICE}</Text>
          <Text style={[s.itemDesc, { color: c.text.secondary }]}>{TXT_MOVE_DETAIL}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  content: { flex: 1, padding: 20, paddingTop: 14, gap: 12 },
  item: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 4 },
  itemTitle: { fontSize: 16, fontWeight: "800" },
  itemDesc: { fontSize: 14, fontWeight: "600" },
});
