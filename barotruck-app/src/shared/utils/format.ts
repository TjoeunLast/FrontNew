export function formatMoneyWon(v: number): string {
  return v.toLocaleString("ko-KR");
}

export function formatDistanceKm(km?: number): string {
  if (typeof km !== "number" || Number.isNaN(km)) return "";
  return `${Math.round(km)}km`;
}


