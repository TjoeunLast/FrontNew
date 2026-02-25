import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";

type PolicyItem = {
  id: string;
  title: string;
  required: boolean;
  version: string;
  effectiveDate: string;
  summary: string;
  preview: string[];
};

const POLICY_ITEMS: PolicyItem[] = [
  {
    id: "service",
    title: "서비스 이용약관",
    required: true,
    version: "v1.2",
    effectiveDate: "2026.01.05",
    summary: "회원 가입, 주문 등록, 배차/정산 이용 기준",
    preview: [
      "제1조(목적) 본 약관은 바로운송 서비스 이용 조건 및 절차를 규정합니다.",
      "제5조(회원의 의무) 회원은 정확한 정보 제공 및 관계 법령을 준수해야 합니다.",
      "제11조(서비스 제한) 허위 주문 등록 등 운영 방해 시 이용이 제한될 수 있습니다.",
    ],
  },
  {
    id: "privacy",
    title: "개인정보 처리방침",
    required: true,
    version: "v2.1",
    effectiveDate: "2026.01.05",
    summary: "수집 항목, 보관 기간, 제3자 제공 및 위탁",
    preview: [
      "수집 항목: 이름, 연락처, 계정 정보, 서비스 이용 기록 등",
      "보유 기간: 법령 기준 또는 동의 철회 시까지 보관 후 파기",
      "이용자는 열람/정정/삭제/처리정지 요구 권리를 가집니다.",
    ],
  },
  {
    id: "location",
    title: "위치기반서비스 이용약관",
    required: false,
    version: "v1.0",
    effectiveDate: "2025.12.12",
    summary: "위치 정보 사용 목적, 수집 범위, 동의 철회",
    preview: [
      "배차 추천 및 차량 위치 확인을 위해 위치 정보가 사용됩니다.",
      "위치 정보는 서비스 제공 목적 범위에서만 처리됩니다.",
      "설정 메뉴에서 위치 정보 동의를 언제든지 변경할 수 있습니다.",
    ],
  },
  {
    id: "marketing",
    title: "마케팅 정보 수신 동의",
    required: false,
    version: "v1.1",
    effectiveDate: "2025.10.21",
    summary: "이벤트/혜택 알림 및 수신 거부 방법",
    preview: [
      "혜택, 이벤트, 프로모션 정보가 앱 푸시/문자로 발송될 수 있습니다.",
      "수신 동의 여부는 서비스 이용과 무관하며 언제든지 철회할 수 있습니다.",
      "철회는 앱 내 설정 또는 고객센터 요청으로 즉시 처리됩니다.",
    ],
  },
];

export default function TermsPoliciesScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;
  const [selectedId, setSelectedId] = React.useState(POLICY_ITEMS[0]?.id ?? "");
  const selectedItem = POLICY_ITEMS.find((item) => item.id === selectedId) ?? POLICY_ITEMS[0];

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(shipper)/(tabs)/my" as any);
  }, [router]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 20, paddingTop: 14, paddingBottom: 30, gap: 12 } as ViewStyle,
        sectionCard: {
          borderWidth: 1,
          borderColor: c.border.default,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        row: {
          minHeight: 58,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
        } as ViewStyle,
        rowIconWrap: {
          width: 28,
          height: 28,
          borderRadius: 8,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 10,
        } as ViewStyle,
        rowTextWrap: { flex: 1 } as ViewStyle,
        rowTop: { flexDirection: "row", alignItems: "center", gap: 7 } as ViewStyle,
        badge: {
          height: 20,
          borderRadius: 10,
          paddingHorizontal: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.text.secondary, 0.14),
        } as ViewStyle,
        badgeRequired: { backgroundColor: withAlpha(c.brand.primary, 0.16) } as ViewStyle,
        badgeText: { fontSize: 10, fontWeight: "900", color: c.text.secondary } as TextStyle,
        badgeTextRequired: { color: c.brand.primary } as TextStyle,
        rowLabel: { fontSize: 14, fontWeight: "800", color: c.text.primary } as TextStyle,
        rowMeta: { marginTop: 2, fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        divider: { height: 1, backgroundColor: withAlpha(c.border.default, 0.9), marginLeft: 54 } as ViewStyle,
        previewCard: {
          borderWidth: 1,
          borderColor: c.border.default,
          borderRadius: 16,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 8,
        } as ViewStyle,
        previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as ViewStyle,
        previewTitle: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
        previewMeta: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        previewLine: { fontSize: 13, fontWeight: "600", lineHeight: 20, color: c.text.primary } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="이용약관 및 정책" onPressBack={goBack} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.sectionCard}>
          {POLICY_ITEMS.map((item, idx) => (
            <React.Fragment key={item.id}>
              <Pressable style={s.row} onPress={() => setSelectedId(item.id)}>
                <View style={[s.rowIconWrap, { backgroundColor: withAlpha(c.text.secondary, 0.12) }]}>
                  <Ionicons name="document-text-outline" size={18} color={c.text.secondary} />
                </View>
                <View style={s.rowTextWrap}>
                  <View style={s.rowTop}>
                    <Text style={s.rowLabel}>{item.title}</Text>
                    <View style={[s.badge, item.required && s.badgeRequired]}>
                      <Text style={[s.badgeText, item.required && s.badgeTextRequired]}>
                        {item.required ? "필수" : "선택"}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.rowMeta}>
                    {item.summary} · {item.version}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.text.secondary} />
              </Pressable>
              {idx < POLICY_ITEMS.length - 1 ? <View style={s.divider} /> : null}
            </React.Fragment>
          ))}
        </View>

        {selectedItem ? (
          <View style={s.previewCard}>
            <View style={s.previewHeader}>
              <Text style={s.previewTitle}>{selectedItem.title}</Text>
              <Text style={s.previewMeta}>{selectedItem.version}</Text>
            </View>
            <Text style={s.previewMeta}>시행일 {selectedItem.effectiveDate}</Text>
            {selectedItem.preview.map((line) => (
              <Text key={line} style={s.previewLine}>
                • {line}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
