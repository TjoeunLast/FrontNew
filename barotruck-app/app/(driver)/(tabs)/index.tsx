import {
  Bell,
  Box,
  CheckCircle2,
  ClipboardCheck,
  MessageCircle,
  Truck,
} from "lucide-react-native";
import { useState } from "react";

// React Native 기본 컴포넌트 임포트
import { ScrollView, StyleSheet, Text, View } from "react-native";
// 프로젝트 공통 UI 및 API 서비스, 타입 임포트
import { useAppTheme } from "@/shared/hooks/useAppTheme"; // 커스텀 테마 훅 (라이트/다크 모드 대응)
import { OrderResponse } from "@/shared/models/order"; // 오더 데이터의 타입 정의
import { Card } from "@/shared/ui/base/Card"; // 카드 컴포넌트
import { OrderCard } from "@/shared/ui/business"; // 오더 정보를 보여주는 공통 카드 컴포넌트

export default function DriverHomeScreen() {
  // 1. 테마 및 상태 관리 설정
  const t = useAppTheme(); // 테마 객체 호출
  const c = t.colors;      // 테마의 색상 팔레트 추출
  const [orders, setOrders] = useState<OrderResponse[]>([]); // API로 받아올 오더 목록 상태

  // 2. 데이터 페칭 (컴포넌트 마운트 시 실행)
  // useEffect(() => {
  //   // OrderController의 /api/v1/orders/recommended 엔드포인트를 호출
  //   OrderService.getRecommendedOrders().then(setOrders).catch(console.error);
  // }, []);

  // 1. 목업 데이터 정의 (OrderResponse 인터페이스 완벽 대응)
  const mockOrders: OrderResponse[] = [
    {
      orderId: 1,
      status: "PENDING",
      createdAt: "2026-02-11",
      updated: "2026-02-11",
      isInstant: true,

      // 상차지 정보
      startAddr: "경기 수원시 영통구 매탄동",
      startPlace: "삼성전자 물류센터",
      startType: "당상",
      startSchedule: "오늘 14:00",

      // 하차지 정보
      endAddr: "부산 강서구 대저동",
      endPlace: "강서 유통단지",
      endType: "당착",
      endSchedule: "오늘 19:30",

      // 화물 및 차량 정보
      cargoContent: "정밀 전자부품 (파레트)",
      loadMethod: "독차",
      workType: "지게차",
      tonnage: 11,
      reqCarType: "윙바디",
      reqTonnage: "11톤",
      driveMode: "편도",
      loadWeight: 8500,

      // 요금 정보
      basePrice: 420000,
      laborFee: 0,
      packagingPrice: 0,
      insuranceFee: 5000,
      payMethod: "인수증/후불",

      // 시스템 지표
      distance: 340,
      duration: 18000, // 약 5시간 (초 단위 예시)
      remark: "요청사항",

      // 유저 정보 (필요시)
      user: {
        userId: 101,
        email: "shipper01@example.com",
        phone: "010-1234-5678",
        nickname: "광교물류",
      },
    },
    {
      orderId: 2,
      status: "REQUESTED",
      createdAt: "2026-02-11",
      isInstant: false,

      startAddr: "서울 강동구 성내동",
      startPlace: "성내동 개인주택",
      startType: "익상",
      startSchedule: "내일 09:00",

      endAddr: "강원 원주시 지정면",
      endPlace: "지정면 물류창고",
      endType: "내착",
      endSchedule: "내일 11:00",

      cargoContent: "가공식품 (박스)",
      loadMethod: "혼적",
      workType: "수작업",
      tonnage: 5,
      reqCarType: "카고",
      reqTonnage: "5톤",
      driveMode: "왕복",

      basePrice: 150000,
      laborFee: 30000, // 수작업비 발생
      packagingPrice: 10000,
      payMethod: "현금/선불",
      remark: "요청사항",

      distance: 85,
      duration: 5400, // 1.5시간
    },
  ];

  // 2. 상태 관리 (초기값을 mockOrders로 설정)
  const [orders, setOrders] = useState<OrderResponse[]>(mockOrders);

  return (
    <View style={[styles.container, { backgroundColor: c.bg.canvas }]}>
      
      {/* --- 상단 헤더 영역 --- */}
      <View style={styles.header}>
        <Text style={styles.logoText}>BARO</Text>
        <View style={styles.headerIcons}>
          <MessageCircle size={24} color={c.text.primary} />
          <Bell size={24} color={c.text.primary} />
        </View>
      </View>

      {/* --- 스크롤 가능한 메인 콘텐츠 영역 --- */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 수정된 수익 요약 카드 (하드코딩 데이터 적용) */}
        <View style={[styles.incomeCard, { backgroundColor: c.brand.primary }]}>
          <View style={styles.incomeHeader}>
            <Text style={styles.incomeTitle}>2월 예상 수익</Text>
            {/* 상승률 뱃지 추가 */}
            <View style={styles.incomeBadge}>
              <Text style={styles.incomeBadgeText}>+8.5%</Text>
            </View>
          </View>
          
          <Text style={styles.incomeAmount}>3,540,000원</Text>
          
          {/* 하단 목표 메시지 추가 */}
          <Text style={styles.incomeSub}>목표 달성까지 46만원 남았어요!</Text>
        </View>

        {/* --- 추천 오더 리스트 영역 --- */}
        <View style={styles.orderList}>
          <Text style={[styles.sectionTitle, { color: c.text.primary }]}>맞춤 추천 오더</Text>
          {orders.map((order) => (
            <OrderCard
              key={order.orderId}
              {...order}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// 스타일 정의
const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#4E46E5",
  },
  headerIcons: { 
    flexDirection: 'row', 
    gap: 15 
  },
  scrollContent: { 
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  incomeCard: { 
    padding: 24, 
    borderRadius: 24, // 조금 더 부드러운 라운드 적용
    marginBottom: 24,
    // 그림자 효과 추가
    elevation: 8,
    shadowColor: '#4E46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  incomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  incomeTitle: { 
    color: '#FFF', 
    opacity: 0.9,
    fontSize: 14,
    fontWeight: '500'
  },
  incomeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  incomeBadgeText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  incomeFooter: {
    marginTop: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 3,
    marginBottom: 10,
    overflow: "hidden",
  },
  incomeAmount: { 
    color: '#FFF', 
    fontSize: 32, // 강조를 위해 폰트 크기 확대
    fontWeight: '800', 
    marginBottom: 4 
  },
  incomeSub: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 24,
  },
  orderList: {
    // gap: 16,
  },
  dashboardContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    flexWrap: "wrap",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    marginBottom: 0,
    marginHorizontal: 4,
    minWidth: 0,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },
  statusDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  orderList: { 
    gap: 16
  }
});
