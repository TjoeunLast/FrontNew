import apiClient from './apiClient';
import { UserProfile, DriverInfo, ShipperInfo } from '../models/user';
import * as SecureStore from "expo-secure-store";
import { USE_MOCK } from "@/shared/config/mock";

type MockSession = {
  userId?: number;
  email?: string;
  nickname?: string;
  phone?: string;
  role?: UserProfile["role"];
};

async function readMockSession(): Promise<MockSession> {
  try {
    const raw = await SecureStore.getItemAsync("baro_mock_auth_session");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MockSession;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export const UserService = {
  /** * 1. 내 프로필 정보 조회 (UsersController /api/user/me) 
   * 백엔드에서 UserResponseDto를 반환하며, 
   * 인터페이스 UserProfile과 필드명(userId, role 등)이 일치하는지 확인이 필요합니다.
   */
  getMyInfo: async (): Promise<UserProfile> => {
    if (USE_MOCK) {
      const session = await readMockSession();
      const role = session.role ?? "SHIPPER";
      return {
        userId: Number(session.userId ?? 1),
        email: String(session.email ?? "mock@baro.local"),
        nickname: String(session.nickname ?? "목업유저"),
        name: String(session.nickname ?? "목업유저"),
        profileImageUrl: undefined,
        phone: String(session.phone ?? "01012345678"),
        role,
        ratingAvg: 4.8,
      };
    }
    const res = await apiClient.get('/api/user/me');
    return res.data;
  },

  /** * 2. 차주 프로필 저장/수정 (DriverController /api/v1/drivers/me) 
   */
  saveDriverProfile: async (data: DriverInfo): Promise<string> => {
    if (USE_MOCK) return `목업 차주 프로필 저장 완료: ${data.carNum}`;
    const res = await apiClient.post('/api/v1/drivers/me', data);
    return res.data;
  },

  /** * 3. 화주 프로필 저장/수정 (ShipperController /api/v1/shippers/me) 
   */
  saveShipperProfile: async (data: ShipperInfo): Promise<string> => {
    if (USE_MOCK) return `목업 화주 프로필 저장 완료: ${data.companyName}`;
    const res = await apiClient.post('/api/v1/shippers/me', data);
    return res.data;
  },

  /** * 4. 닉네임 중복 확인 (UsersController /api/user/check-nickname) 
   * 백엔드 응답 형식: {"isDuplicated": true/false}
   */
  checkNickname: async (nickname: string): Promise<boolean> => {
    if (USE_MOCK) return false;
    const res = await apiClient.get('/api/user/check-nickname', {
      params: { nickname }
    });
    return res.data.isDuplicated;
  },

  /**
   * FCM 토큰 서버 전송 및 저장
   * 앱 실행 시 또는 토큰 갱신 시 호출됨
   */
  updateFcmToken: async (token: string): Promise<void> => {
    console.log("🌐 [UserService] 서버로 FCM 토큰 전송 시도:", token);
    // .patch 대신 .post 사용
    await apiClient.post('/api/user/fcm-token', { fcmToken: token });
},
  

};
