import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getCreateOrderDraft,
  setCreateOrderDraft,
} from "@/features/shipper/create-order/model/createOrderDraft";
import { AddressApi } from "@/shared/api/addressService";
import { RouteApi } from "@/shared/api/routeService";
import { UserService } from "@/shared/api/userService";
import { useShipperOrderFeePreview } from "@/shared/hooks/useShipperOrderFeePreview";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { Card } from "@/shared/ui/base/Card";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

// 기존 import들 사이에 추가!
import AddressSearch from "@/shared/utils/AddressSearch";
import { SearchableAddressField } from "./createOrderStep1.components"; // InlineDropdownField 옆에 추가로 불러오세요.

import { isShipperActivePaymentMethod } from "@/features/common/payment/lib/paymentMethods";
import {
  Chip,
  ChoiceCard,
  InlineDropdownField,
  PaymentTile,
  SectionTitle,
} from "./createOrderStep1.components";
import {
  CAR_TYPE_OPTIONS,
  getEstimatedDistanceKm,
  getRecommendedFareByDistance,
  SP,
  TON_OPTIONS,
} from "./createOrderStep1.constants";
import { s } from "./createOrderStep1.styles";
import {
  ARRIVE_OPTIONS,
  type ArriveType,
  type DispatchType,
  LOAD_DAY_OPTIONS,
  type LoadDayType,
  type Option,
  PAYMENT_OPTIONS,
  type PayType,
  TRIP_OPTIONS,
  type TripType,
} from "./createOrderStep1.types";
import {
  addDays,
  isSameDay,
  parseWonInput,
  toKoreanDateText,
  won,
} from "./createOrderStep1.utils";

function parseOptionTonnage(option: Option) {
  const normalizedValue = option.value.replace(/_/g, ".");
  const parsedValue = Number.parseFloat(normalizedValue);
  if (Number.isFinite(parsedValue)) return parsedValue;

  const match = option.label.match(/[0-9]+(\.[0-9]+)?/);
  if (match) return Number.parseFloat(match[0]);

  return 0;
}

function sanitizeWeightTonInput(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, "");
  const [integerPart = "", ...decimalParts] = sanitized.split(".");
  if (!decimalParts.length) return integerPart;
  return `${integerPart}.${decimalParts.join("")}`;
}

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function roundUpToNextMinute(date: Date) {
  const next = new Date(date);
  if (next.getSeconds() > 0 || next.getMilliseconds() > 0) {
    next.setMinutes(next.getMinutes() + 1);
  }
  next.setSeconds(0, 0);
  return next;
}

function isValidHHmm(v: string) {
  return HHMM_REGEX.test(v.trim());
}

function formatHHmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function hhmmToDate(hhmm: string) {
  const d = new Date();
  const m = hhmm.match(HHMM_REGEX);
  if (m) {
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  }
  return d;
}

function isPastLoadDate(date: Date, now = new Date()) {
  return startOfDay(date).getTime() < startOfDay(now).getTime();
}

function clampLoadDateToToday(date: Date, now = new Date()) {
  return isPastLoadDate(date, now) ? now : date;
}

function getMinimumAllowedDateTime(baseDate: Date, now = new Date()) {
  return isSameDay(baseDate, now) ? roundUpToNextMinute(now) : null;
}

function toScheduledDateTime(baseDate: Date, hhmm: string) {
  const match = hhmm.trim().match(HHMM_REGEX);
  if (!match) return null;

  const next = new Date(baseDate);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return next;
}

function isPastDateTime(baseDate: Date, hhmm: string, now = new Date()) {
  const scheduled = toScheduledDateTime(baseDate, hhmm);
  if (!scheduled) return false;

  const minAllowed = getMinimumAllowedDateTime(baseDate, now);
  return minAllowed ? scheduled.getTime() < minAllowed.getTime() : false;
}

function getDefaultTimeForDate(baseDate: Date, fallbackHHmm: string) {
  const minAllowed = getMinimumAllowedDateTime(baseDate);
  return minAllowed ? formatHHmm(minAllowed) : fallbackHHmm;
}

function getSafeTimeText(
  baseDate: Date,
  rawHHmm: string | undefined,
  fallbackHHmm: string,
) {
  const trimmed = rawHHmm?.trim() ?? "";
  if (isValidHHmm(trimmed) && !isPastDateTime(baseDate, trimmed)) {
    return trimmed;
  }
  return getDefaultTimeForDate(baseDate, fallbackHHmm);
}

function getSafeOptionalTimeText(baseDate: Date, rawHHmm: string | undefined) {
  const trimmed = rawHHmm?.trim() ?? "";
  if (isValidHHmm(trimmed) && !isPastDateTime(baseDate, trimmed)) {
    return trimmed;
  }
  return "";
}

