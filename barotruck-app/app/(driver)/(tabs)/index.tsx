import React, { useEffect, useState } from 'react';
import { Bell, MessageCircle } from 'lucide-react-native';

// React Native 기본 컴포넌트 임포트
import { View, Text, StyleSheet, ScrollView } from "react-native";
// 프로젝트 공통 UI 및 API 서비스, 타입 임포트
import { SHOrderCard } from '@/shared/ui/business'; // 오더 정보를 보여주는 공통 카드 컴포넌트
import { useAppTheme } from '@/shared/hooks/useAppTheme'; // 커스텀 테마 훅 (라이트/다크 모드 대응)
import { OrderService } from '@/shared/api/orderService'; // 백엔드 통신을 담당하는 서비스 객체
import { OrderResponse } from '@/shared/models/order'; // 오더 데이터의 타입 정의

export default function DriverHomeScreen() {
  // 1. 테마 및 상태 관리 설정
  const t = useAppTheme(); // 테마 객체 호출
  const c = t.colors;      // 테마의 색상 팔레트 추출
  const [orders, setOrders] = useState<OrderResponse[]>([]); // API로 받아올 오더 목록 상태

  // 2. 데이터 페칭 (컴포넌트 마운트 시 실행)
  useEffect(() => {
    // OrderController의 /api/v1/orders/recommended 엔드포인트를 호출
    OrderService.getRecommendedOrders()
      .then(setOrders)
      .catch(console.error);
  }, []);

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
            <SHOrderCard
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
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 60,
    paddingBottom: 20
  },
  logoText: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#4E46E5' // 브랜드 컬러에 맞춰 수정
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
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700'
  },
  incomeAmount: { 
    color: '#FFF', 
    fontSize: 32, // 강조를 위해 폰트 크기 확대
    fontWeight: '800', 
    marginBottom: 4 
  },
  incomeSub: {
    color: '#FFF',
    fontSize: 13,
    opacity: 0.7
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16
  },
  orderList: { 
    gap: 16
  }
});

