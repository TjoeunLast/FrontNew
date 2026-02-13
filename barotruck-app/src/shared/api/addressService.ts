import apiClient from "./apiClient";

const ADDRESS_SEARCH_CANDIDATES = [
  { url: "/api/neighborhoods/search", param: "query" },
  { url: "/api/neighborhoods/search", param: "q" },
  { url: "/api/neighborhoods/search", param: "keyword" },
  { url: "/api/neighborhoods", param: "query" },
  { url: "/api/neighborhoods", param: "q" },
  { url: "/api/neighborhoods", param: "keyword" },
  { url: "/api/v1/addresses/search", param: "query" },
  { url: "/api/v1/addresses/search", param: "q" },
  { url: "/api/v1/address/search", param: "query" },
  { url: "/api/v1/address/search", param: "q" },
  { url: "/api/v1/neighborhoods/search", param: "query" },
  { url: "/api/v1/neighborhoods/search", param: "keyword" },
  { url: "/api/v1/neighborhoods", param: "query" },
  { url: "/api/v1/neighborhoods", param: "keyword" },
];

function pickAddressText(row: any): string {
  if (typeof row === "string") return row.trim();
  if (!row || typeof row !== "object") return "";
  return String(
    row.fullName ??
      row.FULL_NAME ??
      row.roadAddress ??
      row.jibunAddress ??
      row.fullAddress ??
      row.displayName ??
      row.DISPLAY_NAME ??
      row.cityName ??
      row.CITY_NAME ??
      row.address ??
      row.addr ??
      row.name ??
      ""
  ).trim();
}

function toAddressList(payload: any): string[] {
  const uniq = new Set<string>();

  const absorb = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach((item) => {
        const text = pickAddressText(item);
        if (text) uniq.add(text);
      });
      return;
    }
    if (typeof node === "string") {
      const text = node.trim();
      if (text) uniq.add(text);
      return;
    }
    if (typeof node === "object") {
      const direct = pickAddressText(node);
      if (direct) uniq.add(direct);

      absorb((node as any).content);
      absorb((node as any).items);
      absorb((node as any).results);
      absorb((node as any).data);
      absorb((node as any).addresses);
    }
  };

  absorb(payload);
  return Array.from(uniq);
}

export const AddressApi = {
  search: async (query: string): Promise<string[]> => {
    const q = query.trim();
    if (!q) return [];

    for (const candidate of ADDRESS_SEARCH_CANDIDATES) {
      try {
        const res = await apiClient.get(candidate.url, {
          params: { [candidate.param]: q },
        });
        const parsed = toAddressList(res.data);
        if (parsed.length > 0) return parsed;
      } catch {
        // Try next candidate endpoint.
      }
    }

    return [];
  },
};
