import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";

const NOTICE_ITEMS = [
  {
    id: "notice-1",
    tag: "서비스",
    title: "화주 마이페이지 구성이 일부 변경되었습니다.",
    date: "2026.03.04",
    body: "고객 지원 메뉴와 사업자 인증 화면이 추가되었습니다. 자주 쓰는 주소지 메뉴는 화주 마이페이지에서 제거되었습니다.",
  },
  {
    id: "notice-2",
    tag: "점검",
    title: "사업자 인증 기능은 준비 중입니다.",
    date: "2026.03.04",
    body: "현재는 안내 화면만 제공되며, 실제 인증 제출 및 검수 연동은 추후 업데이트에서 순차적으로 제공될 예정입니다.",
  },
  {
    id: "notice-3",
    tag: "안내",
    title: "세금계산서 관리 입력 내용은 임시 저장되지 않습니다.",
    date: "2026.03.04",
    body: "입력 중 화면을 벗어나면 작성 중 데이터가 초기화될 수 있으니 작성 완료 전에는 화면을 종료하지 않는 것을 권장합니다.",
  },
] as const;

export default function AnnouncementsScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        body: { padding: 20, paddingTop: 14, paddingBottom: 32, gap: 12 } as ViewStyle,
        heroCard: {
          borderRadius: 20,
          padding: 18,
          gap: 10,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ViewStyle,
        heroTop: { flexDirection: "row", alignItems: "center", gap: 10 } as ViewStyle,
        heroIconWrap: {
          width: 42,
          height: 42,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        heroTitle: { fontSize: 20, fontWeight: "900", color: c.text.primary } as TextStyle,
        heroDesc: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: c.text.secondary } as TextStyle,
        card: {
          borderRadius: 18,
          padding: 16,
          gap: 10,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ViewStyle,
        rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 } as ViewStyle,
        tag: {
          height: 24,
          borderRadius: 12,
          paddingHorizontal: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        tagText: { fontSize: 11, fontWeight: "900", color: c.brand.primary } as TextStyle,
        dateText: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        title: { fontSize: 15, fontWeight: "900", color: c.text.primary, lineHeight: 22 } as TextStyle,
        bodyText: { fontSize: 13, fontWeight: "600", color: c.text.secondary, lineHeight: 19 } as TextStyle,
        actionBtn: {
          marginTop: 8,
          height: 46,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        actionBtnText: { fontSize: 14, fontWeight: "900", color: c.text.primary } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="공지사항"
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
          <View style={s.heroTop}>
            <View style={s.heroIconWrap}>
              <Ionicons name="megaphone-outline" size={22} color={c.brand.primary} />
            </View>
            <Text style={s.heroTitle}>공지사항</Text>
          </View>
          <Text style={s.heroDesc}>서비스 변경, 점검 일정, 기능 업데이트 안내를 이 화면에서 확인할 수 있습니다.</Text>
        </View>

        {NOTICE_ITEMS.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.rowTop}>
              <View style={s.tag}>
                <Text style={s.tagText}>{item.tag}</Text>
              </View>
              <Text style={s.dateText}>{item.date}</Text>
            </View>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.bodyText}>{item.body}</Text>
          </View>
        ))}

        <Pressable style={s.actionBtn} onPress={() => router.push("/(common)/settings/account" as any)}>
          <Text style={s.actionBtnText}>문의하기</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
