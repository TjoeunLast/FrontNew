import { toFiniteNumber } from "./orderDetail.utils";

const KAKAO_REST_API_KEY = String(process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "").trim();

export type RoutePathPoint = {
  lat: number;
  lng: number;
};

export type RoutePreviewData = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startLabel: string;
  endLabel: string;
  path: RoutePathPoint[];
};

interface KakaoMobilityRoad {
  vertexes?: unknown;
}

interface KakaoMobilitySection {
  roads?: KakaoMobilityRoad[];
}

interface KakaoMobilityRoute {
  sections?: KakaoMobilitySection[];
}

interface KakaoMobilityDirectionsResponse {
  routes?: KakaoMobilityRoute[];
}

function parseKakaoDrivingPath(payload: KakaoMobilityDirectionsResponse): RoutePathPoint[] {
  const points: RoutePathPoint[] = [];
  const roads = payload.routes?.[0]?.sections?.flatMap((section) => section.roads ?? []) ?? [];
  for (const road of roads) {
    const vertexes = Array.isArray(road.vertexes) ? road.vertexes : [];
    for (let i = 0; i < vertexes.length - 1; i += 2) {
      const lng = toFiniteNumber(vertexes[i]);
      const lat = toFiniteNumber(vertexes[i + 1]);
      if (lat === null || lng === null) continue;
      const prev = points[points.length - 1];
      if (prev && prev.lat === lat && prev.lng === lng) continue;
      points.push({ lat, lng });
    }
  }
  return points;
}

export async function requestDrivingRoutePath(params: {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}): Promise<RoutePathPoint[] | null> {
  if (!KAKAO_REST_API_KEY) return null;

  const query = new URLSearchParams({
    origin: `${params.startLng},${params.startLat}`,
    destination: `${params.endLng},${params.endLat}`,
    priority: "RECOMMEND",
    alternatives: "false",
    road_details: "false",
  });

  const response = await fetch(`https://apis-navi.kakaomobility.com/v1/directions?${query.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`kakao_mobility_directions_failed:${response.status}:${err}`);
  }

  const payload = (await response.json()) as KakaoMobilityDirectionsResponse;
  const path = parseKakaoDrivingPath(payload);
  if (path.length < 2) return null;
  return path;
}
