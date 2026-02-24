import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { tokenStorage } from "@/shared/utils/tokenStorage";


function resolveApiBaseUrl() {
  // 1. .env 파일에 강제로 설정된 값이 있으면 최우선 사용
  const envBase = String(process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim();
  if (envBase) return envBase;

  // 2. Expo Metro Bundler가 실행 중인 호스트 PC의 IP (예: 192.168.0.x)
  const hostFromExpo = Constants.expoConfig?.hostUri?.split(":").shift();

  // 3. Android 환경에 대한 특수 처리
  if (Platform.OS === 'android') {
    // Expo Go나 Dev Client로 실행 중이라 호스트 IP가 감지된 경우 -> 해당 IP 사용
    if (hostFromExpo && hostFromExpo !== "undefined") {
      return `http://${hostFromExpo}:8080`;
    }
    // 에뮬레이터인데 호스트 IP를 못 찾은 경우 -> 에뮬레이터 전용 루프백 주소 사용
    return "http://10.0.2.2:8080";
  }

  // 4. 웹 환경 처리
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }

  // 5. iOS 시뮬레이터 또는 그 외 환경 (localhost 사용 가능
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
  (error) => Promise.reject(error)
);

export default apiClient;
