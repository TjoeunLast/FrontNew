export const appTheme = {
  colors: {
    brand: {
      primary: "#4E46E5", // 메인 (직접배차, 상차완료 등)
      primaryHover: "#4840D3",
      primaryPressed: "#423BC0",
      primarySoft: "#EDECFC", // 진행 중인 상태 배경
      accent: "#A3E635",
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
      success: "#10B981", // 하차 완료, 운송 성공
      successSoft: "#DCFCE7",
      warning: "#F59E0B", // 하차지 대기/도착 (주의)
      warningSoft: "#FEF3E2",
      danger: "#EF4444", // 긴급, 취소, 오류
      dangerSoft: "#FEF2F2",
      info: "#3B82F6", // 배차 확정, 운송 시작
      infoSoft: "#EFF6FF",
    },
    // 배차 및 운행 단계별 전용 컬러
    badge: {
      requestBg: "#F3E8FF", // 배차 신청/요청 (퍼플)
      requestText: "#6B21A8",
      ongoingBg: "#E0E7FF", // 운송 중 (인디고)
      ongoingText: "#3730A3",
      completeBg: "#F1F5F9", // 최종 완료/정산됨 (회색)
      completeText: "#475569",
      cancelBg: "#FEF2F2", // 취소
      cancelText: "#DC2626",
      urgentBg: "#DC2626", // 긴급/바로배차 (레드)
      urgentText: "#FFFFFF",
      urgentBorder: "#FECACA",
      directBg: "#4E46E5", // 직접배차/확정 (브랜드 블루)
      directText: "#FFFFFF",
      payPrepaid: "#15803D", // 선착불 (그린)
      payDeferred: "#64748B", // 인수증/후불 (슬레이트)
    },
  },
} as const;

export type AppTheme = typeof appTheme;
