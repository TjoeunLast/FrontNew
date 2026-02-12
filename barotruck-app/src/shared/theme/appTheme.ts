export const appTheme = {
  colors: {
    brand: {
      primary: "#4E46E5",  // 메인
      primaryHover: "#4840D3",
      primaryPressed: "#423BC0",
      primarySoft: "#EDECFC",  // 배경용

      accent: "#A3E635",  // 포인트
      accentHover: "#93CF30",
      accentPressed: "#82B82A",
      accentSoft: "#F4FCE7",
    },

    bg: {
      canvas: "#F8FAFC",  // 앱 전체 배경
      surface: "#FFFFFF",  // 카드 배경
      muted: "#F1F5F9",  // 회색 박스 배경
    },

    text: {
      primary: "#0F172A",  // 제목
      secondary: "#64748B",  // 본문
      inverse: "#FFFFFF",  // 흰색 글자
    },

    border: {
      default: "#E2E8F0",
    },

    status: {
      success: "#10B981",  // 성공
      successSoft: "#DCFCE7",
      warning: "#F59E0B",  // 에러
      warningSoft: "#FEF3E2",
      danger: "#EF4444",  // 주의
      dangerSoft: "#FEF2F2",
      info: "#3B82F6",
      infoSoft: "#EFF6FF",
    },

    badge: {
      // 배차 상태 (Business Logic)
      requestBg: '#EEF2FF',      // 배차 신청
      requestText: '#4E46E5',

      ongoingBg: '#F4FCE7',      // 운행/배차중
      ongoingText: '#166534',  

      completeBg: '#F1F5F9',     // 배차 완료
      completeText: '#64748B',

      cancelBg: '#FEF2F2',       // 취소
      cancelText: '#DC2626', 

      // 오더 특성 (UI Tag)
      aiBg: '#111827',           // AI 추천
      aiText: '#F3F4F6',

      urgentBg: '#FEF2F2',       // 긴급
      urgentText: '#DC2626',
      urgentBorder: '#FECACA',
    }

  },
} as const;

export type AppTheme = typeof appTheme;
