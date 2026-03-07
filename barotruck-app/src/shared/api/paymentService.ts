import apiClient from './apiClient';
import {
  DEFAULT_PAYMENT_PROVIDER,
  DEFAULT_TOSS_PREPARE_REQUEST,
} from '../models/payment';
import type {
  CreatePaymentDisputeRequest,
  MarkPaidRequest,
  OrderPaymentSummary,
  PaymentMethod,
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

export function normalizeTransportPaymentStatus(
  raw: unknown,
): TransportPaymentResponse['status'] | undefined {
  const rawText = String(raw ?? '').trim();
  const v = rawText.toUpperCase();
  if (
    v === 'READY' ||
    v === 'PAID' ||
    v === 'CONFIRMED' ||
    v === 'DISPUTED' ||
    v === 'ADMIN_HOLD' ||
    v === 'ADMIN_FORCE_CONFIRMED' ||
    v === 'ADMIN_REJECTED' ||
    v === 'CANCELLED'
  ) {
    return v as TransportPaymentResponse['status'];
  }
  if (v === 'WAIT' || v === 'WAITING' || v === '1') return 'PAID';
  if (v === 'COMPLETED' || v === 'DONE' || v === 'SUCCESS' || v === '2') {
    return 'CONFIRMED';
  }
  if (v === 'UNPAID' || v === 'INIT' || v === '0' || v === 'REQUESTED') {
    return 'READY';
  }
  if (rawText.includes('미결제') || rawText.includes('결제전')) return 'READY';
  if (rawText.includes('대기')) return 'PAID';
  if (rawText.includes('완료') || rawText.includes('결제됨')) return 'CONFIRMED';
  return undefined;
}

function normalizeLegacySettlementPaymentStatus(
  raw: unknown,
): TransportPaymentResponse['status'] | undefined {
  const rawText = String(raw ?? '').trim();
  const v = rawText.toUpperCase();

  if (
    v === 'PAID' ||
    v === 'CONFIRMED' ||
    v === 'DISPUTED' ||
    v === 'ADMIN_HOLD' ||
    v === 'ADMIN_FORCE_CONFIRMED' ||
    v === 'ADMIN_REJECTED' ||
    v === 'CANCELLED'
  ) {
    return v as TransportPaymentResponse['status'];
  }
  if (v === 'WAIT' || v === 'WAITING' || v === '1') return 'PAID';
  if (v === 'COMPLETED' || v === '2') return 'CONFIRMED';
  if (v === 'READY' || v === 'UNPAID' || v === 'INIT' || v === '0') return 'READY';
  if (v === 'REQUESTED') return 'READY';
  if (rawText.includes('미결제') || rawText.includes('결제전')) return 'READY';
  if (rawText.includes('대기')) return 'PAID';
  if (rawText.includes('완료') || rawText.includes('결제됨')) return 'CONFIRMED';

  return undefined;
}

export function normalizePaymentMethod(raw: unknown): PaymentMethod | undefined {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === 'CARD' || v === 'TRANSFER' || v === 'CASH') {
    return v as PaymentMethod;
  }
  return undefined;
}

function normalizeIsoString(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).trim();
  return text || undefined;
}

function resolveLegacySettlementCandidate(node: any): unknown {
  if (!node || typeof node !== 'object') return undefined;

  const settlementNode = (node as any).settlement;
  const settlementsNode =
    (node as any).settlements ??
    (node as any).settlementList ??
    (node as any).settlementDtos ??
    (node as any).settlementInfos;
  const firstSettlement = Array.isArray(settlementsNode)
    ? settlementsNode[0]
    : settlementsNode;

  return (
    (node as any).settlementStatus ??
    (node as any).settlement_status ??
    (node as any).settlementState ??
    (node as any).settlement_state ??
    (node as any).settleStatus ??
    (typeof settlementNode === 'string' ? settlementNode : undefined) ??
    settlementNode?.status ??
    settlementNode?.settlementStatus ??
    settlementNode?.settlement_status ??
    (node as any).settlementDto?.status ??
    (node as any).settlementInfo?.status ??
    (typeof firstSettlement === 'string' ? firstSettlement : undefined) ??
    firstSettlement?.status ??
    firstSettlement?.settlementStatus ??
    firstSettlement?.settlement_status
  );
}

