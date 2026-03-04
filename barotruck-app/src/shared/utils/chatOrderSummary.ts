import AsyncStorage from '@react-native-async-storage/async-storage';

export const CHAT_ORDER_SUMMARY_STORAGE_KEY = 'chat_order_summary_v1';
export const CHAT_ROOM_TITLE_STORAGE_KEY = 'chat_room_title_v1';
export const CHAT_ROOM_VISITED_AT_STORAGE_KEY = 'chat_room_visited_at_v1';

export type ChatOrderSummary = {
  orderId: string;
  routeText: string;
  cargoText: string;
  priceText: string;
};

function normalizeSummary(summary: Partial<ChatOrderSummary> | null | undefined): ChatOrderSummary | null {
  if (!summary) return null;

  const normalized = {
    orderId: String(summary.orderId ?? '').trim(),
    routeText: String(summary.routeText ?? '').trim(),
    cargoText: String(summary.cargoText ?? '').trim(),
    priceText: String(summary.priceText ?? '').trim(),
  };

  if (!normalized.orderId && !normalized.routeText && !normalized.cargoText && !normalized.priceText) {
    return null;
  }

  return normalized;
}

export async function loadStoredChatOrderSummary(roomId: string): Promise<ChatOrderSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CHAT_ORDER_SUMMARY_STORAGE_KEY}:${roomId}`);
    if (!raw) return null;
    return normalizeSummary(JSON.parse(raw) as Partial<ChatOrderSummary> | null);
  } catch {
    return null;
  }
}

export async function storeChatOrderSummary(roomId: string, summary: ChatOrderSummary) {
  try {
    await AsyncStorage.setItem(`${CHAT_ORDER_SUMMARY_STORAGE_KEY}:${roomId}`, JSON.stringify(summary));
  } catch {
    // noop
  }
}

export async function loadStoredChatRoomTitle(roomId: string): Promise<string> {
  try {
    return String(await AsyncStorage.getItem(`${CHAT_ROOM_TITLE_STORAGE_KEY}:${roomId}`) ?? '').trim();
  } catch {
    return '';
  }
}

export async function storeChatRoomTitle(roomId: string, title: string) {
  const normalized = String(title ?? '').trim();
  if (!normalized) return;

  try {
    await AsyncStorage.setItem(`${CHAT_ROOM_TITLE_STORAGE_KEY}:${roomId}`, normalized);
  } catch {
    // noop
  }
}

export async function loadChatRoomVisitedAt(roomId: string): Promise<string> {
  try {
    return String(await AsyncStorage.getItem(`${CHAT_ROOM_VISITED_AT_STORAGE_KEY}:${roomId}`) ?? '').trim();
  } catch {
    return '';
  }
}

export async function markChatRoomVisited(roomId: string, visitedAt: string = new Date().toISOString()) {
  const normalized = String(visitedAt ?? '').trim();
  if (!normalized) return;

  try {
    await AsyncStorage.setItem(`${CHAT_ROOM_VISITED_AT_STORAGE_KEY}:${roomId}`, normalized);
  } catch {
    // noop
  }
}
