import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
    TextInput,
    View,
} from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { Card } from "@/shared/ui/base/Card";

type LoadDayType = "당상(오늘)" | "익상(내일)" | "직접 지정";
type ArriveType = "당착" | "익착" | "내착";

type DispatchType = "instant" | "direct";
type PayType = "card" | "prepaid" | "receipt30" | "monthEnd";

type Option = { label: string; value: string };

const SP = {
  pageX: 16,
  sectionGap: 18,
  chipGap: 10,
};

function won(n: number) {
  const v = Math.max(0, Math.round(n));
  return `${v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

function parseWonInput(v: string) {
  // "320,000" 같이 입력해도 OK
  const x = v.replace(/[^0-9]/g, "");
  return x ? parseInt(x, 10) : 0;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toKoreanDateText(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}


function SectionTitle({ title }: { title: string }) {
  const { colors: c } = useAppTheme();
  return <Text style={[s.sectionTitle, { color: c.text.primary }]}>{title}</Text>;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.chip,
        {
          borderColor: selected ? c.brand.primary : c.border.default,
          backgroundColor: selected ? c.brand.primarySoft : c.bg.surface,
        },
      ]}
    >
      <Text
        style={[
          s.chipText,
          { color: selected ? c.brand.primary : c.text.secondary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function InlineDropdownField({
  label,
  valueLabel,
  placeholder,
  open,
  options,
  selectedValue,
  onToggle,
  onSelect,
  searchable = false,
  searchValue = "",
  onSearchChange,
  emptyText = "항목이 없습니다.",
}: {
  label: string;
  valueLabel?: string;
  placeholder: string;
  open: boolean;
  options: Option[];
  selectedValue?: string;
  onToggle: () => void;
  onSelect: (v: Option) => void;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  emptyText?: string;
}) {
  const { colors: c } = useAppTheme();
  return (
    <View style={{ flex: 1 }}>
      {label ? <Text style={[s.fieldLabel, { color: c.text.primary }]}>{label}</Text> : null}
      <Pressable
        onPress={onToggle}
        style={[
          s.select,
          { backgroundColor: c.bg.surface, borderColor: c.border.default },
        ]}
      >
        <Text
          style={[
            s.selectText,
            { color: valueLabel ? c.text.primary : c.text.secondary },
          ]}
          numberOfLines={1}
        >
          {valueLabel ?? placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={c.text.secondary}
        />
      </Pressable>

      {open ? (
        <View
          style={[
            s.dropdownPanel,
            { backgroundColor: c.bg.surface, borderColor: c.border.default },
          ]}
        >
          {searchable ? (
            <View
              style={[
                s.dropdownSearchWrap,
                { borderColor: c.border.default, backgroundColor: c.bg.canvas },
              ]}
            >
              <Ionicons name="search" size={16} color={c.text.secondary} />
              <TextInput
                value={searchValue}
                onChangeText={onSearchChange}
                placeholder="주소 검색"
                placeholderTextColor={c.text.secondary}
                style={[s.dropdownSearchInput, { color: c.text.primary }]}
              />
            </View>
          ) : null}

          <ScrollView
            style={[s.dropdownList, searchable ? s.dropdownListScrollable : null]}
            nestedScrollEnabled
          >
            {options.length ? (
              options.map((op) => {
                const active = op.value === selectedValue;
                return (
                  <Pressable
                    key={op.value}
                    onPress={() => onSelect(op)}
                    style={[
                      s.dropdownItem,
                      {
                        borderColor: c.border.default,
                        backgroundColor: active ? c.brand.primarySoft : c.bg.surface,
                      },
                    ]}
                  >
                    <Text style={[s.dropdownItemText, { color: c.text.primary }]} numberOfLines={1}>
                      {op.label}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={18} color={c.brand.primary} /> : null}
                  </Pressable>
                );
              })
            ) : (
              <Text style={[s.dropdownEmptyText, { color: c.text.secondary }]}>{emptyText}</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function ChoiceCard({
  emoji,
  title,
  desc,
  selected,
  onPress,
}: {
  emoji: string;
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.choiceCard,
        {
          backgroundColor: selected ? c.brand.primarySoft : c.bg.surface,
          borderColor: selected ? c.brand.primary : c.border.default,
        },
      ]}
    >
      <Text style={s.emoji}>{emoji}</Text>
      <Text style={[s.choiceTitle, { color: c.text.primary }]}>{title}</Text>
      <Text style={[s.choiceDesc, { color: c.text.secondary }]}>{desc}</Text>
    </Pressable>
  );
}

function PaymentTile({
  title,
  desc,
  selected,
  onPress,
}: {
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.payTile,
        {
          backgroundColor: selected ? c.brand.primarySoft : c.bg.surface,
          borderColor: selected ? c.brand.primary : c.border.default,
        },
      ]}
    >
      <Text style={[s.payTitle, { color: c.text.primary }]}>{title}</Text>
      <Text style={[s.payDesc, { color: c.text.secondary }]}>{desc}</Text>
    </Pressable>
  );
}

function CreateOrderTopBar({ onBack }: { onBack: () => void }) {
  const { colors: c } = useAppTheme();
  return (
    <View style={[s.topBar, { borderBottomColor: c.border.default }]}>
      <Pressable onPress={onBack} style={s.backBtn}>
        <Ionicons name="chevron-back" size={22} color={c.text.primary} />
      </Pressable>
      <Text style={[s.topTitle, { color: c.text.primary }]}>화물 등록</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

export function ShipperCreateOrderStep1Screen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();

  // ✅ 백엔드 enum 기반 옵션
  const carTypeOptions: Option[] = useMemo(
    () => [
      { label: "카고", value: "CARGO" },
      { label: "윙바디", value: "WING" },
      { label: "탑차", value: "TOP" },
      { label: "냉동/냉장", value: "COLD" },
      { label: "리프트", value: "LIFT" },
    ],
    []
  );

  const tonOptions: Option[] = useMemo(
    () => [
      { label: "1톤", value: "1T" },
      { label: "1.4톤", value: "1_4T" },
      { label: "2.5톤", value: "2_5T" },
      { label: "5톤", value: "5T" },
      { label: "11톤", value: "11T" },
    ],
    []
  );

  const recentStartOptions: Option[] = useMemo(
    () => [
      { label: "서울 강남구 테헤란로 152 (역삼동)", value: "start_1" },
      { label: "경기 성남시 분당구 판교역로 235", value: "start_2" },
      { label: "인천 연수구 송도과학로 32", value: "start_3" },
      { label: "충남 천안시 서북구 직산읍 123-4", value: "start_4" },
      { label: "부산 강서구 녹산산업중로 45", value: "start_5" },
    ],
    []
  );

  const recentAddressPool = useMemo(
    () => [
      ...recentStartOptions.map((x) => x.label),
      "서울 송파구 법원로 128",
      "대전 유성구 테크노중앙로 55",
      "광주 광산구 하남산단8번로 12",
      "경북 구미시 3공단로 110",
    ],
    [recentStartOptions]
  );

  // 구간/일시
  const [startSelected, setStartSelected] = useState(recentStartOptions[0].label);
  const [startDropdownOpen, setStartDropdownOpen] = useState(false);
  const [startSearch, setStartSearch] = useState("");
  const [loadDay, setLoadDay] = useState<LoadDayType>("당상(오늘)");
  const [loadDate, setLoadDate] = useState(new Date());
  const [loadDatePickerOpen, setLoadDatePickerOpen] = useState(false);
  const [endAddr, setEndAddr] = useState("");
  const [arriveType, setArriveType] = useState<ArriveType>("당착");

  // 차량/화물
  const [carType, setCarType] = useState<Option>(carTypeOptions[1]); // WING
  const [ton, setTon] = useState<Option>(tonOptions[3]); // 5T
  const [cargoDetail, setCargoDetail] = useState("");
  const [weightTon, setWeightTon] = useState("0");

  // ✅ 요청사항: 태그 + 직접입력
  const presetRequestTags = useMemo(
    () => [
      "지게차 상하차",
      "수작업 없음",
      "도착 전 연락",
      "비오면 안됨",
      "취급주의",
      "세워서 적재",
      "파손주의",
      "시간 엄수",
      "냉장/냉동",
      "상하차 대기 없음",
      "주차 공간 협소",
      "야간 상차/하차",
    ],
    []
  );

  const [selectedRequestTags, setSelectedRequestTags] = useState<string[]>([
    "지게차 상하차",
    "수작업 없음",
    "도착 전 연락",
    "비오면 안됨",
  ]);

  const [customRequestOpen, setCustomRequestOpen] = useState(false);
  const [customRequestText, setCustomRequestText] = useState("");

  const toggleRequestTag = (tag: string) => {
    setSelectedRequestTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    );
  };

  // ✅ 사진 첨부(선택): 지금은 더미(추후 이미지피커 연결)
  const [photos, setPhotos] = useState<{ id: string; name: string }[]>([
    { id: "p1", name: "IMG_01" },
  ]);
  const addPhoto = () => {
    Alert.alert("TODO", "이미지 선택(Expo ImagePicker) 연결");
    // 연결 후: setPhotos([...])
  };
  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // 배차/결제
  const [dispatch, setDispatch] = useState<DispatchType>("instant");
  const [pay, setPay] = useState<PayType>("receipt30");

  // 운임 입력/적용
  const distanceKm = 340; // TODO: 구간으로 계산/서버 응답
  const aiFare = 320000; // TODO: 서버 추천값
  const [fareInput, setFareInput] = useState("");
  const [appliedFare, setAppliedFare] = useState(0);

  const fee = useMemo(() => {
    if (pay === "card") return Math.round(appliedFare * 0.1);
    return 0;
  }, [appliedFare, pay]);

  const totalPay = useMemo(() => appliedFare + fee, [appliedFare, fee]);

  const applyFare = () => {
    const v = parseWonInput(fareInput);
    if (v <= 0) {
      Alert.alert("확인", "희망 운임을 입력해주세요.");
      return;
    }
    setAppliedFare(v);
  };

  const applyAiFare = () => {
    setFareInput(String(aiFare));
    setAppliedFare(aiFare);
  };

  const [carDropdownOpen, setCarDropdownOpen] = useState(false);
  const [tonDropdownOpen, setTonDropdownOpen] = useState(false);

  const filteredStartOptions = useMemo(() => {
    const q = startSearch.trim();
    if (!q) return recentStartOptions;
    return recentStartOptions.filter((item) => item.label.includes(q));
  }, [recentStartOptions, startSearch]);

  const endAddrSuggestions = useMemo(() => {
    const q = endAddr.trim();
    if (!q) return [];
    return recentAddressPool.filter((addr) => addr.includes(q)).slice(0, 5);
  }, [endAddr, recentAddressPool]);


  const submit = () => {
    if (!endAddr.trim()) {
      Alert.alert("필수", "하차지 주소를 입력해주세요.");
      return;
    }
    if (appliedFare <= 0) {
      Alert.alert("필수", "희망 운임을 입력 후 적용해주세요.");
      return;
    }

    const requestSummary = [
      ...selectedRequestTags.map((x) => `#${x}`),
      customRequestText.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    // ✅ 서버에 보낼 값들(예시)
    // {
    //   carType: carType.value,
    //   ton: ton.value,
    //   cargoDetail,
    //   weightTon: parseWonInput(weightTon), // 숫자화 필요하면 별도 처리
    //   request: requestSummary,
    //   dispatchType: dispatch,
    //   payType: pay,
    //   fare: appliedFare,
    //   fee,
    //   totalPay,
    //   photos: photos.map(p => p.name)
    // }

    Alert.alert("등록 준비 완료", "다음 단계로 이동합니다.");
    router.push("/(shipper)/create-order/step2-cargo");
  };

  const onSelectLoadDay = (v: LoadDayType) => {
    setLoadDay(v);
    if (v === "당상(오늘)") {
      setLoadDate(new Date());
      setLoadDatePickerOpen(false);
      return;
    }
    if (v === "익상(내일)") {
      setLoadDate(addDays(new Date(), 1));
      setLoadDatePickerOpen(false);
      return;
    }
    setLoadDatePickerOpen(true);
  };

  const onChangeLoadDate = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") {
      setLoadDatePickerOpen(false);
    }
    if (event.type === "dismissed" || !picked) {
      return;
    }

    const today = new Date();
    const tomorrow = addDays(today, 1);
    if (isSameDay(picked, today)) {
      setLoadDay("당상(오늘)");
    } else if (isSameDay(picked, tomorrow)) {
      setLoadDay("익상(내일)");
    } else {
      setLoadDay("직접 지정");
    }
    setLoadDate(picked);
  };

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <CreateOrderTopBar onBack={() => router.back()} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 구간 및 일시 */}
        <SectionTitle title="구간 및 일시" />
        <Card padding={16} style={{ marginBottom: SP.sectionGap }}>
          {/* 출발 */}
          <View style={s.timelineRow}>
            <View style={s.timelineLeft}>
              <View style={[s.circle, { backgroundColor: c.brand.primary }]}>
                <Text style={[s.circleText, { color: c.text.inverse }]}>출발</Text>
              </View>
              <View style={[s.lineV, { backgroundColor: c.border.default }]} />
            </View>

            <View style={s.timelineBody}>
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>상차지 정보</Text>

              <InlineDropdownField
                label=""
                valueLabel={startSelected}
                placeholder="상차지 선택"
                open={startDropdownOpen}
                options={filteredStartOptions}
                selectedValue={recentStartOptions.find((x) => x.label === startSelected)?.value}
                onToggle={() => setStartDropdownOpen((v) => !v)}
                onSelect={(op) => {
                  setStartSelected(op.label);
                  setStartDropdownOpen(false);
                  setStartSearch("");
                }}
                searchable
                searchValue={startSearch}
                onSearchChange={setStartSearch}
                emptyText="일치하는 최근 상차지가 없습니다."
              />

              <View style={s.chipRow}>
                {(["당상(오늘)", "익상(내일)", "직접 지정"] as LoadDayType[]).map((v) => (
                  <Chip key={v} label={v} selected={loadDay === v} onPress={() => onSelectLoadDay(v)} />
                ))}
              </View>

              <Pressable
                onPress={() => {
                  setLoadDay("직접 지정");
                  setLoadDatePickerOpen((v) => !v);
                }}
                style={[s.dateRow, { borderColor: c.border.default, backgroundColor: c.bg.surface }]}
              >
                <View style={s.dateLabelRow}>
                  <Ionicons name="calendar-outline" size={16} color={c.text.secondary} />
                  <Text style={[s.dateValueText, { color: c.text.primary }]}>
                    상차일: {toKoreanDateText(loadDate)}
                  </Text>
                </View>
                <Text style={[s.dateValueText, { color: c.brand.primary }]}>날짜 선택</Text>
              </Pressable>

              {loadDatePickerOpen ? (
                <View style={{ marginTop: 8 }}>
                  <DateTimePicker
                    value={loadDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onChangeLoadDate}
                  />
                </View>
              ) : null}
            </View>
          </View>

          {/* 도착 */}
          <View style={[s.timelineRow, { marginTop: 14 }]}>
            <View style={s.timelineLeft}>
              <View style={[s.circle, { backgroundColor: c.text.primary }]}>
                <Text style={[s.circleText, { color: c.text.inverse }]}>도착</Text>
              </View>
            </View>

            <View style={s.timelineBody}>
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>하차지 정보</Text>

              <View style={[s.searchField, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
                <TextInput
                  value={endAddr}
                  onChangeText={setEndAddr}
                  placeholder="주소를 검색해주세요"
                  placeholderTextColor={c.text.secondary}
                  style={[s.searchInput, { color: c.text.primary }]}
                />
                <Ionicons name="search" size={18} color={c.text.secondary} />
              </View>
              {endAddrSuggestions.length ? (
                <View
                  style={[
                    s.addressSuggestWrap,
                    { borderColor: c.border.default, backgroundColor: c.bg.surface },
                  ]}
                >
                  {endAddrSuggestions.map((addr) => (
                    <Pressable
                      key={addr}
                      onPress={() => setEndAddr(addr)}
                      style={[s.addressSuggestItem, { borderColor: c.border.default }]}
                    >
                      <Ionicons name="location-outline" size={14} color={c.text.secondary} />
                      <Text style={[s.addressSuggestText, { color: c.text.primary }]} numberOfLines={1}>
                        {addr}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={s.chipRow}>
                {(["당착", "익착", "내착"] as ArriveType[]).map((v) => (
                  <Chip key={v} label={v} selected={arriveType === v} onPress={() => setArriveType(v)} />
                ))}
              </View>
            </View>
          </View>
        </Card>

        {/* 차량 및 화물 정보 */}
        <SectionTitle title="차량 및 화물 정보" />
        <Card padding={16} style={{ marginBottom: SP.sectionGap }}>
          {/* 차종 옆에 톤수 (드롭다운) */}
          <View style={s.twoSelectRow}>
            <InlineDropdownField
              label="차종"
              valueLabel={carType.label}
              placeholder="차종 선택"
              open={carDropdownOpen}
              options={carTypeOptions}
              selectedValue={carType.value}
              onToggle={() => {
                setCarDropdownOpen((v) => !v);
              }}
              onSelect={(op) => {
                setCarType(op);
                setCarDropdownOpen(false);
              }}
            />
            <View style={{ width: 10 }} />
            <InlineDropdownField
              label="톤수"
              valueLabel={ton.label}
              placeholder="톤수 선택"
              open={tonDropdownOpen}
              options={tonOptions}
              selectedValue={ton.value}
              onToggle={() => {
                setTonDropdownOpen((v) => !v);
              }}
              onSelect={(op) => {
                setTon(op);
                setTonDropdownOpen(false);
              }}
            />
          </View>

          <View style={{ height: 14 }} />

          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>물품상세</Text>
              <View style={[s.inputWrap, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
                <TextInput
                  value={cargoDetail}
                  onChangeText={setCargoDetail}
                  placeholder="예: 파레트 2개, 박스짐"
                  placeholderTextColor={c.text.secondary}
                  style={[s.input, { color: c.text.primary }]}
                />
              </View>
            </View>

            <View style={{ width: 10 }} />

            <View style={{ width: 110 }}>
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>중량(톤)</Text>
              <View style={[s.inputWrap, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
                <TextInput
                  value={weightTon}
                  onChangeText={setWeightTon}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={c.text.secondary}
                  style={[s.input, { color: c.text.primary }]}
                />
              </View>
            </View>
          </View>

          <View style={{ height: 14 }} />

          {/* ✅ 요청사항: 태그 + 직접 입력 */}
          <Text style={[s.fieldLabel, { color: c.text.primary }]}>요청사항</Text>

          <View style={s.tagWrap}>
            {presetRequestTags.map((tag) => {
              const selected = selectedRequestTags.includes(tag);
              return (
                <Chip
                  key={tag}
                  label={`#${tag}`}
                  selected={selected}
                  onPress={() => toggleRequestTag(tag)}
                />
              );
            })}

            <Chip
              label={customRequestOpen ? "직접 입력 닫기" : "직접 입력"}
              selected={customRequestOpen}
              onPress={() => setCustomRequestOpen((v) => !v)}
            />
          </View>

          {customRequestOpen ? (
            <View
              style={[
                s.inputWrapMulti,
                { marginTop: 10, backgroundColor: c.bg.surface, borderColor: c.border.default },
              ]}
            >
              <TextInput
                value={customRequestText}
                onChangeText={setCustomRequestText}
                placeholder="예) 취급주의 / 세워서 적재 / 도착 30분 전 연락 등"
                placeholderTextColor={c.text.secondary}
                style={[s.inputMulti, { color: c.text.primary }]}
                multiline
              />
            </View>
          ) : null}

          {/* ✅ 사진 첨부(선택) */}
          <Text style={[s.fieldLabel, { color: c.text.primary, marginTop: 14 }]}>사진 첨부 (선택)</Text>

          <View style={s.photoRow}>
            <Pressable
              onPress={addPhoto}
              style={[
                s.photoBox,
                { borderColor: c.border.default, backgroundColor: c.bg.surface },
              ]}
            >
              <Ionicons name="camera-outline" size={18} color={c.text.secondary} />
              <Text style={[s.photoText, { color: c.text.secondary }]}>사진 추가</Text>
            </Pressable>

            {photos.map((p) => (
              <Pressable
                key={p.id}
                onLongPress={() => removePhoto(p.id)}
                style={[
                  s.photoBox,
                  { borderColor: c.border.default, backgroundColor: c.bg.muted },
                ]}
              >
                <Ionicons name="image-outline" size={18} color={c.text.secondary} />
                <Text style={[s.photoText, { color: c.text.secondary }]}>{p.name}</Text>
                <Text style={[s.photoHint, { color: c.text.secondary }]}>길게 눌러 삭제</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* 배차 및 운임 */}
        <SectionTitle title="배차 및 운임" />
        <Card padding={16} style={{ marginBottom: SP.sectionGap }}>
          <Text style={[s.fieldLabel, { color: c.brand.primary, fontWeight: "900" }]}>
            배차 방식 선택
          </Text>

          <View style={s.choiceRow}>
            <ChoiceCard
              emoji="⚡"
              title="바로 배차"
              desc="기사님이 수락하면 즉시 배차됩니다. (빠름)"
              selected={dispatch === "instant"}
              onPress={() => setDispatch("instant")}
            />
            <ChoiceCard
              emoji="👑"
              title="직접 배차"
              desc="지원한 기사님의 평점을 보고 선택합니다."
              selected={dispatch === "direct"}
              onPress={() => setDispatch("direct")}
            />
          </View>

          {/* AI 추천 운임 */}
          <View style={[s.aiBox, { backgroundColor: c.brand.primarySoft, borderColor: c.border.default }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.aiLabel, { color: c.brand.primary }]}>AI 추천 운임 (거리 {distanceKm}km)</Text>
              <Text style={[s.aiPrice, { color: c.brand.primary }]}>{won(aiFare)}</Text>
            </View>
            <Button
              title="적용하기"
              onPress={applyAiFare}
              style={{ height: 40, paddingHorizontal: 14 } as any}
            />
          </View>

          {/* 희망 운임 직접 입력 + 적용 */}
          <View style={{ marginTop: 16 }}>
            <Text style={[s.fieldLabel, { color: c.text.primary }]}>희망 운임</Text>
            <View style={s.fareRow}>
              <View style={[s.fareInputWrap, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
                <TextInput
                  value={fareInput}
                  onChangeText={setFareInput}
                  placeholder="예: 320000"
                  placeholderTextColor={c.text.secondary}
                  keyboardType="numeric"
                  style={[s.input, { color: c.text.primary, flex: 1 }]}
                />
                <Text style={[s.wonSuffix, { color: c.text.secondary }]}>원</Text>
              </View>

              <Button
                title="적용하기"
                variant="outline"
                onPress={applyFare}
                style={{ height: 48, paddingHorizontal: 14 } as any}
              />
            </View>

            <Text style={[s.hint, { color: c.text.secondary }]}>
              적용된 운임:{" "}
              <Text style={{ color: c.brand.primary, fontWeight: "900" }}>
                {won(appliedFare)}
              </Text>
            </Text>
          </View>

          {/* 결제 및 지급 시기 */}
          <Text style={[s.fieldLabel, { color: c.text.primary, marginTop: 16 }]}>
            결제 및 지급 시기 <Text style={{ color: c.status.danger }}>*</Text>
          </Text>

          <View style={s.payGrid}>
            {(
              [
                { value: "card", title: "카드 결제", desc: "수수료 10%" },
                { value: "prepaid", title: "선/착불", desc: "상하차 시 지급" },
                { value: "receipt30", title: "인수증 (30일)", desc: "계산서 발행" },
                { value: "monthEnd", title: "익월말", desc: "회사 정기결제" },
              ] as { value: PayType; title: string; desc: string }[]
            ).map((item) => (
              <PaymentTile
                key={item.value}
                title={item.title}
                desc={item.desc}
                selected={pay === item.value}
                onPress={() => setPay(item.value)}
              />
            ))}
          </View>

          {/* 화면 내 계산표(스크롤 중에도 보이지만, 아래 고정바에도 다시 보여줌) */}
          <Card padding={14} style={{ marginTop: 14 }}>
            <View style={s.feeRow}>
              <Text style={[s.feeLabel, { color: c.text.secondary }]}>희망 운임</Text>
              <Text style={[s.feeValue, { color: c.text.primary }]}>{won(appliedFare)}</Text>
            </View>
            <View style={s.feeRow}>
              <Text style={[s.feeLabel, { color: c.text.secondary }]}>수수료 (카드 10%)</Text>
              <Text style={[s.feeValue, { color: c.text.primary }]}>+ {won(fee)}</Text>
            </View>
            <View style={[s.hr, { backgroundColor: c.border.default }]} />
            <View style={s.feeRow}>
              <Text style={[s.feeTotalLabel, { color: c.text.primary }]}>최종 결제 금액</Text>
              <Text style={[s.feeTotalValue, { color: c.text.primary }]}>{won(totalPay)}</Text>
            </View>
          </Card>
        </Card>

        {/* ✅ 하단 고정바 공간 확보 */}
        <View style={{ height: 150 }} />
      </ScrollView>

      {/* ✅ Bottom Sticky: 최종금액 항상 보이게 */}
      <View style={[s.bottomBar, { backgroundColor: c.bg.canvas, borderTopColor: c.border.default }]}>
        <View style={[s.stickySummary, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
          <View style={s.stickyRow}>
            <Text style={[s.stickyLabel, { color: c.text.secondary }]}>최종 결제 금액</Text>
            <Text style={[s.stickyTotal, { color: c.text.primary }]}>{won(totalPay)}</Text>
          </View>

          <View style={s.stickySubRow}>
            <Text style={[s.stickySub, { color: c.text.secondary }]}>
              희망 운임 {won(appliedFare)}
            </Text>
            <Text style={[s.stickySub, { color: c.text.secondary }]}>
              {pay === "card" ? `수수료 +${won(fee)}` : "수수료 0원"}
            </Text>
          </View>
        </View>

        <Button title="화물 등록하기" onPress={submit} fullWidth />
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },

  topBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SP.pageX,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 16, fontWeight: "900" },
  content: { padding: SP.pageX, paddingBottom: 24 },

  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: "800", marginBottom: 8 },

  // timeline
  timelineRow: { flexDirection: "row" },
  timelineLeft: { width: 52, alignItems: "center" },
  circle: { width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  circleText: { fontSize: 11, fontWeight: "900" },
  lineV: { width: 2, flex: 1, marginTop: 8 },
  timelineBody: { flex: 1 },

  // select
  select: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectText: { fontSize: 14, fontWeight: "700", flex: 1 },

  // chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SP.chipGap, marginTop: 10 },
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "100%",
  },
  chipText: { fontSize: 12, fontWeight: "900" },
  dateRow: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dateLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  dateValueText: { fontSize: 13, fontWeight: "800" },

  // search
  searchField: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "700" },

  // dropdown (inline)
  dropdownPanel: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  dropdownSearchWrap: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dropdownSearchInput: { flex: 1, fontSize: 13, fontWeight: "700" },
  dropdownList: {},
  dropdownListScrollable: { maxHeight: 180 },
  dropdownItem: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dropdownItemText: { flex: 1, fontSize: 13, fontWeight: "800", marginRight: 8 },
  dropdownEmptyText: { fontSize: 12, fontWeight: "700", paddingVertical: 10 },

  // address suggestion
  addressSuggestWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  addressSuggestItem: {
    minHeight: 40,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressSuggestText: { flex: 1, fontSize: 13, fontWeight: "700" },

  // two selects
  twoSelectRow: { flexDirection: "row" },

  // inputs
  twoCol: { flexDirection: "row" },
  inputWrap: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 48, justifyContent: "center" },
  input: { fontSize: 14, fontWeight: "700" },
  inputWrapMulti: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 110 },
  inputMulti: { fontSize: 14, fontWeight: "700", height: 110, textAlignVertical: "top" },

  // request tags
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: SP.chipGap },

  // photos
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  photoBox: {
    width: "48.3%",
    height: 86,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  photoText: { fontSize: 12, fontWeight: "900" },
  photoHint: { fontSize: 10, fontWeight: "800" },

  // dispatch choice
  choiceRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  choiceCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
  emoji: { fontSize: 18, marginBottom: 8 },
  choiceTitle: { fontSize: 14, fontWeight: "900", marginBottom: 6 },
  choiceDesc: { fontSize: 12, fontWeight: "700", lineHeight: 16 },

  // ai fare
  aiBox: { marginTop: 12, borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  aiLabel: { fontSize: 12, fontWeight: "900", marginBottom: 6 },
  aiPrice: { fontSize: 18, fontWeight: "900" },

  // fare input
  fareRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fareInputWrap: { flex: 1, height: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  wonSuffix: { fontSize: 13, fontWeight: "900" },
  hint: { marginTop: 8, fontSize: 12, fontWeight: "800" },

  // pay grid
  payGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  payTile: { width: "48.3%", borderRadius: 16, borderWidth: 1, padding: 14 },
  payTitle: { fontSize: 14, fontWeight: "900", marginBottom: 6 },
  payDesc: { fontSize: 12, fontWeight: "700" },

  // fee summary (in-scroll)
  feeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  feeLabel: { fontSize: 12, fontWeight: "800" },
  feeValue: { fontSize: 12, fontWeight: "900" },
  hr: { height: 1, marginTop: 12 },
  feeTotalLabel: { fontSize: 14, fontWeight: "900", marginTop: 10 },
  feeTotalValue: { fontSize: 14, fontWeight: "900", marginTop: 10 },

  // bottom sticky
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SP.pageX,
    borderTopWidth: 1,
    gap: 10,
  },
  stickySummary: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stickyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stickyLabel: { fontSize: 12, fontWeight: "900" },
  stickyTotal: { fontSize: 18, fontWeight: "900" },
  stickySubRow: { marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stickySub: { fontSize: 12, fontWeight: "800" },

});
