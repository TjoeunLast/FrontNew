export type ParsedCargoAndRequests = {
  cargo: string;
  requests: string[];
  pickupContact: string;
  tags: string[];
  packaging: string;
};

export function formatAddressBig(addr?: string) {
  const parts = String(addr ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (!parts.length) return "-";
  const first = (parts[0] || "")
    .replace("특별시", "")
    .replace("광역시", "")
    .replace("특별자치시", "")
    .replace("특별자치도", "");
  return [first, parts[1] || ""].filter(Boolean).join(" ");
}

export function formatDetailSubText(addr?: string, place?: string) {
  const parts = String(addr ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);
  const roadText = parts.slice(2).join(" ");
  const placeText = String(place ?? "").trim();
  return [roadText, placeText].filter(Boolean).join(" ") || "-";
}

export function formatYmd(dateStr?: string) {
  if (!dateStr) return "-";
  return dateStr.slice(0, 10);
}

export function formatEstimatedDuration(v?: number) {
  const raw = Number(v ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return "예상 시간 미정";
  const minutes = raw > 1000 ? Math.round(raw / 60) : Math.round(raw);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `예상 ${m}분`;
  if (m === 0) return `예상 ${h}시간`;
  return `예상 ${h}시간 ${m}분`;
}

export function formatSchedule(v?: string) {
  if (!v) return "상차 시간 미정";
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `오늘 ${hh}:${mm} 상차`;
  }
  return `${v} 상차`;
}

export function parseCargoAndRequests(raw?: string): ParsedCargoAndRequests {
  const text = String(raw ?? "").trim();
  if (!text) return { cargo: "", requests: [], pickupContact: "", tags: [], packaging: "" };

  const parts = text
    .split(/\s*\|\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { cargo: text, requests: [], pickupContact: "", tags: [], packaging: "" };

  let cargo = "";
  const requests: string[] = [];
  let pickupContact = "";
  const tags: string[] = [];
  let packaging = "";

  for (const part of parts) {
    if (part.startsWith("화물:")) {
      cargo = part.replace(/^화물:/, "").trim();
      continue;
    }
    if (part.startsWith("요청태그:")) {
      const rawTags = part.replace(/^요청태그:/, "").trim();
      rawTags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((t) => tags.push(t));
      continue;
    }
    if (part.startsWith("직접입력:")) {
      requests.push(`직접 요청: ${part.replace(/^직접입력:/, "").trim()}`);
      continue;
    }
    if (part.startsWith("추가메모:")) {
      requests.push(`추가 메모: ${part.replace(/^추가메모:/, "").trim()}`);
      continue;
    }
    if (part.startsWith("상차지 연락처:")) {
      pickupContact = part.replace(/^상차지 연락처:/, "").trim();
      continue;
    }
    if (part.startsWith("하차지 연락처:")) continue;
    if (part.startsWith("상하차방식:")) continue;
    if (part.startsWith("포장:")) {
      packaging = part.replace(/^포장:/, "").trim();
      continue;
    }
  }

  if (!cargo) {
    cargo = parts.find((x) => !x.includes(":")) ?? "";
  }

  return { cargo, requests, pickupContact, tags, packaging };
}

export function normalizeDisplayText(v?: string) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return "";
  return s;
}

export function buildChatLocationLabel(addr?: string, place?: string) {
  const placeText = normalizeDisplayText(place);
  if (placeText) return placeText;
  return formatAddressBig(addr);
}

export function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
