import { OrderService } from "@/shared/api/orderService";
import { USE_MOCK } from "@/shared/config/mock";
import type { ProofResponse, ProofUploadRequest } from '../models/proof';
import apiClient from './apiClient';

function shouldFallbackToOrderImage(error: any): boolean {
  const status = Number(error?.response?.status ?? 0);
  if (status === 404 || status === 405) return true;

  const rawMessage =
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "";
  const message = String(rawMessage).toLowerCase();

  return (
    status >= 500 &&
    (message.includes("proof") ||
      message.includes("updatereceiptimage") ||
      message.includes("is null") ||
      message.includes("null"))
  );
}

function normalizeProofResponse(orderId: number, payload: unknown): ProofResponse {
  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record.result && typeof record.result === "object"
        ? (record.result as Record<string, unknown>)
        : null;

  const source = nested ?? record;

  return {
    proofId: Number(source.proofId ?? source.id ?? orderId) || orderId,
    receiptImageUrl: String(
      source.receiptImageUrl ??
        source.receiptUrl ??
        source.imageUrl ??
        source.proofUrl ??
        ""
    ).trim(),
    signatureImageUrl: String(
      source.signatureImageUrl ??
        source.signatureUrl ??
        ""
    ).trim(),
    recipientName: String(
      source.recipientName ??
        source.receiverName ??
        source.receivedBy ??
        ""
    ).trim(),
  };
}

export const ProofService = {
  /**
   * 1. 운송 완료 증빙 업로드 (차주용)
   * 인수증 사진과 서명을 FormData에 담아 전송합니다.
   */
  uploadProof: async (request: ProofUploadRequest): Promise<boolean> => {
    if (USE_MOCK) return true;
    const formData = new FormData();
    
    // 파일 데이터 추가 (React Native에서 이미지 전송 시 필요 포맷)
    if (request.receipt) {
      formData.append('receipt', request.receipt);
      formData.append('image', request.receipt);
    }
    if (request.signature) {
      formData.append('signature', request.signature);
    }
    
    // 일반 텍스트 데이터 추가
    formData.append('recipientName', request.recipientName);

    try {
      const res = await apiClient.post(`/api/proof/${request.orderId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return typeof res.data === "boolean" ? res.data : true;
    } catch (error: any) {
      if (!request.receipt || !shouldFallbackToOrderImage(error)) {
        throw error;
      }
      await OrderService.uploadOrderImage(request.orderId, request.receipt);
      return true;
    }
  },

  /**
   * 2. 증빙 내역 조회 (화주/관리자용)
   */
  getProof: async (orderId: number): Promise<ProofResponse> => {
    if (USE_MOCK) {
      return {
        proofId: Number(orderId),
        receiptImageUrl: "",
        signatureImageUrl: "",
        recipientName: "목업 수령인",
      };
    }
    try {
      const [proofRes, orderImageUrl] = await Promise.all([
        apiClient.get(`/api/proof/${orderId}`),
        OrderService.getOrderImage(orderId).catch(() => ""),
      ]);
      const normalized = normalizeProofResponse(orderId, proofRes.data);
      return {
        ...normalized,
        receiptImageUrl: normalized.receiptImageUrl || orderImageUrl,
      };
    } catch (error) {
      const orderImageUrl = await OrderService.getOrderImage(orderId).catch(() => "");
      if (orderImageUrl) {
        return {
          proofId: Number(orderId),
          receiptImageUrl: orderImageUrl,
          signatureImageUrl: "",
          recipientName: "",
        };
      }
      throw error;
    }
  }
};
