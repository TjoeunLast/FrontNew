import { AssignedDriverInfoResponse, OrderRequest, OrderResponse, OrderStatus } from '../models/order';
import apiClient from './apiClient';

const API_BASE = '/api/v1/orders';

function normalizeStatus(raw: any): OrderStatus {
  const v = String(raw ?? '').toUpperCase();
  if (
    v === 'REQUESTED' ||
    v === 'ACCEPTED' ||
    v === 'LOADING' ||
    v === 'IN_TRANSIT' ||
    v === 'UNLOADING' ||
    v === 'COMPLETED' ||
    v === 'CANCELLED' ||
    v === 'PENDING'
  ) {
    return v as OrderStatus;
  }
  return 'REQUESTED';
}

function normalizeSettlementStatus(raw: any): OrderResponse['settlementStatus'] {
  const rawText = String(raw ?? '').trim();
  const v = rawText.toUpperCase();
  if (v === 'READY' || v === 'WAIT' || v === 'COMPLETED') return v;
  // TransportPaymentStatus (backend): READY, PAID, CONFIRMED, DISPUTED, CANCELLED
  if (v === 'PAID' || v === 'CONFIRMED') return 'COMPLETED';
  if (v === 'DISPUTED') return 'WAIT';
  if (v === 'CANCELLED') return 'READY';
  if (v === '0') return 'READY';
  if (v === '1') return 'WAIT';
  if (v === '2') return 'COMPLETED';
  if (v === 'UNPAID' || v === 'INIT') return 'READY';
  if (v === 'PENDING' || v === 'WAITING' || v === 'REQUESTED') return 'WAIT';
  if (v === 'PAID' || v === 'DONE' || v === 'SUCCESS') return 'COMPLETED';
  if (rawText.includes('미결제') || rawText.includes('결제전')) return 'READY';
  if (rawText.includes('대기')) return 'WAIT';
  if (rawText.includes('완료') || rawText.includes('결제됨')) return 'COMPLETED';
  return undefined;
}

function findNestedSettlementStatus(node: any, depth = 0): OrderResponse['settlementStatus'] {
  if (!node || typeof node !== 'object' || depth > 3) return undefined;

  const direct = normalizeSettlementStatus(
    (node as any).status ??
      (node as any).settlementStatus ??
      (node as any).settlement_status ??
      (node as any).paymentStatus ??
      (node as any).payStatus ??
      (node as any).state
  );
  if (direct) return direct;

  for (const [k, v] of Object.entries(node as Record<string, any>)) {
    const key = String(k).toLowerCase();
    if (key.includes('settlement') || key.includes('payment') || key.includes('정산') || key.includes('결제')) {
      const nested = Array.isArray(v) ? v[0] : v;
      const parsed =
        normalizeSettlementStatus(nested) ??
        normalizeSettlementStatus((nested as any)?.status) ??
        normalizeSettlementStatus((nested as any)?.state) ??
        findNestedSettlementStatus(nested, depth + 1);
      if (parsed) return parsed;
    }
  }

  return undefined;
}

