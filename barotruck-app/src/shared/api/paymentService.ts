import apiClient from './apiClient';
import {
  DEFAULT_PAYMENT_PROVIDER,
  DEFAULT_TOSS_PREPARE_REQUEST,
} from '../models/payment';
import type {
  CreatePaymentDisputeRequest,
  MarkPaidRequest,
  PaymentProvider,
  PaymentDisputeResponse,
  TossConfirmRequest,
  TossPrepareRequest,
  TossPrepareResponse,
  TransportPaymentResponse,
} from '../models/payment';

const USER_PAYMENT_BASE = '/api/v1/payments';

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
  confirmByDriver: (orderId: number) =>
    post<TransportPaymentResponse>(`${USER_PAYMENT_BASE}/orders/${orderId}/confirm`),

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
};

export default PaymentService;