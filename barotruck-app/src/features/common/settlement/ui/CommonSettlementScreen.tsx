import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

export default function CommonSettlementScreen() {
  const { colors: c } = useAppTheme();

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: {
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 28,
          gap: 12,
        } as ViewStyle,
        card: {
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 16,
          gap: 8,
        } as ViewStyle,
        title: { fontSize: 17, fontWeight: "900", color: c.text.primary } as TextStyle,
        body: {
          fontSize: 13,
          lineHeight: 20,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        noteCard: {
          borderRadius: 18,
          backgroundColor: "#EEF4FF",
          padding: 16,
          gap: 6,
        } as ViewStyle,
        noteTitle: { fontSize: 15, fontWeight: "900", color: "#1D4ED8" } as TextStyle,
        noteText: { fontSize: 13, lineHeight: 20, fontWeight: "700", color: "#334155" } as TextStyle,
      }),
    [c],
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="정산 안내"
        subtitle="역할별 화면에서 확인해야 할 금액 기준이 다릅니다."
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.title}>차주 정산 화면</Text>
          <Text style={s.body}>
            차주 화면은 받는 금액 기준으로 봅니다. 기본 운임, 차주 수수료, 프로모션,
            최종 수령 예정 금액을 순서대로 확인하고 결제 확인과 지급 상태를 함께 봅니다.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>화주 정산 화면</Text>
          <Text style={s.body}>
            화주 화면은 결제 진행과 청구 금액을 중심으로 봅니다. 차주 수수료와 Toss
            수수료는 사용자 핵심 정보로 전면 노출하지 않고 설명 수준으로만 다룹니다.
          </Text>
        </View>

        <View style={s.noteCard}>
          <Text style={s.noteTitle}></Text>
          <Text style={s.noteText}>
            
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
