import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { ListFilter, Search, RotateCcw } from 'lucide-react-native';
// 프로젝트 공통 컴포넌트 및 서비스 임포트
import { SHOrderCard } from '@/shared/ui/business';
import { useAppTheme } from '@/shared/hooks/useAppTheme';
import { OrderService } from '@/shared/api/orderService';
import { OrderResponse } from '@/shared/models/order';

export default function AvailableOrderListScreen() {
  const { colors: c } = useAppTheme();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 배차 가능한 전체 오더 목록 가져오기
  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      const data = await OrderService.getAvailableOrders();
      setOrders(data);
    } catch (e) {
      console.error("오더 목록 로드 실패:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: c.bg.canvas }]}>
      {/* 상단 헤더 및 필터 영역 */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>오더 찾기</Text>
          <Text style={[styles.headerSub, { color: c.text.secondary }]}>현재 배차 가능한 오더 {orders.length}건</Text>
        </View>
        <TouchableOpacity style={[styles.filterBtn, { borderColor: c.border.default }]}>
          <ListFilter size={20} color={c.text.primary} />
        </TouchableOpacity>
      </View>



      {/* 오더 리스트 영역 */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} tintColor={c.brand.primary} />
        }
      >
        {orders.length > 0 ? (
          <View style={styles.orderList}>
            {orders.map((order) => (
              <SHOrderCard
                key={order.orderId}
                {...order}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
          {/* quaternary 대신 secondary 사용 */}
          <RotateCcw size={48} color={c.text.secondary} /> 
          <Text style={[styles.emptyText, { color: c.text.secondary }]}>
            현재 주변에 올라온 오더가 없습니다.
          </Text>
          <TouchableOpacity onPress={fetchOrders} style={styles.retryBtn}>
            <Text style={{ color: c.brand.primary, fontWeight: '700' }}>새로고침</Text>
          </TouchableOpacity>
        </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF'
  },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  headerSub: { fontSize: 13, marginTop: 2 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: { 
    padding: 20,
    paddingBottom: 40
  },
  orderList: { gap: 16 },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
  },
  retryBtn: {
    marginTop: 12,
    padding: 10
  }
});
