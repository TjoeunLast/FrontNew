import * as SecureStore from "expo-secure-store";

import { UserService } from "@/shared/api/userService";
import {
  clearCurrentUserSnapshot,
  getCurrentUserSnapshot,
  saveCurrentUserSnapshot,
  type CurrentUserRole,
} from "@/shared/utils/currentUserStorage";
import { tokenStorage } from "@/shared/utils/tokenStorage";

const MOCK_SESSION_KEY = "baro_mock_auth_session";

type ValidatedRole = Exclude<CurrentUserRole, "USER"> | "USER";

type SessionValidationResult = {
  ok: boolean;
  role?: ValidatedRole;
};

function normalizeRole(value: unknown): ValidatedRole | undefined {
  const role = String(value ?? "").trim().toUpperCase();
  if (role === "DRIVER" || role === "SHIPPER" || role === "ADMIN") {
    return role;
  }
  if (role === "USER") {
    return role;
  }
  return undefined;
}

function normalizeText(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function normalizeGender(value: unknown): "M" | "F" | undefined {
  const gender = String(value ?? "").trim().toUpperCase();
  if (gender === "M" || gender === "F") {
    return gender;
  }
  return undefined;
}

export async function clearStoredAuthSession(): Promise<void> {
  await Promise.allSettled([
    tokenStorage.deleteItem("userToken"),
    tokenStorage.deleteItem("refreshToken"),
    clearCurrentUserSnapshot(),
    SecureStore.deleteItemAsync(MOCK_SESSION_KEY),
  ]);
}

export async function validateStoredSession(
  expectedRole?: ValidatedRole,
): Promise<SessionValidationResult> {
  const token = await tokenStorage.getItem("userToken");
  if (!token) {
    return { ok: false };
  }

  const snapshot = await getCurrentUserSnapshot();
  const profile = await UserService.getMyInfo();

  const role =
    normalizeRole(profile?.role) ?? normalizeRole(snapshot?.role);
  if (!role) {
    return { ok: false };
  }

  if (expectedRole && role !== expectedRole) {
    return { ok: false, role };
  }

  const email = normalizeText(profile?.email) ?? normalizeText(snapshot?.email);
  const nickname =
    normalizeText(profile?.nickname) ??
    normalizeText(profile?.name) ??
    normalizeText(snapshot?.nickname);

  if (email && nickname) {
    await saveCurrentUserSnapshot({
      email,
      nickname,
      name: normalizeText(profile?.name) ?? snapshot?.name,
      phone: normalizeText(profile?.phone) ?? snapshot?.phone,
      role,
      gender: normalizeGender(profile?.gender) ?? snapshot?.gender,
      age:
        Number.isFinite(Number(profile?.age)) ? Number(profile?.age) : snapshot?.age,
      shipperType: snapshot?.shipperType,
      birthDate: snapshot?.birthDate,
      activityAddress: snapshot?.activityAddress,
      activityLat: snapshot?.activityLat,
      activityLng: snapshot?.activityLng,
      driverCarNum: snapshot?.driverCarNum,
      driverCarType: snapshot?.driverCarType,
      driverType: snapshot?.driverType,
      driverTonnage: snapshot?.driverTonnage,
      driverCareer: snapshot?.driverCareer,
      instantDispatchEnabled: snapshot?.instantDispatchEnabled,
    });
  }

  return { ok: true, role };
}
