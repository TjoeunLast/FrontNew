import apiClient from './apiClient';
import { UserProfile, DriverInfo, ShipperInfo } from '../models/user';

function normalizeDuplicateFlag(data: any): boolean {
  if (typeof data?.isDuplicated === "boolean") return data.isDuplicated;
  if (typeof data?.duplicated === "boolean") return data.duplicated;
  if (typeof data?.exists === "boolean") return data.exists;
  if (typeof data?.isExists === "boolean") return data.isExists;
  return false;
}

export const UserService = {
  /** * 1. 내 프로필 정보 조회 (UsersController /api/user/me) 
   * 백엔드에서 UserResponseDto를 반환하며, 
   * 인터페이스 UserProfile과 필드명(userId, role 등)이 일치하는지 확인이 필요합니다.
   */
  getMyInfo: async (): Promise<UserProfile> => {
    const res = await apiClient.get('/api/user/me');
    return res.data;
  },

  /** * 2. 차주 프로필 저장/수정 (DriverController /api/v1/drivers/me) 
   */
  saveDriverProfile: async (data: DriverInfo): Promise<string> => {
    const res = await apiClient.post('/api/v1/drivers/me', data);
    return res.data;
  },

  /** * 3. 화주 프로필 저장/수정 (ShipperController /api/v1/shippers/me) 
   */
  saveShipperProfile: async (data: ShipperInfo): Promise<string> => {
    const res = await apiClient.post('/api/v1/shippers/me', data);
    return res.data;
  },

  /** * 4. 닉네임 중복 확인 (UsersController /api/user/check-nickname) 
   * 백엔드 응답 형식: {"isDuplicated": true/false}
   */
  checkNickname: async (nickname: string): Promise<boolean> => {
    const res = await apiClient.get('/api/user/check-nickname', {
      params: { nickname }
    });
    return res.data.isDuplicated;
  },

  /** * 5. 이메일 존재 여부 확인 (비밀번호 찾기용) */
  checkEmailExists: async (email: string): Promise<boolean> => {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!normalizedEmail) return false;

    try {
      const res = await apiClient.get('/api/user/check-email', {
        params: { email: normalizedEmail }
      });
      return normalizeDuplicateFlag(res.data);
    } catch {
      // 백엔드 라우트가 다를 수 있어 fallback 지원
      const fallbackRes = await apiClient.get('/api/user/check-email-duplicate', {
        params: { email: normalizedEmail }
      });
      return normalizeDuplicateFlag(fallbackRes.data);
    }
  },

  /** * 6. FCM 토큰 업데이트 (UsersController /api/user/fcm-token) 
   */
  updateFcmToken: async (fcmToken: string): Promise<void> => {
    await apiClient.post('/api/user/fcm-token', { fcmToken });
  }
};
