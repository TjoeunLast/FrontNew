// app/_layout.tsx 
import React from "react";
import { Stack } from "expo-router";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { ToastProvider } from "@/shared/ui/feedback/ToastProvider";

export default function RootLayout() {
  return (
    <ThemeProvider> {/* 전역 테마 적용 */}
      <ToastProvider> {/* 전역 알림(Toast) 서비스 적용 */}
        {/* 모든 화면의 기본 옵션: 상단 헤더 숨김 */}
        <Stack screenOptions={{ headerShown: false }} />
      </ToastProvider>
    </ThemeProvider>
  );
}
