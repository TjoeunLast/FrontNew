// src/features/driver/driving-list/ui/DrivingListScreen.tsx
import React, { useState } from "react";
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
import { DrivingOrderCard } from "@/features/driver/shard/ui/DrivingOrderCard";
import { StatusStepCard } from "./StatusStepCard";
import { ReceiptModal } from "./ReceiptModal";
import { useDrivingProcess } from "../model/useDrivingProcess";
import { MOCK_ORDERS } from "@/shared/mockData"; // 목업 데이터 로드
import { Feather } from "@expo/vector-icons";

export default function DrivingListScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"READY" | "ING" | "DONE">("READY");
  const { step, modalOpen, setModalOpen, handleNextStep } = useDrivingProcess();

  // 데이터 필터링
  const readyOrders = MOCK_ORDERS.filter(
    (o) => o.status === "REQUESTED" || o.status === "ACCEPTED",
  );
  const ingOrders = MOCK_ORDERS.filter((o) => o.status === "IN_TRANSIT");
  const doneOrders = MOCK_ORDERS.filter((o) => o.status === "COMPLETED");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.surface }}>
      <StatusBar barStyle="dark-content" />

      <View style={[s.header, { borderBottomColor: c.border.default }]}>
        <Text style={s.headerTitle}>운행 관리</Text>
      </View>

      {/* 3단 서브 탭 */}
      <View style={[s.tabBar, { borderBottomColor: c.border.default }]}>
        <Pressable
          onPress={() => setActiveTab("READY")}
          style={[s.tabItem, activeTab === "READY" && s.activeTab]}
        >
          <Text
            style={[
              s.tabText,
              {
                color:
                  activeTab === "READY" ? c.text.primary : c.text.secondary,
              },
            ]}
          >
            배차 ({readyOrders.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("ING")}
          style={[s.tabItem, activeTab === "ING" && s.activeTab]}
        >
          <Text
            style={[
              s.tabText,
              {
                color: activeTab === "ING" ? c.text.primary : c.text.secondary,
              },
            ]}
          >
            운송 중 ({ingOrders.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("DONE")}
          style={[s.tabItem, activeTab === "DONE" && s.activeTab]}
        >
          <Text
            style={[
              s.tabText,
              {
                color: activeTab === "DONE" ? c.text.primary : c.text.secondary,
              },
            ]}
          >
            완료 ({doneOrders.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg.canvas }}
        contentContainerStyle={{ padding: 20 }}
      >
        {/* 1. 배차 탭: 대기(주황)와 확정(흰색)이 공존 */}
        {activeTab === "READY" &&
          readyOrders.map((order) => (
            <DrivingOrderCard
              key={order.orderId}
              order={order}
              onDetail={() =>
                router.push(`/(driver)/order-detail/${order.orderId}`)
              }
              onStart={() => setActiveTab("ING")} // 테스트용: 운송 중 탭으로 이동
            />
          ))}

        {/* 2. 운송 중 탭: 현재 진행 오더 및 목록 */}
        {activeTab === "ING" && (
          <>
            <StatusStepCard step={step} onNext={handleNextStep} />
            {ingOrders.map((order) => (
              <DrivingOrderCard
                key={order.orderId}
                order={order}
                onDetail={() =>
                  router.push(`/(driver)/order-detail/${order.orderId}`)
                }
              />
            ))}
          </>
        )}

        {/* 3. 완료 탭 */}
        {activeTab === "DONE" &&
          doneOrders.map((order) => (
            <DrivingOrderCard
              key={order.orderId}
              order={order}
              onDetail={() =>
                router.push(`/(driver)/order-detail/${order.orderId}`)
              }
            />
          ))}
      </ScrollView>

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
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  tabBar: {
    flexDirection: "row",
    height: 50,
    borderBottomWidth: 1,
    backgroundColor: "#FFF",
  },
  tabItem: { flex: 1, justifyContent: "center", alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#0F172A" },
  tabText: { fontSize: 15, fontWeight: "600" },
});
