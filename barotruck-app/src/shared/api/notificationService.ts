import apiClient from './apiClient'; // 기존 설정된 axios 인스턴스 가정
import { NotificationResponse } from '../models/notification';

const API_BASE = '/api/notifications';

export const notificationService = {
  /**
   * 1. 사용자의 전체 알림 목록 조회
   */
  getMyNotifications: async (): Promise<NotificationResponse[]> => {
    const res = await apiClient.get<NotificationResponse[]>(`${API_BASE}`);
    return res.data;
  },

  /**
   * 2. 특정 알림 읽음 처리
   */
  markAsRead: async (notificationId: number): Promise<void> => {
    await apiClient.patch(`${API_BASE}/${notificationId}/read`);
  },

  /**
   * (추가 제안) 모든 알림 읽음 처리 등 확장이 필요한 경우 여기에 작성
   */
};