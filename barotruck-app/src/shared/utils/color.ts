function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function withAlpha(hex: string, alpha: number) {
  const a = clamp01(alpha);

  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