export function normalizeOrderPaymentSummary(
  node: unknown,
): OrderPaymentSummary | undefined {
  if (!node || typeof node !== 'object') return undefined;

  const source =
    (node as any).paymentSummary ??
    (node as any).payment ??
    (node as any).transportPayment;

  const paymentIdRaw = source?.paymentId ?? source?.id ?? (node as any).paymentId;
  const paymentId =
    paymentIdRaw !== undefined && paymentIdRaw !== null
      ? Number(paymentIdRaw)
      : undefined;
  const chargedAmountRaw =
    source?.chargedAmount ?? source?.amount ?? (node as any).paymentAmount;
  const chargedAmount =
    chargedAmountRaw !== undefined && chargedAmountRaw !== null
      ? Number(chargedAmountRaw)
      : undefined;
  const receivedAmountRaw = source?.receivedAmount ?? source?.netAmountSnapshot;
  const receivedAmount =
    receivedAmountRaw !== undefined && receivedAmountRaw !== null
      ? Number(receivedAmountRaw)
      : undefined;
  const feeAmountRaw = source?.feeAmount ?? source?.feeAmountSnapshot;
  const feeAmount =
    feeAmountRaw !== undefined && feeAmountRaw !== null
      ? Number(feeAmountRaw)
      : undefined;
  const legacySettlementStatus = normalizeLegacySettlementPaymentStatus(
    resolveLegacySettlementCandidate(node),
  );
  const status = normalizeTransportPaymentStatus(
    source?.status ??
      source?.paymentStatus ??
      source?.payStatus ??
      (node as any).paymentStatus ??
      (node as any).payStatus ??
      (node as any).transportPaymentStatus,
  ) ?? legacySettlementStatus;
  const method = normalizePaymentMethod(
    source?.method ?? source?.paymentMethod,
  );
  const paidAt = normalizeIsoString(source?.paidAt);
  const confirmedAt = normalizeIsoString(source?.confirmedAt);

  if (
    !Number.isFinite(paymentId ?? NaN) &&
    chargedAmount === undefined &&
    receivedAmount === undefined &&
    feeAmount === undefined &&
    status === undefined &&
    method === undefined &&
    paidAt === undefined &&
    confirmedAt === undefined
  ) {
    return undefined;
  }

  return {
    paymentId: Number.isFinite(paymentId ?? NaN) ? paymentId : undefined,
    chargedAmount,
    receivedAmount,
    feeAmount,
    method,
    status,
    paidAt,
    confirmedAt,
  };
}

export function findNestedTransportPaymentStatus(
  node: unknown,
  depth = 0,
): TransportPaymentResponse['status'] | undefined {
  if (!node || typeof node !== 'object' || depth > 3) return undefined;

  const direct = normalizeTransportPaymentStatus(
    (node as any).paymentStatus ??
      (node as any).payStatus ??
      (node as any).transportPaymentStatus ??
      (node as any).paymentSummary?.status,
  );
  if (direct) return direct;

  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    const key = String(k).toLowerCase();
    if (key.includes('payment') || key.includes('결제')) {
      const nested = Array.isArray(v) ? v[0] : v;
      const parsed =
        normalizeTransportPaymentStatus(nested) ??
        normalizeTransportPaymentStatus((nested as any)?.status) ??
        normalizeTransportPaymentStatus((nested as any)?.paymentStatus) ??
        normalizeTransportPaymentStatus((nested as any)?.payStatus) ??
        findNestedTransportPaymentStatus(nested, depth + 1);
      if (parsed) return parsed;
    }
  }

  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    const key = String(k).toLowerCase();
    if (key.includes('settlement') || key.includes('정산')) {
      const nested = Array.isArray(v) ? v[0] : v;
      const parsed =
        normalizeLegacySettlementPaymentStatus(nested) ??
        normalizeLegacySettlementPaymentStatus((nested as any)?.status) ??
        normalizeLegacySettlementPaymentStatus((nested as any)?.settlementStatus) ??
        normalizeLegacySettlementPaymentStatus((nested as any)?.settlement_status) ??
        findNestedTransportPaymentStatus(nested, depth + 1);
      if (parsed) return parsed;
    }
  }

  return undefined;
}

export function mergeOrderPaymentSummary(
  current?: OrderPaymentSummary,
  incoming?: OrderPaymentSummary,
): OrderPaymentSummary | undefined {
  const pickDefined = <T>(a: T | undefined, b: T | undefined) =>
    b !== undefined ? b : a;

  if (!current) return incoming;
  if (!incoming) return current;

  return {
    paymentId: pickDefined(current.paymentId, incoming.paymentId),
    chargedAmount: pickDefined(current.chargedAmount, incoming.chargedAmount),
    receivedAmount: pickDefined(current.receivedAmount, incoming.receivedAmount),
    feeAmount: pickDefined(current.feeAmount, incoming.feeAmount),
    method: pickDefined(current.method, incoming.method),
    status: pickDefined(current.status, incoming.status),
    paidAt: pickDefined(current.paidAt, incoming.paidAt),
    confirmedAt: pickDefined(current.confirmedAt, incoming.confirmedAt),
  };
}

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
