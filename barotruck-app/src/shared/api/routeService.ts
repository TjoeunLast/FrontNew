import apiClient from "./apiClient";

export interface RouteEstimateResult {
  distanceKm: number;
  durationMin: number;
}

type Numeric = number | undefined;

interface KakaoMobilityRouteSummary {
  distance?: number;
  duration?: number;
}

interface KakaoMobilityRoute {
  summary?: KakaoMobilityRouteSummary;
}

interface KakaoMobilityDirectionsResponse {
  routes?: KakaoMobilityRoute[];
}

function toNum(v: unknown): Numeric {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function pickNum(node: any, keys: string[]): Numeric {
  for (const key of keys) {
    const parsed = toNum(node?.[key]);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function parseDistanceKm(payload: any): Numeric {
  const directKm = pickNum(payload, ["distanceKm", "km", "distance_km"]);
  if (directKm !== undefined) return Math.max(0, directKm);

  const meters = pickNum(payload, ["distanceMeters", "distanceMeter", "meters", "distance_m"]);
  if (meters !== undefined) return Math.max(0, meters / 1000);

  const distance = pickNum(payload, ["distance"]);
  if (distance === undefined) return undefined;
  return distance > 1000 ? distance / 1000 : distance;
}

function parseDurationMin(payload: any): Numeric {
  const directMin = pickNum(payload, ["durationMin", "durationMins", "durationMinutes", "minutes"]);
  if (directMin !== undefined) return Math.max(0, directMin);

  const seconds = pickNum(payload, ["durationSec", "durationSecs", "durationSeconds", "seconds"]);
  if (seconds !== undefined) return Math.max(0, seconds / 60);

  const duration = pickNum(payload, ["duration"]);
  if (duration === undefined) return undefined;
  return duration > 1000 ? duration / 60 : duration;
}

function parseEstimate(payload: any): RouteEstimateResult | null {
  const nodes = [payload, payload?.data, payload?.result, payload?.route, payload?.metrics];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const distanceKm = parseDistanceKm(node);
    const durationMin = parseDurationMin(node);
    if (distanceKm === undefined || durationMin === undefined) continue;
    return {
      distanceKm: Math.max(0, Math.round(distanceKm)),
      durationMin: Math.max(1, Math.round(durationMin)),
    };
  }
  return null;
}

function parseKakaoMobilityEstimate(payload: KakaoMobilityDirectionsResponse): RouteEstimateResult | null {
  const summary = payload.routes?.[0]?.summary;
  const distanceMeters = toNum(summary?.distance);
  const durationSeconds = toNum(summary?.duration);
  if (distanceMeters === undefined || durationSeconds === undefined) return null;

  return {
    distanceKm: Math.max(0, Math.round(distanceMeters / 1000)),
    durationMin: Math.max(1, Math.round(durationSeconds / 60)),
  };
}

async function estimateByKakaoMobility(params: {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}): Promise<RouteEstimateResult> {
  const restApiKey = String(process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "").trim();
  if (!restApiKey) {
    throw new Error("kakao_mobility_key_missing");
  }

  const query = new URLSearchParams({
    origin: `${params.startLng},${params.startLat}`,
    destination: `${params.endLng},${params.endLat}`,
    priority: "RECOMMEND",
    summary: "true",
  });

  const response = await fetch(`https://apis-navi.kakaomobility.com/v1/directions?${query.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `KakaoAK ${restApiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`kakao_mobility_directions_failed:${response.status}:${errorText}`);
  }

  const payload = (await response.json()) as KakaoMobilityDirectionsResponse;
  const parsed = parseKakaoMobilityEstimate(payload);
  if (!parsed) {
    throw new Error("kakao_mobility_directions_invalid_response");
  }

  return parsed;
}

export const RouteApi = {
  estimateByCoords: async (params: {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
  }): Promise<RouteEstimateResult> => {
    const envPath = String(process.env.EXPO_PUBLIC_ROUTE_ESTIMATE_PATH ?? "").trim();
    const candidates = [
      envPath,
      "/api/v1/routes/estimate",
      "/api/v1/orders/route-estimate",
      "/api/v1/orders/estimate-route",
      "/api/v1/orders/estimate",
    ].filter(Boolean);

    const body = {
      startLat: params.startLat,
      startLng: params.startLng,
      endLat: params.endLat,
      endLng: params.endLng,
    };

    let lastError: unknown;
    for (const url of candidates) {
      try {
        const res = await apiClient.post(url, body);
        const parsed = parseEstimate(res.data);
        if (parsed) return parsed;
      } catch (error) {
        lastError = error;
      }
    }

    try {
      return await estimateByKakaoMobility(params);
    } catch (mobilityError) {
      throw mobilityError ?? lastError ?? new Error("route_estimate_unavailable");
    }
  },
};

