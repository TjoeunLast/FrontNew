import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { noticeService } from "@/shared/api/noticeService";
import { notificationService } from "@/shared/api/notificationService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { NoticeResponse } from "@/shared/models/notice";
import { NotificationResponse } from "@/shared/models/notification";
import { UserProfile } from "@/shared/models/user";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [pinnedNotices, setPinnedNotices] = useState<NoticeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, notis, notices] = await Promise.all([
          UserService.getMyInfo(),
          notificationService.getMyNotifications(),
          noticeService.getNotices(),
        ]);

        setUser(userData);
        setNotifications(notis);
        setPinnedNotices(
          [...notices]
            .filter((notice) => notice.isPinned === "Y")
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      } catch (e) {
        console.error("데이터 로드 실패", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleNotificationPress = (item: NotificationResponse | NoticeResponse) => {
    if ("noticeId" in item) {
      router.push(`/(common)/notifications/${item.noticeId}` as any);
      return;
    }

    const { targetId, notificationId } = item;
    const isShipperSide = user?.role === "SHIPPER";

    if (targetId) {
      if (isShipperSide) {
        router.push({
          pathname: "/(common)/orders/[orderId]",
          params: { orderId: targetId },
        } as any);
        return;
      }

      router.push({
        pathname: "/(driver)/order-detail/[id]",
        params: { id: targetId },
      } as any);
      return;
    }

    router.push(`/(common)/notifications/detail?id=${notificationId}` as any);
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <View style={[s.wrap, { backgroundColor: c.bg.canvas }]}>
      <ShipperScreenHeader title="알림 및 공지" hideBackButton />

      <FlatList
        data={[...pinnedNotices, ...notifications]}
        keyExtractor={(item) =>
          "noticeId" in item ? `notice-${item.noticeId}` : `noti-${item.notificationId}`
        }
        contentContainerStyle={s.content}
        renderItem={({ item }) => {
          const isNotice = "noticeId" in item;

          return (
            <Pressable
              style={[
                s.item,
                isNotice
                  ? {
                      backgroundColor: c.brand.primarySoft,
                      borderColor: c.brand.primary,
                    }
                  : {
                      backgroundColor: c.bg.surface,
                      borderColor: c.border.default,
                    },
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={s.row}>
                {isNotice ? (
                  <Text style={[s.pinTag, { color: c.brand.primary }]}>[중요 공지]</Text>
                ) : null}
                <Text style={[s.itemTitle, { color: c.text.primary }]} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
              <Text style={[s.itemDesc, { color: c.text.secondary }]} numberOfLines={2}>
                {"content" in item ? item.content : item.body}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: 16, gap: 12 },
  item: { padding: 16, borderRadius: 12, borderWidth: 1.5, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  pinTag: { fontWeight: "bold", fontSize: 12 },
  itemTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  itemDesc: { fontSize: 13 },
});
