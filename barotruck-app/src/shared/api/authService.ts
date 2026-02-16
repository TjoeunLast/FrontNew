import * as SecureStore from 'expo-secure-store';
import { AuthResponse, RegisterRequest } from '../models/auth';
import apiClient from './apiClient';

export const AuthService = {
  /**
   * 1. 회원가입 (POST /api/v1/auth/register) 
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
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
