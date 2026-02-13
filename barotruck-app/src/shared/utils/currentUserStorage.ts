import * as SecureStore from "expo-secure-store";

export type CurrentUserRole = "DRIVER" | "SHIPPER" | "USER" | "ADMIN";

export type CurrentUserSnapshot = {
  email: string;
  nickname: string;
  name?: string;
  role: CurrentUserRole;
};

const CURRENT_USER_KEY = "baro_current_user_snapshot";

export async function saveCurrentUserSnapshot(user: CurrentUserSnapshot): Promise<void> {
  await SecureStore.setItemAsync(CURRENT_USER_KEY, JSON.stringify(user));
}

export async function getCurrentUserSnapshot(): Promise<CurrentUserSnapshot | null> {
  const raw = await SecureStore.getItemAsync(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUserSnapshot;
  } catch {
    return null;
  }
}

export async function clearCurrentUserSnapshot(): Promise<void> {
  await SecureStore.deleteItemAsync(CURRENT_USER_KEY);
}

