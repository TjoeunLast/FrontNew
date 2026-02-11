/**
 * 리뷰 관련 타입
 */
export interface ReviewRequest {
  orderId: number;   // 대상 오더 ID
  rating: number;    // 1~5점
  content: string;   // 리뷰 내용
}

export interface ReviewResponse {
  reviewId: number;
  writerNickname: string; // 작성자 닉네임
  rating: number;
  content: string;
  createdAt: string;      // ISO 날짜 문자열
}

/**
 * 신고 관련 타입
 */
export interface ReportRequest {
  orderId: number;      // 관련 오더 ID
  reportType: 'ACCIDENT' | 'NO_SHOW' | 'RUDE' | 'ETC'; // 신고 유형
  description: string;  // 상세 내용
}

export interface ReportResponse {
  reportId: number;
  orderId: number;
  reporterNickname: string;
  targetNickname: string;
  reportType: string;
  description: string;
  status: 'PENDING' | 'PROCESSING' | 'RESOLVED'; // 처리 상태
  createdAt: string;
}