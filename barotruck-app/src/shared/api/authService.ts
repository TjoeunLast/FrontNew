import * as SecureStore from 'expo-secure-store';
import { AuthResponse, RegisterRequest } from '../models/auth';
import { USE_MOCK } from '@/shared/config/mock';
import apiClient from './apiClient';
import { UserService } from './userService';
import { getFirebaseMessaging } from '@/shared/utils/firebaseMessaging';

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
          name: data.name || '목업이름',
          phone: data.phone || '01000000000',
          role: data.role || 'SHIPPER',
        })
      );
      return mockRes;
    }

    const res = await apiClient.post('/api/v1/auth/register', data);

    // 백엔드 @JsonProperty 설정에 맞춰 access_token으로 확인
    if (res.data.access_token) {
      await SecureStore.setItemAsync('userToken', res.data.access_token);
      await SecureStore.setItemAsync('refreshToken', res.data.refresh_token);
      console.log("✅ 회원가입 성공 및 토큰 저장 완료");

      // [추가] 회원가입 직후 자동 로그인 상태이므로 FCM 토큰 전송
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          return res.data;
        }

        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          await UserService.updateFcmToken(fcmToken);
          console.log("✅ 회원가입 후 FCM 토큰 서버 전송 완료");
        }
      } catch (e) {
        console.error("❌ 회원가입 후 FCM 토큰 전송 실패:", e);
      }
    }
    
    return res.data;
  },

  /**
   * 2. 로그인 (POST /api/v1/auth/authenticate) 
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    if (USE_MOCK) {
      const role = /driver/i.test(email) ? 'DRIVER' : 'SHIPPER';
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
          email,
          nickname: email.split('@')[0] || '목업사용자',
          phone: '01012345678',
          role,
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

      // [추가] 로그인 성공 직후 FCM 토큰 발급 및 서버 전송
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          return res.data;
        }

        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          await UserService.updateFcmToken(fcmToken);
          console.log("✅ 로그인 후 FCM 토큰 서버 전송 완료");
        }
      } catch (e) {
        console.error("❌ 로그인 후 FCM 토큰 전송 실패:", e);
      }
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
  },


  /**
   * 5. 이메일 인증 코드 발송 요청 (POST /api/auth/email-request)
   */
  requestEmailAuth: async (email: string): Promise<boolean> => {
    // 쿼리 스트링(?email=...) 방식으로 전달
    const res = await apiClient.post('/api/auth/email-request', null, {
      params: { email }
    });
    return res.data; // 성공 시 true 반환
  },

  /**
   * 6. 이메일 인증 코드 검증 (POST /api/auth/email-verify)
   */
  verifyEmailCode: async (email: string, code: string): Promise<boolean> => {
    // 쿼리 스트링(?email=...&code=...) 방식으로 전달
    const res = await apiClient.post('/api/auth/email-verify', null, {
      params: { email, code }
    });
    return res.data; // 인증 성공 여부 (true/false) 반환
  },


  /**
   * 7. 이메일 찾기 (POST /api/v1/auth/find-email)
   */
  findEmail: async (name: string, phone: string): Promise<string> => {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (name) resolve("mock_user@baro.local");
          else reject(new Error("일치하는 회원 정보를 찾을 수 없습니다."));
        }, 500);
      });
    }
    const res = await apiClient.post('/api/v1/auth/find-email', { name, phone });
    return res.data; // 이메일 문자열 반환 가정
  },

  /**
   * 8. 비밀번호 재설정 (POST /api/v1/auth/reset-password)
   */
  resetPassword: async (data: { email: string; code: string; newPassword: string }): Promise<void> => {
    if (USE_MOCK) {
      return new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await apiClient.post('/api/v1/auth/reset-password', data);
  },
};


  
