import { Linking } from "react-native";

export const APP_DEEP_LINK_SCHEME = "barotruckapp";
export const APP_DEEP_LINK_PREFIX = `${APP_DEEP_LINK_SCHEME}://`;

type ParsedIntentUrl = {
  appUrl: string | null;
  fallbackUrl: string | null;
  marketUrl: string | null;
};

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseIntentUrl(url: string): ParsedIntentUrl {
  const normalized = String(url ?? "").trim();
  const marker = "#Intent;";
  const markerIndex = normalized.indexOf(marker);

  if (!normalized.toLowerCase().startsWith("intent://") || markerIndex < 0) {
    return {
      appUrl: null,
      fallbackUrl: null,
      marketUrl: null,
    };
  }

  const hostAndPath = normalized.slice("intent://".length, markerIndex);
  const tail = normalized.slice(markerIndex + marker.length);
  const segments = tail.split(";").filter(Boolean);

  let scheme: string | null = null;
  let packageName: string | null = null;
  let fallbackUrl: string | null = null;

  for (const segment of segments) {
    if (segment === "end") {
      continue;
    }

    if (segment.startsWith("scheme=")) {
      scheme = segment.slice("scheme=".length).trim() || null;
      continue;
    }

    if (segment.startsWith("package=")) {
      packageName = segment.slice("package=".length).trim() || null;
      continue;
    }

    if (segment.startsWith("S.browser_fallback_url=")) {
      fallbackUrl =
        safeDecodeURIComponent(
          segment.slice("S.browser_fallback_url=".length).trim()
        ) || null;
    }
  }

  return {
    appUrl: scheme ? `${scheme}://${hostAndPath}` : null,
    fallbackUrl,
    marketUrl: packageName
      ? `market://details?id=${encodeURIComponent(packageName)}`
      : null,
  };
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function isWebViewInternalUrl(url: string) {
  const lower = String(url || "").toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("about:blank") ||
    lower.startsWith("data:")
  );
}

export async function openExternalCheckoutUrl(rawUrl: string) {
  const normalized = String(rawUrl ?? "").trim();
  if (!normalized) {
    return false;
  }

  const intent = parseIntentUrl(normalized);
  const candidates = uniqueStrings([
    intent.appUrl,
    intent.marketUrl,
    intent.fallbackUrl,
    normalized.startsWith("intent://") ? null : normalized,
  ]);

  for (const candidate of candidates) {
    try {
      await Linking.openURL(candidate);
      return true;
    } catch {
      // Android payment intents often require one of several fallbacks.
    }
  }

  return false;
}
