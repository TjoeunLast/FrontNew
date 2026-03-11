import apiClient from './apiClient';

/**
 * SMS 인증 관련 타입 정의
 */
export interface SmsRequestPayload {
  phone: string;
}

export interface SmsVerifyPayload {
  phone: string;
  code: string;
}

/**
 * 전화번호 포맷 정규화 (하이픈 제거 등)
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").trim();
}

/**
 * 인증 서비스 (SMS)
 */
export const smsService = {
  /**
   * 1. 인증번호 요청 (SmsAuthController 기반)
   * 엔드포인트: POST /api/auth/sms/request
   */
  requestSmsCode: async (phone: string): Promise<boolean> => {
    const normalized = normalizePhone(phone);
    const res = await apiClient.post('/api/auth/sms/request', null, {
      params: { phone: normalized },
    });
    return res.data; // ResponseEntity<Boolean> 반환
  },

  /**
   * 2. 인증번호 검증 (SmsAuthController 기반)
   * 엔드포인트: POST /api/auth/sms/verify
   */
  verifySmsCode: async (phone: string, code: string): Promise<boolean> => {
    const res = await apiClient.post('/api/auth/sms/verify', null, {
      params: {
        phone: normalizePhone(phone),
        code: code.trim(),
      }
    });
    return res.data; // ResponseEntity<Boolean> 반환
  },
};
