import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";

const STORAGE_KEY = "baro_driver_documents_status_v1";

type DocKey = "business" | "license" | "insurance";
type DocItem = {
  key: DocKey;
  title: string;
  subtitle: string;
  required: boolean;
  uploaded: boolean;
  updatedAt?: string;
  imageUri?: string;
};

const INITIAL_ITEMS: DocItem[] = [
  {
    key: "business",
    title: "사업자등록증",
    subtitle: "사업자 차주인 경우 필수",
    required: false,
    uploaded: false,
  },
  {
    key: "license",
    title: "화물운송 자격증",
    subtitle: "운행 등록 필수 서류",
    required: true,
    uploaded: false,
  },
  {
    key: "insurance",
    title: "적재물 보험 증빙",
    subtitle: "정산/분쟁 대응 서류",
    required: true,
    uploaded: false,
  },
];

function nowLabel() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function DriverDocumentsScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const [items, setItems] = React.useState<DocItem[]>(INITIAL_ITEMS);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active || !raw) return;
        const parsed = JSON.parse(raw) as Partial<Record<DocKey, { uploaded: boolean; updatedAt?: string; imageUri?: string }>>;
        setItems((prev) =>
          prev.map((item) => {
            const v = parsed[item.key];
            if (!v) return item;
            return { ...item, uploaded: Boolean(v.uploaded), updatedAt: v.updatedAt, imageUri: v.imageUri };
          })
        );
      } catch {
        // noop
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = React.useCallback(async (next: DocItem[]) => {
    setItems(next);
    const payload = next.reduce(
      (acc, cur) => {
        acc[cur.key] = { uploaded: cur.uploaded, updatedAt: cur.updatedAt };
        if (cur.imageUri) {
          acc[cur.key].imageUri = cur.imageUri;
        }
        return acc;
      },
      {} as Record<DocKey, { uploaded: boolean; updatedAt?: string; imageUri?: string }>
    );
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      Alert.alert("저장 실패", "서류 상태 저장에 실패했습니다.");
    }
  }, []);

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(driver)/(tabs)/mypage" as any);
  }, [router]);

  const onPressUpload = React.useCallback(
    async (key: DocKey) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("권한 필요", "서류 사진 등록을 위해 사진 접근 권한이 필요합니다.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.75,
      });

      if (result.canceled || !result.assets?.length) return;
      const imageUri = result.assets[0]?.uri ?? "";
      if (!imageUri) return;

      const stamp = nowLabel();
      const next = items.map((item) =>
        item.key === key ? { ...item, uploaded: true, updatedAt: stamp, imageUri } : item
      );
      await persist(next);
      Alert.alert("등록 완료", "서류 이미지가 등록되었습니다.");
    },
    [items, persist]
  );

  const doneCount = items.filter((x) => x.uploaded).length;

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 16, paddingTop: 14, paddingBottom: 30, gap: 12 } as ViewStyle,
        topCard: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 8,
        } as ViewStyle,
        topTitle: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
        topSub: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        listCard: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          overflow: "hidden",
        } as ViewStyle,
        row: {
          minHeight: 88,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
        } as ViewStyle,
        rowDivider: { height: 1, backgroundColor: c.border.default, marginLeft: 14 } as ViewStyle,
        rowInfo: { flex: 1, gap: 3 } as ViewStyle,
        rowTitle: { fontSize: 14, fontWeight: "900", color: c.text.primary } as TextStyle,
        rowSub: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        rowMeta: { fontSize: 11, fontWeight: "700", color: c.text.secondary } as TextStyle,
        badge: { paddingHorizontal: 8, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" } as ViewStyle,
        badgeDone: { backgroundColor: "#DCFCE7" } as ViewStyle,
        badgeTodo: { backgroundColor: "#EEF2FF" } as ViewStyle,
        badgeTxtDone: { color: "#15803D", fontSize: 11, fontWeight: "900" } as TextStyle,
        badgeTxtTodo: { color: "#4E46E5", fontSize: 11, fontWeight: "900" } as TextStyle,
        uploadBtn: {
          marginLeft: 10,
          height: 34,
          borderRadius: 10,
          paddingHorizontal: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.brand.primary,
        } as ViewStyle,
        uploadBtnDone: { backgroundColor: "#E2E8F0" } as ViewStyle,
        uploadBtnTxt: { color: c.text.inverse, fontSize: 12, fontWeight: "900" } as TextStyle,
        uploadBtnTxtDone: { color: "#475569" } as TextStyle,
        thumb: {
          width: 38,
          height: 38,
          borderRadius: 8,
          marginLeft: 8,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ImageStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader title="서류 관리" onPressBack={goBack} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.topCard}>
          <Text style={s.topTitle}>등록 현황 {doneCount}/{items.length}</Text>
          <Text style={s.topSub}>필수 서류는 운행/정산 진행 전까지 등록해 주세요.</Text>
        </View>

        <View style={s.listCard}>
          {items.map((item, idx) => {
            const done = item.uploaded;
            return (
              <React.Fragment key={item.key}>
                <View style={s.row}>
                  <View style={s.rowInfo}>
                    <Text style={s.rowTitle}>{item.title}</Text>
                    <Text style={s.rowSub}>{item.subtitle}</Text>
                    <Text style={s.rowMeta}>
                      {item.required ? "필수" : "선택"} · {done ? `최근 등록 ${item.updatedAt}` : "미등록"}
                    </Text>
                  </View>
                  <View style={[s.badge, done ? s.badgeDone : s.badgeTodo]}>
                    <Text style={done ? s.badgeTxtDone : s.badgeTxtTodo}>{done ? "등록완료" : "미등록"}</Text>
                  </View>
                  {item.imageUri ? <Image source={{ uri: item.imageUri }} style={s.thumb} resizeMode="cover" /> : null}
                  <Pressable style={[s.uploadBtn, done && s.uploadBtnDone]} onPress={() => onPressUpload(item.key)}>
                    <Text style={[s.uploadBtnTxt, done && s.uploadBtnTxtDone]}>{done ? "재등록" : "등록"}</Text>
                  </Pressable>
                </View>
                {idx < items.length - 1 ? <View style={s.rowDivider} /> : null}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