function getTimePickerValue(
  baseDate: Date,
  rawHHmm: string | undefined,
  fallbackHHmm: string,
) {
  const trimmed = rawHHmm?.trim() ?? "";
  if (isValidHHmm(trimmed) && !isPastDateTime(baseDate, trimmed)) {
    return hhmmToDate(trimmed);
  }

  const minAllowed = getMinimumAllowedDateTime(baseDate);
  if (minAllowed) return minAllowed;

  return hhmmToDate(fallbackHHmm);
}

export function ShipperCreateOrderStep1Screen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const initialDraft = getCreateOrderDraft();
  const initialLoadDate = initialDraft?.loadDateISO
    ? clampLoadDateToToday(new Date(initialDraft.loadDateISO))
    : new Date();
  const normalizeLoadDay = (v?: string): LoadDayType => {
    if (v === "당상(오늘)" || v === "당상") return "당상";
    if (v === "익상(내일)" || v === "익상") return "익상";
    return "직접 지정";
  };

  const [startSelected, setStartSelected] = useState(
    initialDraft?.startSelected ?? "",
  );
  const [startLat, setStartLat] = useState<number | undefined>(
    initialDraft?.startLat,
  );
  const [startLng, setStartLng] = useState<number | undefined>(
    initialDraft?.startLng,
  );
  const [startAddrDetail, setStartAddrDetail] = useState(
    initialDraft?.startAddrDetail ?? "",
  );
  const [startSearch, setStartSearch] = useState(
    initialDraft?.startSelected ?? "",
  );
  const [loadDay, setLoadDay] = useState<LoadDayType>(
    normalizeLoadDay(initialDraft?.loadDay),
  );
  const [loadDate, setLoadDate] = useState(
    initialLoadDate,
  );
  const [loadDatePickerOpen, setLoadDatePickerOpen] = useState(false);
  const [startTimeHHmm, setStartTimeHHmm] = useState(
    getSafeTimeText(initialLoadDate, initialDraft?.startTimeHHmm, "09:00"),
  );
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false);
  const [endAddr, setEndAddr] = useState(initialDraft?.endAddr ?? "");
  const [endLat, setEndLat] = useState<number | undefined>(
    initialDraft?.endLat,
  );
  const [endLng, setEndLng] = useState<number | undefined>(
    initialDraft?.endLng,
  );
  const [endAddrDetail, setEndAddrDetail] = useState(
    initialDraft?.endAddrDetail ?? "",
  );
  const [endTimeHHmm, setEndTimeHHmm] = useState(
    getSafeOptionalTimeText(initialLoadDate, initialDraft?.endTimeHHmm),
  );
  const [lastEndTimeHHmm, setLastEndTimeHHmm] = useState(() => {
    return getSafeTimeText(initialLoadDate, initialDraft?.endTimeHHmm, "18:00");
  });
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);
  const [arriveType, setArriveType] = useState<ArriveType>(
    initialDraft?.arriveType ?? "당착",
  );

  const [carType, setCarType] = useState<Option>(
    initialDraft?.carType ?? CAR_TYPE_OPTIONS[1],
  );
  const [ton, setTon] = useState<Option>(initialDraft?.ton ?? TON_OPTIONS[3]);
  const [cargoDetail, setCargoDetail] = useState(
    initialDraft?.cargoDetail ?? "",
  );
  const [weightTon, setWeightTon] = useState(initialDraft?.weightTon ?? "0");
  const [dispatch, setDispatch] = useState<DispatchType>(
    initialDraft?.dispatch ?? "instant",
  );
  const [autoDispatchLocked, setAutoDispatchLocked] = useState(
    initialDraft?.autoDispatchLocked ?? false,
  );
  const [tripType, setTripType] = useState<TripType>(
    initialDraft?.tripType ?? "oneWay",
  );
  const [pay, setPay] = useState<PayType>(
    isShipperActivePaymentMethod(initialDraft?.pay)
      ? initialDraft?.pay
      : "card",
  );
  const [fareInput, setFareInput] = useState(
    initialDraft?.appliedFare ? String(initialDraft.appliedFare) : "",
  );
  const [appliedBaseFare, setAppliedBaseFare] = useState(() => {
    if (!initialDraft) return 0;
    if (initialDraft.tripType === "roundTrip")
      return Math.max(0, Math.round(initialDraft.appliedFare / 1.8));
    return initialDraft.appliedFare;
  });
  const [carDropdownOpen, setCarDropdownOpen] = useState(false);
  const [tonDropdownOpen, setTonDropdownOpen] = useState(false);

  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);

  const [startAddrSuggestions, setStartAddrSuggestions] = useState<string[]>(
    [],
  );
  const [endAddrSuggestions, setEndAddrSuggestions] = useState<string[]>([]);
  const fallbackDistanceKm = useMemo(
    () => getEstimatedDistanceKm(startSelected || startSearch, endAddr),
    [startSelected, startSearch, endAddr],
  );
  const [distanceKm, setDistanceKm] = useState(
    initialDraft?.distanceKm ?? fallbackDistanceKm,
  );
  const [userLevel, setUserLevel] = useState<number | undefined>(
    initialDraft?.userLevel,
  );
  const [estimatedDurationMin, setEstimatedDurationMin] = useState<
    number | undefined
  >(initialDraft?.estimatedDurationMin);
  const aiFare = useMemo(
    () => getRecommendedFareByDistance(distanceKm),
    [distanceKm],
  );

  const adjustFareByTripType = (baseFare: number) => {
    if (tripType === "roundTrip") return Math.round(baseFare * 1.8);
    return baseFare;
  };

  const aiDisplayedFare = useMemo(
    () => adjustFareByTripType(aiFare),
    [aiFare, tripType],
  );
  const appliedFare = useMemo(
    () => adjustFareByTripType(appliedBaseFare),
    [appliedBaseFare, tripType],
  );

  React.useEffect(() => {
    let active = true;
    if (initialDraft?.userLevel !== undefined) {
      setUserLevel(initialDraft.userLevel);
      return () => {
        active = false;
      };
    }

    void UserService.getMyInfo()
      .then((me) => {
        if (!active) return;
        setUserLevel(me.userLevel);
      })
      .catch(() => {
        if (!active) return;
        setUserLevel(undefined);
      });

    return () => {
      active = false;
    };
  }, [initialDraft?.userLevel]);

  const {
    preview: shipperFeePreview,
    isFallback: isFeePreviewFallback,
    isLoading: isFeePreviewLoading,
  } = useShipperOrderFeePreview({
    baseFare: appliedFare,
    payMethod: pay,
    userLevel,
  });
  const feePreviewBannerText = isFeePreviewLoading
    ? "서버 preview를 확인 중입니다. 현재 금액은 임시 예상치로 표시됩니다."
    : isFeePreviewFallback
      ? "서버 preview를 불러오지 못했습니다. 현재 금액은 임시 예상치입니다."
      : pay === "card"
        ? `Toss 10% 선차감 후 남은 ${won(shipperFeePreview.postTossBaseAmount)} 기준으로 shipper side fee ${shipperFeePreview.appliedRateText}가 계산됩니다.${shipperFeePreview.promoApplied ? " shipper promo가 적용되었습니다." : ""}${shipperFeePreview.minFeeApplied ? " 최소 수수료가 반영되었습니다." : ""}`
        : "최종 결제금액 안에서 shipper side fee가 내부 배분 기준으로 계산됩니다.";
  const shipperFeeLabel =
    pay === "card" && shipperFeePreview.appliedRateText !== "0%"
      ? `shipper side fee 배분액 (${shipperFeePreview.appliedRateText})`
      : "shipper side fee";
  const promoStatusText =
    pay !== "card"
      ? "해당 없음"
      : shipperFeePreview.promoApplied === null
        ? isFeePreviewLoading
          ? "확인 중"
          : "서버 확인 필요"
        : shipperFeePreview.promoApplied
          ? "적용"
          : "미적용";
  const fee = shipperFeePreview.feeAmount;
  const totalPay = shipperFeePreview.chargedTotal;
  const feePreviewBannerColor = isFeePreviewFallback || isFeePreviewLoading
    ? c.status.warning
    : c.brand.primary;
  const feePreviewBannerBackground = isFeePreviewFallback || isFeePreviewLoading
    ? c.status.warningSoft
    : c.brand.primarySoft;
  const feePreviewBannerIcon = isFeePreviewFallback
    ? "alert-circle-outline"
    : isFeePreviewLoading
      ? "time-outline"
      : "checkmark-circle-outline";
  const vehicleTonnage = useMemo(() => parseOptionTonnage(ton), [ton]);
  const startTimePickerValue = useMemo(
    () => getTimePickerValue(loadDate, startTimeHHmm, "09:00"),
    [loadDate, startTimeHHmm],
  );
  const endTimePickerValue = useMemo(
    () => getTimePickerValue(loadDate, endTimeHHmm || lastEndTimeHHmm, "18:00"),
    [endTimeHHmm, lastEndTimeHHmm, loadDate],
  );
  const trimmedWeightTon = weightTon.trim();
  const parsedWeightTon = Number.parseFloat(trimmedWeightTon);
  const hasWeightTonInput = trimmedWeightTon.length > 0;
  const weightTonError = useMemo(() => {
    if (!hasWeightTonInput) return "";
    if (!Number.isFinite(parsedWeightTon) || parsedWeightTon <= 0) {
      return "중량은 0보다 큰 숫자만 입력할 수 있습니다.";
    }
    if (parsedWeightTon >= vehicleTonnage) {
      return `차량 톤수(${ton.label})보다 가벼운 중량만 입력하세요.`;
    }
    return "";
  }, [hasWeightTonInput, parsedWeightTon, ton.label, vehicleTonnage]);
  const hasWeightTonError = weightTonError.length > 0;

  const fetchAddressSuggestions = React.useCallback(
    async (
      rawQuery: string,
      onDone: (rows: string[]) => void,
      minLength: number,
    ) => {
      const q = rawQuery.trim();
      if (q.length < minLength) {
        onDone([]);
        return;
      }
      try {
        const rows = await AddressApi.search(q);
        onDone(rows.filter((addr) => addr !== q).slice(0, 5));
      } catch {
        onDone([]);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (
      startLat === undefined ||
      startLng === undefined ||
      endLat === undefined ||
      endLng === undefined
    ) {
      console.log("[RouteEstimate] skipped: missing coordinates", {
        startLat,
        startLng,
        endLat,
        endLng,
      });
      setDistanceKm(fallbackDistanceKm);
      setEstimatedDurationMin(undefined);
      return;
    }

    let active = true;
    void (async () => {
      try {
        console.log("[RouteEstimate] request", {
          startLat,
          startLng,
          endLat,
          endLng,
        });
        const route = await RouteApi.estimateByCoords({
          startLat,
          startLng,
          endLat,
          endLng,
        });
        if (!active) return;
        console.log("[RouteEstimate] success", route);
        setDistanceKm(route.distanceKm);
        setEstimatedDurationMin(route.durationMin);
      } catch (error) {
        if (!active) return;
        console.error("[RouteEstimate] failed", error);
        setDistanceKm(fallbackDistanceKm);
        setEstimatedDurationMin(undefined);
      }
    })();

    return () => {
      active = false;
    };
  }, [endLat, endLng, fallbackDistanceKm, startLat, startLng]);

  React.useEffect(() => {
    const q = startSearch.trim();
    if (q.length < 1) {
      setStartAddrSuggestions([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      await fetchAddressSuggestions(
        q,
        (rows) => {
          if (!active) return;
          setStartAddrSuggestions(rows);
        },
        1,
      );
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchAddressSuggestions, startSearch]);

  React.useEffect(() => {
    const q = endAddr.trim();
    if (q.length < 1) {
      setEndAddrSuggestions([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      await fetchAddressSuggestions(
        q,
        (rows) => {
          if (!active) return;
          setEndAddrSuggestions(rows);
        },
        1,
      );
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [endAddr, fetchAddressSuggestions]);

  React.useEffect(() => {
    if (isPastLoadDate(loadDate)) {
      setLoadDate(new Date());
      setLoadDay("당상");
      return;
    }

    const minAllowed = getMinimumAllowedDateTime(loadDate);
    if (!minAllowed) return;

    const minHHmm = formatHHmm(minAllowed);
    if (isPastDateTime(loadDate, startTimeHHmm)) {
      setStartTimeHHmm(minHHmm);
    }
    if (endTimeHHmm.trim() && isPastDateTime(loadDate, endTimeHHmm)) {
      setEndTimeHHmm(minHHmm);
      setLastEndTimeHHmm(minHHmm);
    }
  }, [endTimeHHmm, loadDate, startTimeHHmm]);

  const onPressStartSearch = () => {
    void fetchAddressSuggestions(startSearch, setStartAddrSuggestions, 1);
  };

  const onPressEndSearch = () => {
    void fetchAddressSuggestions(endAddr, setEndAddrSuggestions, 1);
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

  const submit = () => {
    const resolvedStartAddr = (startSelected || startSearch).trim();
    if (isPastLoadDate(loadDate)) {
      Alert.alert("확인", "지난 날짜는 선택할 수 없습니다.");
      return;
    }
    if (!resolvedStartAddr) {
      Alert.alert("필수", "상차지 주소를 입력해주세요.");
      return;
    }
    if (!startAddrDetail.trim()) {
      Alert.alert("필수", "상차지 상세 주소를 입력해주세요.");
      return;
    }
    if (!isValidHHmm(startTimeHHmm)) {
      Alert.alert("필수", "상차 시간을 HH:MM 형식으로 입력해주세요.");
      return;
    }
    if (isPastDateTime(loadDate, startTimeHHmm)) {
      Alert.alert("확인", "지난 상차 시간은 선택할 수 없습니다.");
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
    if (endTimeHHmm.trim() && !isValidHHmm(endTimeHHmm)) {
      Alert.alert("확인", "하차 시간은 HH:MM 형식으로 입력해주세요.");
      return;
    }
    if (endTimeHHmm.trim() && isPastDateTime(loadDate, endTimeHHmm)) {
      Alert.alert("확인", "지난 하차 시간은 선택할 수 없습니다.");
      return;
    }
    if (!cargoDetail.trim()) {
      Alert.alert("필수", "물품상세를 입력해주세요.");
      return;
    }
    if (!weightTon.trim()) {
      Alert.alert("필수", "중량(톤)을 입력해주세요.");
      return;
    }
    if (!Number.isFinite(parsedWeightTon) || parsedWeightTon <= 0) {
      Alert.alert("필수", "중량(톤)은 0보다 큰 숫자로 입력해주세요.");
      return;
    }
    if (parsedWeightTon >= vehicleTonnage) {
      Alert.alert(
        "중량 확인",
        `차량 톤수(${ton.label})보다 가벼운 중량만 입력하세요.`,
      );
      return;
    }
    if (appliedFare <= 0) {
      Alert.alert("필수", "희망 운임을 입력 후 적용해주세요.");
      return;
    }

    setCreateOrderDraft({
      editOrderId: initialDraft?.editOrderId,
      startSelected: resolvedStartAddr,
      startLat,
      startLng,
      startAddrDetail: startAddrDetail.trim(),
      loadDay,
      loadDateISO: loadDate.toISOString(),
      startTimeHHmm: startTimeHHmm.trim(),
      endAddr: endAddr.trim(),
      endLat,
      endLng,
      endAddrDetail: endAddrDetail.trim(),
      endTimeHHmm: endTimeHHmm.trim(),
      arriveType,
      carType,
      ton,
      cargoDetail: cargoDetail.trim(),
      weightTon: weightTon.trim(),
      requestTags: [],
      requestText: "",
      dispatch,
      autoDispatchLocked,
      tripType,
      pay,
      userLevel,
      distanceKm,
      estimatedDurationMin,
      appliedFare,
    });

    router.push("/(shipper)/create-order/step2-cargo");
  };

  const onSelectLoadDay = (v: LoadDayType) => {
    setLoadDay(v);

    if (v === "당상") {
      setLoadDate(new Date());
      setLoadDatePickerOpen(false);
      return;
    }

    if (v === "익상") {
      setLoadDate(addDays(new Date(), 1));
      setLoadDatePickerOpen(false);
      return;
    }

    setLoadDatePickerOpen(true);
  };

  const onChangeLoadDate = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setLoadDatePickerOpen(false);
    if (event.type === "dismissed" || !picked) return;

    if (isPastLoadDate(picked)) {
      Alert.alert("확인", "지난 날짜는 선택할 수 없습니다.");
      setLoadDate(new Date());
      setLoadDay("당상");
      return;
    }

    const today = new Date();
    const tomorrow = addDays(today, 1);

    if (isSameDay(picked, today)) setLoadDay("당상");
    else if (isSameDay(picked, tomorrow)) setLoadDay("익상");
    else setLoadDay("직접 지정");

    setLoadDate(picked);
  };

  const onChangeStartTime = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setStartTimePickerOpen(false);
    if (event.type === "dismissed" || !picked) return;
    const next = formatHHmm(picked);
    if (isPastDateTime(loadDate, next)) {
      Alert.alert("확인", "지난 상차 시간은 선택할 수 없습니다.");
      return;
    }
    setStartTimeHHmm(next);
  };

  const onChangeEndTime = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setEndTimePickerOpen(false);
    if (event.type === "dismissed" || !picked) return;
    const next = formatHHmm(picked);
    if (isPastDateTime(loadDate, next)) {
      Alert.alert("확인", "지난 하차 시간은 선택할 수 없습니다.");
      return;
    }
    setEndTimeHHmm(next);
    setLastEndTimeHHmm(next);
  };

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <ShipperScreenHeader
        title="화물 등록"
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/(shipper)/(tabs)" as any);
        }}
      />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <SectionTitle title="구간 및 일시" />
        <Card padding={16} style={{ marginBottom: SP.sectionGap }}>
          <View style={s.timelineRow}>
            <View style={s.timelineLeft}>
              <View style={[s.circle, { backgroundColor: c.brand.primary }]}>
                <Text style={[s.circleText, { color: c.text.inverse }]}>
                  출발
                </Text>
              </View>
              <View style={[s.lineV, { backgroundColor: c.border.default }]} />
            </View>

            <View style={s.timelineBody}>
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>
                상차지 정보
              </Text>

              {/* 2. 주소 검색창 (터치하면 모달 오픈) */}
              <SearchableAddressField
                label=""
                value={startSelected}
                placeholder="터치하여 상차지 주소를 검색해주세요"
                onPress={() => {
                  setIsStartModalOpen(true);
                }}
              />

              {(startSelected || startSearch).trim() ? (
                <>
                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.fieldLabel, { color: c.text.primary }]}>
                      상세 주소
                    </Text>
                    <View
                      style={[
                        s.inputWrap,
                        {
                          backgroundColor: c.bg.surface,
                          borderColor: c.border.default,
                        },
                      ]}
                    >
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
                    <Text style={[s.fieldLabel, { color: c.text.primary }]}>
                      상차 시간
                    </Text>
                    <Pressable
                      onPress={() => setStartTimePickerOpen((v) => !v)}
                      style={[
                        s.inputWrap,
                        {
                          backgroundColor: c.bg.surface,
                          borderColor: c.border.default,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        },
                      ]}
                    >
                      <Text style={[s.input, { color: c.text.primary }]}>
                        {startTimeHHmm}
                      </Text>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={c.text.secondary}
                      />
                    </Pressable>
                    {startTimePickerOpen ? (
                      <View style={{ marginTop: 8 }}>
                        <DateTimePicker
                          value={startTimePickerValue}
                          mode="time"
                          display={
                            Platform.OS === "ios" ? "spinner" : "default"
                          }
                          onChange={onChangeStartTime}
                        />
                      </View>
                    ) : null}
                  </View>
                </>
              ) : null}

              <View style={s.chipRow}>
                {LOAD_DAY_OPTIONS.map((v) => (
                  <Chip
                    key={v}
                    label={v}
                    selected={loadDay === v}
                    onPress={() => onSelectLoadDay(v)}
                  />
                ))}
              </View>

              {loadDay === "직접 지정" ? (
                <Pressable
                  onPress={() => setLoadDatePickerOpen((v) => !v)}
                  style={[
                    s.dateRow,
                    {
                      borderColor: c.border.default,
                      backgroundColor: c.bg.surface,
                    },
                  ]}
                >
                  <View style={s.dateLabelRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={c.text.secondary}
                    />
                    <Text style={[s.dateValueText, { color: c.text.primary }]}>
                      상차일: {toKoreanDateText(loadDate)}
                    </Text>
                  </View>
                  <Text style={[s.dateValueText, { color: c.brand.primary }]}>
                    날짜 선택
                  </Text>
                </Pressable>
              ) : null}

              {loadDatePickerOpen ? (
                <View style={{ marginTop: 8 }}>
                  <DateTimePicker
                    value={loadDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={startOfDay(new Date())}
                    onChange={onChangeLoadDate}
                  />
                </View>
              ) : null}
            </View>
          </View>

          <View style={[s.timelineRow, { marginTop: 14 }]}>
            <View style={s.timelineLeft}>
              <View style={[s.circle, { backgroundColor: c.text.primary }]}>
                <Text style={[s.circleText, { color: c.text.inverse }]}>
                  도착
                </Text>
              </View>
            </View>

            <View style={s.timelineBody}>
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>
                하차지 정보
              </Text>

              <SearchableAddressField
                label=""
                value={endAddr}
                placeholder="터치하여 하차지 주소를 검색해주세요"
                onPress={() => setIsEndModalOpen(true)}
              />

              {endAddr.trim() ? (
                <>
                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.fieldLabel, { color: c.text.primary }]}>
                      상세 주소
                    </Text>
                    <View
                      style={[
                        s.inputWrap,
                        {
                          backgroundColor: c.bg.surface,
                          borderColor: c.border.default,
                        },
                      ]}
                    >
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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={[s.fieldLabel, { color: c.text.primary }]}>
                        하차 시간 (선택)
                      </Text>
                      <Pressable
                        onPress={() => {
                          if (endTimeHHmm.trim()) {
                            setLastEndTimeHHmm(endTimeHHmm.trim());
                            setEndTimeHHmm("");
                            return;
                          }
                          setEndTimeHHmm(lastEndTimeHHmm);
                        }}
                        style={[
                          {
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 999,
                            borderWidth: 1,
                          },
                          endTimeHHmm.trim()
                            ? {
                                borderColor: c.border.default,
                                backgroundColor: c.bg.surface,
                              }
                            : {
                                borderColor: c.brand.primary,
                                backgroundColor: c.brand.primarySoft,
                              },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color: endTimeHHmm.trim()
                              ? c.text.secondary
                              : c.brand.primary,
                          }}
                        >
                          미정
                        </Text>
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => setEndTimePickerOpen((v) => !v)}
                      style={[
                        s.inputWrap,
                        {
                          backgroundColor: c.bg.surface,
                          borderColor: c.border.default,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.input,
                          {
                            color: endTimeHHmm.trim()
                              ? c.text.primary
                              : c.text.secondary,
                          },
                        ]}
                      >
                        {endTimeHHmm.trim() || "하차시간 미정"}
                      </Text>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={c.text.secondary}
                      />
                    </Pressable>
                    {endTimePickerOpen ? (
                      <View style={{ marginTop: 8 }}>
                        <DateTimePicker
                          value={endTimePickerValue}
                          mode="time"
                          display={
                            Platform.OS === "ios" ? "spinner" : "default"
                          }
                          onChange={onChangeEndTime}
                        />
                      </View>
                    ) : null}
                  </View>
                </>
              ) : null}

              <View style={s.chipRow}>
                {ARRIVE_OPTIONS.map((v) => (
                  <Chip
                    key={v}
                    label={v}
                    selected={arriveType === v}
                    onPress={() => setArriveType(v)}
                  />
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
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>
                물품상세
              </Text>
              <View
                style={[
                  s.inputWrap,
                  {
                    backgroundColor: c.bg.surface,
                    borderColor: c.border.default,
                  },
                ]}
              >
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
              <Text style={[s.fieldLabel, { color: c.text.primary }]}>
                중량(톤)
              </Text>
              <View
                style={[
                  s.inputWrap,
                  {
                    backgroundColor: c.bg.surface,
                    borderColor: hasWeightTonError
                      ? c.status.danger
                      : c.border.default,
                  },
                ]}
              >
                <TextInput
                  value={weightTon}
                  onChangeText={(next) =>
                    setWeightTon(sanitizeWeightTonInput(next))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={c.text.secondary}
                  style={[s.input, { color: c.text.primary }]}
                />
              </View>
              {hasWeightTonError ? (
                <Text style={[s.errorText, { color: c.status.danger }]}>
                  {weightTonError}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        <SectionTitle title="배차 및 운임" />
        <Card padding={16} style={{ marginBottom: SP.sectionGap }}>
          <View style={s.choiceRow}>
            <ChoiceCard
              emoji="⚡"
              title="바로 배차"
              desc="기사님이 수락하면 즉시 배차됩니다."
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

          <View
            style={[
              s.dispatchLockRow,
              {
                backgroundColor: autoDispatchLocked
                  ? c.status.warningSoft
                  : c.bg.surface,
                borderColor: autoDispatchLocked
                  ? c.status.warning
                  : c.border.default,
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={[
                  s.dispatchLockTitle,
                  { color: c.text.primary },
                ]}
              >
                자동배차 잠금
              </Text>
              <Text
                style={[
                  s.dispatchLockDesc,
                  { color: c.text.secondary },
                ]}
              >
                켜두면 자동 후보 탐색과 푸시 오퍼를 시작하지 않습니다. 기사님은 공개 오더 목록에서 직접 지원하거나 수락할 수 있습니다.
              </Text>
            </View>
            <Switch
              value={autoDispatchLocked}
              onValueChange={setAutoDispatchLocked}
              trackColor={{
                false: c.border.default,
                true: c.status.warning,
              }}
              thumbColor={autoDispatchLocked ? "#FFFFFF" : "#F8FAFC"}
            />
          </View>

          <View
            style={[
              s.aiBox,
              {
                backgroundColor: c.brand.primarySoft,
                borderColor: c.border.default,
              },
            ]}
          >
            <View style={s.tripHeaderRow}>
              <Text style={[s.tripHeaderLabel, { color: c.text.primary }]}>
                운행 형태
              </Text>
              <View style={s.tripPillRow}>
                {TRIP_OPTIONS.map((item) => {
                  const selected = tripType === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setTripType(item.value)}
                      style={[
                        s.tripPill,
                        selected
                          ? {
                              borderColor: c.brand.primary,
                              backgroundColor: c.brand.primarySoft,
                            }
                          : {
                              borderColor: c.border.default,
                              backgroundColor: c.bg.surface,
                            },
                      ]}
                    >
                      <Text
                        style={[
                          s.tripPillText,
                          {
                            color: selected
                              ? c.brand.primary
                              : c.text.secondary,
                          },
                          selected ? s.tripPillTextActive : null,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={s.aiBottomRow}>
              <View style={s.aiTextWrap}>
                <Text style={[s.aiLabel, { color: c.brand.primary }]}>
                  추천 운임 (거리 {distanceKm}km)
                </Text>
                <Text style={[s.aiPrice, { color: c.brand.primary }]}>
                  {won(aiDisplayedFare)}
                </Text>
              </View>
              <Button
                title="적용하기"
                onPress={applyAiFare}
                style={
                  {
                    height: 48,
                    minWidth: 118,
                    paddingHorizontal: 16,
                    borderRadius: 18,
                  } as any
                }
              />
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={[s.fieldLabel, { color: c.text.primary }]}>
              희망 운임
            </Text>
            <View style={s.fareRow}>
              <View
                style={[
                  s.fareInputWrap,
                  {
                    backgroundColor: c.bg.surface,
                    borderColor: c.border.default,
                  },
                ]}
              >
                <TextInput
                  value={fareInput}
                  onChangeText={setFareInput}
                  placeholder="예: 320000"
                  placeholderTextColor={c.text.secondary}
                  keyboardType="numeric"
                  style={[s.input, { color: c.text.primary, flex: 1 }]}
                />
                <Text style={[s.wonSuffix, { color: c.text.secondary }]}>
                  원
                </Text>
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
              {tripType === "roundTrip" ? " (왕복 1.8배 적용)" : ""}
            </Text>
          </View>

          <Text
            style={[s.fieldLabel, { color: c.text.primary, marginTop: 16 }]}
          >
            결제 방법 <Text style={{ color: c.status.danger }}>*</Text>
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

          <View
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: feePreviewBannerColor,
              backgroundColor: feePreviewBannerBackground,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons
              name={feePreviewBannerIcon as any}
              size={16}
              color={feePreviewBannerColor}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: "800",
                color: feePreviewBannerColor,
              }}
            >
              {feePreviewBannerText}
            </Text>
          </View>

          <Card padding={14} style={{ marginTop: 14 }}>
            <View style={s.feeRow}>
              <Text style={[s.feeLabel, { color: c.text.secondary }]}>
                기본 운임
              </Text>
              <Text style={[s.feeValue, { color: c.text.primary }]}>
                {won(shipperFeePreview.baseFare)}
              </Text>
            </View>
            <View style={s.feeRow}>
              <Text style={[s.feeLabel, { color: c.text.secondary }]}>
                {shipperFeeLabel}
              </Text>
              <Text style={[s.feeValue, { color: c.text.primary }]}>
                + {won(fee)}
              </Text>
            </View>
            <View style={s.feeRow}>
              <Text style={[s.feeLabel, { color: c.text.secondary }]}>
                shipper promo
              </Text>
              <Text style={[s.feeValue, { color: c.text.primary }]}>
                {promoStatusText}
              </Text>
            </View>
            <View style={[s.hr, { backgroundColor: c.border.default }]} />
            <View style={s.feeRow}>
              <Text style={[s.feeTotalLabel, { color: c.text.primary }]}>
                최종 화주 청구 금액
              </Text>
              <Text style={[s.feeTotalValue, { color: c.text.primary }]}>
                {won(totalPay)}
              </Text>
            </View>
            <View style={{ marginTop: 10, gap: 4 }}>
              <Text style={[s.hint, { color: c.text.secondary }]}>
                차주 side fee는 별도 정산에서 차감됩니다.
              </Text>
              <Text style={[s.hint, { color: c.text.secondary }]}>
                Toss 10%를 먼저 제외한 뒤 남은 금액에서 shipper/driver side fee가 계산됩니다.
              </Text>
            </View>
          </Card>
        </Card>

        <View style={{ height: 150 + insets.bottom }} />
      </ScrollView>

      {/* --- 주소 검색 모달 추가 --- */}
      <AddressSearch
        visible={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onComplete={({ address, lat, lng }) => {
          setStartSelected(address);
          setStartSearch(address);
          setStartLat(lat);
          setStartLng(lng);
        }}
      />
      <AddressSearch
        visible={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        onComplete={({ address, lat, lng }) => {
          setEndAddr(address);
          setEndLat(lat);
          setEndLng(lng);
        }}
      />
      {/* ------------------------- */}

      <View
        style={[
          s.bottomBar,
          {
            backgroundColor: c.bg.canvas,
            borderTopColor: c.border.default,
            paddingBottom: 16 + insets.bottom,
          },
        ]}
      >
        <View
          style={[
            s.stickySummary,
            { backgroundColor: c.bg.surface, borderColor: c.border.default },
          ]}
        >
          <View style={s.stickyRow}>
            <Text style={[s.stickyLabel, { color: c.text.secondary }]}>
              최종 화주 청구 금액
            </Text>
            <Text style={[s.stickyTotal, { color: c.text.primary }]}>
              {won(totalPay)}
            </Text>
          </View>

          <View style={s.stickySubRow}>
            <Text style={[s.stickySub, { color: c.text.secondary }]}>
              기본 운임 {won(shipperFeePreview.baseFare)}
            </Text>
            <Text style={[s.stickySub, { color: c.text.secondary }]}>
              {shipperFeeLabel} +{won(fee)}
            </Text>
          </View>
          <Text style={[s.stickySub, { color: c.text.secondary, marginTop: 4 }]}>
            {isFeePreviewFallback || isFeePreviewLoading
              ? "서버 preview 재확인 중"
              : "서버 preview 기준"}
          </Text>
        </View>

        <Button
          title="다음"
          onPress={submit}
          fullWidth
          disabled={hasWeightTonError}
        />
      </View>
    </View>
  );
}
