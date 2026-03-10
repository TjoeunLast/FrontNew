import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { noticeService } from "@/shared/api/noticeService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { NoticeResponse } from "@/shared/models/notice";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

const TXT_DETAIL = "공지 상세";
const TXT_RETRY = "다시 불러오기";

function formatNoticeDate(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.split("T")[0] ?? value;
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors: c } = useAppTheme();
  const [notice, setNotice] = useState<NoticeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const noticeId = Number(id);

  const fetchNotice = async () => {
    if (!Number.isFinite(noticeId) || noticeId <= 0) {
      setNotice(null);
      setError("유효하지 않은 공지입니다.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await noticeService.getNoticeDetail(noticeId);
      setNotice(data);
    } catch (e) {
      console.error("공지 상세 조회 실패", e);
      setNotice(null);
      setError("공지 내용을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotice();
  }, [id]);

  return (
    <View style={[s.wrap, { backgroundColor: c.bg.canvas }]}>
      <ShipperScreenHeader
        title={TXT_DETAIL}
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/(common)/notifications" as any);
        }}
      />

      {loading ? (
        <View style={s.stateBox}>
          <ActivityIndicator size="large" color={c.brand.primary} />
        </View>
      ) : error ? (
        <View style={s.stateBox}>
          <Text style={[s.errorText, { color: c.text.primary }]}>{error}</Text>
          <Pressable
            style={[
              s.retryButton,
              { backgroundColor: c.brand.primarySoft, borderColor: c.brand.primary },
            ]}
            onPress={fetchNotice}
          >
            <Text style={[s.retryLabel, { color: c.brand.primary }]}>{TXT_RETRY}</Text>
          </Pressable>
        </View>
      ) : notice ? (
        <ScrollView contentContainerStyle={s.content}>
          <View style={[s.postCard, { backgroundColor: c.bg.surface, borderColor: c.border.default }]}>
            <View style={s.headerBlock}>
              <View style={s.topRow}>
                {notice.isPinned === "Y" ? (
                  <View
                    style={[
                      s.pinBadge,
                      { backgroundColor: c.brand.primarySoft, borderColor: c.brand.primary },
                    ]}
                  >
                    <Text style={[s.pinBadgeText, { color: c.brand.primary }]}>중요 공지</Text>
                  </View>
                ) : (
                  <Text style={[s.boardLabel, { color: c.brand.primary }]}>공지사항</Text>
                )}
              </View>

              <Text style={[s.title, { color: c.text.primary }]}>{notice.title}</Text>

              <View style={[s.metaPanel, { backgroundColor: c.bg.canvas, borderColor: c.border.default }]}>
                <View style={s.metaItem}>
                  <Text style={[s.metaLabel, { color: c.text.secondary }]}>작성자</Text>
                  <Text style={[s.metaValue, { color: c.text.primary }]}>
                    {notice.adminName || "관리자"}
                  </Text>
                </View>
                <View style={[s.metaDivider, { backgroundColor: c.border.default }]} />
                <View style={s.metaItem}>
                  <Text style={[s.metaLabel, { color: c.text.secondary }]}>등록일</Text>
                  <Text style={[s.metaValue, { color: c.text.primary }]}>
                    {formatNoticeDate(notice.createdAt)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[s.contentDivider, { backgroundColor: c.border.default }]} />

            <View style={s.bodyBlock}>
              <Text style={[s.body, { color: c.text.primary }]}>{notice.content}</Text>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  stateBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  postCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18, gap: 14 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pinBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pinBadgeText: { fontSize: 12, fontWeight: "800" },
  boardLabel: { fontSize: 13, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "800", lineHeight: 34, letterSpacing: -0.3 },
  metaPanel: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: { flex: 1, gap: 4 },
  metaLabel: { fontSize: 12, fontWeight: "600" },
  metaValue: { fontSize: 14, fontWeight: "700" },
  metaDivider: { width: 1, alignSelf: "stretch", marginHorizontal: 14 },
  contentDivider: { height: 1 },
  bodyBlock: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
  body: { fontSize: 16, fontWeight: "500", lineHeight: 30 },
  errorText: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  retryButton: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  retryLabel: { fontSize: 14, fontWeight: "700" },
});
