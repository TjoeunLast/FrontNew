import { AssignedDriverInfoResponse, MyRevenueResponse, OrderRequest, OrderResponse, OrderStatus } from '../models/order'; //
import apiClient from './apiClient'; // 위에서 만든 클라이언트 임포트
import { USE_MOCK } from '@/shared/config/mock';
import { MOCK_ORDERS } from '@/shared/mockData';
import { MOCK_SHIPPER_ORDERS } from '@/features/shipper/mock/shipperMockOrders';
import {
  addLocalShipperOrder,
  getLocalShipperOrders,
  hydrateLocalShipperOrders,
  removeLocalShipperOrder,
  type LocalShipperOrderStatus,
} from '@/features/shipper/home/model/localShipperOrders';

const API_BASE = '/api/v1/orders';

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

function toScheduleIsoFromHHmm(hhmm?: string) {
  if (!hhmm) return new Date().toISOString();
  const m = hhmm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return new Date().toISOString();
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toISOString();
}

function toStableNumericId(raw: string | number, seed = 0) {
  const n = Number(raw);
  if (Number.isFinite(n)) return Math.trunc(n);

  const s = String(raw);
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return 700_000_000 + hash + seed;
}

function mapLocalStatusToOrderStatus(status: LocalShipperOrderStatus): OrderStatus {
  if (status === "MATCHING") return "REQUESTED";
  if (status === "CONFIRMED") return "ACCEPTED";
  if (status === "DRIVING") return "IN_TRANSIT";
  return "COMPLETED";
}

function mapLocalOrderToResponse(row: ReturnType<typeof getLocalShipperOrders>[number]): OrderResponse {
  return {
    orderId: toStableNumericId(row.id),
    status: mapLocalStatusToOrderStatus(row.status),
    createdAt: new Date().toISOString(),
    updated: new Date().toISOString(),
    startAddr: row.from,
    startPlace: row.fromDetail || row.from,
    startType: row.pickupTypeLabel || "당상",
    startSchedule: toScheduleIsoFromHHmm(row.pickupTimeHHmm),
    endAddr: row.to,
    endPlace: row.toDetail || row.to,
    endType: row.dropoffTypeLabel || "당착",
    endSchedule: toScheduleIsoFromHHmm(row.dropoffTimeHHmm),
    cargoContent: row.cargoDetail || row.cargoSummary,
    loadMethod: row.loadMethod,
    workType: row.workTool,
    tonnage: 0,
    reqCarType: row.cargoSummary,
    reqTonnage: "",
    driveMode: row.dispatchMode,
    loadWeight: undefined,
    basePrice: row.priceWon,
    laborFee: 0,
    packagingPrice: 0,
    insuranceFee: 0,
    payMethod: "",
    instant: row.dispatchMode === "instant",
    distance: row.distanceKm,
    duration: Math.max(30, Math.round(row.distanceKm * 2)),
    user: {
      userId: 1,
      email: "mock@baro.local",
      phone: row.startContact || "01012345678",
      nickname: "목업화주",
      role: "SHIPPER",
    },
    applicantCount: row.status === "MATCHING" ? 2 : 0,
  };
}

function mapShipperMockToResponse(row: (typeof MOCK_SHIPPER_ORDERS)[number], index: number): OrderResponse {
  const status: OrderStatus =
    row.status === "MATCHING"
      ? "REQUESTED"
      : row.status === "DISPATCHED"
        ? "ACCEPTED"
        : row.status === "DRIVING"
          ? "IN_TRANSIT"
          : "COMPLETED";

  return {
    orderId: toStableNumericId(row.id, index),
    status,
    createdAt: new Date().toISOString(),
    updated: new Date().toISOString(),
    startAddr: row.from,
    startPlace: row.from,
    startType: row.pickupTypeLabel || "당상",
    startSchedule: toScheduleIsoFromHHmm(row.pickupTimeHHmm),
    endAddr: row.to,
    endPlace: row.to,
    endType: row.dropoffTypeLabel || "당착",
    endSchedule: toScheduleIsoFromHHmm(row.dropoffTimeHHmm),
    cargoContent: row.cargoSummary,
    loadMethod: row.loadMethodShort,
    workType: row.workToolShort,
    tonnage: 0,
    reqCarType: row.cargoSummary,
    reqTonnage: "",
    driveMode: row.isInstantDispatch ? "instant" : "direct",
    loadWeight: undefined,
    basePrice: row.priceWon,
    laborFee: 0,
    packagingPrice: 0,
    insuranceFee: 0,
    payMethod: "",
    instant: Boolean(row.isInstantDispatch),
    distance: row.distanceKm,
    duration: Math.max(30, Math.round(row.distanceKm * 2)),
    user: {
      userId: 1,
      email: "mock@baro.local",
      phone: "01012345678",
      nickname: "목업화주",
      role: "SHIPPER",
    },
    applicantCount: row.status === "MATCHING" ? 2 : 0,
  };
}

