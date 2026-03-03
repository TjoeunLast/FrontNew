interface KakaoAddressDocument {
  x?: string;
  y?: string;
}

interface KakaoAddressSearchResponse {
  documents?: KakaoAddressDocument[];
}

export interface GeocodedCoordinate {
  lat: number;
  lng: number;
}

function toNum(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const KakaoLocalApi = {
  geocodeAddress: async (address: string): Promise<GeocodedCoordinate | null> => {
    const query = address.trim();
    if (!query) return null;

    const restApiKey = String(process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "").trim();
    if (!restApiKey) {
      console.warn("EXPO_PUBLIC_KAKAO_REST_API_KEY is missing.");
      return null;
    }

    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${restApiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`kakao_local_geocode_failed:${response.status}:${errorText}`);
    }

    const payload = (await response.json()) as KakaoAddressSearchResponse;
    const doc = payload.documents?.[0];
    if (!doc) return null;

    const lat = toNum(doc.y);
    const lng = toNum(doc.x);
    if (lat === undefined || lng === undefined) return null;

    return { lat, lng };
  },
};
