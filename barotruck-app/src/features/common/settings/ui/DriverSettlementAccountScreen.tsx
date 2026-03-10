import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from "react-native";

import apiClient from "@/shared/api/apiClient";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

type AccountState = {
  bankName: string;
  accountNumber: string;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function maskAccount(v: string) {
  const digits = onlyDigits(v);
  if (!digits) return "-";
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 3)}*****${digits.slice(-3)}`;
}

export default function DriverSettlementAccountScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();

  const [draft, setDraft] = React.useState<AccountState>({
    bankName: "",
    accountNumber: "",
  });
  const [saved, setSaved] = React.useState<AccountState | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [meRes, driverRes] = await Promise.all([
          UserService.getMyInfo().catch(() => null),
          apiClient.get("/api/v1/drivers/me").catch(() => null),
        ]);
        if (!active) return;

        const driver = driverRes?.data ?? null;
        const next: AccountState = {
          bankName: String(driver?.bankName ?? driver?.driver?.bankName ?? meRes?.DriverInfo?.bankName ?? "").trim(),
          accountNumber: onlyDigits(
            String(driver?.accountNum ?? driver?.driver?.accountNum ?? meRes?.DriverInfo?.accountNum ?? "")
          ),
        };
        setSaved(next);
        setDraft(next);
      } catch {
        // noop
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(driver)/(tabs)/mypage" as any);
  }, [router]);

  const onSave = React.useCallback(async () => {
    if (saving) return;
    if (!draft.bankName.trim() || !draft.accountNumber.trim()) {
      Alert.alert("입력 확인", "은행명과 계좌번호를 모두 입력해 주세요.");
      return;
    }

    const next: AccountState = {
      bankName: draft.bankName.trim(),
      accountNumber: onlyDigits(draft.accountNumber),
    };
    try {
      setSaving(true);
      const [meRes, driverRes] = await Promise.all([
        UserService.getMyInfo(),
        apiClient.get("/api/v1/drivers/me"),
      ]);
      const driver = driverRes?.data ?? {};
      const driverInfo = meRes?.DriverInfo;

      await UserService.saveDriverProfile({
        carNum: String(driver?.carNum ?? driver?.driver?.carNum ?? driverInfo?.carNum ?? "").trim(),
        carType: String(driver?.carType ?? driver?.driver?.carType ?? driverInfo?.carType ?? "CARGO").trim() || "CARGO",
        tonnage: Number(driver?.tonnage ?? driver?.driver?.tonnage ?? driverInfo?.tonnage ?? 0) || 0,
        career: Number(driver?.career ?? driver?.driver?.career ?? driverInfo?.career ?? 0) || 0,
        bankName: next.bankName,
        accountNum: next.accountNumber,
        type: String(driver?.type ?? driver?.driver?.type ?? driverInfo?.type ?? "").trim() || undefined,
        address: String(driver?.address ?? driver?.driver?.address ?? driverInfo?.address ?? "").trim() || undefined,
        lat: driver?.lat ?? driver?.driver?.lat ?? driverInfo?.lat,
        lng: driver?.lng ?? driver?.driver?.lng ?? driverInfo?.lng,
        nbhId: driver?.nbhId ?? driver?.driver?.nbhId ?? driverInfo?.nbhId,
      });
      setSaved(next);
      Alert.alert("저장 완료", "정산 계좌가 저장되었습니다.");
    } catch (error: any) {
      const message =
        typeof error?.response?.data === "string"
          ? error.response.data
          : error?.response?.data?.message || "다시 시도해 주세요.";
      Alert.alert("저장 실패", String(message));
    } finally {
      setSaving(false);
    }
  }, [draft, saving]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 16, paddingTop: 14, paddingBottom: 28, gap: 14 } as ViewStyle,
        card: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 10,
        } as ViewStyle,
        cardTitle: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
        row: { gap: 6 } as ViewStyle,
        label: { fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        input: {
          minHeight: 42,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          color: c.text.primary,
          paddingHorizontal: 12,
          fontSize: 14,
          fontWeight: "700",
        } as TextStyle,
        hint: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        valueRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: 38,
          borderBottomWidth: 1,
          borderBottomColor: c.border.default,
        } as ViewStyle,
        key: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        value: { fontSize: 13, fontWeight: "800", color: c.text.primary } as TextStyle,
        saveBtn: {
          marginTop: 6,
          height: 46,
          borderRadius: 12,
          backgroundColor: c.brand.primary,
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        saveBtnText: { fontSize: 14, fontWeight: "900", color: c.text.inverse } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="정산 계좌 관리" onPressBack={goBack} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.cardTitle}>계좌 정보 입력</Text>
          <View style={s.row}>
            <Text style={s.label}>은행명</Text>
            <TextInput
              value={draft.bankName}
              onChangeText={(v) => setDraft((p) => ({ ...p, bankName: v }))}
              style={s.input}
              placeholder="예: 신한은행"
              placeholderTextColor={c.text.secondary}
            />
          </View>
          <View style={s.row}>
            <Text style={s.label}>계좌번호</Text>
            <TextInput
              value={draft.accountNumber}
              onChangeText={(v) => setDraft((p) => ({ ...p, accountNumber: onlyDigits(v) }))}
              style={s.input}
              keyboardType="number-pad"
              placeholder="숫자만 입력"
              placeholderTextColor={c.text.secondary}
            />
          </View>
          <Text style={s.hint}>예금주는 회원 실명 기준으로 지급 처리됩니다. 계좌 변경 시 다음 정산 건부터 적용됩니다.</Text>
          <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={() => void onSave()} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? "저장 중..." : "저장"}</Text>
          </Pressable>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>현재 등록 계좌</Text>
          {saved ? (
            <>
              <View style={s.valueRow}>
                <Text style={s.key}>은행명</Text>
                <Text style={s.value}>{saved.bankName}</Text>
              </View>
              <View style={s.valueRow}>
                <Text style={s.key}>계좌번호</Text>
                <Text style={s.value}>{maskAccount(saved.accountNumber)}</Text>
              </View>
            </>
          ) : (
            <Text style={s.hint}>아직 등록된 정산 계좌가 없습니다.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

