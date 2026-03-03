import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';

import { useChatManager } from '../../../../shared/api/chatApi';
import { ChatRoomResponse } from '../../../../shared/models/chat';

const GENERIC_ROOM_NAMES = new Set(['오더 협의방', '협의방', '채팅', '채팅방', '1:1 채팅']);

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeNumberText(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${n.toLocaleString()}원`;
}

function buildLocationLabel(place: unknown, addr: unknown) {
  const placeText = normalizeText(place);
  if (placeText) return placeText;

  const parts = normalizeText(addr).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

function resolveRoomTitle(item: ChatRoomResponse) {
  const row = item as ChatRoomResponse & Record<string, unknown>;
  const candidates = [
    row.otherUserNickname,
    row.partnerNickname,
    row.targetNickname,
    row.opponentNickname,
    row.nickname,
    row.roomName,
  ];

  for (const candidate of candidates) {
    const text = normalizeText(candidate);
    if (text && !GENERIC_ROOM_NAMES.has(text)) return text;
  }

  return '';
}

function resolveRoomOrderSummary(item: ChatRoomResponse) {
  const row = item as ChatRoomResponse & Record<string, unknown>;
  const orderId = normalizeText(row.orderId ?? row.orderNo);
  const routeText =
    normalizeText(row.routeText) ||
    [buildLocationLabel(row.startPlace, row.startAddr), buildLocationLabel(row.endPlace, row.endAddr)]
      .filter(Boolean)
      .join(' → ');
  const tonnageText = normalizeText(row.reqTonnage ?? row.tonnageLabel ?? row.tonnage);
  const vehicleText = [tonnageText, normalizeText(row.reqCarType ?? row.carType)].filter(Boolean).join(' ');
  const cargoLabel = normalizeText(row.cargoText) || [vehicleText, normalizeText(row.cargoContent)].filter(Boolean).join(' · ');
  const priceText = normalizeText(row.priceText) || normalizeNumberText(row.price ?? row.basePrice ?? row.totalPrice);

  if (!orderId && !routeText && !cargoLabel && !priceText) return null;

  return {
    orderId,
    routeText,
    cargoText: cargoLabel,
    priceText,
  };
}

function shouldHideRoom(item: ChatRoomResponse) {
  const rawRoomName = normalizeText((item as ChatRoomResponse & Record<string, unknown>).roomName);
  const roomTitle = resolveRoomTitle(item);
  const orderSummary = resolveRoomOrderSummary(item);

  if (!roomTitle && GENERIC_ROOM_NAMES.has(rawRoomName) && !orderSummary) {
    return true;
  }

  return false;
}

const ChatListScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { userId, rooms, fetchMyRooms } = useChatManager();
  const visibleRooms = rooms.filter((room) => !shouldHideRoom(room));

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
    const roomTitle = resolveRoomTitle(item);
    const orderSummary = resolveRoomOrderSummary(item);

    return (
      <TouchableOpacity
        style={styles.roomItem}
        onPress={() => {
          if (item.roomId && userId) {
            router.push({
              pathname: '/(chat)/[roomId]',
              params: {
                roomId: item.roomId.toString(),
                ...(orderSummary ?? {}),
              },
            });
          }
        }}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={hasUnread ? '#5a5ce1' : '#97a3b7'}
            />
          </View>
          {hasUnread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.roomInfo}>
          {!!roomTitle && <Text style={styles.roomName}>{roomTitle}</Text>}
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || '메시지가 없습니다.'}
          </Text>
        </View>

        <View style={styles.metaInfo}>
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>{displayTime}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {visibleRooms.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>아직 채팅이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={visibleRooms}
          keyExtractor={(item) => item.roomId?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef0f5' },
  listContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#7b8798' },
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
  unreadDot: {
    position: 'absolute',
    right: 8,
    bottom: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#f8f9fb',
  },
  roomInfo: { flex: 1, paddingRight: 8 },
  roomName: { fontSize: 16, fontWeight: '700', color: '#1f2430' },
  lastMessage: { color: '#5e6b80', marginTop: 4, fontSize: 13, fontWeight: '500' },
  metaInfo: { alignItems: 'flex-end', justifyContent: 'flex-start', minHeight: 50 },
  time: { fontSize: 12, color: '#9ba6b8', fontWeight: '600' },
  timeUnread: { color: '#5a5ce1' },
});

export default ChatListScreen;
