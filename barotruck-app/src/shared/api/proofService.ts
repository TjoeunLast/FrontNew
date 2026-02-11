import apiClient from './apiClient';
import { ProofResponse, ProofUploadRequest } from '../models/proof';

export const ProofService = {
  /**
   * 1. 운송 완료 증빙 업로드 (차주용)
   * 인수증 사진과 서명을 FormData에 담아 전송합니다.
   */
  uploadProof: async (request: ProofUploadRequest): Promise<boolean> => {
    const formData = new FormData();
    
    // 파일 데이터 추가 (React Native에서 이미지 전송 시 필요 포맷)
    if (request.receipt) {
      formData.append('receipt', request.receipt);
    }
    if (request.signature) {
      formData.append('signature', request.signature);
    }
    
    // 일반 텍스트 데이터 추가
    formData.append('recipientName', request.recipientName);

    const res = await apiClient.post(`/api/proof/${request.orderId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data; // 성공 시 true 반환
  },

  /**
   * 2. 증빙 내역 조회 (화주/관리자용)
   */
  getProof: async (orderId: number): Promise<ProofResponse> => {
    const res = await apiClient.get(`/api/proof/${orderId}`);
    return res.data;
  }
};