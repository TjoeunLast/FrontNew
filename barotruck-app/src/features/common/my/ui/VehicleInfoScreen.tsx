import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import apiClient from "@/shared/api/apiClient";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";
import { getCurrentUserSnapshot, upsertCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

const EXTRA_VEHICLES_STORAGE_KEY = "baro_driver_extra_vehicles_v1";

const CAR_TYPE_OPTIONS = [
  { label: "카고", value: "CARGO" },
  { label: "윙바디", value: "WING" },
  { label: "탑차", value: "TOP" },
] as const;

const VEHICLE_TYPE_OPTIONS = [
  { label: "일반", value: "NORMAL" },
  { label: "냉동/냉장", value: "COLD" },
  { label: "리프트", value: "LIFT" },
] as const;

type Option = { label: string; value: string };

type ExtraVehicleDraft = {
  id: string;
  carNum: string;
  tonnage: string;
  carType: string;
  type: string;
};

function toText(v: unknown, fallback = "") {
  const text = String(v ?? "").trim();
  return text || fallback;
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function pickPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return undefined;
}

function toNumberOrUndefined(v: string) {
  const parsed = Number.parseFloat(v.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createEmptyVehicle(): ExtraVehicleDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    carNum: "",
    tonnage: "",
    carType: "CARGO",
    type: "NORMAL",
  };
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (next: string) => void;
}) {
  const t = useAppTheme();
  const c = t.colors;
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "";

  const s = useMemo(
    () =>
      StyleSheet.create({
        field: {
          minHeight: 42,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.border.default,
          paddingHorizontal: 12,
          backgroundColor: c.bg.surface,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,
        fieldText: {
          color: c.text.primary,
          fontSize: 14,
          fontWeight: "700",
        } as TextStyle,
        backdrop: {
          flex: 1,
          backgroundColor: withAlpha("#000000", 0.35),
          justifyContent: "flex-end",
        } as ViewStyle,
        sheet: {
          backgroundColor: c.bg.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: 1,
          borderTopColor: c.border.default,
          paddingBottom: 16,
        } as ViewStyle,
        sheetTitle: {
          paddingHorizontal: 18,
          paddingVertical: 14,
          fontSize: 16,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        option: {
          paddingHorizontal: 18,
          paddingVertical: 14,
        } as ViewStyle,
        optionText: {
          fontSize: 15,
          fontWeight: "800",
          color: c.text.primary,
        } as TextStyle,
        divider: { height: 1, backgroundColor: c.border.default } as ViewStyle,
      }),
    [c]
  );

  return (
    <>
      <Pressable style={s.field} onPress={() => setOpen(true)}>
        <Text style={s.fieldText}>{selectedLabel}</Text>
        <Text style={s.fieldText}>v</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>{label}</Text>
            <View style={s.divider} />
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={s.option}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <Text style={s.optionText}>{option.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function VehicleInfoScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const [vehicleNo, setVehicleNo] = React.useState("");
  const [tonnage, setTonnage] = React.useState("");
  const [carType, setCarType] = React.useState("CARGO");
  const [vehicleType, setVehicleType] = React.useState("NORMAL");
  const [saving, setSaving] = React.useState(false);
  const [extraVehicles, setExtraVehicles] = React.useState<ExtraVehicleDraft[]>([]);

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(driver)/(tabs)/mypage" as any);
  }, [router]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
        const [cached, extraVehiclesRaw] = await Promise.all([
          getCurrentUserSnapshot(),
          AsyncStorage.getItem(EXTRA_VEHICLES_STORAGE_KEY),
        ]);

        let detail: any = null;
        try {
          const res = await apiClient.get("/api/v1/drivers/me");
          detail = res.data;
        } catch {
          detail = null;
        }

        if (!active) return;

        setVehicleNo(toText(pickFirstText(detail?.carNum, detail?.driver?.carNum, cached?.driverCarNum)));
        setTonnage(
          toText(pickPositiveNumber(detail?.tonnage, detail?.driver?.tonnage, cached?.driverTonnage), "")
        );
        setCarType(toText(pickFirstText(detail?.carType, detail?.driver?.carType, cached?.driverCarType), "CARGO"));
        setVehicleType(toText(pickFirstText(detail?.type, detail?.driver?.type, cached?.driverType), "NORMAL"));

        try {
          const parsed = JSON.parse(extraVehiclesRaw ?? "[]") as ExtraVehicleDraft[];
          setExtraVehicles(Array.isArray(parsed) ? parsed : []);
        } catch {
          setExtraVehicles([]);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const onChangeExtraVehicle = React.useCallback(
    (id: string, patch: Partial<ExtraVehicleDraft>) => {
      setExtraVehicles((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    []
  );

  const onAddExtraVehicle = React.useCallback(() => {
    setExtraVehicles((prev) => [...prev, createEmptyVehicle()]);
  }, []);

  const onRemoveExtraVehicle = React.useCallback((id: string) => {
    setExtraVehicles((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const onSave = React.useCallback(async () => {
    if (saving) return;

    const parsedTonnage = toNumberOrUndefined(tonnage);
    if (!vehicleNo.trim() || parsedTonnage == null) {
      Alert.alert("입력 확인", "주 차량의 차량번호와 톤수를 입력해 주세요.");
      return;
    }

    try {
      setSaving(true);
      const cached = await getCurrentUserSnapshot();

      let detail: any = null;
      try {
        const res = await apiClient.get("/api/v1/drivers/me");
        detail = res.data;
      } catch {
        detail = null;
      }

      await UserService.saveDriverProfile({
        carNum: vehicleNo.trim(),
        carType,
        tonnage: parsedTonnage,
        type: vehicleType,
        career: Number(detail?.career ?? detail?.driver?.career ?? cached?.driverCareer ?? 0) || 0,
        bankName: String(detail?.bankName ?? detail?.driver?.bankName ?? "").trim(),
        accountNum: String(detail?.accountNum ?? detail?.driver?.accountNum ?? "").trim(),
        address: String(detail?.address ?? detail?.driver?.address ?? cached?.activityAddress ?? "").trim() || undefined,
        lat: detail?.lat ?? detail?.driver?.lat ?? cached?.activityLat,
        lng: detail?.lng ?? detail?.driver?.lng ?? cached?.activityLng,
        nbhId: detail?.nbhId ?? detail?.driver?.nbhId,
      });

      const sanitizedExtraVehicles = extraVehicles
        .map((item) => ({
          ...item,
          carNum: item.carNum.trim(),
          tonnage: item.tonnage.trim(),
          carType: item.carType.trim() || "CARGO",
          type: item.type.trim() || "NORMAL",
        }))
        .filter((item) => item.carNum || item.tonnage);

      await AsyncStorage.setItem(EXTRA_VEHICLES_STORAGE_KEY, JSON.stringify(sanitizedExtraVehicles));

      if (cached?.email && cached?.nickname && cached?.role) {
        await upsertCurrentUserSnapshot({
          email: cached.email,
          nickname: cached.nickname,
          role: cached.role,
          name: cached.name,
          gender: cached.gender,
          birthDate: cached.birthDate,
          activityAddress: cached.activityAddress,
          activityLat: cached.activityLat,
          activityLng: cached.activityLng,
          driverCarNum: vehicleNo.trim(),
          driverCarType: carType,
          driverType: vehicleType,
          driverTonnage: parsedTonnage,
          driverCareer: cached.driverCareer,
        });
      }

      Alert.alert("수정 완료", "주 차량 정보가 수정되었습니다.");
      goBack();
    } catch {
      Alert.alert("수정 실패", "차량 정보 수정 중 문제가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }, [carType, extraVehicles, goBack, saving, tonnage, vehicleNo, vehicleType]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 20, paddingTop: 14, gap: 14, paddingBottom: 36 } as ViewStyle,
        card: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 10,
        } as ViewStyle,
        sectionTitle: { fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        label: { fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        input: {
          minHeight: 42,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.border.default,
          paddingHorizontal: 12,
          color: c.text.primary,
          backgroundColor: c.bg.surface,
          fontSize: 14,
          fontWeight: "700",
        } as TextStyle,
        grid: { flexDirection: "row", gap: 10 } as ViewStyle,
        col: { flex: 1, gap: 8 } as ViewStyle,
        helper: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        addBtn: {
          minHeight: 42,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border.default,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        addBtnText: { color: c.text.primary, fontSize: 13, fontWeight: "800" } as TextStyle,
        extraVehicleCard: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.canvas,
          padding: 12,
          gap: 10,
        } as ViewStyle,
        extraVehicleHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,
        extraVehicleTitle: { fontSize: 13, fontWeight: "900", color: c.text.primary } as TextStyle,
        removeText: { fontSize: 12, fontWeight: "800", color: c.status.danger } as TextStyle,
        saveBtn: {
          height: 44,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: saving ? c.bg.muted : c.brand.primary,
          marginTop: 4,
        } as ViewStyle,
        saveBtnText: { color: saving ? c.text.secondary : c.text.inverse, fontSize: 14, fontWeight: "800" } as TextStyle,
      }),
    [c, saving]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="차량 정보" onPressBack={goBack} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.sectionTitle}>주 차량</Text>
          <Text style={s.label}>차량번호</Text>
          <TextInput
            value={vehicleNo}
            onChangeText={setVehicleNo}
            style={s.input}
            placeholder="예: 12가3456"
            placeholderTextColor={c.text.secondary}
          />
          <View style={s.grid}>
            <View style={s.col}>
              <Text style={s.label}>톤수</Text>
              <TextInput
                value={tonnage}
                onChangeText={setTonnage}
                style={s.input}
                placeholder="예: 5"
                placeholderTextColor={c.text.secondary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={s.col}>
              <Text style={s.label}>차종</Text>
              <SelectField label="차종" value={carType} options={CAR_TYPE_OPTIONS} onChange={setCarType} />
            </View>
          </View>
          <Text style={s.label}>차량 타입</Text>
          <SelectField label="차량 타입" value={vehicleType} options={VEHICLE_TYPE_OPTIONS} onChange={setVehicleType} />
          <Pressable style={s.saveBtn} onPress={() => void onSave()} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? "수정 중..." : "수정"}</Text>
          </Pressable>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>추가 차량</Text>
          <Text style={s.helper}>추가 차량은 앱에서 빠르게 확인할 수 있도록 목록으로 보관됩니다.</Text>
          <Pressable style={s.addBtn} onPress={onAddExtraVehicle}>
            <Text style={s.addBtnText}>차량 추가</Text>
          </Pressable>
          {extraVehicles.map((item, index) => (
            <View key={item.id} style={s.extraVehicleCard}>
              <View style={s.extraVehicleHeader}>
                <Text style={s.extraVehicleTitle}>추가 차량 {index + 1}</Text>
                <Pressable onPress={() => onRemoveExtraVehicle(item.id)}>
                  <Text style={s.removeText}>삭제</Text>
                </Pressable>
              </View>
              <Text style={s.label}>차량번호</Text>
              <TextInput
                value={item.carNum}
                onChangeText={(next) => onChangeExtraVehicle(item.id, { carNum: next })}
                style={s.input}
                placeholder="예: 34나5678"
                placeholderTextColor={c.text.secondary}
              />
              <View style={s.grid}>
                <View style={s.col}>
                  <Text style={s.label}>톤수</Text>
                  <TextInput
                    value={item.tonnage}
                    onChangeText={(next) => onChangeExtraVehicle(item.id, { tonnage: next })}
                    style={s.input}
                    placeholder="예: 3.5"
                    placeholderTextColor={c.text.secondary}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={s.col}>
                  <Text style={s.label}>차종</Text>
                  <SelectField
                    label="차종"
                    value={item.carType}
                    options={CAR_TYPE_OPTIONS}
                    onChange={(next) => onChangeExtraVehicle(item.id, { carType: next })}
                  />
                </View>
              </View>
              <Text style={s.label}>차량 타입</Text>
              <SelectField
                label="차량 타입"
                value={item.type}
                options={VEHICLE_TYPE_OPTIONS}
                onChange={(next) => onChangeExtraVehicle(item.id, { type: next })}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
