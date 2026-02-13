import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useChatManager } from '../../../../shared/api/chatApi';
import { ChatMessageResponse } from '../../../../shared/models/chat';
import { useLocalSearchParams } from "expo-router"; // 1. Expo Router 훅 추가

// Props에서 route 대신 userId만 받습니다. (또는 Context에서 가져와도 됩니다)
const ChatRoomScreen = () => {
  // 2. 동적 라우트 [roomId].tsx에서 roomId 추출
const { roomId } = useLocalSearchParams<{ roomId: string; }>();  
const [text, setText] = useState('');

  // 통합 관리 훅 사용
  const { userId, messages, loadHistory, connectSocket, sendMessage, disconnect } = useChatManager();

  
  useEffect(() => {
  if (!roomId || !userId) return;

  const numericRoomId = Number(roomId);
  loadHistory(numericRoomId); 
  connectSocket(numericRoomId); 

  // ✅ 수정: 클린업 함수 내부에서 비동기 함수를 실행만 하도록 변경
  return () => {
    disconnect(); // 리턴값을 반환하지 않고 실행만 합니다.
  };
}, [roomId, userId]);

  const handleSend = () => {
    if (text.trim() && roomId) {
      // ChatMessageRequest 규격에 맞춰 전송
      sendMessage(Number(roomId), text); 
      setText('');
    }
  };

  const renderItem = ({ item }: { item: ChatMessageResponse }) => {
    const isMine = item.senderId === userId;
    return (
      <View style={[styles.messageBox, isMine ? styles.myMessage : styles.otherMessage]}>
        {!isMine && <Text style={styles.senderText}>{item.senderNickname}</Text>}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
          <Text style={styles.messageText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.messageId.toString()}
        inverted // 최신 메시지가 아래에 배치되도록 설정
      />
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          value={text} 
          onChangeText={setText} 
          placeholder="메시지를 입력하세요..." 
          multiline
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  messageBox: { marginVertical: 5, paddingHorizontal: 10, maxWidth: '85%' },
  myMessage: { alignSelf: 'flex-end' },
  otherMessage: { alignSelf: 'flex-start' },
  senderText: { fontSize: 12, color: '#888', marginBottom: 2, marginLeft: 5 },
  bubble: { padding: 10, borderRadius: 15 },
  myBubble: { backgroundColor: '#DCF8C6', borderTopRightRadius: 0 }, // 말풍선 꼬리 효과
  otherBubble: { backgroundColor: '#fff', borderTopLeftRadius: 0 },
  messageText: { fontSize: 15, color: '#333' },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 10, 
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#eee'
  },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 8,
    maxHeight: 100 
  },
  sendButton: { 
    marginLeft: 10, 
    justifyContent: 'center', 
    backgroundColor: '#007AFF', 
    width: 50,
    height: 40,
    borderRadius: 20,
    alignItems: 'center'
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default ChatRoomScreen;