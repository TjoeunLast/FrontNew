import { USE_MOCK } from "@/shared/config/mock";
import {
  ReportRequest, ReportResponse,
  ReviewRequest, ReviewResponse,
  toReportStatusLabel,
  toReportTypeLabel,
} from '../models/review';
import { getCurrentUserSnapshot } from "../utils/currentUserStorage";
import apiClient from './apiClient';

function normalizeReportResponse(row: ReportResponse): ReportResponse {
  return {
    ...row,
    reportTypeLabel: toReportTypeLabel(row.reportType),
    statusLabel: toReportStatusLabel(row.status),
  };
}

async function normalizeReportRequest(data: ReportRequest) {
  const snapshot = await getCurrentUserSnapshot().catch(() => null);
  const fallbackEmail = String(snapshot?.email ?? "").trim();
  const reportType = String(data.reportType ?? "ETC").trim().toUpperCase();
  const normalizedReportType =
    reportType === "NOSHOW" || reportType === "NO SHOW" ? "NO_SHOW" : reportType || "ETC";

  if (data.type === "DISCUSS") {
    return {
      type: "DISCUSS" as const,
      orderId: null,
      description: String(data.description ?? "").trim(),
      email: String(data.email ?? fallbackEmail).trim(),
      title: String(data.title ?? "").trim(),
      reportType: normalizedReportType,
    };
  }

  const payload = {
    type: "REPORT" as const,
    orderId: Number(data.orderId),
    reportType: normalizedReportType,
    description: String(data.description ?? "").trim(),
  };
  const email = String(data.email ?? fallbackEmail).trim();
  const title = String(data.title ?? "").trim();
  if (email) {
    Object.assign(payload, { email });
  }
  if (title) {
    Object.assign(payload, { title });
  }
  return payload;
}

function buildReportPayloadVariants(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  if (payload.type === "DISCUSS") {
    return [payload];
  }

  const orderId = Number(payload.orderId);
  const id = Number(payload.id);
  const targetId = Number(payload.targetId);
  const candidates = [orderId, id, targetId].filter((value) => Number.isFinite(value) && value >= 0);

  if (candidates.length === 0) {
    return [payload];
  }

  const resolvedId = candidates[0];

  return [
    payload,
    { ...payload, id: resolvedId },
    { ...payload, targetId: resolvedId },
    { ...payload, userId: resolvedId },
    { ...payload, id: resolvedId, targetId: resolvedId },
    { ...payload, id: resolvedId, userId: resolvedId },
    { ...payload, order: { id: resolvedId, orderId: resolvedId } },
    { ...payload, user: { id: resolvedId, userId: resolvedId } },
  ];
}

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
    const payload = await normalizeReportRequest(data);
    const variants = buildReportPayloadVariants(payload as Record<string, unknown>);
    let lastError: unknown = null;

    console.log("[ReportService.createReport] input:", data);
    console.log("[ReportService.createReport] normalized payload:", payload);
    console.log("[ReportService.createReport] variants:", variants);

    for (const [index, candidate] of variants.entries()) {
      try {
        console.log(`[ReportService.createReport] attempt ${index + 1}/${variants.length}:`, candidate);
        const res = await apiClient.post('/api/reports', candidate);
        console.log(`[ReportService.createReport] success ${index + 1}/${variants.length}:`, res.data);
        return res.data;
      } catch (error) {
        lastError = error;
        const status = Number((error as any)?.response?.status);
        const serverMessage = String((error as any)?.response?.data?.message ?? "");
        console.log(`[ReportService.createReport] failure ${index + 1}/${variants.length}:`, {
          status,
          data: (error as any)?.response?.data,
          candidate,
        });
        if (status !== 400 || !/id must not be null/i.test(serverMessage)) {
          throw error;
        }
      }
    }

    throw lastError;
  },

  // 2. 내 신고 목록 조회 (상태별)
  getReportsByStatus: async (type: string): Promise<ReportResponse[]> => {
    if (USE_MOCK) return [];
    const res = await apiClient.get('/api/reports/status', { params: { type } });
    return Array.isArray(res.data) ? res.data.map(normalizeReportResponse) : [];
  },

  // [관리자] 전체 신고 목록 조회
  getAllReportsAdmin: async (): Promise<ReportResponse[]> => {
    if (USE_MOCK) return [];
    const res = await apiClient.get('/api/reports/admin/all');
    return Array.isArray(res.data) ? res.data.map(normalizeReportResponse) : [];
  },

  // 내가 신고한 목록 조회
  getMyReports: async (): Promise<ReportResponse[]> => {
    if (USE_MOCK) return [];
    const res = await apiClient.get('/api/reports/my');
    return Array.isArray(res.data) ? res.data.map(normalizeReportResponse) : [];
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
