// 경로: src/shared/hooks/useFCM.ts

import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { UserService } from '../api/userService';
import { Platform } from 'react-native';
import { tokenStorage } from '@/shared/utils/tokenStorage';

export const useFCM = () => {
  useEffect(() => {
    const setupFCM = async () => {
      // 1. 권한 요청 (iOS 필수, Android 13+ 필수)
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM 권한 상태:', authStatus);
        await getAndSaveToken();
      } else {
        console.log('🚫 FCM 권한 거부됨');
      }
    };

    const getAndSaveToken = async () => {
      try {
        // 2. 디바이스 토큰 가져오기
        const token = await messaging().getToken();
        if (token) {
          console.log('✅ FCM Token 발급 성공:', token);
          
          // 3. 로그인 된 상태인지 확인 후 서버 전송
          const userToken = await tokenStorage.getItem('userToken');
          if (userToken) {
            await UserService.updateFcmToken(token);
            console.log('✅ 서버에 FCM Token 업데이트 완료');
          }
        }
      } catch (error) {
        console.error('❌ FCM Token 발급/전송 실패:', error);
      }
    };

    setupFCM();

    // 4. 토큰 갱신 감지 (앱 사용 중 토큰이 바뀌면 다시 전송)
    const unsubscribe = messaging().onTokenRefresh(async (token) => {
      console.log('🔄 FCM Token 갱신됨:', token);
      const userToken = await tokenStorage.getItem('userToken');
      if (userToken) {
        await UserService.updateFcmToken(token);
        console.log('✅ 갱신된 Token 서버 전송 완료');
      }
    });

    return unsubscribe;
  }, []);
};
