import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { notificationService } from "@/shared/api/notificationService";
import { noticeService } from "@/shared/api/noticeService";
import { NotificationResponse } from "@/shared/models/notification";
import { NoticeResponse } from "@/shared/models/notice";
import { UserProfile } from "@/shared/models/user";
import { UserService } from "@/shared/api/userService";

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [pinnedNotices, setPinnedNotices] = useState<NoticeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [routeTarget, setRouteTarget] = useState("");
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
        // 고정된 공지사항만 필터링
        setPinnedNotices(notices.filter(n => n.isPinned === 'Y'));
      } catch (e) {
        console.error("데이터 로드 실패", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

/**
   * 알림 클릭 시 오더 상세보기로 이동하는 핵심 로직
   */
  const handleNotificationPress = (item: NotificationResponse | NoticeResponse) => {
    // 1. 공지사항 여부 확인
    if ('noticeId' in item) {
      router.push(`/(common)/notifications/${item.noticeId}` as any);
      return;
    }

    // 2. 일반 알림 데이터 추출
    const { targetId, type, notificationId } = item;

    // 3. 사용자 역할 판별 (UserProfile 모델 기준)
    // SHIPPER , 나머지는 차주용 경로
    const isShipperSide = user?.role === 'SHIPPER';
    const rolePath = isShipperSide ? "(shipper)" : "(driver)";

    if (targetId) {
      // 4. 오더 상세 페이지로 이동 (targetId를 오더 ID로 사용)
      if(rolePath === "(shipper)") {
        setRouteTarget(`/(common)/orders/[orderId]`);    
        router.push({
        pathname: routeTarget,
        params: { orderId: targetId },
      } as any);  
      } else {
        setRouteTarget(`/${rolePath}/order-detail/[id]`);  
        router.push({
        pathname: routeTarget,
        params: { id: targetId },
      } as any);    
      }

      console.log(`[오더 이동] 타입: ${type}, 경로: ${routeTarget}, targetId: ${targetId}`);
      
    } else {
      // targetId가 없는 일반 알림의 경우 상세 텍스트 페이지로 이동
      router.push(`/(common)/notifications/detail?id=${notificationId}` as any);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={[s.wrap, { backgroundColor: c.bg.canvas }]}>
      <ShipperScreenHeader title="알림 및 공지" hideBackButton />
      
      <FlatList
        data={[...pinnedNotices, ...notifications]} // 고정 공지 우선 배치
        keyExtractor={(item, index) => 'noticeId' in item ? `notice-${item.noticeId}` : `noti-${item.notificationId}`}
        contentContainerStyle={s.content}
        renderItem={({ item }) => {
          const isNotice = 'noticeId' in item;
          return (
            <Pressable
              style={[
                s.item, 
                { backgroundColor: isNotice ? c.brand.primarySoft : c.bg.surface, borderColor: c.border.default }
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={s.row}>
                {isNotice && <Text style={[s.pinTag, { color: c.brand.primary }]}>[공지]</Text>}
                <Text style={[s.itemTitle, { color: c.text.primary }]} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
              <Text style={[s.itemDesc, { color: c.text.secondary }]} numberOfLines={2}>
                {'content' in item ? item.content : item.body}
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
  item: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pinTag: { fontWeight: 'bold', fontSize: 12 },
  itemTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  itemDesc: { fontSize: 13 },
});