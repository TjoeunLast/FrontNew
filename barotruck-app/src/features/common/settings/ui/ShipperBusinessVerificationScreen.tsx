import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";
import { getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

type VerificationView = {
  shipperTypeLabel: string;
  nickname: string;
  name: string;
};

const FIELD_GUIDE = [
  { label: "사업자 구분", value: "사업자 화주 여부 확인", note: "현재 계정 구분과 인증 상태를 이 화면에서 통합 관리합니다." },
  { label: "사업자등록번호", value: "인증 기능 연동 전", note: "숫자만 입력해도 되도록 추후 자동 포맷을 붙일 예정입니다." },
  { label: "상호 / 업체명", value: "회원가입 정보 기준", note: "가입 시 입력한 업체명을 기준으로 표시됩니다." },
  { label: "대표자명", value: "회원가입 정보 기준", note: "대표자명과 사업자 정보가 일치해야 합니다." },
];

const PROCESS_STEPS = [
  "사업자등록번호와 업체명, 대표자명 확인",
  "필요 시 사업자등록증 업로드 또는 고객센터 제출",
  "관리자 확인 후 인증 상태 반영",
  "세금계산서/정산 기능과 연동",
];

const DOC_ITEMS = ["사업자등록증", "대표자명 확인 가능 정보", "사업장 주소 정보", "문의 회신용 이메일"] as const;

function normalizeShipperTypeLabel(raw?: string) {
  const value = String(raw ?? "").trim().toUpperCase();
  if (!value) return "정보 확인 필요";
  if (value === "Y" || value === "BUSINESS" || value === "사업자") return "사업자 화주";
  if (value === "N" || value === "PERSONAL" || value === "개인") return "개인 화주";
  return "정보 확인 필요";
}

export default function ShipperBusinessVerificationScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;
  const [profile, setProfile] = React.useState<VerificationView>({
    shipperTypeLabel: "정보 확인 필요",
    nickname: "",
    name: "",
  });

  React.useEffect(() => {
    let active = true;
    void (async () => {
      const cached = await getCurrentUserSnapshot();
      if (!active) return;
      setProfile({
        shipperTypeLabel: normalizeShipperTypeLabel(cached?.shipperType),
        nickname: String(cached?.nickname ?? "").trim(),
        name: String(cached?.name ?? "").trim(),
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        body: { padding: 20, paddingTop: 14, paddingBottom: 32, gap: 16 } as ViewStyle,
        heroCard: {
          borderRadius: 24,
          padding: 20,
          gap: 14,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ViewStyle,
        heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 } as ViewStyle,
        iconWrap: {
          width: 48,
          height: 48,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        statusBadge: {
          height: 30,
          borderRadius: 15,
          paddingHorizontal: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.status.warning, 0.14),
          borderWidth: 1,
          borderColor: withAlpha(c.status.warning, 0.22),
        } as ViewStyle,
        statusBadgeText: { fontSize: 12, fontWeight: "900", color: c.status.warning } as TextStyle,
        title: { fontSize: 22, fontWeight: "900", color: c.text.primary } as TextStyle,
        desc: { fontSize: 14, lineHeight: 21, fontWeight: "600", color: c.text.secondary } as TextStyle,
        summaryRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" } as ViewStyle,
        summaryChip: {
          minHeight: 34,
          borderRadius: 17,
          paddingHorizontal: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.brand.primary, 0.08),
          borderWidth: 1,
          borderColor: withAlpha(c.brand.primary, 0.16),
        } as ViewStyle,
        summaryChipText: { fontSize: 12, fontWeight: "800", color: c.text.primary } as TextStyle,
        sectionCard: {
          borderRadius: 20,
          padding: 16,
          gap: 14,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ViewStyle,
        sectionTitle: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
        fieldCard: {
          borderRadius: 14,
          padding: 14,
          gap: 4,
          backgroundColor: c.bg.canvas,
          borderWidth: 1,
          borderColor: withAlpha(c.border.default, 0.92),
        } as ViewStyle,
        fieldLabel: { fontSize: 12, fontWeight: "900", color: c.text.secondary } as TextStyle,
        fieldValue: { fontSize: 15, fontWeight: "800", color: c.text.primary } as TextStyle,
        fieldNote: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: c.text.secondary } as TextStyle,
        processRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 } as ViewStyle,
        processIndex: {
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.brand.primary, 0.14),
        } as ViewStyle,
        processIndexText: { fontSize: 12, fontWeight: "900", color: c.brand.primary } as TextStyle,
        processText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "700", color: c.text.primary } as TextStyle,
        docsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as ViewStyle,
        docChip: {
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: withAlpha(c.status.success, 0.1),
          borderWidth: 1,
          borderColor: withAlpha(c.status.success, 0.2),
        } as ViewStyle,
        docChipText: { fontSize: 12, fontWeight: "800", color: c.status.success } as TextStyle,
        noticeBox: {
          borderRadius: 16,
          padding: 14,
          backgroundColor: withAlpha(c.brand.primary, 0.08),
          borderWidth: 1,
          borderColor: withAlpha(c.brand.primary, 0.16),
          gap: 6,
        } as ViewStyle,
        noticeTitle: { fontSize: 13, fontWeight: "900", color: c.brand.primary } as TextStyle,
        noticeText: { fontSize: 13, lineHeight: 19, fontWeight: "600", color: c.text.secondary } as TextStyle,
        actionRow: { flexDirection: "row", gap: 10 } as ViewStyle,
        primaryBtn: {
          flex: 1,
          height: 48,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.brand.primary,
        } as ViewStyle,
        primaryBtnText: { fontSize: 15, fontWeight: "900", color: c.bg.surface } as TextStyle,
        secondaryBtn: {
          flex: 1,
          height: 48,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ViewStyle,
        secondaryBtnText: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="사업자 인증"
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/(shipper)/(tabs)/my" as any);
        }}
      />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroTopRow}>
            <View style={s.iconWrap}>
              <Ionicons name="shield-checkmark-outline" size={24} color={c.brand.primary} />
            </View>
            <View style={s.statusBadge}>
              <Text style={s.statusBadgeText}>연동 준비 중</Text>
            </View>
          </View>
          <Text style={s.title}>사업자 정보 인증</Text>
          <Text style={s.desc}>
            인증 기능은 아직 연결 전이지만, 이후 실제 제출 흐름이 붙어도 바로 사용할 수 있도록 사업자 정보 확인 구조와 안내를 먼저 제공합니다.
          </Text>
          <View style={s.summaryRow}>
            <View style={s.summaryChip}>
              <Text style={s.summaryChipText}>{profile.shipperTypeLabel}</Text>
            </View>
            {!!profile.nickname && (
              <View style={s.summaryChip}>
                <Text style={s.summaryChipText}>{profile.nickname}</Text>
              </View>
            )}
            {!!profile.name && (
              <View style={s.summaryChip}>
                <Text style={s.summaryChipText}>{profile.name}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>확인 대상 정보</Text>
          {FIELD_GUIDE.map((item) => (
            <View key={item.label} style={s.fieldCard}>
              <Text style={s.fieldLabel}>{item.label}</Text>
              <Text style={s.fieldValue}>{item.value}</Text>
              <Text style={s.fieldNote}>{item.note}</Text>
            </View>
          ))}
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>인증 진행 절차</Text>
          {PROCESS_STEPS.map((item, index) => (
            <View key={item} style={s.processRow}>
              <View style={s.processIndex}>
                <Text style={s.processIndexText}>{index + 1}</Text>
              </View>
              <Text style={s.processText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>준비 서류</Text>
          <View style={s.docsWrap}>
            {DOC_ITEMS.map((item) => (
              <View key={item} style={s.docChip}>
                <Text style={s.docChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.noticeBox}>
          <Text style={s.noticeTitle}>현재 단계 안내</Text>
          <Text style={s.noticeText}>
            온라인 인증 제출은 아직 준비 중입니다. 우선은 사업자 화주용 화면과 정보 구조를 먼저 제공하고, 실제 제출과 검수 연동은 이후 단계에서 연결할 예정입니다.
          </Text>
        </View>

        <View style={s.actionRow}>
          <Pressable style={s.primaryBtn} onPress={() => router.push("/(common)/settings/account" as any)}>
            <Text style={s.primaryBtnText}>1:1 문의하기</Text>
          </Pressable>
          <Pressable style={s.secondaryBtn} onPress={() => router.push("/(common)/settings/shipper/business" as any)}>
            <Text style={s.secondaryBtnText}>세금계산서 관리</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