function normalizeOrderRow(node: any): OrderResponse | null {
  if (!node || typeof node !== 'object') return null;
  const orderIdRaw = (node as any).orderId ?? (node as any).id ?? (node as any).orderNo;
  if (orderIdRaw === undefined || orderIdRaw === null) return null;
  const orderIdNum = Number(orderIdRaw);
  if (!Number.isFinite(orderIdNum)) return null;

  const createdAt = String((node as any).createdAt ?? (node as any).created_at ?? new Date().toISOString());
  const updated = (node as any).updated ?? (node as any).updatedAt ?? (node as any).modifiedAt;
  const startAddr = String((node as any).startAddr ?? (node as any).startAddress ?? (node as any).puAddress ?? '');
  const startPlace = String((node as any).startPlace ?? (node as any).startName ?? startAddr);
  const endAddr = String((node as any).endAddr ?? (node as any).endAddress ?? (node as any).doAddress ?? '');
  const endPlace = String((node as any).endPlace ?? (node as any).endName ?? endAddr);

  const settlementNode = (node as any).settlement;
  const settlementsNode =
    (node as any).settlements ??
    (node as any).settlementList ??
    (node as any).settlementDtos ??
    (node as any).settlementInfos;
  const firstSettlement = Array.isArray(settlementsNode) ? settlementsNode[0] : settlementsNode;

  const settlementStatus = normalizeSettlementStatus(
    (node as any).settlementStatus ??
      (node as any).settlement_status ??
      (node as any).settlementState ??
      (node as any).settlement_state ??
      (node as any).settleStatus ??
      (node as any).paymentStatus ??
      (node as any).payment_state ??
      (typeof settlementNode === 'string' ? settlementNode : undefined) ??
      settlementNode?.status ??
      settlementNode?.settlementStatus ??
      settlementNode?.settlement_status ??
      (node as any).settlementDto?.status ??
      (node as any).settlementInfo?.status ??
      (typeof firstSettlement === 'string' ? firstSettlement : undefined) ??
      firstSettlement?.status ??
      firstSettlement?.settlementStatus ??
      firstSettlement?.settlement_status ??
      findNestedSettlementStatus(node)
  );

  return {
    orderId: orderIdNum,
    status: normalizeStatus((node as any).status),
    settlementStatus,
    createdAt,
    updated: updated ? String(updated) : undefined,
    startAddr,
    startPlace,
    startType: String((node as any).startType ?? (node as any).pickupType ?? ''),
    startSchedule: String((node as any).startSchedule ?? (node as any).pickupAt ?? createdAt),
    endAddr,
    endPlace,
    endType: String((node as any).endType ?? (node as any).dropoffType ?? ''),
    endSchedule: (node as any).endSchedule ? String((node as any).endSchedule) : undefined,
    cargoContent: String((node as any).cargoContent ?? (node as any).cargo ?? ''),
    loadMethod: (node as any).loadMethod ? String((node as any).loadMethod) : undefined,
    workType: (node as any).workType ? String((node as any).workType) : undefined,
    tonnage: Number((node as any).tonnage ?? 0),
    reqCarType: String((node as any).reqCarType ?? (node as any).carType ?? ''),
    reqTonnage: String((node as any).reqTonnage ?? (node as any).tonnageText ?? ''),
    driveMode: (node as any).driveMode ? String((node as any).driveMode) : undefined,
    loadWeight: (node as any).loadWeight !== undefined ? Number((node as any).loadWeight) : undefined,
    basePrice: Number((node as any).basePrice ?? (node as any).price ?? 0),
    laborFee: (node as any).laborFee !== undefined ? Number((node as any).laborFee) : undefined,
    packagingPrice: (node as any).packagingPrice !== undefined ? Number((node as any).packagingPrice) : undefined,
    insuranceFee: (node as any).insuranceFee !== undefined ? Number((node as any).insuranceFee) : undefined,
    payMethod: String((node as any).payMethod ?? ''),
    instant: Boolean((node as any).instant),
    distance: Number((node as any).distance ?? 0),
    duration: Number((node as any).duration ?? 0),
    user: (node as any).user,
    cancellation: (node as any).cancellation,
  };
}

function mergeOrderRows(prev: OrderResponse, next: OrderResponse): OrderResponse {
  const pickDefined = <T>(a: T | undefined, b: T | undefined) => (b !== undefined ? b : a);
  return {
    ...prev,
    ...next,
    settlementStatus: pickDefined(prev.settlementStatus, next.settlementStatus),
    payMethod: next.payMethod || prev.payMethod,
    updated: next.updated || prev.updated,
    createdAt: next.createdAt || prev.createdAt,
  };
}

function toOrderList(payload: any): OrderResponse[] {
  const out: OrderResponse[] = [];
  const byId = new Map<string, number>();

  const absorb = (node: any) => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach((item) => absorb(item));
      return;
    }

    const normalized = normalizeOrderRow(node);
    if (normalized) {
      const id = String(normalized.orderId);
      const existingIndex = byId.get(id);
      if (existingIndex === undefined) {
        byId.set(id, out.length);
        out.push(normalized);
      } else {
        out[existingIndex] = mergeOrderRows(out[existingIndex], normalized);
      }
    }

    if (typeof node === 'object') {
      absorb((node as any).content);
      absorb((node as any).items);
      absorb((node as any).results);
      absorb((node as any).data);
      absorb((node as any).orders);
      absorb((node as any).list);
      absorb((node as any).rows);
    }
  };

  absorb(payload);

  if (out.length > 0) return out;
  if (Array.isArray(payload)) return payload as OrderResponse[];
  return [];
}

