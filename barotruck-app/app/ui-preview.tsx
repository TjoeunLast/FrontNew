import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Bell, Info, Package } from "lucide-react-native";
import { Button, IconButton, Divider } from "@/shared/ui/base";
import {
  Dialog,
  EmptyState,
  LoadingOverlay,
  useToast,
} from "@/shared/ui/feedback";
import { Chip, SegmentedTabs, TextField } from "@/shared/ui/form";
import { SHOrderCard } from "@/shared/ui/business";
import { AppLayout, AppTopBar, BottomCTA } from "@/shared/ui/layout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function UiPreviewScreen() {
  const t = useAppTheme();
  const c = t.colors;
  const toast = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("latest");
  const [selectedChip, setSelectedChip] = useState("all");
  const [email, setEmail] = useState("");

  const sortItems = useMemo(
    () => [
      { key: "latest", label: "최신순" },
      { key: "distance", label: "거리순" },
      { key: "price", label: "운임순" },
    ],
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
      <AppTopBar
        title="디자인 시스템 프리뷰"
        right={
          <IconButton onPress={() => toast.show("알림 목록을 확인합니다.")}>
            <Bell size={22} color={c.text.primary} />
          </IconButton>
        }
      />

      <AppLayout
        scroll
        padding={20}
        contentContainerStyle={{ gap: 40, paddingBottom: 140 }}
      >
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Package size={20} color={c.brand.primary} />
            <Text style={[s.sectionTitle, { color: c.text.primary }]}>
              오더 카드 케이스
            </Text>
          </View>

          <View style={{ gap: 16 }}>

          </View>
        </View>

        {/* <Divider /> */}

        <View style={s.section}>
          <Text
            style={[
              s.sectionTitle,
              { color: c.text.primary, marginBottom: 16, marginTop: 20 },
            ]}
          >
            필터 및 입력 양식
          </Text>

          <View style={{ gap: 20 }}>
            <SegmentedTabs items={sortItems} value={sort} onChange={setSort} />

            <View style={s.chipRow}>
              <Chip
                label="전체"
                selected={selectedChip === "all"}
                onPress={() => setSelectedChip("all")}
              />
              <Chip
                label="왕복 전용"
                selected={selectedChip === "round"}
                onPress={() => setSelectedChip("round")}
              />
              <Chip label="선택 불가" disabled />
            </View>

            <TextField
              label="이메일 계정"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* <Divider /> */}

        <View style={s.section}>
          <Text
            style={[
              s.sectionTitle,
              { color: c.text.primary, marginBottom: 16, marginTop: 20 },
            ]}
          >
            버튼 스타일링
          </Text>

          <View style={{ gap: 12 }}>
            <View style={s.row}>
              <Button
                title="확인"
                style={{ flex: 1 }}
                onPress={() => toast.show("확인 버튼 클릭", "success")}
              />
              <Button
                title="취소"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {}}
              />
            </View>
            <Button
              title="로딩 오버레이 테스트"
              variant="accent"
              fullWidth
              onPress={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1500);
              }}
            />
          </View>
        </View>

        <View style={s.emptyContainer}>
          <EmptyState
            title="진행 중인 오더가 없습니다"
            description="주변 오더를 찾으려면 목록을 새로고침 하세요"
            actionLabel="목록 새로고침"
            onPressAction={() => toast.show("데이터를 갱신합니다.")}
          />
        </View>
      </AppLayout>

      <BottomCTA
        primary={{
          title: "설정 저장",
          onPress: () => setDialogOpen(true),
        }}
        secondary={{
          title: "초기화",
          variant: "outline",
          onPress: () => toast.show("입력값이 초기화되었습니다."),
        }}
      >
        <View style={s.ctaHelper}>
          <Info size={14} color={c.text.secondary} />
          <Text style={s.ctaHelperText}>
            저장 전 입력 정보를 다시 확인해주세요
          </Text>
        </View>
      </BottomCTA>

      <Dialog
        open={dialogOpen}
        title="변경사항 저장"
        description="입력하신 UI 설정값을 서버에 반영하시겠습니까"
        onClose={() => setDialogOpen(false)}
        primary={{
          label: "저장",
          onPress: () => {
            setDialogOpen(false);
            toast.show("성공적으로 반영되었습니다!", "success");
          },
        }}
        secondary={{
          label: "닫기",
          variant: "outline",
          onPress: () => setDialogOpen(false),
        }}
      />

      <LoadingOverlay open={loading} label="정보를 처리하고 있습니다" />
    </View>
  );
}

const s = StyleSheet.create({
  section: { width: "100%" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  row: { flexDirection: "row", gap: 12 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  emptyContainer: {
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingVertical: 20,
  },
  ctaHelper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  ctaHelperText: { fontSize: 12, color: "#64748B" },
});

