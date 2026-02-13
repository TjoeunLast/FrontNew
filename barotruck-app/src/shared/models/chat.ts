// types/chat.ts

export enum ChatRoomType {
  PERSONAL = 'PERSONAL',
  GROUP_BUY = 'GROUP_BUY',
  FAMILY = 'FAMILY'
}

export interface ChatMessageResponse {
  messageId: number;
  senderId: number;
  senderNickname: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  createdAt: string; // LocalDateTime은 ISO string으로 옵니다.
}

export interface ChatRoomResponse {
  roomId: number;
  roomName: string;
  type: ChatRoomType;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface ChatHistoryResponse {
  roomId: number;
  messages: ChatMessageResponse[];
  currentPage: number;
  hasNext: boolean;
}

