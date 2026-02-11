export const appTheme = {
  colors: {
    brand: {
      primary: "#4E46E5", // 메인
      primaryHover: "#4840D3",
      primaryPressed: "#423BC0",
      primarySoft: "#EDECFC", // 배경용

      accent: "#A3E635", // 포인트
      accentHover: "#93CF30",
      accentPressed: "#82B82A",
      accentSoft: "#F4FCE7",
    },

    bg: {
      canvas: "#F8FAFC", // 앱 전체 배경
      surface: "#FFFFFF", // 카드 배경
      muted: "#F1F5F9", // 회색 박스 배경
    },

    text: {
      primary: "#0F172A", // 제목
      secondary: "#64748B", // 본문
      inverse: "#FFFFFF", // 흰색 글자
    },

    border: {
      default: "#E2E8F0",
    },

    status: {
      success: "#10B981", // 성공
      successSoft: "#DCFCE7",
      warning: "#F59E0B", // 에러
      warningSoft: "#FEF3E2",
      danger: "#EF4444", // 주의
      dangerSoft: "#FEF2F2",
      info: "#3B82F6",
      infoSoft: "#EFF6FF",
    },

    badge: {
      // 1. 배차대기
      pendingBg: "#EEF2FF", // 연한 인디고
      pendingText: "#4E46E5",

      // 2. 배차확정
      confirmedBg: "#DCFCE7", // 연한 초록 (SuccessSoft)
      confirmedText: "#10B981", // 초록 (Success)

      // 3. 운행중
      ongoingBg: "#E0F2FE", // 연한 블루
      ongoingText: "#0369A1",

      // 4. 운행완료
      completeBg: "#F1F5F9", // 연한 그레이
      completeText: "#64748B",

      // 5. 취소
      cancelBg: "#FEF2F2", // 연한 레드
      cancelText: "#DC2626",

      // 오더 특성 (UI Tag)
      aiBg: "#111827", // AI 추천
      aiText: "#F3F4F6",

      urgentBg: "#FEF2F2", // 긴급
      urgentText: "#DC2626",
      urgentBorder: "#FECACA",
    },
  },
} as const;

export type AppTheme = typeof appTheme;
