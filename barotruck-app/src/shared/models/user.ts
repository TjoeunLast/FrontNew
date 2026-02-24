/**
 * 유저 기본 정보 (UserResponseDto.java 대응)
 */
export interface UserProfile {
  userId: number;
  email: string;
  nickname: string;
  name: string;
  profileImageUrl?: string;
  phone: string;
  role: 'USER' | 'DRIVER' | 'SHIPPER' | 'ADMIN';
  ratingAvg: number;
}

/**
 * 차주 상세 정보 (DriverRequest.java 대응)
 */
export interface DriverInfo {
  carNum: string;
  carType: string;
  tonnage: number;
  career: number;
  bankName: string;
  accountNum: string;
  type?: string; // 냉장, 냉동 등
  address?: string; // 차주 주소 (선호 지역)
  nbhId?: number;   // 지역 코드 (Neighborhood ID)
}

/**
 * 화주 상세 정보 (ShipperRequest.java 대응)
 */
export interface ShipperInfo {
  companyName: string;
  bizRegNum: string;
  representative: string;
  bizAddress: string;
  isCorporate: 'Y' | 'N';
}