import apiClient from './apiClient';
import type {
  SettlementRegionStatResponse,
  SettlementRequest,
  SettlementResponse,
  SettlementStatus,
  SettlementSummaryResponse,
} from '../models/Settlement';

/**
 * 백엔드 공통 응답 래퍼 형태.
 * - 일부 API는 { success, data, message } 형태로 내려오고
 * - 일부 API는 data만 바로 내려오므로 런타임에서 구분해서 처리한다.
 */
type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

/**
 * 전달받은 값이 공통 응답 래퍼 구조인지 검사한다.
 */
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

/**
 * 백엔드 응답을 안전하게 언래핑한다.
 * - 래퍼 형식이 아니면 그대로 반환
 * - 래퍼 형식인데 success=false면 Error 발생
 * - 정상(success=true)이면 data만 반환
 */
const unwrap = <T>(payload: unknown): T => {
  if (!isApiResponse<T>(payload)) {
    return payload as T;
  }
  if (!payload.success) {
    throw new Error(payload.message ?? 'settlement api request failed');
  }
  return payload.data;
};

/**
 * 정산 관련 API 모음.
 *
 * 사용 규칙:
 * 1) initSettlement로 정산 초기화(요청 생성)
 * 2) 필요 시 complete/complete-by-user로 완료 처리
 * 3) 조회는 getOrderSettlement / getMySettlements 사용
 * 4) 관리자 통계는 getSummary / getRegionStats 사용
 */
export const SettlementService = {
  /**
   * 정산 초기화(레거시).
   * Endpoint: POST /api/v1/settlements/init
   *
   * @param data orderId, 할인값(couponDiscount/levelDiscount)
   * @returns 백엔드 메시지 문자열
   * @throws API 실패 시 Error
   */
  initSettlement: async (data: SettlementRequest): Promise<string> => {
    const res = await apiClient.post('/api/v1/settlements/init', data);
    return unwrap<string>(res.data);
  },

  /**
   * 정산 완료 처리(레거시).
   * Endpoint: PATCH /api/v1/settlements/{orderId}/complete
   *
   * @param orderId 주문 ID
   * @returns 백엔드 메시지 문자열
   * @throws API 실패 시 Error
   */
  completeSettlement: async (orderId: number): Promise<string> => {
    const res = await apiClient.patch(`/api/v1/settlements/${orderId}/complete`);
    return unwrap<string>(res.data);
  },

  /**
   * 주문 단건 정산 상세 조회.
   * Endpoint: GET /api/v1/settlements/orders/{orderId}
   *
   * @param orderId 주문 ID
   * @returns SettlementResponse
   * @throws API 실패 시 Error
   */
  getOrderSettlement: async (orderId: number): Promise<SettlementResponse> => {
    const res = await apiClient.get(`/api/v1/settlements/orders/${orderId}`);
    return unwrap<SettlementResponse>(res.data);
  },

  /**
   * 내 정산 목록 조회.
   * Endpoint: GET /api/v1/settlements/me?status=...
   *
   * @param status 선택 필터(READY | COMPLETED | WAIT)
   * @returns SettlementResponse[]
   * @throws API 실패 시 Error
   */
  getMySettlements: async (status?: SettlementStatus): Promise<SettlementResponse[]> => {
    const res = await apiClient.get('/api/v1/settlements/me', {
      params: status ? { status } : undefined,
    });
    return unwrap<SettlementResponse[]>(res.data);
  },

  /**
   * 사용자 권한 기준 정산 완료 처리.
   * Endpoint: PATCH /api/v1/settlements/orders/{orderId}/complete-by-user
   *
   * @param orderId 주문 ID
   * @returns 변경된 SettlementResponse
   * @throws API 실패 시 Error
   */
  completeSettlementByUser: async (orderId: number): Promise<SettlementResponse> => {
    const res = await apiClient.patch(`/api/v1/settlements/orders/${orderId}/complete-by-user`);
    return unwrap<SettlementResponse>(res.data);
  },

  /**
   * 관리자 정산 요약 통계 조회.
   * Endpoint: GET /api/v1/settlements/admin/summary
   *
   * @param start 시작 시각(ISO 문자열 권장)
   * @param end 종료 시각(ISO 문자열 권장)
   * @returns SettlementSummaryResponse
   * @throws API 실패 시 Error
   */
  getSummary: async (start: string, end: string): Promise<SettlementSummaryResponse> => {
    const res = await apiClient.get('/api/v1/settlements/admin/summary', {
      params: { start, end },
    });
    return unwrap<SettlementSummaryResponse>(res.data);
  },

  /**
   * 관리자 지역별 정산 통계 조회.
   * Endpoint: GET /api/v1/settlements/admin/regions
   *
   * @param start 시작 시각(ISO 문자열 권장)
   * @param end 종료 시각(ISO 문자열 권장)
   * @returns SettlementRegionStatResponse[]
   * @throws API 실패 시 Error
   */
  getRegionStats: async (start: string, end: string): Promise<SettlementRegionStatResponse[]> => {
    const res = await apiClient.get('/api/v1/settlements/admin/regions', {
      params: { start, end },
    });
    return unwrap<SettlementRegionStatResponse[]>(res.data);
  },
};
