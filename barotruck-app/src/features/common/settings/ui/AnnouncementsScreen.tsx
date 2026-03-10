import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { noticeService } from "@/shared/api/noticeService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { NoticeResponse } from "@/shared/models/notice";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const [notices, setNotices] = useState<NoticeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    noticeService
      .getNotices()
      .then((data) =>
        setNotices(
          [...data].sort((a, b) => {
            if (a.isPinned !== b.isPinned) {
              return a.isPinned === "Y" ? -1 : 1;
            }
            return b.createdAt.localeCompare(a.createdAt);
          }),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
      <ShipperScreenHeader title="공지사항" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {notices.map((item) => (
          <Pressable
            key={item.noticeId}
            style={{
              padding: 16,
              backgroundColor: item.isPinned === "Y" ? c.brand.primarySoft : c.bg.surface,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: item.isPinned === "Y" ? c.brand.primary : c.border.default,
            }}
            onPress={() => router.push(`/(common)/notifications/${item.noticeId}` as any)}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}
            >
              {item.isPinned === "Y" ? (
                <Text style={{ color: c.brand.primary, fontWeight: "bold" }}>중요 공지</Text>
              ) : (
                <View />
              )}
              <Text style={{ color: c.text.secondary, fontSize: 12 }}>
                {item.createdAt.split("T")[0]}
              </Text>
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: c.text.primary, marginBottom: 4 }}
            >
              {item.title}
            </Text>
            <Text style={{ fontSize: 14, color: c.text.secondary }} numberOfLines={2}>
              {item.content}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
