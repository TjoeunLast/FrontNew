import * as SecureStore from 'expo-secure-store';
import { AuthResponse, RegisterRequest } from '../models/auth';
import { USE_MOCK } from '@/shared/config/mock';
import apiClient from './apiClient';

export const AuthService = {
  /**
   * 1. 회원가입 (POST /api/v1/auth/register) 
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    if (USE_MOCK) {
      const mockRes: AuthResponse = {
        access_token: `mock-access-${Date.now()}`,
        refresh_token: `mock-refresh-${Date.now()}`,
        user_id: Date.now(),
      };

      await SecureStore.setItemAsync('userToken', mockRes.access_token);
      await SecureStore.setItemAsync('refreshToken', mockRes.refresh_token);
      await SecureStore.setItemAsync(
        'baro_mock_auth_session',
        JSON.stringify({
          userId: mockRes.user_id,
          email: data.email,
          nickname: data.nickname || '목업사용자',
          phone: data.phone || '01000000000',
          role: data.role || 'SHIPPER',
          gender: data.gender,
          age: data.age,
        })
      );
      return mockRes;
    }

    const res = await apiClient.post('/api/v1/auth/register', data);

    // 백엔드 @JsonProperty 설정에 맞춰 access_token으로 확인
    if (res.data.access_token) {
      await SecureStore.setItemAsync('userToken', res.data.access_token);
      await SecureStore.setItemAsync('refreshToken', res.data.refresh_token);
    }
    
    return res.data;
  },

  /**
   * 2. 로그인 (POST /api/v1/auth/authenticate) 
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    if (USE_MOCK) {
      const role = /driver/i.test(email) ? 'DRIVER' : 'SHIPPER';
      let previousSession: any = {};
      try {
        const prevRaw = await SecureStore.getItemAsync('baro_mock_auth_session');
        previousSession = prevRaw ? JSON.parse(prevRaw) : {};
      } catch {
        previousSession = {};
      }
      const sameAccount =
        String(previousSession?.email ?? "").trim().toLowerCase() ===
        String(email).trim().toLowerCase();
      const mockRes: AuthResponse = {
        access_token: `mock-access-${Date.now()}`,
        refresh_token: `mock-refresh-${Date.now()}`,
        user_id: sameAccount ? Number(previousSession?.userId ?? Date.now()) : Date.now(),
      };

      await SecureStore.setItemAsync('userToken', mockRes.access_token);
      await SecureStore.setItemAsync('refreshToken', mockRes.refresh_token);
      await SecureStore.setItemAsync(
        'baro_mock_auth_session',
        JSON.stringify({
          userId: mockRes.user_id,
          email,
          nickname: sameAccount
            ? String(previousSession?.nickname ?? email.split('@')[0] ?? '목업사용자')
            : email.split('@')[0] || '목업사용자',
          phone: '01012345678',
          role,
          gender: sameAccount ? previousSession?.gender : undefined,
          age: sameAccount ? previousSession?.age : undefined,
          passwordHint: password ? 'set' : 'empty',
        })
      );
      return mockRes;
    }

    const res = await apiClient.post('/api/v1/auth/authenticate', { email, password });
    
    // 디버깅을 위한 로그
    console.log("서버 응답 데이터:", res.data);

    // 서버 응답이 스네이크 케이스(access_token)이므로 이에 맞춰 수정
    if (res.data.access_token) { 
      await SecureStore.setItemAsync('userToken', res.data.access_token);
      await SecureStore.setItemAsync('refreshToken', res.data.refresh_token);
      console.log("✅ 토큰 저장 완료");
    } else {
      // 만약 로그에 access_token이 찍히는데 여기로 들어온다면 오타를 확인해야 합니다.
      console.error("❌ 응답에 access_token이 없습니다. 필드명을 확인하세요.");
    }
    
    return res.data;
  },

  /**
   * 3. 토큰 갱신 (POST /api/v1/auth/refresh-token) 
   */
  refreshToken: async (): Promise<void> => {
    if (USE_MOCK) return;
    await apiClient.post('/api/v1/auth/refresh-token');
  },

  /**
   * 4. 로그아웃 (로컬 저장소 비우기) 
   */
  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('baro_mock_auth_session');
  }
};
