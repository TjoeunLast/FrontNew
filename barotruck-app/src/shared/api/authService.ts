import * as SecureStore from 'expo-secure-store';
import { AuthResponse, RegisterRequest } from '../models/auth';
import apiClient from './apiClient';

export const AuthService = {
  /** * 1. 회원가입 (POST /api/v1/auth/register) 
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post('/api/v1/auth/register', data);

    // 성공 시 토큰을 SecureStore에 저장
    if (res.data.access_token) {
      await SecureStore.setItemAsync('userToken', res.data.access_token);
      await SecureStore.setItemAsync('refreshToken', res.data.refresh_token);
    }
    
    return res.data;
  },

  /** * 2. 로그인 (POST /api/v1/auth/authenticate) 
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post('/api/v1/auth/authenticate', { email, password });
    
    // 성공 시 토큰을 SecureStore에 저장
    if (res.data.access_token) {
      await SecureStore.setItemAsync('userToken', res.data.access_token);
      await SecureStore.setItemAsync('refreshToken', res.data.refresh_token);
    }
    return res.data;
  },

  /** * 3. 토큰 갱신 (POST /api/v1/auth/refresh-token) 
   */
  refreshToken: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/refresh-token');
  },

  /** * 4. 로그아웃 (로컬 저장소 비우기) 
   */
  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('baro_mock_auth_session');
  }
};
