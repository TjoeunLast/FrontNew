import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { setCreateOrderDraft } from "@/features/shipper/create-order/model/createOrderDraft";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { Card } from "@/shared/ui/base/Card";

import {
  CAR_TYPE_OPTIONS,
  DEFAULT_PHOTOS,
  DEFAULT_SELECTED_REQUEST_TAGS,
  getEstimatedDistanceKm,
  getRecommendedFareByDistance,
  PRESET_REQUEST_TAGS,
  RECENT_ADDRESS_POOL,
  RECENT_START_OPTIONS,
  SP,
  TON_OPTIONS,
} from "./createOrderStep1.constants";
import {
  Chip,
  ChoiceCard,
  CreateOrderTopBar,
  InlineDropdownField,
  PaymentTile,
  SectionTitle,
} from "./createOrderStep1.components";
import { s } from "./createOrderStep1.styles";
import {
  type ArriveType,
  ARRIVE_OPTIONS,
  type DispatchType,
  LOAD_DAY_OPTIONS,
  type LoadDayType,
  type Option,
  type PayType,
  PAYMENT_OPTIONS,
  TRIP_OPTIONS,
  type TripType,
} from "./createOrderStep1.types";
import { addDays, isSameDay, parseWonInput, toKoreanDateText, won } from "./createOrderStep1.utils";

