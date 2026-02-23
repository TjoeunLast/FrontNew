import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";

const STORAGE_KEY = "baro_shipper_favorite_addresses_v1";

type FavoriteAddress = {
  id: string;
  name: string;
  roadAddress: string;
  detailAddress: string;
  isDefault: boolean;
};

const INITIAL_ADDRESSES: FavoriteAddress[] = [
  {
    id: "home",
    name: "본사",
    roadAddress: "서울 강남구 테헤란로 123",
    detailAddress: "8층 물류팀",
    isDefault: true,
  },
  {
    id: "warehouse",
    name: "창고",
    roadAddress: "경기 화성시 동탄대로 201",
    detailAddress: "B동 2번 게이트",
    isDefault: false,
  },
];

export default function ShipperFavoriteAddressesScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const [addresses, setAddresses] = React.useState<FavoriteAddress[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (!active) return;
          if (!raw) {
            setAddresses(INITIAL_ADDRESSES);
            return;
          }
          const parsed = JSON.parse(raw) as FavoriteAddress[];
          if (!Array.isArray(parsed)) {
            setAddresses(INITIAL_ADDRESSES);
            return;
          }
          setAddresses(parsed);
        } catch {
          if (!active) return;
          setAddresses(INITIAL_ADDRESSES);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const persist = React.useCallback(async (next: FavoriteAddress[]) => {
    setAddresses(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      Alert.alert("저장 실패", "주소 저장에 실패했습니다.");
    }
  }, []);

  const setDefault = React.useCallback(
    (id: string) => {
      const next = addresses.map((item) => ({ ...item, isDefault: item.id === id }));
      void persist(next);
    },
    [addresses, persist]
  );

  const removeAddress = React.useCallback(
    (id: string) => {
      Alert.alert("주소 삭제", "이 주소를 삭제할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            const next = addresses.filter((item) => item.id !== id);
            void persist(next);
          },
        },
      ]);
    },
    [addresses, persist]
  );

  const addAddress = React.useCallback(() => {
    const index = addresses.length + 1;
    const next: FavoriteAddress = {
      id: `custom-${Date.now()}`,
      name: `새 주소 ${index}`,
      roadAddress: "주소 검색으로 등록해 주세요",
      detailAddress: "상세 주소를 입력해 주세요",
      isDefault: addresses.length === 0,
    };
    void persist([...addresses, next]);
  }, [addresses, persist]);

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
        wrap: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: { padding: 20, paddingTop: 12, paddingBottom: 32, gap: 12 } as ViewStyle,
        addRow: { alignItems: "flex-end" } as ViewStyle,
        addBtn: {
          height: 40,
          borderRadius: 12,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        addBtnText: { fontSize: 13, fontWeight: "800", color: c.brand.primary } as TextStyle,
        card: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 8,
        } as ViewStyle,
        nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as ViewStyle,
        nameText: { fontSize: 16, fontWeight: "800", color: c.text.primary } as TextStyle,
        defaultBadge: {
          height: 24,
          borderRadius: 12,
          paddingHorizontal: 9,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.brand.primary, 0.16),
        } as ViewStyle,
        defaultBadgeText: { fontSize: 11, fontWeight: "800", color: c.brand.primary } as TextStyle,
        addressText: { fontSize: 14, fontWeight: "700", color: c.text.primary } as TextStyle,
        detailText: { fontSize: 13, fontWeight: "600", color: c.text.secondary } as TextStyle,
        actionRow: { marginTop: 4, flexDirection: "row", gap: 8 } as ViewStyle,
        ghostBtn: {
          height: 34,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.border.default,
          paddingHorizontal: 12,
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        ghostBtnText: { fontSize: 12, fontWeight: "700", color: c.text.secondary } as TextStyle,
        dangerBtn: {
          height: 34,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: withAlpha(c.status?.danger ?? "#EF4444", 0.5),
          paddingHorizontal: 12,
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        dangerBtnText: { fontSize: 12, fontWeight: "700", color: c.status?.danger ?? "#EF4444" } as TextStyle,
        emptyCard: {
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 18,
          alignItems: "center",
          gap: 6,
        } as ViewStyle,
        emptyTitle: { fontSize: 14, fontWeight: "800", color: c.text.primary } as TextStyle,
        emptyDesc: { fontSize: 12, fontWeight: "600", color: c.text.secondary } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={s.wrap}>
      <ShipperScreenHeader
        title="자주 쓰는 주소지"
        subtitle="상차/하차 주소를 저장해 두고 빠르게 선택하세요."
        onPressBack={goBack}
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.addRow}>
          <Pressable style={s.addBtn} onPress={addAddress}>
            <Ionicons name="add" size={16} color={c.brand.primary} />
            <Text style={s.addBtnText}>주소 추가</Text>
          </Pressable>
        </View>

        {addresses.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>등록된 주소가 없습니다</Text>
            <Text style={s.emptyDesc}>상단의 주소 추가 버튼으로 시작하세요.</Text>
          </View>
        ) : (
          addresses.map((item) => (
            <View key={item.id} style={s.card}>
              <View style={s.nameRow}>
                <Text style={s.nameText}>{item.name}</Text>
                {item.isDefault ? (
                  <View style={s.defaultBadge}>
                    <Text style={s.defaultBadgeText}>기본</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.addressText}>{item.roadAddress}</Text>
              <Text style={s.detailText}>{item.detailAddress}</Text>
              <View style={s.actionRow}>
                {!item.isDefault ? (
                  <Pressable style={s.ghostBtn} onPress={() => setDefault(item.id)}>
                    <Text style={s.ghostBtnText}>기본으로 설정</Text>
                  </Pressable>
                ) : null}
                <Pressable style={s.dangerBtn} onPress={() => removeAddress(item.id)}>
                  <Text style={s.dangerBtnText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
