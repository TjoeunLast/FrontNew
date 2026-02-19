import axios from 'axios'; // npm install axios 필요
import apiClient from './apiClient'; // 위에서 만든 클라이언트 임포트
import { OrderResponse, OrderRequest, DriverDashboardResponse, OrderStatus, AssignedDriverInfoResponse } from '../models/order'; //
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = '/api/v1/orders';
const SHIPPER_ORDERS_ENDPOINT_CACHE_KEY = "baro_shipper_orders_endpoint_v1";

type EndpointCandidate = {
  url: string;
  params?: Record<string, string | number | boolean>;
};

function normalizeStatus(raw: any): OrderStatus {
  const v = String(raw ?? "").toUpperCase();
  if (v === "REQUESTED" || v === "ACCEPTED" || v === "LOADING" || v === "IN_TRANSIT" || v === "UNLOADING" || v === "COMPLETED" || v === "CANCELLED" || v === "PENDING") {
    return v as OrderStatus;
  }
  return "REQUESTED";
}

function normalizeOrderRow(node: any): OrderResponse | null {
  if (!node || typeof node !== "object") return null;
  const orderIdRaw = (node as any).orderId ?? (node as any).id ?? (node as any).orderNo;
  if (orderIdRaw === undefined || orderIdRaw === null) return null;
  const orderIdNum = Number(orderIdRaw);
  if (!Number.isFinite(orderIdNum)) return null;

  const createdAt = String((node as any).createdAt ?? (node as any).created_at ?? new Date().toISOString());
  const updated = (node as any).updated ?? (node as any).updatedAt ?? (node as any).modifiedAt;
  const startAddr = String((node as any).startAddr ?? (node as any).startAddress ?? (node as any).puAddress ?? "");
  const startPlace = String((node as any).startPlace ?? (node as any).startName ?? startAddr);
  const endAddr = String((node as any).endAddr ?? (node as any).endAddress ?? (node as any).doAddress ?? "");
  const endPlace = String((node as any).endPlace ?? (node as any).endName ?? endAddr);

  return {
    orderId: orderIdNum,
    status: normalizeStatus((node as any).status),
    createdAt,
    updated: updated ? String(updated) : undefined,
    startAddr,
    startPlace,
    startType: String((node as any).startType ?? (node as any).pickupType ?? ""),
    startSchedule: String((node as any).startSchedule ?? (node as any).pickupAt ?? createdAt),
    endAddr,
    endPlace,
    endType: String((node as any).endType ?? (node as any).dropoffType ?? ""),
    endSchedule: (node as any).endSchedule ? String((node as any).endSchedule) : undefined,
    cargoContent: String((node as any).cargoContent ?? (node as any).cargo ?? ""),
    loadMethod: (node as any).loadMethod ? String((node as any).loadMethod) : undefined,
    workType: (node as any).workType ? String((node as any).workType) : undefined,
    tonnage: Number((node as any).tonnage ?? 0),
    reqCarType: String((node as any).reqCarType ?? (node as any).carType ?? ""),
    reqTonnage: String((node as any).reqTonnage ?? (node as any).tonnageText ?? ""),
    driveMode: (node as any).driveMode ? String((node as any).driveMode) : undefined,
    loadWeight: (node as any).loadWeight !== undefined ? Number((node as any).loadWeight) : undefined,
    basePrice: Number((node as any).basePrice ?? (node as any).price ?? 0),
    laborFee: (node as any).laborFee !== undefined ? Number((node as any).laborFee) : undefined,
    packagingPrice: (node as any).packagingPrice !== undefined ? Number((node as any).packagingPrice) : undefined,
    insuranceFee: (node as any).insuranceFee !== undefined ? Number((node as any).insuranceFee) : undefined,
    payMethod: String((node as any).payMethod ?? ""),
    instant: Boolean((node as any).instant),
    distance: Number((node as any).distance ?? 0),
    duration: Number((node as any).duration ?? 0),
    user: (node as any).user,
    cancellation: (node as any).cancellation,
  };
}

function toOrderList(payload: any): OrderResponse[] {
  const out: OrderResponse[] = [];
  const seen = new Set<string>();

  const absorb = (node: any) => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach((item) => absorb(item));
      return;
    }

    const normalized = normalizeOrderRow(node);
    if (normalized) {
      const id = String(normalized.orderId);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(normalized);
      }
    }

    if (typeof node === "object") {
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

  if (out.length > 0) {
    return out;
  }

  if (Array.isArray(payload)) {
    return payload as OrderResponse[];
  }

  return [];
}

