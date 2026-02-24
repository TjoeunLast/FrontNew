import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  clearCreateOrderDraft,
  getCreateOrderDraft,
} from "@/features/shipper/create-order/model/createOrderDraft";
import { PRESET_REQUEST_TAGS } from "@/features/shipper/create-order/ui/createOrderStep1.constants";
import { OrderApi } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderRequest } from "@/shared/models/order";
import { Button } from "@/shared/ui/base/Button";
import { Card } from "@/shared/ui/base/Card";
import { Chip as FormChip } from "@/shared/ui/form/Chip";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

import { Chip as RequestChip } from "./createOrderStep1.components";
import { s as step1Styles } from "./createOrderStep1.styles";

const EXCLUSIVE_LOAD_SURCHARGE_RATE = 0.1;
const MIXED_LOAD_DISCOUNT_RATE = 0.1;
const PACKAGING_FEE_WON = 30000;
const LOAD_METHOD_OPTIONS: Array<{ value: "독차" | "혼적"; label: string }> = [
  { value: "독차", label: "독차" },
  { value: "혼적", label: "혼적" },
];

function won(n: number) {
  const v = Math.max(0, Math.round(n));
  return `${v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

function toKoreanDateTextFromISO(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function toScheduleText(iso: string, hhmm?: string) {
  const d = new Date(iso);
  const timeMatch = (hhmm ?? "").match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (timeMatch) {
    d.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function parseProvince(addr: string) {
  const t = addr.trim();
  if (!t) return "미정";
  const p = t.split(/\s+/)[0];
  return p || "미정";
}

function parseTonnage(label: string, value: string) {
  const n = Number.parseFloat(value);
  if (Number.isFinite(n)) return n;
  const match = label.match(/[0-9]+(\.[0-9]+)?/);
  if (match) return Number.parseFloat(match[0]);
  return 0;
}

export function ShipperCreateOrderStep2CargoScreen() {
  const { colors: c } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const draft = getCreateOrderDraft();

  React.useEffect(() => {
    if (!draft) {
      router.replace("/(shipper)/create-order/step1-route");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [loadMethod, setLoadMethod] = React.useState<"독차" | "혼적">("독차");
  const [workMode, setWorkMode] = React.useState<"수작업" | "도구 사용">("수작업");
  const [workTool, setWorkTool] = React.useState<"지게차" | "크레인">("지게차");
  const [packaging, setPackaging] = React.useState<"미포장" | "포장">("미포장");
  const [selectedRequestTags, setSelectedRequestTags] = React.useState<string[]>(draft?.requestTags ?? []);
  const [memo, setMemo] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  if (!draft) return null;

  const loadMethodRate = loadMethod === "독차" ? 1 + EXCLUSIVE_LOAD_SURCHARGE_RATE : 1 - MIXED_LOAD_DISCOUNT_RATE;
  const loadMethodAdjustedFare = Math.max(0, Math.round(draft.appliedFare * loadMethodRate));
  const loadMethodDelta = loadMethodAdjustedFare - draft.appliedFare;
  const packagingPrice = packaging === "포장" ? PACKAGING_FEE_WON : 0;
  const finalFare = loadMethodAdjustedFare + packagingPrice;
  const fee = draft.pay === "card" ? Math.round(finalFare * 0.1) : 0;
  const totalPay = finalFare + fee;
  const resolvedWorkType = workMode === "수작업" ? "수작업" : workTool;
  const packagingHintText = packaging === "포장" ? `선택 시 +${won(packagingPrice)}` : "추가요금 없음";
  const payFeeHintText =
    draft.pay === "card" ? `토스 결제 수수료 +10% (${won(fee)})` : "결제 방식 수수료 없음";
  const toggleRequestTag = (tag: string) => {
    setSelectedRequestTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  };

  const submitFinal = async () => {
    setLoading(true);
    try {
      const isEditMode = Boolean(draft.editOrderId);
      const request: OrderRequest = {
        startAddr: draft.startSelected,
        startPlace: draft.startAddrDetail || draft.startSelected,
        startType: draft.loadDay,
        startSchedule: toScheduleText(draft.loadDateISO, draft.startTimeHHmm),
        puProvince: parseProvince(draft.startSelected),
        startLat: draft.startLat,
        startLng: draft.startLng,
        endAddr: draft.endAddr,
        endPlace: draft.endAddrDetail || draft.endAddr,
        endType: draft.arriveType,
        endSchedule: toScheduleText(draft.loadDateISO, draft.endTimeHHmm),
        doProvince: parseProvince(draft.endAddr),
        endLat: draft.endLat,
        endLng: draft.endLng,
        cargoContent: [
          selectedRequestTags.length ? `요청태그:${selectedRequestTags.join(",")}` : "",
          `상하차방식:${resolvedWorkType}`,
          `포장:${packaging}`,
          draft.cargoDetail ? `화물:${draft.cargoDetail}` : "",
          draft.startContact ? `상차지 연락처:${draft.startContact}` : "",
          draft.endContact ? `하차지 연락처:${draft.endContact}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        memo: memo.trim() || undefined,
        loadMethod,
        workType: resolvedWorkType,
        tonnage: parseTonnage(draft.ton.label, draft.ton.value),
        reqCarType: draft.carType.label,
        reqTonnage: draft.ton.label,
        driveMode: draft.tripType,
        loadWeight: Number.parseFloat(draft.weightTon) || undefined,
        basePrice: loadMethodAdjustedFare,
        payMethod: draft.pay,
        packagingPrice,
        instant: draft.dispatch === "instant",
        distance: draft.distanceKm,
        duration: Math.max(30, Math.round(draft.distanceKm * 2)),
      };

      if (isEditMode) {
        const editId = Number(draft.editOrderId);
        if (!Number.isFinite(editId)) {
          throw new Error("invalid_edit_order_id");
        }
        await OrderApi.updateOrder(editId, request);
      } else {
        await OrderApi.createOrder(request);
      }

      clearCreateOrderDraft();
      Alert.alert(
        isEditMode ? "수정 완료" : "등록 완료",
        isEditMode ? "오더 정보가 수정되었습니다." : "서버에 화물이 등록되었습니다.",
        [{ text: "확인", onPress: () => router.replace("/(shipper)/(tabs)") }]
      );
    } catch (e: any) {
      const isEditMode = Boolean(draft.editOrderId);
      const status = Number(e?.response?.status ?? 0);
      const msg =
        e?.response?.data?.message
        ?? (isEditMode && (status === 404 || status === 405)
          ? "서버에서 오더 수정 엔드포인트를 찾지 못했습니다. 백엔드 수정 API 확인이 필요합니다."
          : isEditMode
            ? "수정 중 오류가 발생했습니다."
            : "등록 중 오류가 발생했습니다.");
      Alert.alert(isEditMode ? "수정 실패" : "등록 실패", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
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
        contentContainerStyle={{ padding: 16, paddingBottom: 200 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Card padding={16} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 10 }}>요약</Text>

          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>상차</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>{draft.startSelected}</Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>상차지 상세 주소</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>{draft.startAddrDetail}</Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>상차지 연락처</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>{draft.startContact}</Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>상차 시간</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>{draft.startTimeHHmm}</Text>

          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>하차</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>{draft.endAddr}</Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>상세 주소</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>{draft.endAddrDetail}</Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>연락처</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>{draft.endContact}</Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>하차 시간</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>
            {draft.endTimeHHmm?.trim() || "하차시간 미정"}
          </Text>

          <View style={{ height: 1, backgroundColor: c.border.default, marginVertical: 12 }} />

          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>
            상차일: {toKoreanDateTextFromISO(draft.loadDateISO)} ({draft.loadDay})
          </Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800", marginTop: 6 }}>
            차량: {draft.ton.label} · {draft.carType.label}
          </Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800", marginTop: 6 }}>
            운행 형태: {draft.tripType === "roundTrip" ? "왕복" : "편도"}
          </Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800", marginTop: 6 }}>{payFeeHintText}</Text>

          <View style={{ height: 1, backgroundColor: c.border.default, marginVertical: 12 }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>희망 운임</Text>
            <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 16 }}>{won(finalFare)}</Text>
          </View>
        </Card>

        <Card padding={16} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 12 }}>작업 정보</Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.primary }}>적재 방식</Text>
            <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "800" }}>
              {loadMethod === "독차"
                ? `기본 운임에서 +10% (${won(loadMethodDelta)})`
                : `기본 운임에서 -10% (${won(Math.abs(loadMethodDelta))})`}
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {LOAD_METHOD_OPTIONS.map((x) => (
              <FormChip
                key={x.value}
                label={x.label}
                selected={loadMethod === x.value}
                onPress={() => setLoadMethod(x.value)}
              />
            ))}
          </View>

          <View style={{ height: 14 }} />

          <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.primary, marginBottom: 8 }}>상하차 방식</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {(["수작업", "도구 사용"] as const).map((x) => (
              <FormChip key={x} label={x} selected={workMode === x} onPress={() => setWorkMode(x)} />
            ))}
          </View>

          {workMode === "도구 사용" ? (
            <>
              <View style={{ height: 14 }} />
              <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.primary, marginBottom: 8 }}>사용 도구</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {(["지게차", "크레인"] as const).map((x) => (
                  <FormChip key={x} label={x} selected={workTool === x} onPress={() => setWorkTool(x)} />
                ))}
              </View>
            </>
          ) : null}

          <View style={{ height: 14 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.primary }}>포장</Text>
            <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "800" }}>{packagingHintText}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {(["미포장", "포장"] as const).map((x) => (
              <FormChip key={x} label={x} selected={packaging === x} onPress={() => setPackaging(x)} />
            ))}
          </View>
        </Card>

        <Card padding={16} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 12 }}>요청사항</Text>

          <View style={step1Styles.tagWrap}>
            {PRESET_REQUEST_TAGS.map((tag) => (
              <RequestChip
                key={tag}
                label={`#${tag}`}
                selected={selectedRequestTags.includes(tag)}
                onPress={() => toggleRequestTag(tag)}
              />
            ))}
          </View>

          <View style={{ height: 12 }} />
          <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.primary, marginBottom: 8 }}>추가 메모</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: c.border.default,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: c.bg.surface,
              minHeight: 110,
            }}
          >
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="예: 1톤 진입 가능 / 경비실 연락 필요"
              placeholderTextColor={c.text.secondary}
              style={{ color: c.text.primary, fontWeight: "700", height: 110, textAlignVertical: "top" }}
              multiline
            />
          </View>
        </Card>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          paddingBottom: 16 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: c.border.default,
          backgroundColor: c.bg.canvas,
          gap: 10,
        }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: c.border.default,
            backgroundColor: c.bg.surface,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.text.secondary, fontWeight: "900" }}>최종 결제 금액</Text>
            <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 18 }}>{won(totalPay)}</Text>
          </View>
          <View style={{ marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>기본 운임 {won(draft.appliedFare)}</Text>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>
              {loadMethod === "독차"
                ? `독차 +${Math.round(EXCLUSIVE_LOAD_SURCHARGE_RATE * 100)}% (${won(loadMethodDelta)})`
                : `혼적 -${Math.round(MIXED_LOAD_DISCOUNT_RATE * 100)}% (${won(Math.abs(loadMethodDelta))})`}
            </Text>
          </View>
          <View style={{ marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>조정 운임 {won(loadMethodAdjustedFare)}</Text>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>
              포장비 {packaging === "포장" ? `+${won(packagingPrice)}` : "0원"}
            </Text>
          </View>
          <View style={{ marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>작업 방식 {resolvedWorkType}</Text>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>
              {draft.pay === "card" ? `수수료 +${won(fee)}` : "수수료 0원"}
            </Text>
          </View>
        </View>

        <Button title={draft.editOrderId ? "수정 완료" : "등록 완료"} onPress={submitFinal} fullWidth loading={loading} />
      </View>
    </View>
  );
}
