import apiClient from './apiClient';
import { UserProfile, DriverInfo, ShipperInfo } from '../models/user';
import * as SecureStore from 'expo-secure-store';
import { USE_MOCK } from '@/shared/config/mock';

type MockRole = 'DRIVER' | 'SHIPPER';
type MockAuthUser = {
  user_id: number;
  email: string;
  password: string;
  phone: string;
  nickname: string;
  role: MockRole;
};

const MOCK_USERS_KEY = 'baro_mock_auth_users';
const MOCK_SESSION_KEY = 'baro_mock_auth_session';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function makeMockError(message: string): never {
  throw { response: { data: { message } } };
}

export const UserService = {
  /** 1. 내 프로필 정보 조회 (UsersController /api/user/me) */
  getMyInfo: async (): Promise<UserProfile> => {
    if (USE_MOCK) {
      const session = await readJson<MockAuthUser | null>(MOCK_SESSION_KEY, null);
      if (!session) makeMockError('로그인 정보가 없어요.');

      return {
        userId: session.user_id,
        email: session.email,
        nickname: session.nickname,
        profileImageUrl: '',
        phone: session.phone,
        role: session.role,
        ratingAvg: 0,
      };
    }

    const res = await apiClient.get('/api/user/me');
    return res.data;
  },

  /** 2. 차주 프로필 저장/수정 (DriverController /api/v1/drivers/me) */
  saveDriverProfile: async (data: DriverInfo): Promise<string> => {
    if (USE_MOCK) return 'OK';
    const res = await apiClient.post('/api/v1/drivers/me', data);
    return res.data;
  },

  /** 3. 화주 프로필 저장/수정 (ShipperController /api/v1/shippers/me) */
  saveShipperProfile: async (data: ShipperInfo): Promise<string> => {
    if (USE_MOCK) return 'OK';
    const res = await apiClient.post('/api/v1/shippers/me', data);
    return res.data;
  },

  /** 4. 닉네임 중복 확인 (UsersController /api/user/check-nickname) */
  checkNickname: async (nickname: string): Promise<boolean> => {
    if (USE_MOCK) {
      const users = await readJson<MockAuthUser[]>(MOCK_USERS_KEY, []);
      const target = nickname.trim().toLowerCase();
      return users.some((u) => u.nickname.trim().toLowerCase() === target);
    }

    const res = await apiClient.get('/api/user/check-nickname', {
      params: { nickname }
    });
    return res.data.isDuplicated;
  },

  /** 5. FCM 토큰 업데이트 (UsersController /api/user/fcm-token) */
  updateFcmToken: async (fcmToken: string): Promise<void> => {
    if (USE_MOCK) return;
    await apiClient.post('/api/user/fcm-token', { fcmToken });
  }
};
