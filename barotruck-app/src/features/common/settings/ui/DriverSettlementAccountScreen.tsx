import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

const STORAGE_KEY = "baro_driver_settlement_account_v1";

type AccountState = {
  bankName: string;
  accountNumber: string;
  holderName: string;
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
    holderName: "",
  });
  const [saved, setSaved] = React.useState<AccountState | null>(null);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active || !raw) return;
        const parsed = JSON.parse(raw) as Partial<AccountState>;
        const next: AccountState = {
          bankName: String(parsed.bankName ?? "").trim(),
          accountNumber: onlyDigits(String(parsed.accountNumber ?? "")),
          holderName: String(parsed.holderName ?? "").trim(),
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
    if (!draft.bankName.trim() || !draft.accountNumber.trim() || !draft.holderName.trim()) {
      Alert.alert("입력 확인", "은행명, 계좌번호, 예금주를 모두 입력해 주세요.");
      return;
    }

    const next: AccountState = {
      bankName: draft.bankName.trim(),
      accountNumber: onlyDigits(draft.accountNumber),
      holderName: draft.holderName.trim(),
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
      Alert.alert("저장 완료", "정산 계좌가 저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "다시 시도해 주세요.");
    }
  }, [draft]);

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
          <View style={s.row}>
            <Text style={s.label}>예금주</Text>
            <TextInput
              value={draft.holderName}
              onChangeText={(v) => setDraft((p) => ({ ...p, holderName: v }))}
              style={s.input}
              placeholder="예: 김차주"
              placeholderTextColor={c.text.secondary}
            />
          </View>
          <Text style={s.hint}>입금 계좌 변경 시 다음 정산 건부터 적용됩니다.</Text>
          <Pressable style={s.saveBtn} onPress={() => void onSave()}>
            <Text style={s.saveBtnText}>저장</Text>
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
              <View style={[s.valueRow, { borderBottomWidth: 0 }]}>
                <Text style={s.key}>예금주</Text>
                <Text style={s.value}>{saved.holderName}</Text>
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

