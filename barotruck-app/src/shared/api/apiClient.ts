import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { tokenStorage } from "@/shared/utils/tokenStorage";

function resolveApiBaseUrl() {
  const envBase = String(process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim();
  if (envBase) return envBase;

  const hostFromExpo = Constants.expoConfig?.hostUri?.split(":").shift();
  if (hostFromExpo && hostFromExpo !== "undefined")
    return `http://${hostFromExpo}:8080`;

  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location?.hostname
  ) {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }

  return "http://localhost:8080";
}

const baseURL = resolveApiBaseUrl();
console.log("현재 API 요청 주소:", baseURL);
const apiClient = axios.create({ baseURL });
console.log("현재 설정된 서버 주소:", apiClient.defaults.baseURL);
// 요청 인터셉터: 모든 API 요청 직전에 실행됨
apiClient.interceptors.request.use(
  async (config) => {
    // 저장소에서 JWT 토큰 가져오기
    const token = await tokenStorage.getItem("userToken");
    console.log("🚀 요청 헤더 토큰 확인:", token ? "있음" : "없음"); // 이 로그가 찍히는지 확인
    if (token) {
      // 헤더에 Authorization 추가
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default apiClient;
