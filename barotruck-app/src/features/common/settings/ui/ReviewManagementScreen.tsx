import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import { ReviewService } from "@/shared/api/reviewService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { ReviewResponse } from "@/shared/models/review";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";

type ReviewTab = "RECEIVED" | "WRITTEN";

type ReviewItem = {
  id: string;
  title: string;
  subtitle: string;
  rating: number;
  content: string;
  date: string;
};

function renderStars(rating: number) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function toDateLabel(raw?: string) {
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function mapReviewRows(rows: ReviewResponse[] | undefined, mode: ReviewTab): ReviewItem[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    id: String(row.reviewId ?? `${mode}-${Math.random()}`),
    title: `리뷰 #${row.reviewId ?? "-"}`,
    subtitle: mode === "RECEIVED" ? `작성자 ${row.writerNickname || "-"}` : "내가 작성한 리뷰",
    rating: Number(row.rating ?? 0),
    content: String(row.content ?? "").trim() || "내용 없음",
    date: toDateLabel(row.createdAt),
  }));
}

export default function ReviewManagementScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const [tab, setTab] = React.useState<ReviewTab>("RECEIVED");
  const [loading, setLoading] = React.useState(true);
  const [receivedRows, setReceivedRows] = React.useState<ReviewItem[]>([]);
  const [writtenRows, setWrittenRows] = React.useState<ReviewItem[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);

      void (async () => {
        try {
          const me = await UserService.getMyInfo().catch(() => null as any);
          const myUserId = Number((me as any)?.userId ?? 0);

          const [receivedApi, writtenApi] = await Promise.all([
            Number.isFinite(myUserId) && myUserId > 0
              ? ReviewService.getReviewsByTarget(myUserId).catch(() => [])
              : Promise.resolve([]),
            ReviewService.getMyReviews().catch(() => []),
          ]);

          if (!active) return;
          setReceivedRows(mapReviewRows(receivedApi, "RECEIVED"));
          setWrittenRows(mapReviewRows(writtenApi, "WRITTEN"));
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const rows = tab === "RECEIVED" ? receivedRows : writtenRows;
  const avg = rows.length > 0 ? rows.reduce((acc, cur) => acc + cur.rating, 0) / rows.length : 0;

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 16, paddingTop: 14, paddingBottom: 28, gap: 12 } as ViewStyle,
        summaryCard: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
        } as ViewStyle,
        summaryTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as ViewStyle,
        summaryTitle: { fontSize: 14, fontWeight: "900", color: c.text.primary } as TextStyle,
        summaryCount: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        summaryRate: { marginTop: 8, fontSize: 24, fontWeight: "900", color: c.text.primary } as TextStyle,
        summaryStars: { marginTop: 3, fontSize: 13, fontWeight: "800", color: "#F59E0B" } as TextStyle,
        tabRow: { flexDirection: "row", gap: 8 } as ViewStyle,
        tabBtn: {
          flex: 1,
          height: 40,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        tabBtnOn: { backgroundColor: c.brand.primary, borderColor: c.brand.primary } as ViewStyle,
        tabTxt: { fontSize: 13, fontWeight: "800", color: c.text.secondary } as TextStyle,
        tabTxtOn: { color: c.text.inverse } as TextStyle,
        reviewCard: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 12,
          gap: 8,
        } as ViewStyle,
        reviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as ViewStyle,
        reviewTitle: { fontSize: 14, fontWeight: "900", color: c.text.primary } as TextStyle,
        reviewDate: { fontSize: 11, fontWeight: "700", color: c.text.secondary } as TextStyle,
        reviewSub: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        reviewStars: { fontSize: 12, fontWeight: "800", color: "#F59E0B" } as TextStyle,
        reviewBody: { fontSize: 13, fontWeight: "700", color: c.text.primary, lineHeight: 19 } as TextStyle,
        emptyCard: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          paddingVertical: 22,
          alignItems: "center",
          gap: 6,
        } as ViewStyle,
        emptyText: { fontSize: 13, fontWeight: "700", color: c.text.secondary } as TextStyle,
        emptyIcon: {
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.text.secondary, 0.14),
        } as ViewStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="리뷰 관리"
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/(shipper)/(tabs)/my" as any);
        }}
      />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.summaryCard}>
          <View style={s.summaryTop}>
            <Text style={s.summaryTitle}>{tab === "RECEIVED" ? "받은 리뷰" : "작성한 리뷰"}</Text>
            <Text style={s.summaryCount}>{rows.length}건</Text>
          </View>
          <Text style={s.summaryRate}>{avg.toFixed(1)}</Text>
          <Text style={s.summaryStars}>{renderStars(avg)}</Text>
        </View>

        <View style={s.tabRow}>
          <Pressable style={[s.tabBtn, tab === "RECEIVED" && s.tabBtnOn]} onPress={() => setTab("RECEIVED")}>
            <Text style={[s.tabTxt, tab === "RECEIVED" && s.tabTxtOn]}>받은 리뷰</Text>
          </Pressable>
          <Pressable style={[s.tabBtn, tab === "WRITTEN" && s.tabBtnOn]} onPress={() => setTab("WRITTEN")}>
            <Text style={[s.tabTxt, tab === "WRITTEN" && s.tabTxtOn]}>작성한 리뷰</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Ionicons name="time-outline" size={18} color={c.text.secondary} />
            </View>
            <Text style={s.emptyText}>리뷰를 불러오는 중입니다.</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color={c.text.secondary} />
            </View>
            <Text style={s.emptyText}>리뷰 내역이 없습니다.</Text>
          </View>
        ) : (
          rows.map((item) => (
            <View key={item.id} style={s.reviewCard}>
              <View style={s.reviewTop}>
                <Text style={s.reviewTitle}>{item.title}</Text>
                <Text style={s.reviewDate}>{item.date}</Text>
              </View>
              <Text style={s.reviewSub}>{item.subtitle}</Text>
              <Text style={s.reviewStars}>{renderStars(item.rating)}</Text>
              <Text style={s.reviewBody}>{item.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
