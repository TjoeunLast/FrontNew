import apiClient from './apiClient'; // 설정된 axios 인스턴스
import { NoticeResponse } from '../models/notice';

const API_BASE = '/api/notices';

export const noticeService = {
  /**
   * 1. 공지사항 전체 목록 조회
   */
  getNotices: async (): Promise<NoticeResponse[]> => {
    const res = await apiClient.get<NoticeResponse[]>(API_BASE);
    return res.data;
  },

  /**
   * 2. 공지사항 상세 조회
   */
  getNoticeDetail: async (id: number): Promise<NoticeResponse> => {
    const res = await apiClient.get<NoticeResponse>(`${API_BASE}/${id}`);
    return res.data;
  },


};