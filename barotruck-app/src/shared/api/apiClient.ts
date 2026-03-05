import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { tokenStorage } from "@/shared/utils/tokenStorage";

function resolveApiBaseUrl() {
  const envBase = String(process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim();
  if (envBase) return envBase;

  // 2. 안드로이드 에뮬레이터인 경우 10.0.2.2 적용
  // __DEV__는 개발 모드일 때 true입니다.
  if (__DEV__ && Platform.OS === "android") {
    // 실제 기기(Physical Device)가 아닌 에뮬레이터인지 체크가 필요할 수 있지만,
    // 보통 로컬 개발 시에는 10.0.2.2를 기본으로 두는 것이 편합니다.
    return "http://10.0.2.2:8080";
  }

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
const apiClient = axios.create({ baseURL });
// 요청 인터셉터: 모든 API 요청 직전에 실행됨
apiClient.interceptors.request.use(
  async (config) => {
    // 저장소에서 JWT 토큰 가져오기 
    const token = await tokenStorage.getItem("userToken");
    if (token) {
      // 헤더에 Authorization 추가
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default apiClient;
