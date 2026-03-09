/**
 * 공지사항 응답 데이터 모델 (NoticeResponse.java 대응)
 */
export interface NoticeResponse {
  noticeId: number;
  title: string;
  content: string;
  isPinned: 'Y' | 'N';
  adminName: string;
  createdAt: string; // ISO 8601 날짜 문자열
}

/**
 * 공지사항 생성/수정 요청 모델 (NoticeRequest.java 대응)
 */
export interface NoticeRequest {
  title: string;
  content: string;
  isPinned: 'Y' | 'N';
}