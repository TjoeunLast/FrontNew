import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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

  // 15초 카운트다운 숫자
  const [timeLeft, setTimeLeft] = useState(15);

  // 아이콘 회전을 위한 애니메이션 값
  const spinAnim = useRef(new Animated.Value(0)).current;

  // refreshing 상태가 바뀔 때 회전 애니메이션 제어
  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
      setTimeLeft(15); // 갱신 끝나면 타이머 리셋
    }
  }, [refreshing, spinAnim]);

  // 15초마다 자동 갱신 로직 (1초 카운트다운)
  useFocusEffect(
    useCallback(() => {
      if (refreshing) return; // 갱신 중엔 타이머 멈춤

      // 1초 타이머 설정
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            console.log("자동 갱신", new Date().toLocaleTimeString());
            onRefresh();
            return 15;
          }
          return prev - 1;
        });
      }, 1000); // 1000ms = 1초

      // 화면을 벗어나면 타이머 해제
      return () => clearInterval(timer);
    }, [onRefresh, refreshing]),
  );

  // 회전 애니메이션 보간
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <ShipperScreenHeader
        title="오더 목록"
        hideBackButton
        right={
          <Pressable
            onPress={() => Alert.alert("필터", "상세 필터 모달이 열립니다.")}
            style={s.headerFilterBtn}
          >
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={s.totalText}>
            총{" "}
            <Text style={{ color: c.brand.primary }}>
              {filteredOrders.length}
            </Text>
            건의 오더
          </Text>

          {/* 자동 갱신 카운트다운 및 회전 아이콘 (오더 갯수 옆) */}
          <Pressable
            style={s.refreshWrap}
            onPress={() => {
              if (!refreshing) {
                setTimeLeft(15);
                onRefresh();
              }
            }}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="refresh" size={14} color="#94A3B8" />
            </Animated.View>
            <Text style={s.refreshText}>
              {refreshing ? "업데이트 중" : `${timeLeft}`}
            </Text>
          </Pressable>
        </View>

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
  refreshWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  refreshText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
  },
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
