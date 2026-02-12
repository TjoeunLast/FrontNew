import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import OrderCard from "@/shared/ui/business/OrderCard";

// 1. 필터 옵션 정의
const FILTER_OPTIONS = [
  { id: "isInstant", label: "바로배차" },
  { id: "isDirect", label: "직접배차" },
  { id: "seoul", label: "서울" },
  { id: "gyeonggi", label: "경기" },
  { id: "wingbody", label: "윙바디" },
];

const MOCK_ORDERS: any[] = [
  {
    orderId: 2491,
    status: "WAITING", // [변경] 배차대기
    createdAt: "2026-02-12T14:00:00Z",
    updated: "2026-02-12T14:05:00Z",
    isInstant: true,
    isDirect: false,

    // 상차지 정보
    startAddr: "경기 평택시 포승읍 만호리 123",
    startPlace: "포승물류센터 A동 3번 도크",
    startType: "당상",
    startSchedule: "오늘 14:00",

    // 하차지 정보
    endAddr: "부산 강서구 신항남로 99",
    endPlace: "부산신항 2부두 하역장",
    endType: "내착",
    endSchedule: "내일 오전 09:00",

    // 화물 및 작업 세부 정보
    cargoContent: "전자제품 (파레트 짐)",
    loadMethod: "독차",
    workType: "지게차",
    tonnage: 11.0,
    reqCarType: "윙바디",
    reqTonnage: "11톤",
    driveMode: "편도",
    loadWeight: 8500,
    remark: "상차지 진입 시 정문에서 오더번호 확인 필수입니다.",

    // 요금 정보
    basePrice: 450000,
    laborFee: 0,
    packagingPrice: 0,
    insuranceFee: 5000,
    payMethod: "인수증 후불",

    // 시스템 지표
    distance: 385,
    duration: 16200,

    user: { name: "화주A", rating: 4.8 },
    cancellation: null,
  },
  {
    orderId: 2495,
    status: "CONFIRMED",
    createdAt: "2026-02-12T15:00:00Z",
    updated: "2026-02-12T15:02:00Z",
    isInstant: false,
    isDirect: true,

    startAddr: "인천 남동구 고잔동 456",
    startPlace: "남동공단 2단지 (주)대항",
    startType: "당상",
    startSchedule: "오늘 17:00",

    endAddr: "충남 천안시 서북구 번영로",
    endPlace: "천안 제3산단 물류창고",
    endType: "당착",
    endSchedule: "오늘 19:30",

    cargoContent: "자동차 부품용 금형",
    loadMethod: "독차",
    workType: "크레인",
    tonnage: 5.0,
    reqCarType: "카고",
    reqTonnage: "5톤",
    driveMode: "편도",
    loadWeight: 4800,
    remark: "하차지 크레인 작업 대기 발생할 수 있음",

    basePrice: 180000,
    laborFee: 30000,
    packagingPrice: 0,
    insuranceFee: 10000,
    payMethod: "선불 (계좌이체)",

    distance: 92,
    duration: 5400,

    user: { name: "화주B", rating: 4.5 },
    cancellation: null,
  },
  {
    orderId: 2498,
    status: "DRIVING", // [변경] 운행중
    createdAt: "2026-02-12T15:10:00Z",
    updated: "2026-02-12T15:10:00Z",
    isInstant: false,
    isDirect: true,

    startAddr: "서울 강서구 양천로 12",
    startPlace: "마곡역 3번 출구 인근",
    startType: "당상",
    startSchedule: "오늘 18:00",

    endAddr: "경기 고양시 일산동구 백석로",
    endPlace: "백석 유통단지 B동",
    endType: "당착",
    endSchedule: "오늘 20:00",

    cargoContent: "사무용 의자 및 가구",
    loadMethod: "혼적",
    workType: "수작업",
    tonnage: 1.0,
    reqCarType: "카고",
    reqTonnage: "1톤",
    driveMode: "왕복",
    loadWeight: 800,
    remark: "수작업 도움 필요 (엘리베이터 있음)",

    basePrice: 85000,
    laborFee: 40000,
    packagingPrice: 10000,
    insuranceFee: 0,
    payMethod: "현금 지불",

    distance: 22,
    duration: 3600,

    user: { name: "화주C", rating: 4.2 },
    cancellation: null,
  },
];

