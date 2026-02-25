// 경로: src/shared/hooks/useFCM.ts

import { useEffect } from 'react';
import { UserService } from '../api/userService';
import { tokenStorage } from '@/shared/utils/tokenStorage';
import { getFirebaseMessaging } from '@/shared/utils/firebaseMessaging';

export const useFCM = () => {
  useEffect(() => {
    const setupFCM = async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        return;
      }

      // 0. 로그인 여부 체크: 로그인이 안 되어 있으면 FCM 권한 요청/토큰 발급을 하지 않음
      const userToken = await tokenStorage.getItem('userToken');
      if (!userToken) {
        console.log('ℹ️ 비로그인 상태이므로 앱 시작 시 FCM 로직을 건너뜁니다.');
        return;
      }

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
        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          return;
        }

        // 2. 디바이스 토큰 가져오기
        const token = await messaging().getToken();
        if (token) {
          console.log('✅ FCM Token 발급 성공:', token);
          
          // 3. 서버 전송 (위에서 로그인 체크를 했으므로 바로 전송)
          await UserService.updateFcmToken(token);
          console.log('✅ 서버에 FCM Token 업데이트 완료');
        }
      } catch (error) {
        console.error('❌ FCM Token 발급/전송 실패:', error);
      }
    };

    setupFCM();

    // 4. 토큰 갱신 감지 (앱 사용 중 토큰이 바뀌면 다시 전송)
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        return;
      }

      unsubscribe = messaging().onTokenRefresh(async (token) => {
        console.log('🔄 FCM Token 갱신됨:', token);
        const userToken = await tokenStorage.getItem('userToken');
        if (userToken) {
          await UserService.updateFcmToken(token);
          console.log('✅ 갱신된 Token 서버 전송 완료');
        } else {
          console.log('⚠️ 토큰 갱신 시 로그인 상태 아님, 서버 전송 생략');
        }
      });
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);
};
