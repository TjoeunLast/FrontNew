/** * 회원가입 요청 데이터 (RegisterRequest.java 대응) 
 */
export interface RegisterRequest {
  nickname: string;
  email: string;
  password?: string;
  phone: string;
  role: 'DRIVER' | 'SHIPPER';
  gender?: 'M' | 'F';
  age?: number;
  // 차주 추가 정보
  driver?: {
    carNum: string;
    carType: string;
    tonnage: number;
    bankName: string;
    accountNum: string;
    career: number; // 또는 경력 형식에 따라 string 추가
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
