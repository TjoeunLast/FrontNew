import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type CurrentUserRole = "DRIVER" | "SHIPPER" | "USER" | "ADMIN";

export type CurrentUserSnapshot = {
  email: string;
  nickname: string;
  name?: string;
  role: CurrentUserRole;
  shipperType?: "Y" | "N";
  gender?: "M" | "F";
  age?: number;
  birthDate?: string;
  activityAddress?: string;
  activityLat?: number;
  activityLng?: number;
  driverCarNum?: string;
  driverCarType?: string;
  driverType?: string;
  driverTonnage?: number;
  driverCareer?: number;
  instantDispatchEnabled?: boolean;
};

const CURRENT_USER_KEY = "baro_current_user_snapshot";

async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function deleteStorageItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

export async function saveCurrentUserSnapshot(user: CurrentUserSnapshot): Promise<void> {
  await setStorageItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export async function getCurrentUserSnapshot(): Promise<CurrentUserSnapshot | null> {
  const raw = await getStorageItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUserSnapshot;
  } catch {
    return null;
  }
}

export async function clearCurrentUserSnapshot(): Promise<void> {
  await deleteStorageItem(CURRENT_USER_KEY);
}

export async function upsertCurrentUserSnapshot(
  patch: Partial<CurrentUserSnapshot> & Pick<CurrentUserSnapshot, "email" | "nickname" | "role">
): Promise<CurrentUserSnapshot> {
  const current = await getCurrentUserSnapshot();
  const next: CurrentUserSnapshot = {
    ...current,
    ...patch,
    email: String(patch.email ?? current?.email ?? "").trim(),
    nickname: String(patch.nickname ?? current?.nickname ?? "").trim(),
    role: (patch.role ?? current?.role ?? "USER") as CurrentUserRole,
  };

  if (!next.email || !next.nickname) {
    throw new Error("current user snapshot requires email and nickname");
  }

  await saveCurrentUserSnapshot(next);
  return next;
}
