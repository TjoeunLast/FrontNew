/**
 * 정산 상태 타입
 */
export type SettlementStatus = 'READY' | 'WAIT' | 'COMPLETED'; //

/**
 * 결제 초기화 요청 데이터 (SettlementRequest.java 대응)
 */
export interface SettlementRequest {
  orderId: number;
  couponDiscount: number; // 쿠폰 할인액
  levelDiscount: number;  // 등급 할인액
}

/**
 * 정산 정보 상세 모델 (Settlement.java 대응)
 */
export interface SettlementResponse {
  id: number;
  orderId: number;
  totalPrice: number;      // 최종 결제 금액
  levelDiscount: number;   // 등급 할인
  couponDiscount: number;  // 쿠폰 할인
  feeRate: number;         // 수수료율
  status: SettlementStatus;
  feeDate: string;         // 요청일
  feeCompleteDate?: string; // 완료일
}