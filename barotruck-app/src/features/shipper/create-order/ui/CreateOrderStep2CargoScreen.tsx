import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderApi } from "@/shared/api/orderService";
import type { OrderRequest } from "@/shared/models/order";
import {
  clearCreateOrderDraft,
  getCreateOrderDraft,
} from "@/features/shipper/create-order/model/createOrderDraft";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { Card } from "@/shared/ui/base/Card";
import { Chip } from "@/shared/ui/form/Chip";

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

function toScheduleText(iso: string) {
  const d = new Date(iso);
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
  const [workTool, setWorkTool] = React.useState<string>("지게차");
  const [memo, setMemo] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  if (!draft) return null;

  const fee = draft.pay === "card" ? Math.round(draft.appliedFare * 0.1) : 0;
  const totalPay = draft.appliedFare + fee;

  const submitFinal = async () => {
    setLoading(true);
    try {
      const request: OrderRequest = {
        startAddr: draft.startSelected,
        startPlace: draft.startSelected,
        startType: draft.loadDay,
        startSchedule: toScheduleText(draft.loadDateISO),
        puProvince: parseProvince(draft.startSelected),
        endAddr: draft.endAddr,
        endPlace: draft.endAddr,
        endType: draft.arriveType,
        endSchedule: toScheduleText(draft.loadDateISO),
        doProvince: parseProvince(draft.endAddr),
        cargoContent: draft.cargoDetail || draft.requestText || draft.requestTags.join(", "),
        loadMethod,
        workType: workTool,
        tonnage: parseTonnage(draft.ton.label, draft.ton.value),
        reqCarType: draft.carType.label,
        reqTonnage: draft.ton.label,
        driveMode: draft.dispatch,
        loadWeight: Number.parseFloat(draft.weightTon) || undefined,
        basePrice: draft.appliedFare,
        payMethod: draft.pay,
        distance: draft.distanceKm,
        duration: Math.max(30, Math.round(draft.distanceKm * 2)),
      };

      await OrderApi.createOrder(request);

      clearCreateOrderDraft();
      Alert.alert(
        "등록 완료",
        "서버에 화물이 등록되었습니다.",
        [{ text: "확인", onPress: () => router.replace("/(shipper)/(tabs)") }]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "등록 중 오류가 발생했습니다.";
      Alert.alert("등록 실패", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
      <View
        style={{
          height: 52 + insets.top + 6,
          paddingTop: insets.top + 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: c.border.default,
          backgroundColor: c.bg.canvas,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={22} color={c.text.primary} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "900", color: c.text.primary }}>화물 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 + insets.bottom }}>
        <Card padding={16} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 10 }}>요약</Text>

          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>상차</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>{draft.startSelected}</Text>

          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>하차</Text>
          <Text style={{ color: c.text.primary, fontWeight: "900", marginBottom: 8 }}>{draft.endAddr}</Text>

          <View style={{ height: 1, backgroundColor: c.border.default, marginVertical: 12 }} />

          <Text style={{ color: c.text.secondary, fontWeight: "800" }}>
            상차일: {toKoreanDateTextFromISO(draft.loadDateISO)} ({draft.loadDay})
          </Text>
          <Text style={{ color: c.text.secondary, fontWeight: "800", marginTop: 6 }}>
            차량: {draft.ton.label} · {draft.carType.label}
          </Text>

          <View style={{ height: 1, backgroundColor: c.border.default, marginVertical: 12 }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>희망 운임</Text>
            <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 16 }}>{won(draft.appliedFare)}</Text>
          </View>
        </Card>

        <Card padding={16} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 12 }}>작업 정보</Text>

          <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.primary, marginBottom: 8 }}>적재 방식</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {(["독차", "혼적"] as const).map((x) => (
              <Chip key={x} label={x} selected={loadMethod === x} onPress={() => setLoadMethod(x)} />
            ))}
          </View>

          <View style={{ height: 14 }} />

          <Text style={{ fontSize: 13, fontWeight: "800", color: c.text.primary, marginBottom: 8 }}>상하차 도구</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {["지게차", "수작업", "크레인", "호이스트"].map((x) => (
              <Chip key={x} label={x} selected={workTool === x} onPress={() => setWorkTool(x)} />
            ))}
          </View>
        </Card>

        <Card padding={16} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary, marginBottom: 12 }}>요청사항</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {draft.requestTags.map((tag) => (
              <Chip key={tag} label={`#${tag}`} selected onPress={() => {}} />
            ))}
          </View>

          {draft.requestText.trim() ? (
            <View
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: c.border.default,
                borderRadius: 14,
                padding: 12,
                backgroundColor: c.bg.surface,
              }}
            >
              <Text style={{ color: c.text.primary, fontWeight: "700", lineHeight: 18 }}>{draft.requestText}</Text>
            </View>
          ) : null}

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
          <View style={{ marginTop: 6, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>희망 운임 {won(draft.appliedFare)}</Text>
            <Text style={{ color: c.text.secondary, fontWeight: "800" }}>
              {draft.pay === "card" ? `수수료 +${won(fee)}` : "수수료 0원"}
            </Text>
          </View>
        </View>

        <Button title="등록 완료" onPress={submitFinal} fullWidth loading={loading} />
      </View>
    </View>
  );
}
