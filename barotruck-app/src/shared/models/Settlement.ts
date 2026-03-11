import type { TransportPaymentStatus } from "./payment";

/**
 * 정산 상태 코드
 * - 백엔드 SettlementStatus enum(READY/COMPLETED/WAIT)과 1:1 매핑된다.
 * - 화면에서는 배지/필터/상태문구 렌더링 기준으로 사용한다.
 */
export type SettlementStatus =
  /** 정산 대기(미완료) */
  | "READY"
  /** 정산 완료 */
  | "COMPLETED"
  /** 이슈 대기(분쟁/보류 등으로 확정 대기) */
  | "WAIT";

/**
 * 정산 생성/갱신 요청 모델
 * - 백엔드 SettlementRequest DTO와 매핑된다.
 * - 보통 관리자/내부 플로우에서 정산 데이터 초기화 시 사용한다.
 */
export interface SettlementRequest {
  /** 대상 주문 ID */
  orderId: number;
  /** 쿠폰 할인 금액(원) */
  couponDiscount: number;
  /** 회원등급 할인 금액(원) */
  levelDiscount: number;
}

/**
 * 정산 단건/목록 응답 모델
 * 사용 API:
 * - GET /api/v1/settlements/orders/{orderId}
 * - GET /api/v1/settlements/me
 */
export interface SettlementResponse {
  /** 정산 PK */
  settlementId: number;
  /** 주문 ID */
  orderId: number;
  /** 화주 사용자 ID (없을 수 있음) */
  shipperUserId: number | null;
  /** 차주 사용자 ID (없을 수 있음) */
  driverUserId: number | null;
  /** 차주 이름 */
  driverName?: string | null;
  /** 차주 은행명 */
  bankName?: string | null;
  /** 차주 계좌번호 */
  accountNum?: string | null;
  /** 화주 회사명/이름 */
  shipperName?: string | null;
  /** 화주 사업자번호 */
  bizNumber?: string | null;
  /** 주문 상태 */
  orderStatus?: string | null;
  /** 결제 PK */
  paymentId?: number | null;
  /** 결제 수단 */
  paymentMethod?: string | null;
  /** 결제 시점 */
  paymentTiming?: string | null;
  /** 결제 상태 */
  paymentStatus?: TransportPaymentStatus | null;
  /** 결제 금액 */
  paymentAmount?: number | null;
  /** 수수료 금액 */
  paymentFeeAmount?: number | null;
  /** 차주 지급 예정 금액 */
  paymentNetAmount?: number | null;
  /** PG 거래 ID */
  pgTid?: string | null;
  /** 수기결제 증빙 URL */
  proofUrl?: string | null;
  /** 결제 완료 시각 */
  paidAt?: string | null;
  /** 차주 확인 완료 시각 */
  confirmedAt?: string | null;
  /** 등급 할인 금액(원) */
  levelDiscount: number;
  /** 쿠폰 할인 금액(원) */
  couponDiscount: number;
  /** 최종 정산 기준 금액(원) */
  totalPrice: number;
  /** 수수료율(% 정수, 예: 10 => 10%) */
  feeRate: number;
  /** 정산 상태 코드 */
  status: SettlementStatus;
  /** 지급 상태 */
  payoutStatus?: string | null;
  /** 지급 실패 사유 */
  payoutFailureReason?: string | null;
  /** 지급 참조키 */
  payoutRef?: string | null;
  /** 지급 요청 시각 */
  payoutRequestedAt?: string | null;
  /** 지급 완료 시각 */
  payoutCompletedAt?: string | null;
  /** 정산 생성/반영 시각(ISO 문자열) */
  feeDate: string | null;
  /** 정산 완료 시각(ISO 문자열), 미완료면 null */
  feeCompleteDate: string | null;
}

/**
 * 정산 요약 응답 모델
 * 사용 API:
 * - GET /api/v1/settlements/admin/summary
 */
export interface SettlementSummaryResponse {
  /** 합계 금액(원) */
  totalAmount: number;
  /** 플랫폼 수익(원) */
  platformRevenue: number;
  /** 총 할인 금액(원) */
  totalDiscount: number;
  /** 집계 건수 */
  count: number;
}

/**
 * 지역별 정산 통계 응답 모델
 * 사용 API:
 * - GET /api/v1/settlements/admin/region-stats
 */
export interface SettlementRegionStatResponse {
  /** 광역 시/도명(없을 수 있음) */
  province: string | null;
  /** 지역별 합계 금액(원) */
  totalAmount: number;
  /** 지역별 건수 */
  count: number;
}
