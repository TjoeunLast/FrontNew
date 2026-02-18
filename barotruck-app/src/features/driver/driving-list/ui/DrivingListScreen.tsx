import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator, // 로딩 표시용 추가
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useRouter } from "expo-router";

// [컴포넌트 및 로직 임포트]
import { PendingOrderCard } from "@/features/driver/shard/ui/PendingOrderCard";
import { ActiveOrderCard } from "@/features/driver/shard/ui/ActiveOrderCard";
import { DoneOrderCard } from "@/features/driver/shard/ui/DoneOrderCard";
import { useDrivingList } from "@/features/driver/driving-list/model/useDrivingList";
import { useDrivingProcess } from "@/features/driver/driving/model/useDrivingProcess";
import { ReceiptModal } from "@/features/driver/driving/ui/ReceiptModal";

export default function DrivingListScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();

  // [1] 데이터 및 탭 로직
  const {
    activeTab,
    setActiveTab,
    pendingOrders,
    activeOrders,
    completedOrders,
    loading,
  } = useDrivingList();

  // [2] 운행 프로세스 로직
  const { step, handleNextStep, modalOpen, setModalOpen, handleCancelOrder } =
    useDrivingProcess();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.canvas }}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View
        style={[
          s.header,
          { backgroundColor: "#FFF", borderBottomColor: c.border.default },
        ]}
      >
        <Text style={s.headerTitle}>운행 관리</Text>
      </View>

      {/* 탭 헤더 */}
      <View
        style={[
          s.tabHeader,
          { backgroundColor: "#FFF", borderBottomColor: c.border.default },
        ]}
      >
        {[
          { id: "READY", label: "배차", count: pendingOrders.length },
          { id: "ING", label: "운송 중", count: activeOrders.length },
          { id: "DONE", label: "완료", count: completedOrders.length },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id as any)}
            style={[s.tabItem, activeTab === tab.id && s.activeTab]}
          >
            <Text
              style={[
                s.tabText,
                activeTab === tab.id
                  ? s.activeText
                  : { color: c.text.secondary },
              ]}
            >
              {tab.label} ({tab.count})
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 데이터 로딩 중일 때 처리 */}
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={{ marginTop: 10, color: c.text.secondary }}>
            데이터를 불러오는 중입니다...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* 1. 배차 탭 */}
          {activeTab === "READY" &&
            pendingOrders.map((order) => (
              <PendingOrderCard
                key={order.orderId}
                order={order}
                onCancel={(id) => handleCancelOrder(Number(id))}
                onStart={() => setActiveTab("ING")}
                onDetail={(id) => router.push(`/(driver)/order-detail/${id}`)}
              />
            ))}

          {/* 2. 운송 중 탭 */}
          {activeTab === "ING" &&
            activeOrders.map((order) => (
              <ActiveOrderCard
                key={order.orderId}
                order={order}
                step={step}
                onNext={handleNextStep}
                onNav={() => router.push(`/(driver)/driving/${order.orderId}`)}
              />
            ))}

          {/* 3. 완료 탭 */}
          {activeTab === "DONE" &&
            completedOrders.map((order) => (
              <DoneOrderCard
                key={order.orderId}
                order={order}
                onDetail={(id) => router.push(`/(driver)/order-detail/${id}`)}
              />
            ))}

          {/* 데이터가 없을 때 표시 */}
          {activeTab === "READY" && pendingOrders.length === 0 && (
            <EmptyState text="배차 대기 중인 오더가 없습니다." />
          )}
          {activeTab === "ING" && activeOrders.length === 0 && (
            <EmptyState text="현재 진행 중인 운송이 없습니다." />
          )}
          {activeTab === "DONE" && completedOrders.length === 0 && (
            <EmptyState text="최근 완료된 운송 내역이 없습니다." />
          )}
        </ScrollView>
      )}

      <ReceiptModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </SafeAreaView>
  );
}

// 텅 빈 상태 공통 컴포넌트
const EmptyState = ({ text }: { text: string }) => (
  <View style={{ paddingVertical: 100, alignItems: "center" }}>
    <Text style={{ color: "#94A3B8", fontSize: 14 }}>{text}</Text>
  </View>
);

const s = StyleSheet.create({
  header: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  tabHeader: { flexDirection: "row", height: 50, borderBottomWidth: 1 },
  tabItem: { flex: 1, justifyContent: "center", alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#0F172A" },
  tabText: { fontSize: 14, fontWeight: "600" },
  activeText: { color: "#0F172A", fontWeight: "700" },
});
