import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useRouter } from "expo-router";

// [카드 부품 임포트]
import { PendingOrderCard } from "@/features/driver/shard/ui/PendingOrderCard";
import { ActiveOrderCard } from "@/features/driver/shard/ui/ActiveOrderCard";
import { DoneOrderCard } from "@/features/driver/shard/ui/DoneOrderCard";

// [로직 및 모달 임포트]
import { useDrivingList } from "../model/useDrivingList";
import { useDrivingProcess } from "@/features/driver/driving/model/useDrivingProcess";
import { ReceiptModal } from "@/features/driver/driving/ui/ReceiptModal";

export default function DrivingListScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();

  // 탭 및 데이터 로직
  const {
    activeTab,
    setActiveTab,
    pendingOrders,
    activeOrders,
    completedOrders,
  } = useDrivingList();

  // 운행 상태 및 인수증 모달 로직
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

      {/* 탭 헤더 (3단 구성) */}
      <View
        style={[
          s.tabHeader,
          { backgroundColor: "#FFF", borderBottomColor: c.border.default },
        ]}
      >
        <Pressable
          onPress={() => setActiveTab("READY")}
          style={[s.tabItem, activeTab === "READY" && s.activeTab]}
        >
          <Text
            style={[
              s.tabText,
              activeTab === "READY"
                ? s.activeText
                : { color: c.text.secondary },
            ]}
          >
            배차 ({pendingOrders.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("ING")}
          style={[s.tabItem, activeTab === "ING" && s.activeTab]}
        >
          <Text
            style={[
              s.tabText,
              activeTab === "ING" ? s.activeText : { color: c.text.secondary },
            ]}
          >
            운송 중 ({activeOrders.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("DONE")}
          style={[s.tabItem, activeTab === "DONE" && s.activeTab]}
        >
          <Text
            style={[
              s.tabText,
              activeTab === "DONE" ? s.activeText : { color: c.text.secondary },
            ]}
          >
            완료 ({completedOrders.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* 1. 배차 탭 */}
        {activeTab === "READY" &&
          pendingOrders.map((order) => (
            <PendingOrderCard
              key={order.orderId}
              order={order}
              onCancel={(id: string) => handleCancelOrder(Number(id))}
              onStart={() => {
                setActiveTab("ING");
                console.log(`${order.orderId}번 배차 운송 시작!`);
              }}
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
              // 운송 중 카드에서도 상세(길 안내) 페이지로 연결 가능
              onNav={() => router.push(`/(driver)/driving/${order.orderId}`)}
            />
          ))}

        {/* 3. 완료 탭 */}
        {activeTab === "DONE" &&
          completedOrders.map((order) => (
            <DoneOrderCard
              key={order.orderId}
              order={order}
              onDetail={(id: string) =>
                router.push(`/(driver)/order-detail/${id}`)
              }
            />
          ))}
      </ScrollView>

      {/* 하차 완료 버튼 클릭 시 뜨는 모달 */}
      <ReceiptModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </SafeAreaView>
  );
}

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
