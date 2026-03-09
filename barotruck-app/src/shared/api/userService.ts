import { USE_MOCK } from "@/shared/config/mock";
import { getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";
import * as SecureStore from "expo-secure-store";
import {
  ChangePasswordRequest,
  DriverInfo,
  ShipperInfo,
  UserProfile,
} from "../models/user";
import apiClient from "./apiClient";

function toFiniteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildDriverProfilePayload(data: DriverInfo): DriverInfo & Record<string, unknown> {
  const address = String(data.address ?? "").trim() || undefined;
  const lat = toFiniteNumber(data.lat);
  const lng = toFiniteNumber(data.lng);

  return {
    ...data,
    address,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    activityAddress: address,
    activityLat: lat,
    activityLng: lng,
  };
}

type MockSession = {
  userId?: number;
  email?: string;
  nickname?: string;
  phone?: string;
  role?: UserProfile["role"];
};

async function readMockSession(): Promise<MockSession> {
  try {
    const raw = await SecureStore.getItemAsync("baro_mock_auth_session");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MockSession;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export const UserService = {
  /** * 1. 내 프로필 정보 조회 (UsersController /api/user/me)
   * 백엔드에서 UserResponseDto를 반환하며,
   * 인터페이스 UserProfile과 필드명(userId, role 등)이 일치하는지 확인이 필요합니다.
   */
  getMyInfo: async (): Promise<UserProfile> => {
    const snapshot = await getCurrentUserSnapshot();

    const res = await apiClient.get("/api/user/me");
    const baseProfile = res.data;

    return {
      ...baseProfile,
      nickname:
        String(snapshot?.nickname ?? baseProfile.nickname).trim() ||
        baseProfile.nickname,
      name:
        String(
          snapshot?.name ?? snapshot?.nickname ?? baseProfile.name,
        ).trim() || baseProfile.name,

      DriverInfo: baseProfile.driverInfo || baseProfile.DriverInfo,
      ShipperInfo: baseProfile.shipperInfo || baseProfile.ShipperInfo,
    } as UserProfile;
  },

  /** * 2. 차주 프로필 저장/수정 (DriverController /api/v1/drivers/me)
   */
  saveDriverProfile: async (data: DriverInfo): Promise<string> => {
    if (USE_MOCK) return `목업 차주 프로필 저장 완료: ${data.carNum}`;
    const res = await apiClient.post("/api/v1/drivers/me", buildDriverProfilePayload(data));
    return res.data;
  },

  /** * 3. 화주 프로필 저장/수정 (ShipperController /api/v1/shippers/me)
   */
  saveShipperProfile: async (data: ShipperInfo): Promise<string> => {
    if (USE_MOCK) return `목업 화주 프로필 저장 완료: ${data.companyName}`;
    const res = await apiClient.post("/api/v1/shippers/me", data);
    return res.data;
  },

  /** * 4. 닉네임 중복 확인 (UsersController /api/user/check-nickname)
   * 백엔드 응답 형식: {"isDuplicated": true/false}
   */
  checkNickname: async (nickname: string): Promise<boolean> => {
    if (USE_MOCK) return false;
    const res = await apiClient.get("/api/user/check-nickname", {
      params: { nickname },
    });
    return res.data.isDuplicated;
  },

  /**
   * FCM 토큰 서버 전송 및 저장
   * 앱 실행 시 또는 토큰 갱신 시 호출됨
   */
  updateFcmToken: async (token: string): Promise<void> => {
    console.log("🌐 [UserService] 서버로 FCM 토큰 전송 시도:", token);
    // .patch 대신 .post 사용
    await apiClient.post("/api/user/fcm-token", { fcmToken: token });
  },

  updateAdminForceAllocateBlocked: async (blocked: boolean): Promise<void> => {
    await apiClient.post("/api/user/admin-force-allocate-blocked", { blocked });
  },

  updateInstantDispatchEnabled: async (enabled: boolean): Promise<void> => {
    const candidates = [
      { url: "/api/v1/drivers/me/instant-dispatch", payload: { enabled } },
      { url: "/api/v1/drivers/me/instant-dispatch", payload: { instantDispatchEnabled: enabled } },
      { url: "/api/v1/drivers/me/direct-dispatch", payload: { enabled } },
      { url: "/api/v1/drivers/me/direct-dispatch", payload: { instantDispatchEnabled: enabled } },
      { url: "/api/v1/drivers/me/quick-dispatch", payload: { enabled } },
      { url: "/api/v1/drivers/me/quick-dispatch", payload: { quickDispatchEnabled: enabled } },
      { url: "/api/v1/drivers/me/admin-dispatch", payload: { enabled } },
      { url: "/api/v1/drivers/me/admin-dispatch", payload: { adminDispatchEnabled: enabled } },
      { url: "/api/v1/drivers/me/auto-assign", payload: { enabled } },
      { url: "/api/v1/drivers/me/auto-assign", payload: { autoAssignEnabled: enabled } },
    ] as const;

    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        await apiClient.post(candidate.url, candidate.payload);
        return;
      } catch (error: any) {
        const status = error?.response?.status;
        if (status && status !== 404 && status !== 405) {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError ?? new Error("Failed to update instant dispatch setting");
  },

  /** * 5. 비밀번호 변경 (POST /api/user/change-password) */
  changePassword: async (data: ChangePasswordRequest): Promise<string> => {
    const res = await apiClient.post("/api/user/change-password", data);
    return res.data;
  },

  /** * 6. 회원 탈퇴 (POST /api/user/delete) */
  deleteUser: async (): Promise<string> => {
    if (USE_MOCK) return "목업 회원 탈퇴 처리되었습니다.";
    const res = await apiClient.post("/api/user/delete");
    return res.data;
  },

  /** * 7. 회원 복구 (POST /api/user/restore) */
  restoreUser: async (): Promise<string> => {
    const res = await apiClient.post("/api/user/restore");
    return res.data;
  },

/** * 프로필 이미지 업로드 및 수정 
   * POST /api/v1/users/me/image
   */
  uploadProfileImage: async (file: any): Promise<string> => {
    const formData = new FormData();
    // 백엔드 @RequestParam("image")에 맞춰 키값을 "image"로 설정
    formData.append("image", file);

    const res = await apiClient.post("/api/v1/users/me/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data; // 이미지 URL 반환
  },

  /** * 프로필 이미지 조회 
   * GET /api/v1/users/me/image
   */
  getProfileImage: async (): Promise<string> => {
    const res = await apiClient.get("/api/v1/users/me/image");
    return res.data;
  },

  /** * 프로필 이미지 삭제 
   * DELETE /api/v1/users/me/image
   */
  deleteProfileImage: async (): Promise<void> => {
    await apiClient.delete("/api/v1/users/me/image");
  },

  /**
   * 10. 차주/화주 전용 중복 체크 (선택 사항)
   * 백엔드 DriverService/ShipperService의 중복 체크 로직과 연결
   */
  checkCarNum: async (carNum: string): Promise<boolean> => {
    const res = await apiClient.get("/api/v1/drivers/check-car-num", {
      params: { carNum },
    });
    return res.data;
  },

  checkBizNum: async (bizRegNum: string): Promise<boolean> => {
    const res = await apiClient.get("/api/v1/shippers/check-biz-num", {
      params: { bizRegNum },
    });
    return res.data;
  },

  
};
