import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/shared/hooks/useAppTheme';
import { OrderService } from '@/shared/api/orderService';
import { OrderResponse, OrderStatus } from '@/shared/models/order';

export default function DrivingScreen() {
  const { colors: c } = useAppTheme();
  const [orders, setOrders] = useState<OrderResponse[]>([]); // 전체 목록 저장
  const [loadingId, setLoadingId] = useState<number | null>(null); // 특정 오더 로딩 상태
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<'APPLICATION' | 'DRIVING'>('APPLICATION'); // 탭 상태

  const fetchOrders = async () => {
    try {
      setIsFetching(true);
      const response = await OrderService.getMyDrivingOrders();
      setOrders(response || []);
    } catch (e) {
      console.error("데이터를 불러오지 못했습니다.", e);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // --- 탭별 필터링 로직 ---
  // 1. 신청 현황: 승인 대기(PENDING), 배차 완료(ACCEPTED)
  const applicationOrders = orders.filter(o => ['PENDING', 'ACCEPTED'].includes(o.status));
  
  // 2. 운행 현황: 상차중, 이동중, 하차중
  const drivingOrders = orders.filter(o => ['LOADING', 'IN_TRANSIT', 'UNLOADING'].includes(o.status));

  // 상태 업데이트 로직 (다음 단계로 진행)
  const handleStatusStep = async (order: OrderResponse) => {
    if (order.status === 'PENDING') {
      Alert.alert("취소 확인", "배차 신청을 취소하시겠습니까?", [
        { text: "아니오" },
        { text: "예", onPress: () => console.log("취소 API 호출 예정") }
      ]);
      return;
    }

    const nextStatusMap: Record<string, OrderStatus> = {
      'ACCEPTED': 'LOADING',
      'LOADING': 'IN_TRANSIT',
      'IN_TRANSIT': 'UNLOADING',
      'UNLOADING': 'COMPLETED'
    };

    const nextStatus = nextStatusMap[order.status];
    if (!nextStatus) return;

    try {
      setLoadingId(order.orderId);
      await OrderService.updateStatus(order.orderId, nextStatus);
      await fetchOrders(); // 목록 새로고침
      
      if (nextStatus === 'COMPLETED') {
        Alert.alert("운행 종료", "인수증 등록 화면으로 이동합니다.");
      }
    } catch (e) {
      Alert.alert("오류", "상태 업데이트에 실패했습니다.");
    } finally {
      setLoadingId(null);
    }
  };

  const getButtonLabel = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return "신청 취소";
      case 'ACCEPTED': return "상차지 도착";
      case 'LOADING': return "상차 완료";
      case 'IN_TRANSIT': return "하차지 도착";
      case 'UNLOADING': return "운행 종료";
      default: return "확인";
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return "승인 대기";
      case 'ACCEPTED': return "배차 완료";
      case 'LOADING': return "상차 중";
      case 'IN_TRANSIT': return "운행 중";
      case 'UNLOADING': return "하차 중";
      case 'COMPLETED': return "운행 완료";
      default: return status;
    }
  };

  const renderCard = (order: OrderResponse) => (
    <View key={order.orderId} style={[s.card, { backgroundColor: c.bg.surface }]}>
      <View style={s.topRow}>
        <View style={[s.badge, { backgroundColor: c.brand.primary + '10' }]}>
          <Text style={{ color: c.brand.primary, fontWeight: '700', fontSize: 12 }}>{order.status}</Text>
        </View>
        <Text style={{ color: c.text.secondary, fontSize: 12 }}>#{order.orderId}</Text>
      </View>

      <Text style={[s.routeText, { color: c.text.primary }]}>
        {order.startAddr} <Ionicons name="arrow-forward" size={16} /> {order.endAddr}
      </Text>

      <View style={s.infoSection}>
        <Text style={{ color: c.text.secondary, fontWeight: '700' }}>
          운행 현황: {getStatusLabel(order.status)}
        </Text>
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity style={[s.navBtn, { borderColor: c.border.default }]}>
          <Ionicons name="navigate-circle-outline" size={20} color={c.text.primary} />
          <Text style={{ marginLeft: 6, fontWeight: '600' }}>길안내</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[s.mainBtn, { backgroundColor: order.status === 'PENDING' ? c.text.secondary : c.text.primary }]}
          onPress={() => handleStatusStep(order)}
          disabled={loadingId === order.orderId}
        >
          {loadingId === order.orderId ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={s.mainBtnText}>{getButtonLabel(order.status)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isFetching) return <View style={s.center}><ActivityIndicator size="large" color={c.brand.primary} /></View>;

  return (
    <View style={[s.container, { backgroundColor: c.bg.canvas }]}>
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: c.text.primary }]}>운행 관리</Text>
      </View>

      {/* 탭 메뉴 */}
      <View style={s.tabBar}>
        <TouchableOpacity 
          onPress={() => setActiveTab('APPLICATION')}
          style={[s.tabItem, activeTab === 'APPLICATION' && { borderBottomColor: c.brand.primary, borderBottomWidth: 3 }]}
        >
          <Text style={[s.tabLabel, { color: activeTab === 'APPLICATION' ? c.brand.primary : c.text.secondary }]}>
            신청 현황 ({applicationOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('DRIVING')}
          style={[s.tabItem, activeTab === 'DRIVING' && { borderBottomColor: c.brand.primary, borderBottomWidth: 3 }]}
        >
          <Text style={[s.tabLabel, { color: activeTab === 'DRIVING' ? c.brand.primary : c.text.secondary }]}>
            운행 현황 ({drivingOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {activeTab === 'APPLICATION' ? (
          applicationOrders.length > 0 ? applicationOrders.map(renderCard) : (
            <View style={s.empty}><Text style={{ color: c.text.secondary }}>신청한 내역이 없습니다.</Text></View>
          )
        ) : (
          drivingOrders.length > 0 ? drivingOrders.map(renderCard) : (
            <View style={s.empty}><Text style={{ color: c.text.secondary }}>진행 중인 운행이 없습니다.</Text></View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 60, paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  tabLabel: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  card: { margin: 20, padding: 20, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  routeText: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  infoSection: { marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  actionRow: { flexDirection: 'row', gap: 12 },
  navBtn: { flex: 1, height: 50, borderWidth: 1, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  mainBtn: { flex: 1.5, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