export default function OrdersScreen() {
  const { colors: c } = useAppTheme();
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortType, setSortType] = useState("최신순");

  // 필터 추가/삭제 토글 함수
  const toggleFilter = (filterId: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId],
    );
  };

  /**
   * 필터 및 정렬된 데이터 계산 (로직 강화)
   */
  const filteredOrders = useMemo(() => {
    let list = [...MOCK_ORDERS];

    // 1. 필터링 적용
    if (selectedFilters.length > 0) {
      list = list.filter((order) => {
        return selectedFilters.every((id) => {
          if (id === "isInstant") return order.isInstant;
          if (id === "isDirect") return order.isDirect;
          if (id === "seoul") return order.startAddr.includes("서울");
          if (id === "gyeonggi") return order.startAddr.includes("경기");
          if (id === "wingbody") return order.reqCarType === "윙바디";
          return true;
        });
      });
    }

    // 2. 정렬 적용
    if (sortType === "최신순") {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sortType === "가까운순") {
      list.sort((a, b) => a.distance - b.distance);
    }

    return list;
  }, [selectedFilters, sortType]);

  return (
    <View style={[s.container, { backgroundColor: "#F8FAFC" }]}>
      {/* --- 상단 헤더 --- */}
      <View style={s.header}>
        <Text style={s.logoText}>오더 목록</Text>
        <View style={s.headerIcons}>
          <Pressable style={s.iconBtn}>
            <Ionicons name="chatbubble-outline" size={24} color="#1E293B" />
          </Pressable>
          <Pressable style={s.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color="#1E293B" />
          </Pressable>
        </View>
      </View>

      {/* --- 필터 선택 영역 --- */}
      <View style={s.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          <Pressable
            style={[
              s.filterBadge,
              selectedFilters.length === 0 && s.filterBadgeActive,
            ]}
            onPress={() => setSelectedFilters([])}
          >
            <Text
              style={[
                s.filterText,
                selectedFilters.length === 0 && { color: "#fff" },
              ]}
            >
              전체
            </Text>
          </Pressable>
          {FILTER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => toggleFilter(opt.id)}
              style={[
                s.filterBadge,
                selectedFilters.includes(opt.id) && s.filterBadgeActive,
              ]}
            >
              <Text
                style={[
                  s.filterText,
                  selectedFilters.includes(opt.id) && { color: "#fff" },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* --- 선택된 필터 칩 리스트 (삭제 가능) --- */}
      {selectedFilters.length > 0 && (
        <View style={s.chipWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipScroll}
          >
            {selectedFilters.map((id) => (
              <View key={id} style={s.activeChip}>
                <Text style={s.activeChipText}>
                  {FILTER_OPTIONS.find((o) => o.id === id)?.label}
                </Text>
                <Pressable onPress={() => toggleFilter(id)}>
                  <Ionicons name="close-circle" size={16} color="#4E46E5" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* --- 리스트 영역 --- */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.orderId.toString()}
        renderItem={({ item }) => <OrderCard {...item} />}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <View style={s.listHeader}>
            <Text style={s.totalText}>
              총{" "}
              <Text style={{ color: "#4E46E5" }}>{filteredOrders.length}</Text>
              건의 오더
            </Text>
            <View style={s.sortRow}>
              {["최신순", "가까운순"].map((type) => (
                <Pressable key={type} onPress={() => setSortType(type)}>
                  <Text
                    style={[s.sortText, sortType === type && s.sortTextActive]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "#fff",
  },
  logoText: { fontSize: 22, fontWeight: "900", color: "#1E293B" },
  headerIcons: { flexDirection: "row", gap: 15 },
  iconBtn: { padding: 4 },
  filterWrapper: { backgroundColor: "#fff", paddingBottom: 12 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  filterBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterBadgeActive: { backgroundColor: "#1E293B", borderColor: "#1E293B" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  chipWrapper: {
    backgroundColor: "#fff",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  chipScroll: { paddingHorizontal: 20, gap: 6 },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    gap: 4,
  },
  activeChipText: { fontSize: 12, fontWeight: "700", color: "#4E46E5" },
  listContent: { padding: 16, paddingBottom: 100 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalText: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  sortRow: { flexDirection: "row", gap: 12 },
  sortText: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  sortTextActive: { color: "#1E293B" },
});
