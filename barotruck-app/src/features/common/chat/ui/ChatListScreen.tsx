import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';

import { useChatManager } from '../../../../shared/api/chatApi';
import { ChatRoomResponse } from '../../../../shared/models/chat';
import {
  loadChatRoomVisitedAt,
  loadStoredChatOrderSummary,
  loadStoredChatRoomTitle,
  type ChatOrderSummary,
} from '../../../../shared/utils/chatOrderSummary';
import { getCurrentUserSnapshot } from '../../../../shared/utils/currentUserStorage';

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

function resolveRoomTitle(item: ChatRoomResponse, currentNickname?: string, currentName?: string) {
  const row = item as ChatRoomResponse & Record<string, unknown>;
  const candidates = [
    row.otherUserNickname,
    row.partnerNickname,
    row.partnerName,
    row.targetNickname,
    row.opponentNickname,
    row.userNickname,
    row.shipperNickname,
    row.driverNickname,
    row.userName,
    row.name,
    row.businessName,
    row.companyName,
    row.nickname,
    row.roomName,
  ];

  const blockedNames = new Set(
    [normalizeText(currentNickname), normalizeText(currentName)].filter(Boolean)
  );

  for (const candidate of candidates) {
    const text = normalizeText(candidate);
    if (!text || GENERIC_ROOM_NAMES.has(text) || blockedNames.has(text)) continue;
    return text;
  }

  return '';
}

function resolveUnreadCount(item: ChatRoomResponse) {
  const row = item as ChatRoomResponse & Record<string, unknown>;
  const unreadMeta = row.unread as Record<string, unknown> | undefined;
  const candidates = [
    row.unreadCount,
    row.unread_count,
    row.unreadCnt,
    row.notReadCount,
    row.unreadMessageCount,
    unreadMeta?.count,
    unreadMeta?.messageCount,
  ];

  for (const candidate of candidates) {
    const count = Number(candidate);
    if (Number.isFinite(count)) return Math.max(0, count);
  }

  return 0;
}

function applyVisitedUnreadCount(item: ChatRoomResponse, unreadCount: number, visitedAt?: string) {
  if (unreadCount <= 0) return 0;

  const lastMessageTime = new Date((item as ChatRoomResponse & Record<string, unknown>).lastMessageTime ?? '').getTime();
  const visitedTime = new Date(String(visitedAt ?? '')).getTime();

  if (Number.isFinite(lastMessageTime) && Number.isFinite(visitedTime) && lastMessageTime <= visitedTime) {
    return 0;
  }

  return unreadCount;
}

function resolveRoomOrderSummary(item: ChatRoomResponse, fallbackSummary?: ChatOrderSummary | null) {
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

  if (!orderId && !routeText && !cargoLabel && !priceText) return fallbackSummary ?? null;

  return {
    orderId,
    routeText,
    cargoText: cargoLabel,
    priceText,
  };
}

function shouldHideRoom(
  item: ChatRoomResponse,
  storedSummary?: ChatOrderSummary | null,
  storedTitle?: string,
  currentNickname?: string,
  currentName?: string
) {
  const rawRoomName = normalizeText((item as ChatRoomResponse & Record<string, unknown>).roomName);
  const roomTitle = resolveRoomTitle(item, currentNickname, currentName) || normalizeText(storedTitle);
  const orderSummary = resolveRoomOrderSummary(item, storedSummary);

  if (!roomTitle && GENERIC_ROOM_NAMES.has(rawRoomName) && !orderSummary) {
    return true;
  }

  return false;
}

const ChatListScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { userId, rooms, fetchMyRooms } = useChatManager();
  const [storedSummaries, setStoredSummaries] = useState<Record<string, ChatOrderSummary>>({});
  const [storedTitles, setStoredTitles] = useState<Record<string, string>>({});
  const [visitedTimes, setVisitedTimes] = useState<Record<string, string>>({});
  const [currentNickname, setCurrentNickname] = useState('');
  const [currentName, setCurrentName] = useState('');
  const visibleRooms = rooms.filter((room) =>
    !shouldHideRoom(
      room,
      storedSummaries[String(room.roomId)],
      storedTitles[String(room.roomId)],
      currentNickname,
      currentName
    )
  );

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: '채팅',
    });
  }, [navigation]);

  useEffect(() => {
    let active = true;

    void (async () => {
      const snapshot = await getCurrentUserSnapshot();
      if (!active || !snapshot) return;
      setCurrentNickname(normalizeText(snapshot.nickname));
      setCurrentName(normalizeText(snapshot.name));
    })();

    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyRooms();
    }, [])
  );

  useEffect(() => {
    const roomIds = rooms.map((room) => String(room.roomId ?? '')).filter(Boolean);
    if (roomIds.length === 0) {
      setStoredSummaries({});
      setStoredTitles({});
      setVisitedTimes({});
      return;
    }

    let active = true;

    void (async () => {
      const entries = await Promise.all(
        roomIds.map(async (roomId) => {
          const [summary, title, visitedAt] = await Promise.all([
            loadStoredChatOrderSummary(roomId),
            loadStoredChatRoomTitle(roomId),
            loadChatRoomVisitedAt(roomId),
          ]);
          return { roomId, summary, title, visitedAt };
        })
      );

      if (!active) return;

      const next: Record<string, ChatOrderSummary> = {};
      const nextTitles: Record<string, string> = {};
      const nextVisitedTimes: Record<string, string> = {};
      for (const entry of entries) {
        if (entry.summary) next[entry.roomId] = entry.summary;
        if (entry.title) nextTitles[entry.roomId] = entry.title;
        if (entry.visitedAt) nextVisitedTimes[entry.roomId] = entry.visitedAt;
      }
      setStoredSummaries(next);
      setStoredTitles(nextTitles);
      setVisitedTimes(nextVisitedTimes);
    })();

    return () => {
      active = false;
    };
  }, [rooms]);

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
    const unreadCount = applyVisitedUnreadCount(
      item,
      resolveUnreadCount(item),
      visitedTimes[String(item.roomId)]
    );
    const hasUnread = unreadCount > 0;
    const storedSummary = storedSummaries[String(item.roomId)] ?? null;
    const storedTitle = storedTitles[String(item.roomId)] ?? '';
    const roomTitle = resolveRoomTitle(item, currentNickname, currentName) || storedTitle;
    const orderSummary = resolveRoomOrderSummary(item, storedSummary);
    const titleText = roomTitle || orderSummary?.routeText || normalizeText(item.roomName) || '채팅';

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
              name="person-outline"
              size={28}
              color={hasUnread ? '#6f7c90' : '#a7b1c2'}
            />
          </View>
          <View style={[styles.statusDot, hasUnread ? styles.statusDotActive : styles.statusDotIdle]} />
        </View>

        <View style={styles.roomInfo}>
          <Text style={styles.roomName} numberOfLines={1}>
            {titleText}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || '메시지가 없습니다.'}
          </Text>
        </View>

        <View style={styles.metaInfo}>
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>{displayTime}</Text>
          {hasUnread ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
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
  container: { flex: 1, backgroundColor: '#f2f4f8' },
  listContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#7b8798' },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 15,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#cad2df',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  avatarWrap: { width: 62, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf1f7',
  },
  statusDot: {
    position: 'absolute',
    right: 9,
    bottom: 7,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  statusDotActive: { backgroundColor: '#53b985' },
  statusDotIdle: { backgroundColor: '#d7dee9' },
  roomInfo: { flex: 1, paddingRight: 10 },
  roomName: { fontSize: 15, fontWeight: '800', color: '#273142' },
  lastMessage: { color: '#7c889b', marginTop: 4, fontSize: 13, fontWeight: '600' },
  metaInfo: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 2 },
  time: { fontSize: 12, color: '#9ba6b8', fontWeight: '700' },
  timeUnread: { color: '#5a66f0' },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6574b',
    marginTop: 10,
  },
  unreadBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
});

export default ChatListScreen;
