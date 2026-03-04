import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import * as SecureStore from 'expo-secure-store';
import apiClient from './apiClient'; // 보내주신 axios 인스턴스
import { ChatMessageResponse, ChatRoomResponse, ChatHistoryResponse } from '../models/chat';
import { jwtDecode } from "jwt-decode"; // 설치 필요: npm install jwt-decode
import { UserService } from './userService';
import { USE_MOCK } from "@/shared/config/mock";
import { loadChatRoomVisitedAt } from '../utils/chatOrderSummary';


export const useChatManager = () => {
  const [rooms, setRooms] = useState<ChatRoomResponse[]>([]);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  
  const stompClient = useRef<Client | null>(null);
    
    useEffect(() => {
    const fetchAndStoreUser = async () => {
      try {
        // 2. API 호출하여 진짜 정보 가져오기
        const userInfo = await UserService.getMyInfo();
        
        if (userInfo && userInfo.userId) {
          const id = userInfo.userId;
          setUserId(id); // 상태에 저장
          
          // 3. (선택사항) 나중에 쓸 수 있게 저장소에도 보관
          await SecureStore.setItemAsync('myUserId', String(id));
          console.log("✅ chatApi 내부에서 userId 확보 완료:", id);
        }
      } catch (err) {
        console.error("❌ 유저 정보를 가져오지 못했습니다:", err);
      }
    };

    fetchAndStoreUser();
  }, []); // 훅이 처음 실행될 때 딱 한 번 호출

  // 메시지 전송 
  const sendMessage = (roomId: number, content: string) => {
    // 3. userId가 숫자(0 포함)인지 확실히 체크
    if (stompClient.current?.connected && userId) {
      const payload = { 
        roomId, 
        senderId: userId, // 👈 토큰에서 꺼낸 memberid가 들어감
        content, 
        type: 'TEXT' 
      }; 

      stompClient.current.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify(payload),
      });
    }
  };


  // 1. 내 채팅방 목록 조회 (ChatRoomController.getMyRooms)
  const fetchMyRooms = async () => {
    if (USE_MOCK) {
      setRooms([]);
      return;
    }
    try {
      const res = await apiClient.get<ChatRoomResponse[]>('/api/chat/room');
      setRooms(extractChatRooms(res.data));
    } catch (err) {
      console.error("목록 로드 실패:", err);
    }
  };

  // 2. 1:1 채팅방 생성 및 입장 (ChatRoomController.createPersonalRoom)
  const startOrGetChat = async (targetId: number) => {
    if (USE_MOCK) return Number(targetId) + 1000;
    try {
      const res = await apiClient.post<number>(`/api/chat/room/personal/${targetId}`);
      return res.data; // 기존 방이 있으면 해당 ID, 없으면 새 ID 반환
    } catch (err) {
      console.error("방 생성 실패:", err);
    }
  };

  // 3. 과거 내역 조회 (수정)
const loadHistory = async (roomId: number, page: number = 0) => {
  if (!roomId || isNaN(roomId)) return;
  if (USE_MOCK) {
    if (page === 0) setMessages([]);
    setHasNext(false);
    return;
  }

  try {
    const res = await apiClient.get<ChatHistoryResponse>(`/api/chat/room/${roomId}`, {
      params: { page, size: 30 }
    });

    // ✨ 사용자님의 모델 필드명(messages)에 맞춰 수정
    if (res.data && res.data.messages) {
      if (page === 0) {
        // 첫 페이지 로드 시 기존 메시지를 새 데이터로 교체
        setMessages(res.data.messages);
      } else {
        // 페이징 로드 시 기존 메시지 뒤에 추가
        setMessages(prev => [...prev, ...res.data.messages]);
      }
      
      // 모델의 hasNext 필드를 사용하여 페이징 여부 저장
      setHasNext(res.data.hasNext); 
    }
    
    console.log(`✅ ${roomId}번 방 내역 로드 완료:`, res.data.messages.length, "개");
  } catch (err) {
    console.error("이력 로드 실패:", err);
  }
};

  // 4. WebSocket 연결 및 실시간 구독 (ChatMessageController 대응)
  const connectSocket = async (roomId: number) => {
    if (USE_MOCK) return;
    // ✨ 추가: roomId가 없으면 실행 중단
    if (!roomId || isNaN(roomId)) {
      console.warn("유효하지 않은 roomId로 소켓 연결을 시도했습니다.");
      return;
    }
    const token = await SecureStore.getItemAsync('userToken');
    const socketUrl = `${apiClient.defaults.baseURL}/ws-stomp`;

    stompClient.current = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      connectHeaders: { Authorization: `Bearer ${token}` }, // Interceptor와 동일한 토큰 사용
      onConnect: () => {
        // 메시지 수신 구독 (ChatMessageController의 sub 경로)
        stompClient.current?.subscribe(`/sub/chat/room/${roomId}`, (msg) => {
          const newMsg: ChatMessageResponse = JSON.parse(msg.body);
          setMessages(prev => [newMsg, ...prev]); // 최신 메시지를 리스트 맨 앞으로
        });
      },
    });
    stompClient.current.activate();
  };

  

  const disconnect = () => stompClient.current?.deactivate();

  return { 
    userId,
    rooms, messages, hasNext, 
    fetchMyRooms, startOrGetChat, loadHistory, 
    connectSocket, sendMessage, disconnect 
  };
};

function extractChatRooms(payload: unknown): ChatRoomResponse[] {
  if (Array.isArray(payload)) return payload as ChatRoomResponse[];
  const root = payload as any;
  if (Array.isArray(root?.rooms)) return root.rooms as ChatRoomResponse[];
  if (Array.isArray(root?.data)) return root.data as ChatRoomResponse[];
  if (Array.isArray(root?.content)) return root.content as ChatRoomResponse[];
  if (Array.isArray(root?.result)) return root.result as ChatRoomResponse[];
  return [];
}

function resolveUnreadCount(room: any): number {
  const candidates = [
    room?.unreadCount,
    room?.unread_count,
    room?.unreadCnt,
    room?.notReadCount,
    room?.unreadMessageCount,
    room?.unread?.count,
    room?.unread?.messageCount,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return 0;
}

export async function fetchMyChatRooms(): Promise<ChatRoomResponse[]> {
  if (USE_MOCK) return [];
  try {
    const res = await apiClient.get('/api/chat/room');
    return extractChatRooms(res.data);
  } catch {
    return [];
  }
}

export async function fetchMyUnreadChatCount(): Promise<number> {
  const rooms = await fetchMyChatRooms();
  const counts = await Promise.all(
    rooms.map(async (room) => {
      const unreadCount = resolveUnreadCount(room);
      if (unreadCount <= 0 || !room?.roomId) return unreadCount;

      const visitedAt = await loadChatRoomVisitedAt(String(room.roomId));
      const lastMessageTime = new Date((room as any)?.lastMessageTime ?? '').getTime();
      const visitedTime = new Date(visitedAt).getTime();

      if (Number.isFinite(lastMessageTime) && Number.isFinite(visitedTime) && lastMessageTime <= visitedTime) {
        return 0;
      }

      return unreadCount;
    })
  );

  return counts.reduce((acc, count) => acc + count, 0);
}
