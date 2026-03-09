/**
 * 리뷰 관련 타입
 */
export interface ReviewRequest {
  orderId: number;   // 대상 오더 ID
  rating: number;    // 1~5점
  content: string;   // 리뷰 내용

  
}

export interface ReviewResponse {
  reviewId: number;
  writerNickname: string; // 작성자 닉네임
  rating: number;
  content: string;
  createdAt: string;      // ISO 날짜 문자열
}

/**
 * 신고 관련 타입
 */
export const REPORT_TYPE_LABELS = {
  ACCIDENT: "사고",
  NO_SHOW: "노쇼",
  RUDE: "불친절",
  ETC: "기타",
} as const;

export const REPORT_STATUS_LABELS = {
  PENDING: "접수됨",
  PROCESSING: "처리 중",
  RESOLVED: "처리 완료",
} as const;

export type ReportTypeCode = keyof typeof REPORT_TYPE_LABELS;
export type ReportTypeLabel = (typeof REPORT_TYPE_LABELS)[ReportTypeCode];
export type ReportStatusCode = keyof typeof REPORT_STATUS_LABELS;
export type ReportSubmissionType = "REPORT" | "DISCUSS";

export const REPORT_TYPE_OPTIONS: ReadonlyArray<{
  value: ReportTypeCode;
  label: ReportTypeLabel;
}> = Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({
  value: value as ReportTypeCode,
  label,
}));

export function toReportTypeLabel(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return "-";

  const upper = value.toUpperCase();
  if (upper in REPORT_TYPE_LABELS) {
    return REPORT_TYPE_LABELS[upper as ReportTypeCode];
  }

  if (Object.values(REPORT_TYPE_LABELS).includes(value as ReportTypeLabel)) {
    return value;
  }

  if (upper === "NOSHOW" || upper === "NO SHOW") return REPORT_TYPE_LABELS.NO_SHOW;
  return value;
}

export function toReportTypeRequestValue(raw: unknown): ReportTypeLabel {
  const label = toReportTypeLabel(raw);
  if (Object.values(REPORT_TYPE_LABELS).includes(label as ReportTypeLabel)) {
    return label as ReportTypeLabel;
  }
  return REPORT_TYPE_LABELS.ETC;
}

export function toReportStatusLabel(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return "-";

  const upper = value.toUpperCase();
  if (upper in REPORT_STATUS_LABELS) {
    return REPORT_STATUS_LABELS[upper as ReportStatusCode];
  }

  if (Object.values(REPORT_STATUS_LABELS).includes(value as (typeof REPORT_STATUS_LABELS)[ReportStatusCode])) {
    return value;
  }

  return value;
}

export type ReportRequest =
  | {
      type: "REPORT"; // 신고
      orderId: number; // 관련 오더 ID
      reportType: ReportTypeCode | ReportTypeLabel; // 신고 유형
      description: string; // 상세 내용
      email?: string; // 문의 회신용 이메일
      title?: string; // 문의 제목
    }
  | {
      type: "DISCUSS"; // 1:1 문의
      description: string; // 문의 내용
      email: string; // 회신용 이메일
      title: string; // 문의 제목
      orderId?: number | null; // 관련 오더 ID
      reportType?: ReportTypeCode | ReportTypeLabel; // 신고 유형
    };

export interface ReportResponse {
  reportId: number;
  orderId?: number;
  reporterNickname: string;
  targetNickname: string;
  reportType?: string;
  description: string;
  status: ReportStatusCode | string; // 처리 상태
  reportTypeLabel?: string;
  statusLabel?: string;
  createdAt: string;
  type: ReportSubmissionType | string; // DISCUSS 1:1 문의 / REPORT 신고
  email?: string; // 이메일
  title?: string; // 제목
}
