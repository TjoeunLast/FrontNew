/** * 회원가입 요청 데이터 (RegisterRequest.java 대응) 
 */
export interface RegisterRequest {
  nickname: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'DRIVER' | 'SHIPPER';
  gender?: 'M' | 'F';
  age?: number;
  delflag?: string;
  regflag?: string;
  ratingAvg?: number;
  user_level?: number;
  // 차주 추가 정보
  driver?: {
    carNum: string;
    carType: string;
    tonnage: number;
    type?: string;
    bankName: string;
    accountNum: string;
    career: number; // 또는 경력 형식에 따라 string 추가
    address?: string; // 차주 주소
    lat?: number;     // 차주 활동 지역 위도
    lng?: number;     // 차주 활동 지역 경도
    nbhId?: number;   // 지역 코드
  };
  // 화주 추가 정보
  shipper?: {
    companyName: string;
    bizRegNum: string;
    representative: string;
    bizAddress: string;
    isCorporate?: 'Y' | 'N';
  };
}

/** * 로그인 응답 데이터 (AuthenticationResponse.java 대응) 
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: number;
  error?: string;
}
