import apiClient from './apiClient';
import {
  DEFAULT_PAYMENT_PROVIDER,
  DEFAULT_TOSS_PREPARE_REQUEST,
} from '../models/payment';
import type {
  CancelTossPaymentRequest,
  CreatePaymentDisputeRequest,
  DriverPayoutItemStatusResponse,
  MarkPaidRequest,
  PaymentProvider,
  PaymentDisputeResponse,
  ShipperBillingAgreementResponse,
  TossBillingContextResponse,
  TossBillingIssueRequest,
  TossPaymentComparisonResponse,
  TossPaymentLookupResponse,
  TossConfirmRequest,
  TossPrepareRequest,
  TossPrepareResponse,
  TransportPaymentResponse,
} from '../models/payment';

const USER_PAYMENT_BASE = '/api/v1/payments';
const ADMIN_PAYMENT_BASE = '/api/admin/payment';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<ApiResponse<T>>;
  return (
    typeof candidate.success === 'boolean' &&
    'data' in candidate &&
    'message' in candidate
  );
};

const unwrap = <T>(payload: unknown): T => {
  if (!isApiResponse<T>(payload)) {
    return payload as T;
  }
  if (!payload.success) {
    throw new Error(payload.message ?? 'payment api request failed');
  }
  return payload.data;
};

const post = async <T>(
  url: string,
  body?: unknown,
  params?: Record<string, unknown>
): Promise<T> => {
  const res = await apiClient.post(url, body ?? null, params ? { params } : undefined);
  return unwrap<T>(res.data);
};

const patch = async <T>(
  url: string,
  body?: unknown,
  params?: Record<string, unknown>
): Promise<T> => {
  const res = await apiClient.patch(url, body ?? null, params ? { params } : undefined);
  return unwrap<T>(res.data);
};

const get = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const res = await apiClient.get(url, params ? { params } : undefined);
  return unwrap<T>(res.data);
};

const del = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const res = await apiClient.delete(url, params ? { params } : undefined);
  return unwrap<T>(res.data);
};

const isConfirmFallbackError = (error: any) => {
  const status = Number(error?.response?.status ?? 0);
  return status === 404 || status === 405;
};

type TossPrepareResponseRaw = Omit<TossPrepareResponse, 'provider'> & {
  provider?: PaymentProvider | null;
};

/**
 * 결제 API 사용 순서
 * 1) 화주: prepareTossPayment(orderId, request)
 * 2) 프론트: prepare 응답(clientKey/pgOrderId/amount)으로 토스 결제창 호출
 * 3) 프론트: 성공 콜백 paymentKey로 confirmTossPayment 호출
 * 4) 차주: confirmByDriver 호출
 * 5) 이의 필요 시 createDispute 호출
 */
export const PaymentService = {
  /** 화주 수동 결제 반영(운영 fallback) */
  markPaid: (orderId: number, request: MarkPaidRequest) =>
    post<TransportPaymentResponse>(`${USER_PAYMENT_BASE}/orders/${orderId}/mark-paid`, request),

  /** 차주 결제 확인 */
  confirmByDriver: async (orderId: number): Promise<unknown> => {
    try {
      return await post<TransportPaymentResponse>(`${USER_PAYMENT_BASE}/orders/${orderId}/confirm`);
    } catch (error) {
      if (!isConfirmFallbackError(error)) throw error;
    }

    try {
      return await patch<TransportPaymentResponse>(`${USER_PAYMENT_BASE}/orders/${orderId}/confirm`);
    } catch (error) {
      if (!isConfirmFallbackError(error)) throw error;
    }

    return patch<unknown>(`/api/v1/settlements/orders/${orderId}/complete-by-user`);
  },

  /** 차주 본인 지급 상태 조회 */
  getMyPayoutStatus: (orderId: number) =>
    get<DriverPayoutItemStatusResponse>(`${USER_PAYMENT_BASE}/payouts/orders/${orderId}/status`),

  /** 차주/관리자 결제 이의 생성 */
  createDispute: (orderId: number, request: CreatePaymentDisputeRequest) =>
    post<PaymentDisputeResponse>(`${USER_PAYMENT_BASE}/orders/${orderId}/disputes`, request),

  /**
   * 화주 토스 결제 사전준비
   * - request 미입력 가능
   * - method/payChannel 미입력 시 기본값(CARD/CARD) 자동 적용
   */
  prepareTossPayment: async (
    orderId: number,
    request: TossPrepareRequest = {}
  ): Promise<TossPrepareResponse> => {
    const finalRequest: TossPrepareRequest = {
      ...DEFAULT_TOSS_PREPARE_REQUEST,
      ...request,
    };

    const prepared = await post<TossPrepareResponseRaw>(
      `${USER_PAYMENT_BASE}/orders/${orderId}/toss/prepare`,
      finalRequest
    );

    return {
      ...prepared,
      provider: prepared.provider ?? DEFAULT_PAYMENT_PROVIDER,
    };
  },

  /** 화주 토스 결제 승인 확정 */
  confirmTossPayment: (orderId: number, request: TossConfirmRequest) =>
    post<TransportPaymentResponse>(`${USER_PAYMENT_BASE}/orders/${orderId}/toss/confirm`, request),

  /** 화주 billing agreement 등록용 SDK 컨텍스트 조회 */
  getBillingContext: () => get<TossBillingContextResponse>(`${USER_PAYMENT_BASE}/billing/context`),

  /** 화주 billing agreement 발급 */
  issueBillingAgreement: (request: TossBillingIssueRequest) =>
    post<ShipperBillingAgreementResponse>(`${USER_PAYMENT_BASE}/billing/agreements`, request),

  /** 화주 내 billing agreement 조회 */
  getMyBillingAgreement: () =>
    get<ShipperBillingAgreementResponse | null>(`${USER_PAYMENT_BASE}/billing/agreements/me`),

  /** 화주 billing agreement 해지 */
  deactivateMyBillingAgreement: () =>
    del<ShipperBillingAgreementResponse>(`${USER_PAYMENT_BASE}/billing/agreements/me`),

  /** 관리자용 Toss payment 실조회 */
  lookupTossPaymentByPaymentKey: (paymentKey: string) =>
    get<TossPaymentLookupResponse>(
      `${ADMIN_PAYMENT_BASE}/toss/payments/${encodeURIComponent(paymentKey)}`
    ),

  /** 관리자용 주문 기준 PG vs 내부 결제 비교 조회 */
  lookupTossPaymentByOrderId: (orderId: number) =>
    get<TossPaymentComparisonResponse>(`${ADMIN_PAYMENT_BASE}/toss/orders/${orderId}/lookup`),

  /** 관리자용 Toss 결제 취소 */
  cancelTossOrderPayment: (orderId: number, request?: CancelTossPaymentRequest) =>
    post<TransportPaymentResponse>(`${ADMIN_PAYMENT_BASE}/orders/${orderId}/cancel`, request ?? {}),
};

export default PaymentService;
