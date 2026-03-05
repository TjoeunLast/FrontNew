import { SplashView } from "@/shared/ui/layout/SplashView";
import { getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";
import { tokenStorage } from "@/shared/utils/tokenStorage";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
// import { useFCM } from '@/shared/hooks/useFCM';

// 1. 앱이 켜지자마자 Expo 기본 스플래시 화면을 붙잡아 둡니다.
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const [isAppReady, setIsAppReady] = useState(false);

  // useFCM(); // FCM 훅 실행 필요 시 주석 해제

  useEffect(() => {
    let active = true;

    async function prepareApp() {
      try {
        // 2. 자동 로그인 체킹 및 필수 데이터 로딩
        const minSplashTime = new Promise((resolve) =>
          setTimeout(resolve, 1500),
        );

        // 토큰 확인 등 비동기 작업
        const tokenPromise = tokenStorage.getItem("userToken");

        // 딜레이와 토큰 확인을 동시에 진행
        const [, token] = await Promise.all([minSplashTime, tokenPromise]);

        if (!active) return;

        if (!token) {
          router.replace("/(auth)/login");
          return;
        }

        const snapshot = await getCurrentUserSnapshot();
        const role = String(snapshot?.role ?? "").toUpperCase();

        if (role === "DRIVER") {
          router.replace("/(driver)/(tabs)");
          return;
        }

        if (role === "SHIPPER") {
          router.replace("/(shipper)/(tabs)");
          return;
        }

        // 권한이 없거나 이상한 경우 로그인으로
        router.replace("/(auth)/login");
      } catch (e) {
        console.warn("App initialization error:", e);
        if (active) router.replace("/(auth)/login");
      } finally {
        if (active) {
          // 3. 준비가 다 끝나면 상태를 변경하고 Expo 기본 스플래시를 숨김
          setIsAppReady(true);
          await SplashScreen.hideAsync();
        }
      }
    }

    prepareApp();

    return () => {
      active = false;
    };
  }, [router]);

  // 4. 앱이 준비되는 동안(자동 로그인 검사 중)
  if (!isAppReady) {
    return <SplashView />;
  }

  return null;
}
