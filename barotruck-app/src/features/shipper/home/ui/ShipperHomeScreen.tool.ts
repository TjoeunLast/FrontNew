import type { OrderResponse, OrderStatus } from "@/shared/models/order";

export type SummaryItem = {
  key: "matching" | "driving" | "done";
  label: string;
  value: number;
};

export type LiveOrderItem = {
  id: string;
  status: "MATCHING" | "DISPATCHED" | "DRIVING" | "DONE";
  applicantsCount?: number;
  isInstantDispatch?: boolean;
  pickupTypeLabel?: string;
  dropoffTypeLabel?: string;
  from: string;
  to: string;
  fromDetail?: string;
  toDetail?: string;
  distanceKm: number;
  cargoSummary: string;
  loadMethodShort?: string;
  workToolShort?: string;
  priceWon: number;
  updatedAtLabel: string;
  updatedAtMs?: number;
  pickupTimeHHmm?: string;
  dropoffTimeHHmm?: string;
  drivingStageLabel?: "상차 완료" | "배달 중" | "하차 직전";
};

function toLoadMethodShort(v?: string) {
  if (!v) return "-";
  if (v.includes("혼")) return "혼";
  return "독";
}

function toWorkToolShort(v?: string) {
  if (!v) return "-";
  if (v.includes("지")) return "지";
  if (v.includes("수")) return "수";
  if (v.includes("크")) return "크";
  if (v.includes("호")) return "호";
  return "-";
}

function mapStatus(status: OrderStatus): LiveOrderItem["status"] {
  if (status === "COMPLETED") return "DONE";
  if (status === "REQUESTED" || status === "PENDING") return "MATCHING";
  if (status === "ACCEPTED") return "DISPATCHED";
  return "DRIVING";
}

function toRelativeLabel(iso?: string) {
  if (!iso) return "방금 전";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "방금 전";
  const diffMin = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function toTimestampMs(iso?: string) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function parseLabelToMs(label: string) {
  const now = new Date();
  if (label.includes("방금")) return now.getTime();

  const minMatch = label.match(/(\d+)\s*분\s*전/);
  if (minMatch) return now.getTime() - Number(minMatch[1]) * 60_000;

  const hourMatch = label.match(/(\d+)\s*시간\s*전/);
  if (hourMatch) return now.getTime() - Number(hourMatch[1]) * 3_600_000;

  const dayMatch = label.match(/(\d+)\s*일\s*전/);
  if (dayMatch) return now.getTime() - Number(dayMatch[1]) * 86_400_000;

  const weekMatch = label.match(/(\d+)\s*주\s*전/);
  if (weekMatch) return now.getTime() - Number(weekMatch[1]) * 7 * 86_400_000;

  if (label.includes("어제")) return now.getTime() - 86_400_000;

  const todayTimeMatch = label.match(/오늘\s*(\d{1,2}):(\d{2})/);
  if (todayTimeMatch) {
    const d = new Date(now);
    d.setHours(Number(todayTimeMatch[1]), Number(todayTimeMatch[2]), 0, 0);
    return d.getTime();
  }

  return 0;
}

export function sortLiveOrdersByLatest(items: LiveOrderItem[]) {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ta = a.item.updatedAtMs ?? parseLabelToMs(a.item.updatedAtLabel);
      const tb = b.item.updatedAtMs ?? parseLabelToMs(b.item.updatedAtLabel);
      if (tb !== ta) return tb - ta;
      return a.index - b.index;
    })
    .map((x) => x.item);
}

export function mapOrderToLiveItem(o: OrderResponse): LiveOrderItem {
  const updatedIso = o.updated ?? o.createdAt;
  const toHHmm = (v?: string) => {
    if (!v) return undefined;
    const normalized = v.includes("T") ? v : v.replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return "00:00";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return {
    id: String(o.orderId),
    status: mapStatus(o.status),
    applicantsCount: Math.max(0, Math.floor(Number((o as any).applicantCount ?? 0) || 0)),
    isInstantDispatch: o.driveMode === "instant",
    pickupTypeLabel: o.startType || "당상",
    dropoffTypeLabel: o.endType || "당착",
    from: o.startAddr || "-",
    to: o.endAddr || "-",
    fromDetail: o.startPlace || "-",
    toDetail: o.endPlace || "-",
    distanceKm: Math.round(o.distance ?? 0),
    cargoSummary: `${o.reqTonnage ?? ""} ${o.reqCarType ?? ""}`.trim() || o.cargoContent || "-",
    loadMethodShort: toLoadMethodShort(o.loadMethod),
    workToolShort: toWorkToolShort(o.workType),
    priceWon: o.basePrice ?? 0,
    updatedAtLabel: toRelativeLabel(updatedIso),
    updatedAtMs: toTimestampMs(updatedIso),
    pickupTimeHHmm: toHHmm(o.startSchedule),
    dropoffTimeHHmm: toHHmm(o.endSchedule),
    drivingStageLabel:
      o.status === "LOADING" ? "상차 완료" : o.status === "UNLOADING" ? "하차 직전" : "배달 중",
  };
}

export function isWithinNextHour(hhmm?: string) {
  if (!hhmm) return false;
  const m = hhmm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return false;
  const now = new Date();
  const target = new Date(now);
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  let diffMin = Math.floor((target.getTime() - now.getTime()) / 60000);
  if (diffMin < 0) diffMin += 24 * 60;
  return diffMin >= 0 && diffMin <= 60;
}
