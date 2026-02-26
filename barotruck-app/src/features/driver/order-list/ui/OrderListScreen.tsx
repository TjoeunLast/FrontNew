import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { DrOrderCard } from "@/features/driver/shard/ui/DrOrderCard";
import { useOrderList } from "../model/useOrderList";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

export default function OrderListScreen() {
  const { colors: c } = useAppTheme();

  const {
    filteredOrders, // 필터와 정렬이 적용된 최종 오더 리스트
    loading,
    refreshing,
    onRefresh,
    filter, // 배차 유형
    setFilter,
    sortBy, // 정렬 기준
    setSortBy,
    myLocation,
  } = useOrderList();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <ShipperScreenHeader
        title="오더 목록"
        hideBackButton
        right={
          <Pressable onPress={() => Alert.alert("필터", "상세 필터 모달이 열립니다.")} style={s.headerFilterBtn}>
            <Ionicons name="options-outline" size={24} color={c.text.primary} />
          </Pressable>
        }
      />

      {/* 필터 탭 (4개 항목으로 정리) */}
      <View style={s.filterWrapper}>
        <View style={s.tabContainer}>
          <TabChip
            label="전체"
            active={filter.dispatchType === "ALL"}
            onPress={() => setFilter({ ...filter, dispatchType: "ALL" })}
          />
          <TabChip
            label="추천"
            active={filter.dispatchType === "RECOMMENDED"}
            onPress={() =>
              setFilter({ ...filter, dispatchType: "RECOMMENDED" })
            }
            isRecommend
          />
          <TabChip
            label="바로배차"
            active={filter.dispatchType === "INSTANT"}
            onPress={() => setFilter({ ...filter, dispatchType: "INSTANT" })}
          />
          <TabChip
            label="직접배차"
            active={filter.dispatchType === "DIRECT"}
            onPress={() => setFilter({ ...filter, dispatchType: "DIRECT" })}
          />
        </View>
      </View>

      {/* 목롤 요약 및 정렬 */}
      <View style={s.listInfoRow}>
        <Text style={s.totalText}>
          총{" "}
          <Text style={{ color: c.brand.primary }}>
            {filteredOrders.length}
          </Text>
          건의 오더
        </Text>
        <View style={s.sortContainer}>
          <SortButton
            label="최신순"
            active={sortBy === "LATEST"}
            onPress={() => setSortBy("LATEST")}
          />
          <SortButton
            label="단가순"
            active={sortBy === "PRICE_HIGH"}
            onPress={() => setSortBy("PRICE_HIGH")}
          />
          <SortButton
            label="가까운순"
            active={sortBy === "NEARBY"}
            onPress={() => setSortBy("NEARBY")}
          />
        </View>
      </View>

      {/* 오더 리스트 */}
      {loading && !refreshing ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1A2F4B" size="large" />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => (
            <DrOrderCard order={item} myLocation={myLocation} />
          )}
          keyExtractor={(item) => item.orderId.toString()}
          contentContainerStyle={s.listPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>해당하는 오더가 없습니다.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const TabChip = ({ label, active, onPress, isRecommend }: any) => (
  <Pressable
    style={[
      s.chip,
      active && (isRecommend ? s.activeRecommendChip : s.activeChip),
      isRecommend && !active && { borderColor: "#E0E7FF" },
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        s.chipText,
        active
          ? { color: "#FFF" }
          : isRecommend
            ? { color: "#4E46E5" }
            : { color: "#0F172A" },
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const SortButton = ({ label, active, onPress }: any) => (
  <Pressable onPress={onPress} style={s.sortBtn}>
    <Text style={[s.sortBtnText, active && { color: "#1A2F4B" }]}>{label}</Text>
    {active && <View style={s.activeDot} />}
  </Pressable>
);

const s = StyleSheet.create({
  headerFilterBtn: { padding: 4 },
  filterWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeChip: { backgroundColor: "#1A2F4B", borderColor: "#1A2F4B" },
  activeRecommendChip: { backgroundColor: "#4E46E5", borderColor: "#4E46E5" },
  chipText: { fontSize: 15, fontWeight: "700" },
  listInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  totalText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  sortContainer: { flexDirection: "row" },
  sortBtn: { marginLeft: 16, alignItems: "center" },
  sortBtnText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1A2F4B",
    marginTop: 4,
  },
  listPadding: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#94A3B8", fontSize: 15 },
});
