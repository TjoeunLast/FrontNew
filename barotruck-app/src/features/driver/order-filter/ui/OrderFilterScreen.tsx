import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { AddressApi } from "@/shared/api/addressService";
import { Ionicons } from "@expo/vector-icons";
import { useOrderFilterStore } from "../model/useOrderFilterStore";
import DateTimePickerModal from "react-native-modal-datetime-picker"; // 상차 일정 지정

export default function OrderFilterScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();
  const filter = useOrderFilterStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  // 상차지/하차지 중 어디를 검색 중인지 구분
  const [activeField, setActiveField] = useState<"start" | "end" | null>(null);

  // 상차 일정
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const handleDateConfirm = (date: Date) => {
    // DB의 START_SCHEDULE 형식에 맞춰 YYYY-MM-DD 포맷으로 저장
    const formattedDate = date.toISOString().split("T")[0];
    filter.setFilter("uploadDate", formattedDate);
    setDatePickerVisibility(false);
  };

  useEffect(() => {
    const fetchResults = async () => {
      if (searchQuery.trim().length > 0) {
        const results = await AddressApi.search(searchQuery);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    };
    fetchResults();
  }, [searchQuery]);

  // 지역 선택/해제 로직 (상차지/하차지 공용)
  const toggleRegion = (
    field: "selectedRegions" | "destRegions",
    address: string,
  ) => {
    const current = filter[field];
    const isSelected = current.includes(address);
    const next = isSelected
      ? current.filter((r) => r !== address)
      : [...current, address];

    filter.setFilter(field, next);
    setSearchQuery("");
    setActiveField(null);
  };

  const toggleMultiSelect = (
    key: "carTypes" | "tonnages" | "payMethods",
    value: string,
  ) => {
    const current = filter[key] as string[];
    const isSelected = current.includes(value);
    const next = isSelected
      ? current.filter((v) => v !== value)
      : [...current, value];

    filter.setFilter(key, next);
  };

  const FilterChip = ({ label, active, onPress }: any) => {
    return (
      <Pressable
        onPress={onPress}
        style={[
          s.chipBase,
          {
            borderColor: active ? c.brand.primary : c.border.default,
            backgroundColor: active ? c.brand.primary : "transparent",
          },
        ]}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: active ? "#FFF" : c.text.secondary,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: c.bg.surface }]}>
      <ShipperScreenHeader title="필터 설정" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. 지역 및 거리 (상차지/하차지/반경) */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            지역 및 거리
          </Text>

          <Text style={s.groupLabel}>상차지 검색</Text>
          <View style={[s.searchBar, { backgroundColor: c.bg.canvas }]}>
            <Ionicons name="search" size={20} color={c.text.secondary} />
            <TextInput
              style={[s.searchInput, { color: c.text.primary }]}
              placeholder="상차지 지역명 검색"
              value={activeField === "start" ? searchQuery : ""}
              onFocus={() => setActiveField("start")}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={s.selectedContainer}>
            {filter.selectedRegions.map((r) => (
              <View
                key={r}
                style={[s.selectedChip, { backgroundColor: c.brand.primary }]}
              >
                <Text style={s.selectedChipText}>{r.split(" ").pop()}</Text>
                <Pressable onPress={() => toggleRegion("selectedRegions", r)}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color="#FFF"
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>
              </View>
            ))}
          </View>

          <Text style={[s.groupLabel, { marginTop: 16 }]}>하차지 검색</Text>
          <View style={[s.searchBar, { backgroundColor: c.bg.canvas }]}>
            <Ionicons
              name="location-outline"
              size={20}
              color={c.text.secondary}
            />
            <TextInput
              style={[s.searchInput, { color: c.text.primary }]}
              placeholder="하차지 지역명 검색"
              value={activeField === "end" ? searchQuery : ""}
              onFocus={() => setActiveField("end")}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={s.selectedContainer}>
            {filter.destRegions?.map((r) => (
              <View
                key={r}
                style={[s.selectedChip, { backgroundColor: "#64748B" }]}
              >
                <Text style={s.selectedChipText}>{r.split(" ").pop()}</Text>
                <Pressable onPress={() => toggleRegion("destRegions", r)}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color="#FFF"
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>
              </View>
            ))}
          </View>

          {/* 검색 결과 */}
          {activeField && searchResults.length > 0 && (
            <View
              style={[
                s.resultWrapper,
                {
                  backgroundColor: c.bg.surface,
                  borderColor: c.border.default,
                },
              ]}
            >
              <ScrollView
                style={{ maxHeight: 200 }}
                keyboardShouldPersistTaps="handled"
              >
                {searchResults.map((item) => (
                  <Pressable
                    key={item}
                    style={s.resultItem}
                    onPress={() =>
                      toggleRegion(
                        activeField === "start"
                          ? "selectedRegions"
                          : "destRegions",
                        item,
                      )
                    }
                  >
                    <Text style={{ color: c.text.primary }}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={[s.groupLabel, { marginTop: 16 }]}>
            상차지 반경 (현위치 기준)
          </Text>
          <View style={s.row}>
            {[999, 5, 10, 20, 50].map((r) => (
              <FilterChip
                key={r}
                label={r === 999 ? "전국" : `${r}km`}
                active={filter.radius === r}
                onPress={() => filter.setFilter("radius", r)}
              />
            ))}
          </View>
        </View>

        <View style={s.divider} />

        {/* 2. 차량 및 적재 옵션 */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            차량 및 화물 제원
          </Text>
          <Text style={s.groupLabel}>차종</Text>
          <View style={s.row}>
            {["카고", "윙바디", "탑차", "냉동/냉장", "리프트"].map((t) => (
              <FilterChip
                key={t}
                label={t}
                active={filter.carTypes.includes(t)}
                onPress={() => toggleMultiSelect("carTypes", t)}
              />
            ))}
          </View>
          <Text style={[s.groupLabel, { marginTop: 16 }]}>중량(톤수)</Text>
          <View style={s.row}>
            {["1톤", "1.4톤", "2.5톤", "5톤", "11톤"].map((t) => (
              <FilterChip
                key={t}
                label={t}
                active={filter.tonnages.includes(t)}
                onPress={() => toggleMultiSelect("tonnages", t)}
              />
            ))}
          </View>
          <Text style={[s.groupLabel, { marginTop: 16 }]}>적재 방식</Text>
          <View style={s.row}>
            {["독차", "혼적"].map((m) => (
              <FilterChip
                key={m}
                label={m}
                active={filter.loadMethod === m}
                onPress={() =>
                  filter.setFilter(
                    "loadMethod",
                    filter.loadMethod === m ? null : m,
                  )
                }
              />
            ))}
          </View>
        </View>

        <View style={s.divider} />

        {/* 운행 및 작업 조건 */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            운행 및 작업 조건
          </Text>
          <View style={s.row}>
            {["편도", "왕복"].map((m) => (
              <FilterChip
                key={m}
                label={m}
                active={filter.driveMode === m}
                onPress={() =>
                  filter.setFilter(
                    "driveMode",
                    filter.driveMode === m ? null : m,
                  )
                }
              />
            ))}
            <FilterChip
              label="수작업 제외"
              active={filter.isManualWork === false}
              onPress={() =>
                filter.setFilter(
                  "isManualWork",
                  filter.isManualWork === false ? null : false,
                )
              }
            />
          </View>
          <Text style={[s.groupLabel, { marginTop: 16 }]}>상차 일정</Text>
          <View style={s.row}>
            {["당상", "익상"].map((type) => (
              <FilterChip
                key={type}
                label={type}
                active={filter.uploadDate === type}
                onPress={() =>
                  filter.setFilter(
                    "uploadDate",
                    filter.uploadDate === type ? null : type,
                  )
                }
              />
            ))}

            {/* 날짜 지정 칩 */}
            <FilterChip
              label={
                filter.uploadDate &&
                !["당상", "익상"].includes(filter.uploadDate)
                  ? filter.uploadDate // 선택된 날짜 (예: 2026-02-28)
                  : "날짜 지정"
              }
              active={
                filter.uploadDate !== null &&
                !["당상", "익상"].includes(filter.uploadDate)
              }
              onPress={() => setDatePickerVisibility(true)}
            />
          </View>

          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleDateConfirm}
            onCancel={() => setDatePickerVisibility(false)}
          />
        </View>

        <View style={s.divider} />

        {/* 수익 및 결제 */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            수익 및 결제
          </Text>
          <Text style={s.groupLabel}>최소 운임 설정</Text>
          <TextInput
            style={[
              s.priceInput,
              { backgroundColor: c.bg.canvas, color: c.text.primary },
            ]}
            placeholder="금액 입력 (예: 100000)"
            keyboardType="numeric"
            value={filter.minPrice > 0 ? filter.minPrice.toString() : ""}
            onChangeText={(v) =>
              filter.setFilter("minPrice", Number(v.replace(/[^0-9]/g, "")))
            }
          />
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[s.bottomBar, { borderTopColor: c.border.default }]}>
        <Pressable style={s.resetBtn} onPress={filter.resetFilters}>
          <Text style={[s.resetText, { color: c.text.secondary }]}>초기화</Text>
        </Pressable>
        <Pressable
          style={[s.applyBtn, { backgroundColor: c.brand.primary }]}
          onPress={() => router.back()}
        >
          <Text style={s.applyText}>적용하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16 },
  groupLabel: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipBase: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  resultWrapper: {
    position: "absolute",
    top: 180,
    left: 20,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 999,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  selectedContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectedChipText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  divider: { height: 8, width: "100%" },
  priceInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  resetText: { fontSize: 16, fontWeight: "700" },
  applyBtn: {
    flex: 2,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  applyText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