export const OrderApi = {
  createOrder: async (data: OrderRequest): Promise<OrderResponse> => {
    const res = await apiClient.post(API_BASE, data);
    return res.data;
  },

  updateOrder: async (orderId: number, data: OrderRequest): Promise<OrderResponse> => {
    const candidates: Array<{ method: 'patch' | 'put' | 'post'; url: string }> = [
      { method: 'patch', url: `${API_BASE}/${orderId}` },
      { method: 'put', url: `${API_BASE}/${orderId}` },
      { method: 'patch', url: `${API_BASE}/${orderId}/update` },
      { method: 'put', url: `${API_BASE}/${orderId}/update` },
      { method: 'post', url: `${API_BASE}/${orderId}/update` },
      { method: 'patch', url: `${API_BASE}/update/${orderId}` },
    ];

    let lastError: any = null;
    for (const candidate of candidates) {
      try {
        const res =
          candidate.method === 'patch'
            ? await apiClient.patch(candidate.url, data)
            : candidate.method === 'put'
              ? await apiClient.put(candidate.url, data)
              : await apiClient.post(candidate.url, data);
        return res.data;
      } catch (error: any) {
        const status = Number(error?.response?.status ?? 0);
        if (status !== 404 && status !== 405) throw error;
        lastError = error;
      }
    }

    throw lastError ?? new Error('order_update_endpoint_not_found');
  },

  getAvailableOrders: async (): Promise<OrderResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/available`);
    return res.data;
  },

  getRecommendedOrders: async (): Promise<OrderResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/recommended`);
    return res.data;
  },

  getMyShipperOrders: async (): Promise<OrderResponse[]> => {
    try {
      const res = await apiClient.get(`${API_BASE}/my-shipper`);
      return toOrderList(res.data);
    } catch (error: any) {
      console.error('화주 오더 목록 조회 실패:', {
        endpoint: `${API_BASE}/my-shipper`,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      return [];
    }
  },

  acceptOrder: async (orderId: number): Promise<void> => {
    await apiClient.patch(`${API_BASE}/${orderId}/accept`);
  },

  cancelOrder: async (orderId: number, reason: string): Promise<void> => {
    await apiClient.patch(`${API_BASE}/${orderId}/cancel`, null, {
      params: { reason },
    });
  },

  updateStatus: async (orderId: number, newStatus: OrderStatus): Promise<OrderResponse> => {
    const res = await apiClient.patch(`${API_BASE}/${orderId}/status`, null, {
      params: { newStatus },
    });
    return res.data;
  },

  getApplicants: async (orderId: number): Promise<AssignedDriverInfoResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/${orderId}/applicants`);
    return res.data;
  },

  selectDriver: async (orderId: number, driverNo: number): Promise<string> => {
    const res = await apiClient.post(`${API_BASE}/${orderId}/select-driver`, null, {
      params: { driverNo },
    });
    return res.data;
  },
};

export const OrderService = {
  getRecommendedOrders: async (): Promise<OrderResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/recommended`);
    return res.data;
  },

  getAvailableOrders: async (): Promise<OrderResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/available`);
    return res.data;
  },

  acceptOrder: async (orderId: number): Promise<void> => {
    await apiClient.patch(`${API_BASE}/${orderId}/accept`);
  },

  updateStatus: async (orderId: number, newStatus: string): Promise<OrderResponse> => {
    const res = await apiClient.patch(`${API_BASE}/${orderId}/status`, null, {
      params: { newStatus },
    });
    return res.data;
  },

  cancelOrder: async (orderId: number, reason: string): Promise<void> => {
    await apiClient.patch(`${API_BASE}/${orderId}/cancel`, null, {
      params: { reason },
    });
  },

  getMyDrivingOrders: async (): Promise<OrderResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/my-driving`);
    return res.data;
  },


/** 차주 전용: 월간 수익 통계 및 목록 조회 */
  getMyRevenue: async (year?: number, month?: number): Promise<MyRevenueResponse> => {
    // 목업 모드 대응
    if (USE_MOCK) {
      return {
        totalAmount: 1500000,
        receivedAmount: 1200000,
        pendingAmount: 300000,
        orders: MOCK_ORDERS.slice(0, 5), // 목업 데이터 일부 반환
      };
    }

    // API 호출 (쿼리 파라미터 전달)
    const res = await apiClient.get(`${API_BASE}/my-revenue`, {
      params: { year, month }
    });
    
    // 백엔드에서 준 orders 리스트를 normalizeOrderRow 등을 통해 가공해야 한다면 아래처럼 처리 가능
    const data = res.data;
    if (data && data.orders) {
      data.orders = toOrderList(data.orders);
    }
    
    return data;
  },

};
