import apiClient from './apiClient';
import { 
  ReviewRequest, ReviewResponse, 
  ReportRequest, ReportResponse 
} from '../models/review';
import { USE_MOCK } from "@/shared/config/mock";

/**
 * 리뷰 서비스
 */
export const ReviewService = {
  // 1. 리뷰 등록
  createReview: async (data: ReviewRequest): Promise<boolean> => {
    if (USE_MOCK) return true;
    const res = await apiClient.post('/api/reviews', data);
    return res.data;
  },

  // 2. 특정 대상의 리뷰 목록 조회
  getReviewsByTarget: async (targetId: number): Promise<ReviewResponse[]> => {
    if (USE_MOCK) return [];
    const res = await apiClient.get(`/api/reviews/target/${targetId}`);
    return res.data;
  },

  // 3. 본인 리뷰 수정
  updateMyReview: async (reviewId: number, data: Omit<ReviewRequest, 'orderId'>): Promise<boolean> => {
    if (USE_MOCK) return true;
    const res = await apiClient.put(`/api/reviews/my/${reviewId}`, data);
    return res.data;
  },

  // 4. 본인 리뷰 삭제
  deleteMyReview: async (reviewId: number): Promise<boolean> => {
    if (USE_MOCK) return true;
    const res = await apiClient.delete(`/api/reviews/my/${reviewId}`);
    return res.data;
  }
};

/**
 * 신고 서비스
 */
export const ReportService = {
  // 1. 신고 접수
  createReport: async (data: ReportRequest): Promise<boolean> => {
    if (USE_MOCK) return true;
    const res = await apiClient.post('/api/reports', data);
    return res.data;
  },

  // 2. 내 신고 목록 조회 (상태별)
  getReportsByStatus: async (status: string): Promise<ReportResponse[]> => {
    if (USE_MOCK) return [];
    const res = await apiClient.get('/api/reports/status', { params: { status } });
    return res.data;
  },

  // 3. 내 신고 삭제
  deleteMyReport: async (reportId: number): Promise<boolean> => {
    if (USE_MOCK) return true;
    const res = await apiClient.delete(`/api/reports/my/${reportId}`);
    return res.data;
  }
};
