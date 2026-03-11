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

/** PG 원장 상태 */
export type GatewayTxStatus = 'PREPARED' | 'CONFIRMED' | 'FAILED' | 'CANCELED';

/** billing agreement 상태 */
export type BillingAgreementStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

/** 차주 지급 상태 */
export type PayoutItemStatus =
  | 'READY'
  | 'REQUESTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING';

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
export interface PaymentAmountSnapshotResponse {
  baseAmount: number | null;
  shipperChargeAmount: number | null;
  shipperFeeRate: number | null;
  shipperFeeAmount: number | null;
  shipperPromoApplied: boolean | null;
  driverFeeRate: number | null;
  driverFeeAmount: number | null;
  driverPromoApplied: boolean | null;
  driverPayoutAmount: number | null;
  tossFeeRate: number | null;
  tossFeeAmount: number | null;
  platformGrossRevenue: number | null;
  platformNetRevenue: number | null;
  feePolicyId: number | null;
  feePolicyAppliedAt: string | null;
}

export interface TransportPaymentResponse {
  paymentId: number;
  orderId: number;
  shipperUserId: number;
  driverUserId: number | null;
  amount: number;
  feeRateSnapshot: number;
  feeAmountSnapshot: number;
  netAmountSnapshot: number;
  amountSnapshot?: PaymentAmountSnapshotResponse | null;
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

/** billing 등록용 토스 컨텍스트 */
export interface TossBillingContextResponse {
  clientKey: string | null;
  customerKey: string;
  successUrl: string | null;
  failUrl: string | null;
}

/** billing agreement 발급 요청 */
export interface TossBillingIssueRequest {
  authKey: string;
  customerKey?: string;
}

/** 화주 billing agreement 응답 */
export interface ShipperBillingAgreementResponse {
  agreementId: number;
  shipperUserId: number;
  provider: PaymentProvider;
  method: PaymentMethod;
  status: BillingAgreementStatus;
  customerKey: string;
  billingKeyMasked: string | null;
  cardCompany: string | null;
  cardNumberMasked: string | null;
  cardType: string | null;
  ownerType: string | null;
  authenticatedAt: string | null;
  lastChargedAt: string | null;
  deactivatedAt: string | null;
  deactivationReason: string | null;
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

/** 관리자 취소 요청 DTO */
export interface CancelTossPaymentRequest {
  cancelReason?: string;
  cancelAmount?: number;
}

/** PG 취소 이력 DTO */
export interface TossPaymentLookupCancelHistory {
  cancelAmount: number | null;
  cancelReason: string | null;
  canceledAt: string | null;
  transactionKey: string | null;
  cancelStatus: string | null;
}

/** PG 실조회 DTO */
export interface TossPaymentLookupResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  method: string | null;
  easyPayProvider: string | null;
  totalAmount: number | null;
  suppliedAmount: number | null;
  vat: number | null;
  approvedAt: string | null;
  lastTransactionAt: string | null;
  cancels: TossPaymentLookupCancelHistory[];
  rawPayload: string | null;
}

/** 내부 게이트웨이 원장 상태 DTO */
export interface GatewayTransactionStatusResponse {
  txId: number;
  orderId: number;
  provider: PaymentProvider;
  status: GatewayTxStatus;
  amount: number | null;
  retryCount: number | null;
  expiresAt: string | null;
  approvedAt: string | null;
  nextRetryAt: string | null;
  failCode: string | null;
  failMessage: string | null;
}

/** 내부 결제 vs Toss 비교 DTO */
export interface TossPaymentComparisonResponse {
  gatewayTransaction: GatewayTransactionStatusResponse | null;
  transportPayment: TransportPaymentResponse | null;
  gatewayLookup: TossPaymentLookupResponse | null;
  mismatch: boolean;
  mismatchReason: string | null;
}

/** 차주 지급 상태 DTO */
export interface DriverPayoutItemStatusResponse {
  itemId: number;
  orderId: number;
  batchId: number | null;
  driverUserId: number;
  status: PayoutItemStatus;
  retryCount: number | null;
  requestedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  payoutRef: string | null;
  sellerId?: string | null;
  sellerRef?: string | null;
  sellerStatus?: string | null;
  lastWebhookId?: number | null;
  lastWebhookExternalEventId?: string | null;
  lastWebhookEventType?: string | null;
  lastWebhookProcessResult?: string | null;
  webhookStatus?: string | null;
  lastWebhookReceivedAt?: string | null;
  lastWebhookProcessedAt?: string | null;
  webhookMatchesPayoutStatus?: boolean | null;
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
