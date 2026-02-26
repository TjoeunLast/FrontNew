import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';

import { useChatManager } from '../../../../shared/api/chatApi';
import { ChatRoomResponse } from '../../../../shared/models/chat';

const ChatListScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { userId, rooms, fetchMyRooms } = useChatManager();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: '채팅',
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchMyRooms();
    }, [])
  );

  const getDisplayTime = (lastMessageTime?: string) => {
    if (!lastMessageTime) return '';

    const date = new Date(lastMessageTime);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((todayStart.getTime() - targetStart.getTime()) / (1000 * 60 * 60 * 24));
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 60 * 1000) return '방금 전';
    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    if (diffDays === 1) return '어제';

    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const renderItem = ({ item }: { item: ChatRoomResponse }) => {
    const displayTime = getDisplayTime(item.lastMessageTime);
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.roomItem}
        onPress={() => {
          if (item.roomId && userId) {
            router.push({
              pathname: '/(chat)/[roomId]',
              params: { roomId: item.roomId.toString() },
            });
          }
        }}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Ionicons
              name={hasUnread ? 'person-outline' : 'business-outline'}
              size={22}
              color={hasUnread ? '#5a5ce1' : '#97a3b7'}
            />
          </View>
          {hasUnread && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{item.roomName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || '메시지가 없습니다.'}
          </Text>
        </View>

        <View style={styles.metaInfo}>
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>{displayTime}</Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.roomId?.toString() || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef0f5' },
  listContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaedf3',
  },
  avatarWrap: { width: 64, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef1f7',
    borderWidth: 1,
    borderColor: '#e3e8f1',
  },
  onlineDot: {
    position: 'absolute',
    right: 8,
    bottom: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4fb37f',
    borderWidth: 2,
    borderColor: '#f8f9fb',
  },
  roomInfo: { flex: 1, paddingRight: 8 },
  roomName: { fontSize: 16, fontWeight: '700', color: '#1f2430' },
  lastMessage: { color: '#5e6b80', marginTop: 4, fontSize: 13, fontWeight: '500' },
  metaInfo: { alignItems: 'flex-end', justifyContent: 'flex-start', minHeight: 50 },
  time: { fontSize: 12, color: '#9ba6b8', fontWeight: '600' },
  timeUnread: { color: '#5a5ce1' },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    marginTop: 8,
    backgroundColor: '#de5048',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});

export default ChatListScreen;
