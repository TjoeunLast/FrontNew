import type { OrderResponse } from '../models/order';
import type { SettlementResponse } from '../models/Settlement';
import type {
  DriverPayoutItemStatusResponse,
  MarkPaidRequest,
  ShipperBillingAgreementResponse,
  TossBillingContextResponse,
  TossPrepareRequest,
  TossPrepareResponse,
  TransportPaymentResponse,
} from '../models/payment';
import apiClient from './apiClient';
import { OrderApi } from './orderService';
import { PaymentService } from './paymentService';
import { SettlementService } from './settlementService';

export type ShipperPaymentLabSnapshot = {
  order: OrderResponse | null;
  settlement: SettlementResponse | null;
  fetchedAt: string;
};

export interface DriverPayoutBatchStatusResponse {
  batchId: number | null;
  batchDate: string | null;
  status: string;
  totalItems: number | null;
  failedItems: number | null;
  requestedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

export type DriverStageSnapshot = {
  settlement: SettlementResponse | null;
  settlementError: string | null;
  payoutStatus: DriverPayoutItemStatusResponse | null;
  payoutError: string | null;
  fetchedAt: string;
};

const getHttpStatus = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return null;
  }

  const response = (error as { response?: { status?: number } }).response;
  return typeof response?.status === "number" ? response.status : null;
};

export const getPaymentTestErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: { data?: { message?: string } | string };
      }
    ).response;
    const responseData = response?.data;

    if (typeof responseData === "string" && responseData.trim()) {
      return responseData;
    }

    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string" &&
      responseData.message.trim()
    ) {
      return responseData.message;
    }
  }

  return error instanceof Error ? error.message : fallbackMessage;
};

async function findMyShipperOrder(orderId: number): Promise<OrderResponse | null> {
  const orders = await OrderApi.getMyShipperOrders();
  const matched = orders.find((item) => item.orderId === orderId);
  if (matched) {
    return matched;
  }

  try {
    const res = await apiClient.get(`/api/v1/orders/${orderId}`);
    return (res.data ?? null) as OrderResponse | null;
  } catch {
    return null;
  }
}

export const PaymentTestService = {
  getBillingContext: (): Promise<TossBillingContextResponse> =>
    PaymentService.getBillingContext(),

  getBillingAgreement: (): Promise<ShipperBillingAgreementResponse | null> =>
    PaymentService.getMyBillingAgreement(),

  prepareTossPayment: (
    orderId: number,
    request: TossPrepareRequest = {}
  ): Promise<TossPrepareResponse> => PaymentService.prepareTossPayment(orderId, request),

  markPaid: (
    orderId: number,
    request: MarkPaidRequest
  ): Promise<TransportPaymentResponse> => PaymentService.markPaid(orderId, request),

  getShipperPaymentSnapshot: async (
    orderId: number
  ): Promise<ShipperPaymentLabSnapshot> => {
    const [order, settlement] = await Promise.all([
      findMyShipperOrder(orderId),
      SettlementService.getOrderSettlement(orderId).catch(() => null),
    ]);

    return {
      order,
      settlement,
      fetchedAt: new Date().toISOString(),
    };
  },

  confirmByDriver: (orderId: number): Promise<unknown> =>
    PaymentService.confirmByDriver(orderId),

  getDriverSettlementStatus: (orderId: number): Promise<SettlementResponse> =>
    SettlementService.getOrderSettlement(orderId),

  getDriverPayoutStatus: (orderId: number): Promise<DriverPayoutItemStatusResponse> =>
    PaymentService.getMyPayoutStatus(orderId),

  getDriverStageSnapshot: async (orderId: number): Promise<DriverStageSnapshot> => {
    const [settlementResult, payoutResult] = await Promise.allSettled([
      SettlementService.getOrderSettlement(orderId),
      PaymentService.getMyPayoutStatus(orderId),
    ]);

    const settlement =
      settlementResult.status === "fulfilled" ? settlementResult.value : null;
    const payoutStatus =
      payoutResult.status === "fulfilled" ? payoutResult.value : null;

    const settlementError =
      settlementResult.status === "rejected"
        ? getPaymentTestErrorMessage(
            settlementResult.reason,
            "차주 정산 상태를 불러오지 못했습니다."
          )
        : null;

    const payoutError =
      payoutResult.status === "rejected"
        ? getHttpStatus(payoutResult.reason) === 400 || getHttpStatus(payoutResult.reason) === 404
          ? "아직 지급 아이템이 없습니다."
          : getPaymentTestErrorMessage(
              payoutResult.reason,
              "차주 payout 상태를 불러오지 못했습니다."
            )
        : null;

    return {
      settlement,
      settlementError,
      payoutStatus,
      payoutError,
      fetchedAt: new Date().toISOString(),
    };
  },

  requestAdminPayout: (orderId: number): Promise<DriverPayoutItemStatusResponse> =>
    apiClient
      .post(`/api/admin/payment/orders/${orderId}/payouts/request`)
      .then((res) => res.data?.data ?? res.data),

  syncAdminPayout: (orderId: number): Promise<DriverPayoutItemStatusResponse> =>
    apiClient
      .post(`/api/admin/payment/payout-items/orders/${orderId}/sync`)
      .then((res) => res.data?.data ?? res.data),

  getAdminPayoutBatchStatus: (date: string): Promise<DriverPayoutBatchStatusResponse> =>
    apiClient
      .get(`/api/admin/payment/payouts/status`, { params: { date } })
      .then((res) => res.data?.data ?? res.data),

  getAdminPayoutItemStatus: (orderId: number): Promise<DriverPayoutItemStatusResponse> =>
    apiClient
      .get(`/api/admin/payment/payout-items/orders/${orderId}/status`)
      .then((res) => res.data?.data ?? res.data),
};

export default PaymentTestService;