export function ShipperCreateOrderStep1Screen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [startSelected, setStartSelected] = useState("");
  const [startAddrDetail, setStartAddrDetail] = useState("");
  const [startContact, setStartContact] = useState("");
  const [startSearch, setStartSearch] = useState("");
  const [loadDay, setLoadDay] = useState<LoadDayType>("당상(오늘)");
  const [loadDate, setLoadDate] = useState(new Date());
  const [loadDatePickerOpen, setLoadDatePickerOpen] = useState(false);
  const [startTimeHHmm, setStartTimeHHmm] = useState("09:00");
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false);
  const [endAddr, setEndAddr] = useState("");
  const [endAddrDetail, setEndAddrDetail] = useState("");
  const [endContact, setEndContact] = useState("");
  const [endTimeHHmm, setEndTimeHHmm] = useState("18:00");
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);
  const [arriveType, setArriveType] = useState<ArriveType>("당착");

  const [carType, setCarType] = useState<Option>(CAR_TYPE_OPTIONS[1]);
  const [ton, setTon] = useState<Option>(TON_OPTIONS[3]);
  const [cargoDetail, setCargoDetail] = useState("");
  const [weightTon, setWeightTon] = useState("0");

  const [selectedRequestTags, setSelectedRequestTags] = useState<string[]>(DEFAULT_SELECTED_REQUEST_TAGS);
  const [customRequestOpen, setCustomRequestOpen] = useState(false);
  const [customRequestText, setCustomRequestText] = useState("");

  const [photos, setPhotos] = useState(DEFAULT_PHOTOS);
  const [dispatch, setDispatch] = useState<DispatchType>("instant");
  const [tripType, setTripType] = useState<TripType>("oneWay");
  const [pay, setPay] = useState<PayType>("receipt30");
  const [fareInput, setFareInput] = useState("");
  const [appliedBaseFare, setAppliedBaseFare] = useState(0);
  const [carDropdownOpen, setCarDropdownOpen] = useState(false);
  const [tonDropdownOpen, setTonDropdownOpen] = useState(false);
  const distanceKm = useMemo(
    () => getEstimatedDistanceKm(startSelected || startSearch, endAddr),
    [startSelected, startSearch, endAddr]
  );
  const aiFare = useMemo(() => getRecommendedFareByDistance(distanceKm), [distanceKm]);

  const adjustFareByTripType = (baseFare: number) => {
    if (tripType === "roundTrip") return Math.round(baseFare * 1.8);
    return baseFare;
  };

  const appliedFare = useMemo(() => adjustFareByTripType(appliedBaseFare), [appliedBaseFare, tripType]);

  const fee = useMemo(() => {
    if (pay === "card") return Math.round(appliedFare * 0.1);
    return 0;
  }, [appliedFare, pay]);

  const totalPay = useMemo(() => appliedFare + fee, [appliedFare, fee]);

  const startAddrSuggestions = useMemo(() => {
    const q = startSearch.trim();
    const pool = RECENT_START_OPTIONS.map((item) => item.label);
    if (!q) return pool.slice(0, 2);
    return pool.filter((addr) => addr.includes(q) && addr !== q).slice(0, 2);
  }, [startSearch]);

  const endAddrSuggestions = useMemo(() => {
    const q = endAddr.trim();
    if (!q) return [];
    return RECENT_ADDRESS_POOL.filter((addr) => addr.includes(q) && addr !== q).slice(0, 2);
  }, [endAddr]);

  const toggleRequestTag = (tag: string) => {
    setSelectedRequestTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  };

  const addPhoto = () => {
    Alert.alert("TODO", "이미지 선택(Expo ImagePicker) 연결");
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const applyFare = () => {
    const v = parseWonInput(fareInput);
    if (v <= 0) {
      Alert.alert("확인", "희망 운임을 입력해주세요.");
      return;
    }
    setAppliedBaseFare(v);
  };

  const applyAiFare = () => {
    setFareInput(String(aiFare));
    setAppliedBaseFare(aiFare);
  };

  const isValidHHmm = (v: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v.trim());
  const formatHHmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const hhmmToDate = (hhmm: string) => {
    const d = new Date();
    const m = hhmm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (m) {
      d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    }
    return d;
  };

  const submit = () => {
    const resolvedStartAddr = (startSelected || startSearch).trim();
    if (!resolvedStartAddr) {
      Alert.alert("필수", "상차지 주소를 입력해주세요.");
      return;
    }
    if (!startAddrDetail.trim()) {
      Alert.alert("필수", "상차지 상세 주소를 입력해주세요.");
      return;
    }
    if (!startContact.trim()) {
      Alert.alert("필수", "상차지 연락처를 입력해주세요.");
      return;
    }
    if (!isValidHHmm(startTimeHHmm)) {
      Alert.alert("필수", "상차 시간을 HH:MM 형식으로 입력해주세요.");
      return;
    }
    if (!endAddr.trim()) {
      Alert.alert("필수", "하차지 주소를 입력해주세요.");
      return;
    }
    if (!endAddrDetail.trim()) {
      Alert.alert("필수", "하차지 상세 주소를 입력해주세요.");
      return;
    }
    if (!endContact.trim()) {
      Alert.alert("필수", "하차지 연락처를 입력해주세요.");
      return;
    }
    if (!isValidHHmm(endTimeHHmm)) {
      Alert.alert("필수", "하차 시간을 HH:MM 형식으로 입력해주세요.");
      return;
    }
    if (appliedFare <= 0) {
      Alert.alert("필수", "희망 운임을 입력 후 적용해주세요.");
      return;
    }

    setCreateOrderDraft({
      startSelected: resolvedStartAddr,
      startAddrDetail: startAddrDetail.trim(),
      startContact: startContact.trim(),
      loadDay,
      loadDateISO: loadDate.toISOString(),
      startTimeHHmm: startTimeHHmm.trim(),
      endAddr: endAddr.trim(),
      endAddrDetail: endAddrDetail.trim(),
      endContact: endContact.trim(),
      endTimeHHmm: endTimeHHmm.trim(),
      arriveType,
      carType,
      ton,
      cargoDetail: cargoDetail.trim(),
      weightTon: weightTon.trim(),
      requestTags: selectedRequestTags,
      requestText: customRequestText.trim(),
      photos,
      dispatch,
      tripType,
      pay,
      distanceKm,
      appliedFare,
    });

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
    if (Platform.OS === "android") setLoadDatePickerOpen(false);
    if (event.type === "dismissed" || !picked) return;

    const today = new Date();
    const tomorrow = addDays(today, 1);

    if (isSameDay(picked, today)) setLoadDay("당상(오늘)");
    else if (isSameDay(picked, tomorrow)) setLoadDay("익상(내일)");
    else setLoadDay("직접 지정");

    setLoadDate(picked);
  };

  const onChangeStartTime = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setStartTimePickerOpen(false);
    if (event.type === "dismissed" || !picked) return;
    setStartTimeHHmm(formatHHmm(picked));
  };

  const onChangeEndTime = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setEndTimePickerOpen(false);
    if (event.type === "dismissed" || !picked) return;
    setEndTimeHHmm(formatHHmm(picked));
  };

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <CreateOrderTopBar onBack={() => router.back()} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="구간 및 일시" />
        <Card padding={16} style={{ marginBottom: SP.sectionGap }}>
          <View style={s.timelineRow}>
            <View style={s.timelineLeft}>
              <View style={[s.circle, { backgroundColor: c.brand.primary }]}>
                <Text style={[s.circleText, { color: c.text.inverse }]}>출발</Text>
              </View>
              <View style={[s.lineV, { backgroundColor: c.border.default }]} />
            </View>

            <View style={s.timelineBody}>
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>상차지 정보</Text>

              <View style={[s.searchField, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
                <TextInput
                  value={startSearch}
                  onChangeText={(v) => {
                    setStartSearch(v);
                    setStartSelected(v.trim());
                  }}
                  placeholder="상차지 주소를 검색해주세요"
                  placeholderTextColor={c.text.secondary}
                  style={[s.searchInput, { color: c.text.primary }]}
                />
                <Ionicons name="search" size={18} color={c.text.secondary} />
              </View>

              {startAddrSuggestions.length ? (
                <View
                  style={[
                    s.addressSuggestWrap,
                    { borderColor: c.border.default, backgroundColor: c.bg.surface, marginTop: 8 },
                  ]}
                >
                  {startAddrSuggestions.map((addr) => (
                    <Pressable
                      key={addr}
                      onPress={() => {
                        setStartSelected(addr);
                        setStartSearch(addr);
                      }}
                      style={[s.addressSuggestItem, { borderColor: c.border.default }]}
                    >
                      <Ionicons name="time-outline" size={14} color={c.text.secondary} />
                      <Text style={[s.addressSuggestText, { color: c.text.primary }]} numberOfLines={1}>
                        {addr}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {(startSelected || startSearch).trim() ? (
                <>
                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.fieldLabel, { color: c.text.primary }]}>상세 주소</Text>
                    <View style={[s.inputWrap, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
                      <TextInput
                        value={startAddrDetail}
                        onChangeText={setStartAddrDetail}
                        placeholder="예: A동 2층 203호"
                        placeholderTextColor={c.text.secondary}
                        style={[s.input, { color: c.text.primary }]}
                      />
                    </View>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.fieldLabel, { color: c.text.primary }]}>연락처</Text>
                    <View style={[s.inputWrap, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
                      <TextInput
                        value={startContact}
                        onChangeText={setStartContact}
                        placeholder="예: 010-1234-5678"
                        keyboardType="phone-pad"
                        placeholderTextColor={c.text.secondary}
                        style={[s.input, { color: c.text.primary }]}
                      />
                    </View>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.fieldLabel, { color: c.text.primary }]}>상차 시간</Text>
                    <Pressable
                      onPress={() => setStartTimePickerOpen((v) => !v)}
                      style={[s.inputWrap, { backgroundColor: c.bg.surface, borderColor: c.border.default, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                    >
                      <Text style={[s.input, { color: c.text.primary }]}>{startTimeHHmm}</Text>
                      <Ionicons name="time-outline" size={16} color={c.text.secondary} />
                    </Pressable>
                    {startTimePickerOpen ? (
                      <View style={{ marginTop: 8 }}>
                        <DateTimePicker
                          value={hhmmToDate(startTimeHHmm)}
                          mode="time"
                          display={Platform.OS === "ios" ? "spinner" : "default"}
                          onChange={onChangeStartTime}
                        />
                      </View>
                    ) : null}
                  </View>
                </>
              ) : null}

              <View style={s.chipRow}>
                {LOAD_DAY_OPTIONS.map((v) => (
                  <Chip key={v} label={v} selected={loadDay === v} onPress={() => onSelectLoadDay(v)} />
                ))}
              </View>

              {loadDay === "직접 지정" ? (
                <Pressable
                  onPress={() => setLoadDatePickerOpen((v) => !v)}
                  style={[s.dateRow, { borderColor: c.border.default, backgroundColor: c.bg.surface }]}
                >
                  <View style={s.dateLabelRow}>
                    <Ionicons name="calendar-outline" size={16} color={c.text.secondary} />
                    <Text style={[s.dateValueText, { color: c.text.primary }]}>상차일: {toKoreanDateText(loadDate)}</Text>
                  </View>
                  <Text style={[s.dateValueText, { color: c.brand.primary }]}>날짜 선택</Text>
                </Pressable>
              ) : null}

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

              {endAddr.trim() ? (
                <>
                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.fieldLabel, { color: c.text.primary }]}>상세 주소</Text>
                    <View style={[s.inputWrap, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
                      <TextInput
                        value={endAddrDetail}
                        onChangeText={setEndAddrDetail}
                        placeholder="예: A동 3층 305호"
                        placeholderTextColor={c.text.secondary}
                        style={[s.input, { color: c.text.primary }]}
                      />
                    </View>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.fieldLabel, { color: c.text.primary }]}>연락처</Text>
                    <View style={[s.inputWrap, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
                      <TextInput
                        value={endContact}
                        onChangeText={setEndContact}
                        placeholder="예: 010-1234-5678"
                        keyboardType="phone-pad"
                        placeholderTextColor={c.text.secondary}
                        style={[s.input, { color: c.text.primary }]}
                      />
                    </View>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.fieldLabel, { color: c.text.primary }]}>하차 시간</Text>
                    <Pressable
                      onPress={() => setEndTimePickerOpen((v) => !v)}
                      style={[s.inputWrap, { backgroundColor: c.bg.surface, borderColor: c.border.default, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                    >
                      <Text style={[s.input, { color: c.text.primary }]}>{endTimeHHmm}</Text>
                      <Ionicons name="time-outline" size={16} color={c.text.secondary} />
                    </Pressable>
                    {endTimePickerOpen ? (
                      <View style={{ marginTop: 8 }}>
                        <DateTimePicker
                          value={hhmmToDate(endTimeHHmm)}
                          mode="time"
                          display={Platform.OS === "ios" ? "spinner" : "default"}
                          onChange={onChangeEndTime}
                        />
                      </View>
                    ) : null}
                  </View>
                </>
              ) : null}

              <View style={s.chipRow}>
                {ARRIVE_OPTIONS.map((v) => (
                  <Chip key={v} label={v} selected={arriveType === v} onPress={() => setArriveType(v)} />
                ))}
              </View>
            </View>
          </View>
        </Card>

        <SectionTitle title="차량 및 화물 정보" />
        <Card padding={16} style={{ marginBottom: SP.sectionGap }}>
          <View style={s.twoSelectRow}>
            <InlineDropdownField
              label="차종"
              valueLabel={carType.label}
              placeholder="차종 선택"
              open={carDropdownOpen}
              options={CAR_TYPE_OPTIONS}
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
              options={TON_OPTIONS}
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

          <Text style={[s.fieldLabel, { color: c.text.primary }]}>요청사항</Text>

          <View style={s.tagWrap}>
            {PRESET_REQUEST_TAGS.map((tag) => {
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
              label="직접 입력"
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

        <SectionTitle title="배차 및 운임" />
        <Card padding={16} style={{ marginBottom: SP.sectionGap }}>
          <Text style={[s.fieldLabel, { color: c.brand.primary, fontWeight: "900" }]}>배차 방식 선택</Text>

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

          <View style={[s.aiBox, { backgroundColor: c.brand.primarySoft, borderColor: c.border.default }]}>
            <View style={{ marginBottom: 10 }}>
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>운행 형태</Text>
              <View style={s.chipRow}>
                {TRIP_OPTIONS.map((item) => (
                  <Chip
                    key={item.value}
                    label={item.label}
                    selected={tripType === item.value}
                    onPress={() => setTripType(item.value)}
                  />
                ))}
              </View>
            </View>

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
              적용된 운임: <Text style={{ color: c.brand.primary, fontWeight: "900" }}>{won(appliedFare)}</Text>
              {tripType === "roundTrip" ? " (왕복 1.8배 적용)" : ""}
            </Text>
          </View>

          <Text style={[s.fieldLabel, { color: c.text.primary, marginTop: 16 }]}>
            결제 및 지급 시기 <Text style={{ color: c.status.danger }}>*</Text>
          </Text>

          <View style={s.payGrid}>
            {PAYMENT_OPTIONS.map((item) => (
              <PaymentTile
                key={item.value}
                title={item.title}
                desc={item.desc}
                selected={pay === item.value}
                onPress={() => setPay(item.value)}
              />
            ))}
          </View>

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

        <View style={{ height: 150 + insets.bottom }} />
      </ScrollView>

      <View
        style={[
          s.bottomBar,
          { backgroundColor: c.bg.canvas, borderTopColor: c.border.default, paddingBottom: 16 + insets.bottom },
        ]}
      >
        <View style={[s.stickySummary, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
          <View style={s.stickyRow}>
            <Text style={[s.stickyLabel, { color: c.text.secondary }]}>최종 결제 금액</Text>
            <Text style={[s.stickyTotal, { color: c.text.primary }]}>{won(totalPay)}</Text>
          </View>

          <View style={s.stickySubRow}>
            <Text style={[s.stickySub, { color: c.text.secondary }]}>희망 운임 {won(appliedFare)}</Text>
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
