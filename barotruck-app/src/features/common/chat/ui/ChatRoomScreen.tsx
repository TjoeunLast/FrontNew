import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useChatManager } from '../../../../shared/api/chatApi';
import { ChatMessageResponse } from '../../../../shared/models/chat';

function resolveOutgoingReadState(
  item: ChatMessageResponse,
  myUserId: number | null,
  sortedMessages: ChatMessageResponse[]
): 'READ' | 'UNREAD' | null {
  const myId = Number(myUserId);
  const senderId = Number((item as any)?.senderId);
  if (!Number.isFinite(myId) || !Number.isFinite(senderId) || senderId !== myId) return null;
  const row = item as any;

  const explicitBool = row?.isRead ?? row?.read ?? row?.seen ?? row?.isSeen;
  if (typeof explicitBool === 'boolean') return explicitBool ? 'READ' : 'UNREAD';

  const readAt = String(row?.readAt ?? row?.seenAt ?? '').trim();
  if (readAt) return 'READ';

  const unreadCount = Number(row?.unreadCount ?? row?.unreadCnt ?? row?.notReadCount);
  if (Number.isFinite(unreadCount)) return unreadCount <= 0 ? 'READ' : 'UNREAD';

  const readCount = Number(row?.readCount ?? row?.readCnt);
  if (Number.isFinite(readCount)) return readCount > 0 ? 'READ' : 'UNREAD';

  const itemTime = new Date(item.createdAt).getTime();
  const hasLaterOtherMessage = sortedMessages.some((msg) => {
    const msgSenderId = Number((msg as any)?.senderId);
    if (Number.isFinite(msgSenderId) && msgSenderId === myId) return false;
    const t = new Date(msg.createdAt).getTime();
    if (Number.isFinite(itemTime) && Number.isFinite(t) && t > itemTime) return true;
    return msg.messageId > item.messageId;
  });
  return hasLaterOtherMessage ? 'READ' : 'UNREAD';
}

function hasLaterOtherMessageAfter(
  item: ChatMessageResponse,
  myUserId: number | null,
  sortedMessages: ChatMessageResponse[]
): boolean {
  const myId = Number(myUserId);
  if (!Number.isFinite(myId)) return false;
  const itemTime = new Date(item.createdAt).getTime();
  return sortedMessages.some((msg) => {
    const senderId = Number((msg as any)?.senderId);
    if (Number.isFinite(senderId) && senderId === myId) return false;
    const t = new Date(msg.createdAt).getTime();
    if (Number.isFinite(itemTime) && Number.isFinite(t) && t > itemTime) return true;
    return msg.messageId > item.messageId;
  });
}

