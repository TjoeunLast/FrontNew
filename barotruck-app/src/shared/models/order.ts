import { ImageInfo } from "./ImageInfo";

// @/shared/models/order.

/** 오더 상태 (Order.java의 status 필드 대응) */
export type OrderStatus =
  | "REQUESTED" // 배차 대기
  | "APPLIED" // 승인 대기
  | "ACCEPTED" // 배차 확정
  | "LOADING" // 상차 중
  | "IN_TRANSIT" // 운송 중
  | "UNLOADING" // 하차 중
  | "COMPLETED" // 운송 완료
  | "CANCELLED" // 취소
  | "PENDING"; // 접수 대기

/** * 오더 생성 요청 (OrderRequest.java 대응)
 */
export interface OrderRequest {
  startAddr: string;
  startPlace: string;
  startType: string;
  startSchedule: string;
  puProvince: string;
  // 상차지 전체 주소 (예: 서울특별시 강남구 테헤란로 123)
  // 상차지 특정 명칭 (예: OO물류센터 A동 3번 도크) - 기사가 위치를 정확히 찾는 데 활용
  // 상차 방식 (예: 당상-당일 상차, 익상-다음날 상차, 야간상차)
  // 상차 예정 시간 (예: "2024-05-20 14:00" 또는 "오전 중")
  // 상차지 광역 자치단체명 (예: 서울, 경기, 부산) - 지역별 오더 필터링용

  endAddr: string;
  endPlace: string;
  endType: string;
  endSchedule: string;
  doProvince: string;
  // --- [하차지 정보: 물건을 내리는 곳] ---
  // 하차지 전체 주소 (예: 경기도 용인시 처인구 ...)
  // 하차지 특정 명칭 (예: XX빌딩 후문 하역장)
  // 하차 방식 (예: 당착-당일 도착, 내착-내일 도착)
  // 하차 예정 시간
  // 하차지 광역 자치단체명 (예: 경기, 강원, 전남)

  cargoContent?: string;
  loadMethod?: string;
  workType?: string;
  tonnage: number;
  reqCarType: string;
  reqTonnage: string;
  driveMode?: string;
  loadWeight?: number;
  // --- [화물 및 작업 세부 정보] ---
  // 화물 내용물 (예: 정밀 기계, 파레트 짐, 농산물 등)
  // 적재 방식 (예: 독차-차 한 대 전체 사용, 혼적-다른 짐과 같이 적재)
  // 상하차 작업 도구 (예: 지게차, 수작업, 크레인 등)
  // 화물 무게 단위 (예: 2.5 - 톤 단위)
  // 요청 차량 종류 (예: 카고, 윙바디, 냉동탑차, 라보 등)
  // 요청 차량 톤수 (예: 1톤, 5톤, 11톤 등)
  // 운행 모드 (예: 편도, 왕복, 경유 있음)
  // 실제 적재 중량 (Kg 단위 등 세부 수치)

  // --- [금액 및 결제 정보] ---
  // 기본 운송료 (거리 및 톤수 기준 표준 운임)
  // 결제 방식 (예: 신용카드, 계좌이체, 인수증/후불, 선불)
  basePrice: number;
  payMethod: string;
  laborFee?: number; // 수작업비 (기사님이 직접 상하차를 도울 경우 발생하는 수고비)
  packagingPrice?: number; // 포장비용 (물건 보호를 위한 래핑, 파레트 제공 등 실비)
  insuranceFee?: number; // 적재물 보험료 (고가 화물일 경우 추가되는 보험 비용)

  instant: boolean; // 즉시 배차 요청 여부 (true면 빠른 배차 우선 처리)

  distance: number;
  duration: number;
  // --- [시스템 계산 지표: 지도 API 연동 결과] ---
  // 예상 주행 거리 (단위: 미터 또는 킬로미터)
  // 예상 소요 시간 (단위: 초 또는 분)
}

/** * 오더 상세 응답 (OrderResponse.java 대응)
 */
export interface OrderResponse {
  orderId: number;
  status: OrderStatus;
  createdAt?: string; //
  updated?: string;
  // OrderSnapshot 대응 데이터

  startAddr: string;
  startPlace: string;
  startType: string;
  startSchedule: string;

  endAddr: string;
  endPlace: string;
  endType: string;
  endSchedule?: string;

  cargoContent: string;
  loadMethod?: string;
  workType?: string;
  tonnage: number;
  reqCarType: string;
  reqTonnage: string;
  driveMode?: string;
  loadWeight?: number;

  // 요금
  basePrice: number;
  laborFee?: number;
  packagingPrice?: number;
  insuranceFee?: number;
  payMethod: string;

  memo?: string;
  remark?: string;
  tag?: string[];
  instant: boolean; // 즉시 배차 요청 여부 (true면 빠른 배차 우선 처리)

  // 시스템 지표
  distance: number;
  duration: number;

  user?: UserSummary;
  cancellation?: CancellationSummary;
  applicantCount?: number;
}

export interface UserSummary {
  userId: number;
  email: string;
  phone: string;
  nickname: string;
  profileImage?: ImageInfo;
  ratingAvg?: number;
  age?: number;
  level?: number;
  role?: string;
}

export interface CancellationSummary {
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

/** 대시보드 데이터 모델 (차주 홈 화면용) */
export interface DriverDashboardResponse {
  monthlyExpectedIncome: number;
  incomeChangeRate: number;
  goalMessage: string;
  allocatedCount: number;
  drivingCount: number;
  pendingSettlementCount: number;
  recommendedOrders: OrderResponse[];
}

export interface AssignedDriverInfoResponse {
  // --- 유저(기사) 기본 정보 ---
  userId: number;
  email: string;
  nickname: string;
  phone: string;
  profileImage?: ImageInfo;
  ratingAvg: number; // 기사 평균 별점

  // --- 차주 전용 상세 정보 (Driver 엔티티 대응) ---
  driverId: number;
  carNum: string; // 차량 번호 (예: 80아 1234)
  carType: string; // 차종 (예: CARGO, WING)
  tonnage: string; // 차량 톤수 (예: 1t, 5t)
  career: number; // 경력 (년 단위)
  bankName?: string; // 정산용 은행명
  accountNum?: string; // 정산용 계좌번호
  type?: string; // 개별/용달/법인 구분
}


export interface MyRevenueResponse {
  totalAmount: number;    // 이번 달 총 수익
  receivedAmount: number; // 정산 완료 금액
  pendingAmount: number;  // 정산 예정 금액
  orders: OrderResponse[]; // 이번 달 오더 상세 목록
}