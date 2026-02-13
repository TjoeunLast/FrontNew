import apiClient from './apiClient';
import { UserProfile, DriverInfo, ShipperInfo } from '../models/user';

export const UserService = {
  /** 1. 내 프로필 정보 조회 (UsersController /api/user/me) */
  getMyInfo: async (): Promise<UserProfile> => {
    const res = await apiClient.get('/api/user/me');
    return res.data;
  },

  /** 2. 차주 프로필 저장/수정 (DriverController /api/v1/drivers/me) */
  saveDriverProfile: async (data: DriverInfo): Promise<string> => {
    const res = await apiClient.post('/api/v1/drivers/me', data);
    return res.data;
  },

  /** 3. 화주 프로필 저장/수정 (ShipperController /api/v1/shippers/me) */
  saveShipperProfile: async (data: ShipperInfo): Promise<string> => {
    const res = await apiClient.post('/api/v1/shippers/me', data);
    return res.data;
  },

  /** 4. 닉네임 중복 확인 (UsersController /api/user/check-nickname) */
  checkNickname: async (nickname: string): Promise<boolean> => {
    const res = await apiClient.get('/api/user/check-nickname', {
      params: { nickname }
    });
    return res.data.isDuplicated;
  },

  /** 5. FCM 토큰 업데이트 (UsersController /api/user/fcm-token) */
  updateFcmToken: async (fcmToken: string): Promise<void> => {
    await apiClient.post('/api/user/fcm-token', { fcmToken });
  }
};
