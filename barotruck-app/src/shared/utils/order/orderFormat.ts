/**
 * 금액 천단위 콤마 포맷팅
 */
export const formatPrice = (price: number): string => {
  return price.toLocaleString() + '원';
};

/**
 * 날짜 포맷팅 (ISO String -> MM.DD HH:mm)
 */
export const formatOrderDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}.${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
};

/**
 * 오더 상태에 따른 UI 레이블 및 색상 매핑
 */
export const ORDER_STATUS_MAP = {
  REQUESTED: { label: '배차대기', color: '#64748B' },
  ACCEPTED: { label: '배차확정', color: '#3B82F6' },
  LOADING: { label: '운행중', color: '#F59E0B' },
  IN_TRANSIT: { label: '운행중', color: '#10B981' },
  UNLOADING: { label: '운행중', color: '#8B5CF6' },
  COMPLETED: { label: '운행완료', color: '#1E293B' },
} as const;

