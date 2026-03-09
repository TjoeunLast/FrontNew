export function won(n: number) {
  const v = Math.max(0, Math.round(n));
  return `${v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

export function parseWonInput(v: string) {
  const x = v.replace(/[^0-9]/g, "");
  return x ? parseInt(x, 10) : 0;
}

export function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toKoreanDateText(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
