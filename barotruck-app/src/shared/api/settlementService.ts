import apiClient from './apiClient';
import { SettlementRequest, SettlementResponse } from '../models/Settlement';

export const SettlementService = {
  /**
   * 1. 결제 요청 생성 (화주용)
   * 오더에 대한 정산 데이터를 초기화합니다.
   */
  initSettlement: async (data: SettlementRequest): Promise<string> => {
    const res = await apiClient.post('/api/v1/settlements/init', data); //
    return res.data;
  },

  /**
   * 2. 결제 승인 완료
   * 실제 PG사 결제 등이 완료된 후 상태를 변경합니다.
   */
  completeSettlement: async (orderId: number): Promise<string> => {
    const res = await apiClient.patch(`/api/v1/settlements/${orderId}/complete`); //
    return res.data;
  }
};