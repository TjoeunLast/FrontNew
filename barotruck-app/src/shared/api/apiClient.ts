import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store'; // 또는 AsyncStorage


// ⚠️ 중요: 본인 컴퓨터 IP로 변경하세요! (localhost 금지)
// 안드로이드 에뮬레이터라면: 'http://10.0.2.2:8080'
// 실물 폰 연결이라면: 'http://192.168.x.x:8080' (PC와 같은 와이파이 필수)
// 개발 서버의 호스트 주소(IP)를 자동으로 가져옵니다.
const debuggerHost = Constants.expoConfig?.hostUri?.split(':').shift();


console.log("현재 API 요청 주소:", `http://${debuggerHost}:8080`);
const apiClient = axios.create({
  
  // 로컬 IP 주소 사용 권장 (예: http://192.168.x.x:8080)
  baseURL: 'http://192.168.10.73:8080',
  
});
console.log("현재 설정된 서버 주소:", apiClient.defaults.baseURL);
// 요청 인터셉터: 모든 API 요청 직전에 실행됨
apiClient.interceptors.request.use(
  async (config) => {
    // 저장소에서 JWT 토큰 가져오기
    const token = await SecureStore.getItemAsync('userToken');
    
    if (token) {
      // 헤더에 Authorization 추가
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;