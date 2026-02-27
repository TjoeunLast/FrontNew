import React, { useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useRouter, useLocalSearchParams } from "expo-router";

// [컴포넌트 및 로직 임포트]
import { PendingOrderCard } from "@/features/driver/shard/ui/PendingOrderCard";
import { ActiveOrderCard } from "@/features/driver/shard/ui/ActiveOrderCard";
import { DoneOrderCard } from "@/features/driver/shard/ui/DoneOrderCard";
import { useDrivingList } from "@/features/driver/driving-list/model/useDrivingList";
import { useDrivingProcess } from "@/features/driver/driving/model/useDrivingProcess";
import { ReceiptModal } from "@/features/driver/driving/ui/ReceiptModal";
import { Ionicons } from "@expo/vector-icons";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

export default function DrivingListScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();

  // 외부에서 넘어온 탭 전환 파라미터 수신
  const params = useLocalSearchParams<{ initialTab?: string }>();

  // 데이터 로드 및 탭 상태 관리
  const {
    activeTab, // 현재 탭 상태
    setActiveTab, // 탭을 변경하는 함수
    pendingOrders, // 서버에서 받은 원본 데이터
    activeOrders,
    completedOrders,
    loading, // 데이터를 가져오는 중인지 나타내는 상태
    refresh, // 데이터를 다시 불러오는 함수\
    // myLocation, // 내 위치 정보
  } = useDrivingList();

  // 운행 프로세스 로직 (취소, 상태변경, 모달 등)
  const {
    handleCancelOrder,
    handleStartTransport,
    handleUpdateStatus,
    modalOpen,
    setModalOpen,
  } = useDrivingProcess(refresh);

  // 외부 파라미터 수신 시 탭 자동 전환 로직
  useEffect(() => {
    if (params.initialTab) {
      const tabMapping: Record<string, string> = {
        READY: "READY",
        ONGOING: "ING",
        DONE: "DONE",
      };

      const targetTab = tabMapping[params.initialTab];
      if (targetTab) {
        setActiveTab(targetTab as any);
      }
    }
  }, [params.initialTab]); // initialTab 값이 바뀔 때마다 실행

  // 데이터 분리 및 정렬 로직
  const orders = useMemo(() => {
    // 배차 탭 분리
    const accepted = pendingOrders.filter((o) => o.status === "ACCEPTED"); // 배차 확정
    const applied = pendingOrders.filter((o) => o.status === "APPLIED"); // 승인 대기

    // 완료 탭 분리 (정산 완료 vs 정산 대기)
    const settled = completedOrders.filter(
      (o) => o.settlementStatus === "COMPLETED",
    ); // 정산 완료
    const waiting = completedOrders.filter(
      (o) => o.settlementStatus !== "COMPLETED",
    ); // 정산 대기

    return { accepted, applied, settled, waiting };
  }, [pendingOrders, completedOrders]); // 원본 데이터가 바뀔 때만 다시 계산

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar barStyle="dark-content" />
      <ShipperScreenHeader title="운행 관리" hideBackButton />

      {/* 탭 메뉴 */}
      <View style={[s.tabHeader, { borderBottomColor: c.border.default }]}>
        {[
          { id: "READY", label: "배차", count: pendingOrders.length },
          { id: "ING", label: "운송 중", count: activeOrders.length },
          { id: "DONE", label: "완료", count: completedOrders.length },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id as any)} // 클릭 시 해당 탭으로 상태 변경
            style={[s.tabItem, activeTab === tab.id && s.activeTab]} // 선택된 탭에만 밑줄 표시
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

      {/* 메인 리스트 영역 */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2F4B" />
          <Text style={s.loadingText}>데이터를 불러오는 중입니다...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* 1. 배차 탭 */}
          {activeTab === "READY" && (
            <>
              {orders.accepted.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <View
                      style={[s.indicator, { backgroundColor: c.status.info }]}
                    />
                    <Text style={[s.sectionTitle, { color: c.status.info }]}>
                      확정된 운행 ({orders.accepted.length})
                    </Text>
                  </View>
                  {orders.accepted.map((order) => (
                    <PendingOrderCard
                      key={order.orderId}
                      order={order}
                      // myLocation={myLocation}
                      onStart={handleStartTransport} // 운송 시작 액션 연결
                      onDetail={(id: number) =>
                        router.push(`/(driver)/order-detail/${id}`)
                      }
                    />
                  ))}
                </View>
              )}

              {orders.applied.length > 0 && (
                <View style={[s.section, { marginTop: 24 }]}>
                  <View style={s.sectionHeader}>
                    <View
                      style={[
                        s.indicator,
                        { backgroundColor: c.status.warning },
                      ]}
                    />
                    <Text style={[s.sectionTitle, { color: c.status.warning }]}>
                      승인 대기 중 ({orders.applied.length})
                    </Text>
                  </View>
                  {orders.applied.map((order) => (
                    <PendingOrderCard
                      key={order.orderId}
                      order={order}
                      // myLocation={myLocation}
                      onCancel={handleCancelOrder}
                      onDetail={(id: number) =>
                        router.push(`/(driver)/order-detail/${id}`)
                      }
                    />
                  ))}
                </View>
              )}
              {pendingOrders.length === 0 && (
                <EmptyState text="현재 진행 중인 오더가 없습니다." />
              )}
            </>
          )}

          {/* 2. 운송 중 탭 */}
          {activeTab === "ING" &&
            (activeOrders.length > 0 ? (
              activeOrders.map((order) => (
                <ActiveOrderCard
                  key={order.orderId}
                  order={order}
                  onNext={handleUpdateStatus}
                  onNav={() =>
                    router.push(`/(driver)/driving/${order.orderId}`)
                  }
                  onDetail={(id: number) =>
                    router.push(`/(driver)/order-detail/${id}`)
                  }
                />
              ))
            ) : (
              <EmptyState text="현재 진행 중인 운송이 없습니다." />
            ))}

          {/* 3. 완료 탭 (섹션 분리 구조) */}
          {activeTab === "DONE" && (
            <>
              {/* 정산 대기 섹션 */}
              {orders.waiting.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <View
                      style={[
                        s.indicator,
                        { backgroundColor: c.status.warning },
                      ]}
                    />
                    <Text style={[s.sectionTitle, { color: c.status.warning }]}>
                      정산 대기 중 ({orders.waiting.length})
                    </Text>
                  </View>
                  {orders.waiting.map((order) => (
                    <DoneOrderCard
                      key={order.orderId}
                      order={order}
                      onDetail={(id: number) =>
                        router.push(`/(driver)/order-detail/${id}`)
                      }
                    />
                  ))}
                </View>
              )}

              {/* 정산 완료 섹션 */}
              {orders.settled.length > 0 && (
                <View
                  style={[
                    s.section,
                    orders.waiting.length > 0 && { marginTop: 24 },
                  ]}
                >
                  <View style={s.sectionHeader}>
                    <View
                      style={[
                        s.indicator,
                        { backgroundColor: c.status.success },
                      ]}
                    />
                    <Text style={[s.sectionTitle, { color: c.status.success }]}>
                      정산 완료 ({orders.settled.length})
                    </Text>
                  </View>
                  {orders.settled.map((order) => (
                    <DoneOrderCard
                      key={order.orderId}
                      order={order}
                      onDetail={(id: number) =>
                        router.push(`/(driver)/order-detail/${id}`)
                      }
                    />
                  ))}
                </View>
              )}

              {completedOrders.length === 0 && (
                <EmptyState text="최근 완료된 운송 내역이 없습니다." />
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* 모달 */}
      <ReceiptModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </View>
  );
}

const EmptyState = ({ text }: { text: string }) => (
  <View style={s.emptyContainer}>
    <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
    <Text style={s.emptyText}>{text}</Text>
  </View>
);

const s = StyleSheet.create({
  tabHeader: {
    flexDirection: "row",
    height: 50,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
  },
  section: { marginBottom: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 4,
  },
  indicator: {
    width: 4,
    height: 14,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  tabItem: { flex: 1, justifyContent: "center", alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#1A2F4B" },
  tabText: { fontSize: 14, fontWeight: "600" },
  activeText: { color: "#1A2F4B", fontWeight: "800" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 14 },
  emptyContainer: { paddingVertical: 100, alignItems: "center" },
  emptyText: { color: "#94A3B8", fontSize: 14, marginTop: 12 },
});
