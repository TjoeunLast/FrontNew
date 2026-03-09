/**
 * 알림 데이터 모델 (NotificationResponse.java 대응)
 */
export interface NotificationResponse {
  notificationId: number;
  type: string;     // 예: 'GROUPBUY', 'EXPIRY', 'ORDER' 등
  title: string;
  body: string;
  targetId?: number; // 이동할 상세 페이지 ID 등
  createdAt: string; // LocalDateTime 대응
  readAt?: string | null; // 읽지 않은 경우 null
}

/**
 * 알림 타입 정의 (필요 시 확장)
 */
export type NotificationType = 'GROUPBUY' | 'EXPIRY' | 'ORDER';