import React, { useCallback } from 'react'; // useCallback 추가
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useChatManager } from '../../../../shared/api/chatApi'; 
import { ChatRoomResponse } from '../../../../shared/models/chat';
import { useRouter, useFocusEffect } from "expo-router"; // useFocusEffect 추가

// navigation 프롭은 더 이상 필요하지 않습니다.
const ChatListScreen = () => {
  const router = useRouter(); 
  const { userId, rooms, fetchMyRooms } = useChatManager();
  console.log("리스트 userId:", userId);

  // Expo Router 방식의 화면 포스크 시 데이터 갱신
  useFocusEffect(
    useCallback(() => {
      fetchMyRooms(); // 백엔드 getMyRooms 호출
    }, [])
  );

  const renderItem = ({ item }: { item: ChatRoomResponse }) => {
    // 날짜 포맷팅 (예: 2026-02-11T17:30 -> 17:30)
    const displayTime = item.lastMessageTime 
      ? new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "";

    return (
      <TouchableOpacity 
      style={styles.roomItem}
        onPress={() => {
          // ✨ userId가 로드되었는지 확인 (undefined 에러 원천 차단)
          if (item.roomId && userId) { 
            router.push({
              pathname: "/(chat)/[roomId]",
              params: { roomId: item.roomId.toString() } // userId는 상세 페이지가 직접 가져오면 됨
            });
          }
        }}
     >
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{item.roomName}</Text>
          {/* 최근 메시지 표시 */}
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || "메시지가 없습니다."}
          </Text>
        </View>
        <View style={styles.metaInfo}>
          <Text style={styles.time}>{displayTime}</Text>
          {/* 안 읽은 메시지 배지 */}
          {item.unreadCount > 0 && (
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  roomItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 16, fontWeight: 'bold' },
  lastMessage: { color: '#666', marginTop: 5 },
  metaInfo: { alignItems: 'flex-end' },
  time: { fontSize: 12, color: '#999' },
  badge: { backgroundColor: 'red', borderRadius: 10, paddingHorizontal: 6, marginTop: 5 },
  badgeText: { color: '#fff', fontSize: 12 },

});

export default ChatListScreen;