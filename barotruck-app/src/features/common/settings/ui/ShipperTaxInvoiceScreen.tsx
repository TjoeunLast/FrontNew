import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";

type Party = {
  registrationNo: string;
  companyName: string;
  representative: string;
  address: string;
  businessType: string;
  businessCategory: string;
};

type ItemRow = {
  id: string;
  monthDay: string;
  itemName: string;
  spec: string;
  quantity: string;
  unitPrice: string;
  supplyAmount: string;
  taxAmount: string;
  note: string;
};

const PAYMENT_METHODS = ["현금", "수표", "어음", "외상미수금"] as const;

function createItemRow(id: string): ItemRow {
  return {
    id,
    monthDay: "",
    itemName: "",
    spec: "",
    quantity: "",
    unitPrice: "",
    supplyAmount: "",
    taxAmount: "",
    note: "",
  };
}

function onlyDigits(input: string) {
  return input.replace(/\D/g, "");
}

export default function ShipperTaxInvoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useAppTheme();
  const c = t.colors;

  const [supplier, setSupplier] = React.useState<Party>({
    registrationNo: "",
    companyName: "",
    representative: "",
    address: "",
    businessType: "",
    businessCategory: "",
  });
  const [buyer, setBuyer] = React.useState<Party>({
    registrationNo: "",
    companyName: "",
    representative: "",
    address: "",
    businessType: "",
    businessCategory: "",
  });
  const [writeDate, setWriteDate] = React.useState({
    year: "",
    month: "",
    day: "",
  });
  const [supplyTotal, setSupplyTotal] = React.useState("");
  const [taxTotal, setTaxTotal] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<(typeof PAYMENT_METHODS)[number]>("현금");
  const [rows, setRows] = React.useState<ItemRow[]>([createItemRow("1"), createItemRow("2")]);

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(shipper)/(tabs)/my" as any);
  }, [router]);

  const addRow = React.useCallback(() => {
    setRows((prev) => [...prev, createItemRow(String(Date.now()))]);
  }, []);

  const removeRow = React.useCallback((id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const updateRow = React.useCallback((id: string, key: keyof ItemRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }, []);

  const updateParty = React.useCallback((target: "supplier" | "buyer", key: keyof Party, value: string) => {
    if (target === "supplier") {
      setSupplier((prev) => ({ ...prev, [key]: value }));
      return;
    }
    setBuyer((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canSubmit = Boolean(
    supplier.registrationNo.trim() &&
      supplier.companyName.trim() &&
      buyer.registrationNo.trim() &&
      buyer.companyName.trim() &&
      writeDate.year.trim() &&
      writeDate.month.trim() &&
      writeDate.day.trim()
  );

  const onSubmit = React.useCallback(() => {
    if (!canSubmit) {
      Alert.alert("입력 확인", "필수 항목(등록번호, 상호, 작성일자)을 입력해 주세요.");
      return;
    }

    Alert.alert("저장 완료", "세금계산서 양식이 저장되었습니다.");
  }, [canSubmit]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 20, paddingTop: 14, paddingBottom: 120, gap: 14 } as ViewStyle,
        sectionTitle: {
          marginBottom: 8,
          fontSize: 14,
          fontWeight: "900",
          color: c.text.secondary,
        } as TextStyle,
        sectionCard: {
          borderWidth: 1,
          borderColor: c.border.default,
          borderRadius: 18,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 10,
        } as ViewStyle,
        partyTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,
        partyTitle: { fontSize: 14, fontWeight: "900", color: c.text.primary } as TextStyle,
        fieldLabel: { fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        input: {
          minHeight: 42,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          paddingHorizontal: 12,
          color: c.text.primary,
          fontSize: 14,
          fontWeight: "700",
        } as TextStyle,
        row2: { flexDirection: "row", gap: 8 } as ViewStyle,
        col: { flex: 1, gap: 6 } as ViewStyle,
        dateRow: { flexDirection: "row", gap: 8 } as ViewStyle,
        dateInput: { flex: 1 } as TextStyle,
        itemCard: {
          borderWidth: 1,
          borderColor: withAlpha(c.border.default, 0.95),
          borderRadius: 12,
          backgroundColor: c.bg.surface,
          padding: 10,
          gap: 8,
        } as ViewStyle,
        itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as ViewStyle,
        itemTitle: { fontSize: 12, fontWeight: "900", color: c.text.secondary } as TextStyle,
        removeBtn: {
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.status.danger, 0.1),
        } as ViewStyle,
        addBtn: {
          height: 40,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.border.default,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 6,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        addBtnText: { fontSize: 13, fontWeight: "800", color: c.text.secondary } as TextStyle,
        paymentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as ViewStyle,
        paymentChip: {
          height: 34,
          borderRadius: 17,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: c.border.default,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        paymentChipActive: {
          borderColor: c.brand.primary,
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        paymentChipText: { fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        paymentChipTextActive: { color: c.brand.primary } as TextStyle,
        bottomActionBar: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          borderTopWidth: 1,
          borderTopColor: c.border.default,
          backgroundColor: c.bg.canvas,
          paddingTop: 10,
        } as ViewStyle,
        submitBtn: {
          marginHorizontal: 20,
          height: 46,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: canSubmit ? c.brand.primary : c.bg.muted,
        } as ViewStyle,
        submitBtnText: {
          fontSize: 14,
          fontWeight: "900",
          color: canSubmit ? c.text.inverse : c.text.secondary,
        } as TextStyle,
      }),
    [c, canSubmit]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="세금계산서 관리"
        subtitle="세금계산서 서식(공급자/공급받는자/작성일자/품목/결제구분) 기준 입력"
        onPressBack={goBack}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.page}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.sectionCard}>
            <View style={s.partyTitleRow}>
              <Text style={s.partyTitle}>공급자</Text>
            </View>
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.fieldLabel}>등록번호</Text>
                <TextInput
                  value={supplier.registrationNo}
                  onChangeText={(v) => updateParty("supplier", "registrationNo", onlyDigits(v))}
                  keyboardType="number-pad"
                  maxLength={10}
                  style={s.input}
                  placeholder="10자리 숫자"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
              <View style={s.col}>
                <Text style={s.fieldLabel}>상호(법인명)</Text>
                <TextInput
                  value={supplier.companyName}
                  onChangeText={(v) => updateParty("supplier", "companyName", v)}
                  style={s.input}
                  placeholder="회사명"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
            </View>
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.fieldLabel}>성명</Text>
                <TextInput
                  value={supplier.representative}
                  onChangeText={(v) => updateParty("supplier", "representative", v)}
                  style={s.input}
                  placeholder="대표자명"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
              <View style={s.col}>
                <Text style={s.fieldLabel}>사업장 주소</Text>
                <TextInput
                  value={supplier.address}
                  onChangeText={(v) => updateParty("supplier", "address", v)}
                  style={s.input}
                  placeholder="주소"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
            </View>
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.fieldLabel}>업태</Text>
                <TextInput
                  value={supplier.businessType}
                  onChangeText={(v) => updateParty("supplier", "businessType", v)}
                  style={s.input}
                  placeholder="예: 운수업"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
              <View style={s.col}>
                <Text style={s.fieldLabel}>종목</Text>
                <TextInput
                  value={supplier.businessCategory}
                  onChangeText={(v) => updateParty("supplier", "businessCategory", v)}
                  style={s.input}
                  placeholder="예: 화물운송"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
            </View>
          </View>

          <View style={s.sectionCard}>
            <View style={s.partyTitleRow}>
              <Text style={s.partyTitle}>공급받는자</Text>
            </View>
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.fieldLabel}>등록번호</Text>
                <TextInput
                  value={buyer.registrationNo}
                  onChangeText={(v) => updateParty("buyer", "registrationNo", onlyDigits(v))}
                  keyboardType="number-pad"
                  maxLength={10}
                  style={s.input}
                  placeholder="10자리 숫자"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
              <View style={s.col}>
                <Text style={s.fieldLabel}>상호(법인명)</Text>
                <TextInput
                  value={buyer.companyName}
                  onChangeText={(v) => updateParty("buyer", "companyName", v)}
                  style={s.input}
                  placeholder="회사명"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
            </View>
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.fieldLabel}>성명</Text>
                <TextInput
                  value={buyer.representative}
                  onChangeText={(v) => updateParty("buyer", "representative", v)}
                  style={s.input}
                  placeholder="담당자/대표자"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
              <View style={s.col}>
                <Text style={s.fieldLabel}>사업장 주소</Text>
                <TextInput
                  value={buyer.address}
                  onChangeText={(v) => updateParty("buyer", "address", v)}
                  style={s.input}
                  placeholder="주소"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
            </View>
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.fieldLabel}>업태</Text>
                <TextInput
                  value={buyer.businessType}
                  onChangeText={(v) => updateParty("buyer", "businessType", v)}
                  style={s.input}
                  placeholder="예: 제조업"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
              <View style={s.col}>
                <Text style={s.fieldLabel}>종목</Text>
                <TextInput
                  value={buyer.businessCategory}
                  onChangeText={(v) => updateParty("buyer", "businessCategory", v)}
                  style={s.input}
                  placeholder="예: 부품"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
            </View>
          </View>

          <View style={s.sectionCard}>
            <Text style={s.partyTitle}>작성일자 / 금액</Text>
            <View style={s.dateRow}>
              <TextInput
                value={writeDate.year}
                onChangeText={(v) => setWriteDate((p) => ({ ...p, year: onlyDigits(v) }))}
                keyboardType="number-pad"
                maxLength={4}
                style={[s.input, s.dateInput]}
                placeholder="YYYY"
                placeholderTextColor={c.text.secondary}
              />
              <TextInput
                value={writeDate.month}
                onChangeText={(v) => setWriteDate((p) => ({ ...p, month: onlyDigits(v) }))}
                keyboardType="number-pad"
                maxLength={2}
                style={[s.input, s.dateInput]}
                placeholder="MM"
                placeholderTextColor={c.text.secondary}
              />
              <TextInput
                value={writeDate.day}
                onChangeText={(v) => setWriteDate((p) => ({ ...p, day: onlyDigits(v) }))}
                keyboardType="number-pad"
                maxLength={2}
                style={[s.input, s.dateInput]}
                placeholder="DD"
                placeholderTextColor={c.text.secondary}
              />
            </View>
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.fieldLabel}>공급가액</Text>
                <TextInput
                  value={supplyTotal}
                  onChangeText={(v) => setSupplyTotal(onlyDigits(v))}
                  keyboardType="number-pad"
                  style={s.input}
                  placeholder="숫자만 입력"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
              <View style={s.col}>
                <Text style={s.fieldLabel}>세액</Text>
                <TextInput
                  value={taxTotal}
                  onChangeText={(v) => setTaxTotal(onlyDigits(v))}
                  keyboardType="number-pad"
                  style={s.input}
                  placeholder="숫자만 입력"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
            </View>
            <View style={s.col}>
              <Text style={s.fieldLabel}>비고</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={s.input}
                placeholder="비고 입력"
                placeholderTextColor={c.text.secondary}
              />
            </View>
          </View>

          <View style={s.sectionCard}>
            <Text style={s.partyTitle}>품목</Text>
            {rows.map((row, idx) => (
              <View key={row.id} style={s.itemCard}>
                <View style={s.itemTop}>
                  <Text style={s.itemTitle}>품목 {idx + 1}</Text>
                  {rows.length > 1 ? (
                    <Pressable style={s.removeBtn} onPress={() => removeRow(row.id)}>
                      <Ionicons name="close" size={16} color={c.status.danger} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={s.row2}>
                  <View style={s.col}>
                    <Text style={s.fieldLabel}>월일</Text>
                    <TextInput
                      value={row.monthDay}
                      onChangeText={(v) => updateRow(row.id, "monthDay", onlyDigits(v))}
                      keyboardType="number-pad"
                      maxLength={4}
                      style={s.input}
                      placeholder="MMDD"
                      placeholderTextColor={c.text.secondary}
                    />
                  </View>
                  <View style={s.col}>
                    <Text style={s.fieldLabel}>품목</Text>
                    <TextInput
                      value={row.itemName}
                      onChangeText={(v) => updateRow(row.id, "itemName", v)}
                      style={s.input}
                      placeholder="품목명"
                      placeholderTextColor={c.text.secondary}
                    />
                  </View>
                </View>
                <View style={s.row2}>
                  <View style={s.col}>
                    <Text style={s.fieldLabel}>규격</Text>
                    <TextInput
                      value={row.spec}
                      onChangeText={(v) => updateRow(row.id, "spec", v)}
                      style={s.input}
                      placeholder="규격"
                      placeholderTextColor={c.text.secondary}
                    />
                  </View>
                  <View style={s.col}>
                    <Text style={s.fieldLabel}>수량</Text>
                    <TextInput
                      value={row.quantity}
                      onChangeText={(v) => updateRow(row.id, "quantity", onlyDigits(v))}
                      keyboardType="number-pad"
                      style={s.input}
                      placeholder="수량"
                      placeholderTextColor={c.text.secondary}
                    />
                  </View>
                </View>
                <View style={s.row2}>
                  <View style={s.col}>
                    <Text style={s.fieldLabel}>단가</Text>
                    <TextInput
                      value={row.unitPrice}
                      onChangeText={(v) => updateRow(row.id, "unitPrice", onlyDigits(v))}
                      keyboardType="number-pad"
                      style={s.input}
                      placeholder="단가"
                      placeholderTextColor={c.text.secondary}
                    />
                  </View>
                  <View style={s.col}>
                    <Text style={s.fieldLabel}>공급가액</Text>
                    <TextInput
                      value={row.supplyAmount}
                      onChangeText={(v) => updateRow(row.id, "supplyAmount", onlyDigits(v))}
                      keyboardType="number-pad"
                      style={s.input}
                      placeholder="공급가액"
                      placeholderTextColor={c.text.secondary}
                    />
                  </View>
                </View>
                <View style={s.row2}>
                  <View style={s.col}>
                    <Text style={s.fieldLabel}>세액</Text>
                    <TextInput
                      value={row.taxAmount}
                      onChangeText={(v) => updateRow(row.id, "taxAmount", onlyDigits(v))}
                      keyboardType="number-pad"
                      style={s.input}
                      placeholder="세액"
                      placeholderTextColor={c.text.secondary}
                    />
                  </View>
                  <View style={s.col}>
                    <Text style={s.fieldLabel}>비고</Text>
                    <TextInput
                      value={row.note}
                      onChangeText={(v) => updateRow(row.id, "note", v)}
                      style={s.input}
                      placeholder="비고"
                      placeholderTextColor={c.text.secondary}
                    />
                  </View>
                </View>
              </View>
            ))}

            <Pressable style={s.addBtn} onPress={addRow}>
              <Ionicons name="add" size={16} color={c.text.secondary} />
              <Text style={s.addBtnText}>품목 행 추가</Text>
            </Pressable>
          </View>

          <View style={s.sectionCard}>
            <Text style={s.partyTitle}>결제 구분</Text>
            <View style={s.paymentRow}>
              {PAYMENT_METHODS.map((method) => {
                const active = paymentMethod === method;
                return (
                  <Pressable
                    key={method}
                    style={[s.paymentChip, active && s.paymentChipActive]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[s.paymentChipText, active && s.paymentChipTextActive]}>{method}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[s.bottomActionBar, { paddingBottom: Math.max(10, insets.bottom + 6) }]}>
        <Pressable style={s.submitBtn} onPress={onSubmit}>
          <Text style={s.submitBtnText}>세금계산서 저장</Text>
        </Pressable>
      </View>
    </View>
  );
}
