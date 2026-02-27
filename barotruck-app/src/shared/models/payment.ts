/**
 * 결제 DTO/타입 정의
 * - 토스 결제는 prepare -> 프론트 결제창 -> confirm 순서
 * - mark-paid는 운영 fallback(수동 반영) 용도
 */

/** 결제 수단 */
export type PaymentMethod = 'CARD' | 'TRANSFER' | 'CASH';

/** 결제 시점(선불/후불) */
export type PaymentTiming = 'PREPAID' | 'POSTPAID';

/** 결제 채널(카드/앱카드/계좌이체) */
export type PayChannel = 'CARD' | 'APP_CARD' | 'TRANSFER';

/** PG 제공자(현재 토스 단일) */
export type PaymentProvider = 'TOSS';
export const DEFAULT_PAYMENT_PROVIDER: PaymentProvider = 'TOSS';

/** 결제 상태 */
export type TransportPaymentStatus =
  | 'READY' // 결제 준비
  | 'PAID' // 결제 완료
  | 'CONFIRMED' // 차주 확인 완료
  | 'DISPUTED' // 이의 제기 상태
  | 'ADMIN_HOLD' // 관리자 보류
  | 'ADMIN_FORCE_CONFIRMED' // 관리자 강제확정
  | 'ADMIN_REJECTED' // 관리자 반려
  | 'CANCELLED'; // 결제 취소

/** 결제 이의 사유 */
export type PaymentDisputeReason =
  | 'PRICE_MISMATCH'
  | 'RECEIVED_AMOUNT_MISMATCH'
  | 'PROOF_MISSING'
  | 'FRAUD_SUSPECTED'
  | 'OTHER';

/** 결제 이의 상태 */
export type PaymentDisputeStatus =
  | 'PENDING'
  | 'ADMIN_HOLD'
  | 'ADMIN_FORCE_CONFIRMED'
  | 'ADMIN_REJECTED';

/** 운송 결제 응답 DTO */
export interface TransportPaymentResponse {
  paymentId: number;
  orderId: number;
  shipperUserId: number;
  driverUserId: number | null;
  amount: number;
  feeRateSnapshot: number;
  feeAmountSnapshot: number;
  netAmountSnapshot: number;
  method: PaymentMethod;
  paymentTiming: PaymentTiming;
  status: TransportPaymentStatus;
  pgTid: string | null;
  proofUrl: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
}

/** 결제 이의 응답 DTO */
export interface PaymentDisputeResponse {
  disputeId: number;
  orderId: number;
  paymentId: number;
  requesterUserId: number;
  createdByUserId: number;
  reasonCode: PaymentDisputeReason;
  description: string;
  attachmentUrl: string | null;
  status: PaymentDisputeStatus;
  adminMemo: string | null;
  requestedAt: string;
  processedAt: string | null;
}

/** 토스 prepare 응답 DTO */
export interface TossPrepareResponse {
  provider: PaymentProvider;
  clientKey: string;
  orderId: number;
  pgOrderId: string;
  amount: number;
  method: PaymentMethod;
  payChannel: PayChannel;
  orderName: string;
  successUrl: string;
  failUrl: string;
  confirmEndpoint: string;
  expiresAt: string;
}

/** mark-paid 요청 DTO */
export interface MarkPaidRequest {
  method?: PaymentMethod;
  paymentTiming?: PaymentTiming;
  proofUrl?: string | null;
  paidAt?: string | null;
}

/** 결제 이의 생성 요청 DTO */
export interface CreatePaymentDisputeRequest {
  requesterUserId?: number | null;
  reasonCode: PaymentDisputeReason;
  description: string;
  attachmentUrl?: string | null;
}

/**
 * 토스 prepare 요청 DTO
 * - method/payChannel 미입력 시 DEFAULT_TOSS_PREPARE_REQUEST 사용
 */
export interface TossPrepareRequest {
  method?: PaymentMethod;
  payChannel?: PayChannel;
  orderName?: string;
}

/** 토스 confirm 요청 DTO */
export interface TossConfirmRequest {
  paymentKey: string;
  pgOrderId?: string;
  amount?: number;
}

/** 토스 prepare 기본값 */
export const DEFAULT_TOSS_PREPARE_METHOD: PaymentMethod = 'CARD';
export const DEFAULT_TOSS_PREPARE_CHANNEL: PayChannel = 'CARD';
export const DEFAULT_TOSS_PREPARE_REQUEST: Required<
  Pick<TossPrepareRequest, 'method' | 'payChannel'>
> = {
  method: DEFAULT_TOSS_PREPARE_METHOD,
  payChannel: DEFAULT_TOSS_PREPARE_CHANNEL,
};