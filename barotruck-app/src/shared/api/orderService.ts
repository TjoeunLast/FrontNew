import axios from 'axios'; // npm install axios 필요
import apiClient from './apiClient'; // 위에서 만든 클라이언트 임포트
import { OrderResponse, OrderRequest, DriverDashboardResponse, OrderStatus, AssignedDriverInfoResponse } from '../models/order'; //

const API_BASE = '/api/v1/orders';

function toOrderList(payload: any): OrderResponse[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const candidates = [payload.content, payload.items, payload.results, payload.data, payload.orders];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
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

  /** 화주: 내 주문 목록 조회 (백엔드 구현 경로 차이를 흡수하기 위해 후보 경로 순차 시도) */
  getMyShipperOrders: async (): Promise<OrderResponse[]> => {
    const candidates = [
      "/api/v1/orders/my",
      "/api/v1/orders/me",
      "/api/v1/shippers/me/orders",
      "/api/v1/shippers/orders",
      "/api/v1/orders/shipper",
      "/api/orders/my",
      "/api/orders/me",
    ];

    for (const url of candidates) {
      try {
        const res = await apiClient.get(url);
        const parsed = toOrderList(res.data);
        if (parsed.length > 0) return parsed;
      } catch {
        // Try next endpoint.
      }
    }

    return [];
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