export const OrderApi = {
  /** 1. 화주: 신규 오더 생성 */
  createOrder: async (data: OrderRequest): Promise<OrderResponse> => {
    const res = await apiClient.post(API_BASE, data);
    return res.data;
  },

  /** 2. 차주: 배차 가능한 오더 목록 조회 */
  getAvailableOrders: async (): Promise<OrderResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/available`);
    return res.data;
  },

  /** 3. 차주: 내 차량 맞춤 추천 오더 조회 */
  getRecommendedOrders: async (): Promise<OrderResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/recommended`);
    return res.data;
  },

  /** * 화주 전용: 내가 등록한 모든 오더 목록 조회 (최신순)
   * 백엔드 GET /api/v1/orders/my-shipper 호출
   */
  getMyShipperOrders: async (): Promise<OrderResponse[]> => {
    try {
      const res = await apiClient.get(`${API_BASE}/my-shipper`);
      // 데이터가 페이징(Page<T>) 형태로 올 경우를 대비해 toOrderList로 필터링
      return toOrderList(res.data);
    } catch (error) {
      console.warn("화주 오더 목록 조회 실패(서버 응답):", (error as any)?.response?.status ?? error);
      return [];
    }
  },

  /** 4. 차주: 오더 수락 (배차 신청) */
  acceptOrder: async (orderId: number): Promise<void> => {
    await apiClient.patch(`${API_BASE}/${orderId}/accept`);
  },

  /** 5. 공통: 오더 취소 (사유 포함) */
  cancelOrder: async (orderId: number, reason: string): Promise<void> => {
    await apiClient.patch(`${API_BASE}/${orderId}/cancel`, null, {
      params: { reason }
    });
  },

  /** 6. 차주: 오더 상태 변경 (상차, 이동중, 완료 등) */
  updateStatus: async (orderId: number, newStatus: OrderStatus): Promise<OrderResponse> => {
    const res = await apiClient.patch(`${API_BASE}/${orderId}/status`, null, {
      params: { newStatus }
    });
    return res.data;
  },

  // /** 7. 차주: 홈 대시보드 데이터 조회 (통계 및 요약) */
  // getDashboard: async (): Promise<DriverDashboardResponse> => {
  //   const res = await apiClient.get(`${API_BASE}/dashboard`);
  //   return res.data;
  // }


  /** [추가] 7. 화주: 특정 오더에 배차 신청한 차주 리스트 조회 */
  getApplicants: async (orderId: number): Promise<AssignedDriverInfoResponse[]> => {
    // GET /api/v1/orders/{orderId}/applicants
    const res = await apiClient.get(`${API_BASE}/${orderId}/applicants`);
    return res.data;
  },

  /** [추가] 8. 화주: 차주 최종 선택 (배차 확정) */
  selectDriver: async (orderId: number, driverNo: number): Promise<string> => {
    // POST /api/v1/orders/{orderId}/select-driver?driverNo=...
    const res = await apiClient.post(`${API_BASE}/${orderId}/select-driver`, null, {
      params: { driverNo }
    });
    return res.data;
  },


};


export const OrderService = {
  // 차주: 추천 오더 목록만 직접 조회
  getRecommendedOrders: async (): Promise<OrderResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/recommended`);
    return res.data;
  },

  /** 2. 차주: 배차 가능한 오더 목록 조회 */
  getAvailableOrders: async (): Promise<OrderResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/available`);
    return res.data;
  },

  // 차주: 오더 수락
  acceptOrder: async (orderId: number): Promise<void> => {
    await apiClient.patch(`${API_BASE}/${orderId}/accept`);
  },

  /** 차주: 오더 상태 변경 (상차, 이동중, 하차, 완료 등) */
  updateStatus: async (orderId: number, newStatus: string): Promise<OrderResponse> => {
    // PATCH /api/v1/orders/{orderId}/status?newStatus=...
    const res = await apiClient.patch(`${API_BASE}/${orderId}/status`, null, {
      params: { newStatus }
    });
    return res.data;
  },

  /** 5. 공통: 오더 취소 (사유 포함) */
  cancelOrder: async (orderId: number, reason: string): Promise<void> => {
    await apiClient.patch(`${API_BASE}/${orderId}/cancel`, null, {
      params: { reason }
    });
  },

  /** 차주 전용: 현재 내가 배차받아 운행 중인 오더 목록 조회
   * 백엔드 GET /api/v1/orders/my-driving 엔드포인트 호출
   */
  getMyDrivingOrders: async (): Promise<OrderResponse[]> => {
    // apiClient를 사용하여 인증 헤더와 함께 요청 전송
    const res = await apiClient.get(`${API_BASE}/my-driving`);
    return res.data;
  },
};
