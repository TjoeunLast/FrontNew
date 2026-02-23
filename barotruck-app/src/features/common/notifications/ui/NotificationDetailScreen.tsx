import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

const TXT_DETAIL = "공지 상세";
const TXT_DETAIL_TMP = "공지 상세 페이지 (임시)";

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View style={[s.wrap, { backgroundColor: c.bg.canvas }]}>
      <ShipperScreenHeader
        title={TXT_DETAIL}
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/(shipper)/(tabs)/notifications" as any);
        }}
      />
      <View style={s.content}>
        <Text style={[s.desc, { color: c.text.secondary }]}>id: {id ?? "-"}</Text>
        <Text style={[s.desc, { color: c.text.secondary }]}>{TXT_DETAIL_TMP}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  content: { flex: 1, padding: 20, justifyContent: "center", alignItems: "center", gap: 8 },
  desc: { fontSize: 15, fontWeight: "600" },
});