const ChatRoomScreen = () => {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const navigation = useNavigation();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessageResponse>>(null);

  const { userId, messages, loadHistory, connectSocket, sendMessage, disconnect } = useChatManager();

  const roomTitle = useMemo(() => {
    const other = messages.find((m) => m.senderId !== userId && m.senderNickname);
    return other?.senderNickname || '채팅';
  }, [messages, userId]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: roomTitle,
    });
  }, [navigation, roomTitle]);

  useEffect(() => {
    if (!roomId || !userId) return;

    const numericRoomId = Number(roomId);
    loadHistory(numericRoomId);
    connectSocket(numericRoomId);

    return () => {
      disconnect();
    };
  }, [roomId, userId]);

  const dateChipLabel = useMemo(() => {
    const target = messages[messages.length - 1]?.createdAt || messages[0]?.createdAt || new Date().toISOString();
    const d = new Date(target);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  }, [messages]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return a.messageId - b.messageId;
    });
  }, [messages]);

  const latestMyMessageId = useMemo(() => {
    const myId = Number(userId);
    if (!Number.isFinite(myId)) return null;
    for (let i = sortedMessages.length - 1; i >= 0; i -= 1) {
      const senderId = Number((sortedMessages[i] as any)?.senderId);
      if (Number.isFinite(senderId) && senderId === myId) return sortedMessages[i].messageId;
    }
    return null;
  }, [sortedMessages, userId]);

  const formatKoreanTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSend = () => {
    if (text.trim() && roomId) {
      sendMessage(Number(roomId), text);
      setText('');
    }
  };

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한을 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    setText((prev) => (prev ? `${prev} [사진]` : '[사진]'));
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한을 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    setText((prev) => (prev ? `${prev} [사진]` : '[사진]'));
  };

  const openAttachmentMenu = () => {
    Alert.alert('첨부', '추가할 항목을 선택하세요.', [
      { text: '갤러리', onPress: () => void pickImageFromGallery() },
      { text: '카메라', onPress: () => void takePhoto() },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }: { item: ChatMessageResponse }) => {
    const myId = Number(userId);
    const senderId = Number((item as any)?.senderId);
    const isMine = Number.isFinite(myId) && Number.isFinite(senderId) && senderId === myId;
    const readState = resolveOutgoingReadState(item, userId, sortedMessages);
    const hasLaterOtherMessage = hasLaterOtherMessageAfter(item, userId, sortedMessages);
    const readLabel =
      readState === 'UNREAD'
        ? '1'
        : readState === 'READ' && item.messageId === latestMyMessageId && !hasLaterOtherMessage
          ? '읽음'
          : '';
    return (
      <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.otherMessageRow]}>
        {isMine ? (
          <View style={styles.myMetaCol}>
            {!!readLabel && <Text style={styles.readStateText}>{readLabel}</Text>}
            <Text style={styles.timeText}>{formatKoreanTime(item.createdAt)}</Text>
          </View>
        ) : null}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.content}</Text>
        </View>
        {!isMine && <Text style={styles.timeText}>{formatKoreanTime(item.createdAt)}</Text>}
      </View>
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [sortedMessages.length]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.orderSummary}>
        <View style={styles.orderSummaryLeft}>
          <Text style={styles.routeText}>경기 평택 → 부산 신항</Text>
          <Text style={styles.cargoText}>11톤 윙바디 · 파렛트 14개</Text>
        </View>
        <Text style={styles.priceText}>450,000원</Text>
      </View>

      {!!dateChipLabel && (
        <View style={styles.dateChipWrap}>
          <Text style={styles.dateChipText}>{dateChipLabel}</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={sortedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.messageId.toString()}
        contentContainerStyle={styles.messageListContent}
        style={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.circleIconButton} onPress={openAttachmentMenu}>
          <Ionicons name="add" size={22} color="#9aa4b6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleIconButton} onPress={() => void takePhoto()}>
          <Ionicons name="camera-outline" size={20} color="#9aa4b6" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="메시지 보내기"
          placeholderTextColor="#b8bfcc"
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="paper-plane" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f8' },
  orderSummary: {
    backgroundColor: '#e9ecf8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#d9dfef',
  },
  orderSummaryLeft: { flex: 1, paddingRight: 8 },
  routeText: { fontSize: 15, fontWeight: '700', color: '#222836' },
  cargoText: { marginTop: 4, fontSize: 12, color: '#66748d' },
  priceText: { fontSize: 16, fontWeight: '700', color: '#4d51db' },
  dateChipWrap: { alignItems: 'center', marginTop: 12, marginBottom: 6 },
  dateChipText: {
    backgroundColor: '#e4e8ef',
    color: '#7e889a',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
  },
  messageList: { flex: 1 },
  messageListContent: { paddingHorizontal: 14, paddingBottom: 10, paddingTop: 6 },
  messageRow: { marginVertical: 5, flexDirection: 'row', alignItems: 'flex-end', maxWidth: '92%' },
  myMessageRow: { alignSelf: 'flex-end' },
  otherMessageRow: { alignSelf: 'flex-start' },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '88%',
    borderWidth: 1,
  },
  myBubble: {
    backgroundColor: '#4f52dc',
    borderColor: '#4f52dc',
    borderBottomRightRadius: 9,
  },
  otherBubble: {
    backgroundColor: '#f8f9fb',
    borderColor: '#d9e0ea',
    borderBottomLeftRadius: 9,
  },
  messageText: { fontSize: 14, lineHeight: 20, color: '#1f2430', fontWeight: '500' },
  myMessageText: { color: '#ffffff' },
  timeText: { fontSize: 11, color: '#9aa4b6', marginHorizontal: 7, marginBottom: 3 },
  myMetaCol: { alignItems: 'flex-end', justifyContent: 'flex-end', marginRight: 6, marginBottom: 2 },
  readStateText: { fontSize: 11, color: '#5a5ce1', fontWeight: '700', marginBottom: 1 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f7fa',
    borderWidth: 1,
    borderColor: '#dde3ee',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 24,
  },
  circleIconButton: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#e9edf3',
    borderRadius: 20,
    fontSize: 14,
    color: '#2c3345',
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginHorizontal: 6,
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4f52dc',
    width: 38,
    height: 38,
    borderRadius: 19,
  },
});

export default ChatRoomScreen;
