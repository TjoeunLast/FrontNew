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

  // 2-1. 리뷰 상세 조회
  getReview: async (reviewId: number): Promise<ReviewResponse> => {
    if (USE_MOCK) return { reviewId, writerNickname: '목업', rating: 5, content: '목업 내용', createdAt: new Date().toISOString() } as any;
    const res = await apiClient.get(`/api/reviews/${reviewId}`);
    return res.data;
  },

  // [관리자] 전체 리뷰 조회
  getAllReviewsAdmin: async (): Promise<ReviewResponse[]> => {
    if (USE_MOCK) return [];
    const res = await apiClient.get('/api/reviews/admin/all');
    return res.data;
  },


  // 내가 쓴 리뷰 조회
  getMyReviews: async (): Promise<ReviewResponse[]> => {
    if (USE_MOCK) return [];
    const res = await apiClient.get('/api/reviews/my');
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
  },

  // [관리자] 리뷰 수정
  updateReviewAdmin: async (reviewId: number, data: Omit<ReviewRequest, 'orderId'>): Promise<boolean> => {
    const res = await apiClient.put(`/api/reviews/admin/${reviewId}`, data);
    return res.data;
  },

  // [관리자] 리뷰 삭제
  deleteReviewAdmin: async (reviewId: number): Promise<boolean> => {
    const res = await apiClient.delete(`/api/reviews/admin/${reviewId}`);
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

  // [관리자] 전체 신고 목록 조회
  getAllReportsAdmin: async (): Promise<ReportResponse[]> => {
    if (USE_MOCK) return [];
    const res = await apiClient.get('/api/reports/admin/all');
    return res.data;
  },

  // 내가 신고한 목록 조회
  getMyReports: async (): Promise<ReportResponse[]> => {
    if (USE_MOCK) return [];
    const res = await apiClient.get('/api/reports/my');
    return res.data;
  },

  // [관리자] 신고 상태 업데이트
  updateReportStatusAdmin: async (reportId: number, status: string): Promise<boolean> => {
    const res = await apiClient.patch(`/api/reports/admin/${reportId}/status`, null, { params: { status } });
    return res.data;
  },

  // [관리자] 신고 삭제
  deleteReportAdmin: async (reportId: number): Promise<boolean> => {
    const res = await apiClient.delete(`/api/reports/admin/${reportId}`);
    return res.data;
  },

  // 내 신고 상태 업데이트 (취소 등)
  updateMyReportStatus: async (reportId: number, status: string): Promise<boolean> => {
    const res = await apiClient.patch(`/api/reports/my/${reportId}/status`, null, { params: { status } });
    return res.data;
  },

  // 3. 내 신고 삭제
  deleteMyReport: async (reportId: number): Promise<boolean> => {
    if (USE_MOCK) return true;
    const res = await apiClient.delete(`/api/reports/my/${reportId}`);
    return res.data;
  }
};
