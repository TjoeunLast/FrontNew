import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator, Pressable } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { noticeService } from "@/shared/api/noticeService";
import { NoticeResponse } from "@/shared/models/notice";

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const [notices, setNotices] = useState<NoticeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    noticeService.getNotices()
      .then(setNotices)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
      <ShipperScreenHeader title="공지사항" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {notices.map((item) => (
          <Pressable 
            key={item.noticeId} 
            style={{ padding: 16, backgroundColor: c.bg.surface, borderRadius: 12 }}
            onPress={() => router.push(`/(common)/notifications/${item.noticeId}` as any)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              {item.isPinned === 'Y' && <Text style={{ color: c.brand.primary, fontWeight: 'bold' }}>📍 고정</Text>}
              <Text style={{ color: c.text.secondary, fontSize: 12 }}>{item.createdAt.split('T')[0]}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: c.text.primary, marginBottom: 4 }}>
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