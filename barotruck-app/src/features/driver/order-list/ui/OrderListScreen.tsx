import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { DrOrderCard } from "@/features/driver/shard/ui/DrOrderCard";
import { useOrderList } from "../model/useOrderList";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function OrderListScreen() {
  const { colors: c } = useAppTheme();

  const {
    filteredOrders,
    loading,
    refreshing,
    onRefresh,
    filter,
    setFilter,
    sortBy,
    setSortBy,
  } = useOrderList();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
      {/* HEADER */}
      <View style={[s.header, { borderBottomColor: c.border.default }]}>
        <Text style={s.headerTitle}>오더 목록</Text>
      </View>

      {/* FILTER BAR */}
      <View style={s.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
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

          <View style={s.divider} />

          <FilterSelectChip label={filter.region} />
          <FilterSelectChip label={filter.tonnage} />
          <FilterSelectChip label={filter.carType} />
        </ScrollView>
      </View>

      {/* LIST INFO & SORTING */}
      <View style={s.listInfoRow}>
        <Text style={s.totalText}>
          총 <Text style={{ color: "#4E46E5" }}>{filteredOrders.length}</Text>
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

      {/* ORDER LIST AREA */}
      {loading && !refreshing ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1A2F4B" size="large" />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => <DrOrderCard order={item} />}
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
    </SafeAreaView>
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

const FilterSelectChip = ({ label }: { label: string }) => (
  <View style={s.selectChip}>
    <Text style={s.selectChipText}>{label}</Text>
    <Ionicons
      name="chevron-down"
      size={12}
      color="#94A3B8"
      style={{ marginLeft: 4 }}
    />
  </View>
);

const SortButton = ({ label, active, onPress }: any) => (
  <Pressable onPress={onPress} style={s.sortBtn}>
    <Text style={[s.sortBtnText, active && { color: "#1A2F4B" }]}>{label}</Text>
    {active && <View style={s.activeDot} />}
  </Pressable>
);

const s = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  headerIcons: { flexDirection: "row" },
  filterWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterScroll: { paddingHorizontal: 20, alignItems: "center" },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  activeChip: { backgroundColor: "#1A2F4B", borderColor: "#1A2F4B" },
  activeRecommendChip: { backgroundColor: "#4E46E5", borderColor: "#4E46E5" },
  chipText: { fontSize: 15, fontWeight: "700" },
  selectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  selectChipText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
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
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 10,
  },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#94A3B8", fontSize: 15 },
});