async function getMockShipperOrders(): Promise<OrderResponse[]> {
  await hydrateLocalShipperOrders();
  const localRows = getLocalShipperOrders().map(mapLocalOrderToResponse);
  const seededRows = MOCK_SHIPPER_ORDERS.map(mapShipperMockToResponse);
  return [...localRows, ...seededRows];
}

export const OrderApi = {
  /** 1. 화주: 신규 오더 생성 */
  createOrder: async (data: OrderRequest): Promise<OrderResponse> => {
    if (USE_MOCK) {
      const orderId = Date.now();
      addLocalShipperOrder({
        id: String(orderId),
        status: "MATCHING",
        dispatchMode: data.instant ? "instant" : "direct",
        pickupTypeLabel: data.startType || "당상",
        dropoffTypeLabel: data.endType || "당착",
        from: data.startAddr || "-",
        to: data.endAddr || "-",
        fromDetail: data.startPlace || "-",
        toDetail: data.endPlace || "-",
        pickupTimeHHmm: "09:00",
        dropoffTimeHHmm: "18:00",
        distanceKm: Math.round(Number(data.distance ?? 0)),
        cargoSummary: `${data.reqTonnage ?? ""} ${data.reqCarType ?? ""}`.trim() || data.cargoContent || "-",
        cargoDetail: data.cargoContent,
        loadMethod: data.loadMethod,
        workTool: data.workType,
        priceWon: Number(data.basePrice ?? 0),
        updatedAtLabel: "방금 전",
      });
      return {
        orderId,
        status: "REQUESTED",
        createdAt: new Date().toISOString(),
        updated: new Date().toISOString(),
        startAddr: data.startAddr,
        startPlace: data.startPlace,
        startType: data.startType,
        startSchedule: data.startSchedule,
        startLat: data.startLat,
        startLng: data.startLng,
        endAddr: data.endAddr,
        endPlace: data.endPlace,
        endType: data.endType,
        endSchedule: data.endSchedule,
        cargoContent: data.cargoContent ?? "",
        loadMethod: data.loadMethod,
        workType: data.workType,
        tonnage: data.tonnage,
        reqCarType: data.reqCarType,
        reqTonnage: data.reqTonnage,
        driveMode: data.driveMode,
        loadWeight: data.loadWeight,
        basePrice: data.basePrice,
        laborFee: data.laborFee,
        packagingPrice: data.packagingPrice,
        insuranceFee: data.insuranceFee,
        payMethod: data.payMethod,
        instant: data.instant,
        distance: data.distance,
        duration: data.duration,
      };
    }

    const res = await apiClient.post(API_BASE, data);
    return res.data;
  },

  /** 2. 차주: 배차 가능한 오더 목록 조회 */
  getAvailableOrders: async (): Promise<OrderResponse[]> => {
    if (USE_MOCK) return MOCK_ORDERS;
    const res = await apiClient.get(`${API_BASE}/available`);
    return res.data;
  },

  /** 3. 차주: 내 차량 맞춤 추천 오더 조회 */
  getRecommendedOrders: async (): Promise<OrderResponse[]> => {
    if (USE_MOCK) return MOCK_ORDERS.filter((x) => x.status === "REQUESTED");
    const res = await apiClient.get(`${API_BASE}/recommended`);
    return res.data;
  },

  /** * 화주 전용: 내가 등록한 모든 오더 목록 조회 (최신순)
   * 백엔드 GET /api/v1/orders/my-shipper 호출
   */
  getMyShipperOrders: async (): Promise<OrderResponse[]> => {
    if (USE_MOCK) return getMockShipperOrders();
    try {
      const res = await apiClient.get(`${API_BASE}/my-shipper`);
      // 데이터가 페이징(Page<T>) 형태로 올 경우를 대비해 toOrderList로 필터링
      return toOrderList(res.data);
    } catch (error: any) {
      console.error("화주 오더 목록 조회 실패:", {
        endpoint: `${API_BASE}/my-shipper`,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      return [];
    }
  },

  /** 4. 차주: 오더 수락 (배차 신청) */
  acceptOrder: async (orderId: number): Promise<void> => {
    if (USE_MOCK) return;
    await apiClient.patch(`${API_BASE}/${orderId}/accept`);
  },

  /** 5. 공통: 오더 취소 (사유 포함) */
  cancelOrder: async (orderId: number, reason: string): Promise<void> => {
    if (USE_MOCK) {
      removeLocalShipperOrder(String(orderId));
      return;
    }
    await apiClient.patch(`${API_BASE}/${orderId}/cancel`, null, {
      params: { reason }
    });
  },

  /** 6. 차주: 오더 상태 변경 (상차, 이동중, 완료 등) */
  updateStatus: async (orderId: number, newStatus: OrderStatus): Promise<OrderResponse> => {
    if (USE_MOCK) {
      const found = MOCK_ORDERS.find((x) => x.orderId === orderId);
      if (found) return { ...found, status: newStatus, updated: new Date().toISOString() };
      return {
        orderId,
        status: newStatus,
        createdAt: new Date().toISOString(),
        updated: new Date().toISOString(),
        startAddr: "-",
        startPlace: "-",
        startType: "당상",
        startSchedule: new Date().toISOString(),
        endAddr: "-",
        endPlace: "-",
        endType: "당착",
        endSchedule: new Date().toISOString(),
        cargoContent: "-",
        tonnage: 0,
        reqCarType: "-",
        reqTonnage: "-",
        basePrice: 0,
        payMethod: "",
        instant: false,
        distance: 0,
        duration: 0,
      };
    }
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
    if (USE_MOCK) {
      return [
        {
          userId: 101,
          email: "driver1@mock.local",
          nickname: "목업기사1",
          phone: "01011112222",
          ratingAvg: 4.8,
          driverId: 1001,
          carNum: "12가3456",
          carType: "카고",
          tonnage: "5톤",
          career: 5,
        },
      ];
    }
    // GET /api/v1/orders/{orderId}/applicants
    const res = await apiClient.get(`${API_BASE}/${orderId}/applicants`);
    return res.data;
  },

  /** [추가] 8. 화주: 차주 최종 선택 (배차 확정) */
  selectDriver: async (orderId: number, driverNo: number): Promise<string> => {
    if (USE_MOCK) return `목업 배차 확정 완료 (${orderId}, ${driverNo})`;
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
    if (USE_MOCK) return MOCK_ORDERS.filter((x) => x.status === "REQUESTED");
    const res = await apiClient.get(`${API_BASE}/recommended`);
    return res.data;
  },

  /** 2. 차주: 배차 가능한 오더 목록 조회 */
  getAvailableOrders: async (): Promise<OrderResponse[]> => {
    if (USE_MOCK) return MOCK_ORDERS;
    const res = await apiClient.get(`${API_BASE}/available`);
    return res.data;
  },

  // 차주: 오더 수락
  acceptOrder: async (orderId: number): Promise<void> => {
    if (USE_MOCK) return;
    await apiClient.patch(`${API_BASE}/${orderId}/accept`);
  },

  /** 차주: 오더 상태 변경 (상차, 이동중, 하차, 완료 등) */
  updateStatus: async (orderId: number, newStatus: string): Promise<OrderResponse> => {
    if (USE_MOCK) {
      const found = MOCK_ORDERS.find((x) => x.orderId === orderId);
      if (found) return { ...found, status: (newStatus as OrderStatus), updated: new Date().toISOString() };
      return {
        orderId,
        status: "IN_TRANSIT",
        createdAt: new Date().toISOString(),
        updated: new Date().toISOString(),
        startAddr: "-",
        startPlace: "-",
        startType: "당상",
        startSchedule: new Date().toISOString(),
        endAddr: "-",
        endPlace: "-",
        endType: "당착",
        endSchedule: new Date().toISOString(),
        cargoContent: "-",
        tonnage: 0,
        reqCarType: "-",
        reqTonnage: "-",
        basePrice: 0,
        payMethod: "",
        instant: false,
        distance: 0,
        duration: 0,
      };
    }
    // PATCH /api/v1/orders/{orderId}/status?newStatus=...
    const res = await apiClient.patch(`${API_BASE}/${orderId}/status`, null, {
      params: { newStatus }
    });
    return res.data;
  },

  /** 5. 공통: 오더 취소 (사유 포함) */
  cancelOrder: async (orderId: number, reason: string): Promise<void> => {
    if (USE_MOCK) return;
    await apiClient.patch(`${API_BASE}/${orderId}/cancel`, null, {
      params: { reason }
    });
  },

  /** 차주 전용: 현재 내가 배차받아 운행 중인 오더 목록 조회
   * 백엔드 GET /api/v1/orders/my-driving 엔드포인트 호출
   */
  getMyDrivingOrders: async (): Promise<OrderResponse[]> => {
    if (USE_MOCK) return MOCK_ORDERS.filter((x) => ["ACCEPTED", "LOADING", "IN_TRANSIT", "UNLOADING"].includes(x.status));
    // apiClient를 사용하여 인증 헤더와 함께 요청 전송
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
