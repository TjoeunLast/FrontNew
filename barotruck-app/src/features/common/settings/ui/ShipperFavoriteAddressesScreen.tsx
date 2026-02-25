import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ShipperScreenHeader from "@/shared/ui/layout/ShipperScreenHeader";
import { withAlpha } from "@/shared/utils/color";

const STORAGE_KEY = "baro_shipper_favorite_addresses_v1";

type FavoriteAddress = {
  id: string;
  kind: "pickup" | "dropoff";
  name: string;
  roadAddress: string;
  detailAddress: string;
  isDefault: boolean;
};

const INITIAL_ADDRESSES: FavoriteAddress[] = [
  {
    id: "pickup-home",
    kind: "pickup",
    name: "본사 상차지",
    roadAddress: "서울 강남구 테헤란로 123",
    detailAddress: "8층 물류팀",
    isDefault: true,
  },
  {
    id: "dropoff-warehouse",
    kind: "dropoff",
    name: "동탄 하차지",
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
  const [addingKind, setAddingKind] = React.useState<"pickup" | "dropoff" | null>(null);
  const [draftName, setDraftName] = React.useState("");
  const [draftRoadAddress, setDraftRoadAddress] = React.useState("");
  const [draftDetailAddress, setDraftDetailAddress] = React.useState("");

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
          const parsed = JSON.parse(raw) as Array<
            FavoriteAddress | Omit<FavoriteAddress, "kind"> | (Omit<FavoriteAddress, "kind"> & { kind?: unknown })
          >;
          if (!Array.isArray(parsed)) {
            setAddresses(INITIAL_ADDRESSES);
            return;
          }
          const migrated = parsed.map((item, idx) => {
            const rawKind = (item as FavoriteAddress).kind;
            const kind: "pickup" | "dropoff" =
              rawKind === "pickup" || rawKind === "dropoff" ? rawKind : idx % 2 === 0 ? "pickup" : "dropoff";
            return {
              id: String(item.id),
              kind,
              name: String(item.name ?? ""),
              roadAddress: String(item.roadAddress ?? ""),
              detailAddress: String(item.detailAddress ?? ""),
              isDefault: Boolean(item.isDefault),
            };
          });
          setAddresses(migrated);
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
    (id: string, kind: "pickup" | "dropoff") => {
      const next = addresses.map((item) => ({
        ...item,
        isDefault: item.kind === kind ? item.id === id : item.isDefault,
      }));
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

  const openAddForm = React.useCallback((kind: "pickup" | "dropoff") => {
    setAddingKind(kind);
    setDraftName("");
    setDraftRoadAddress("");
    setDraftDetailAddress("");
  }, []);

  const cancelAddForm = React.useCallback(() => {
    setAddingKind(null);
    setDraftName("");
    setDraftRoadAddress("");
    setDraftDetailAddress("");
  }, []);

  const saveAddress = React.useCallback(() => {
    if (!addingKind) return;
    if (!draftName.trim() || !draftRoadAddress.trim()) {
      Alert.alert("입력 확인", "주소 이름과 도로명 주소를 입력해 주세요.");
      return;
    }

    const currentOfKind = addresses.filter((item) => item.kind === addingKind);
    const next: FavoriteAddress = {
      id: `${addingKind}-${Date.now()}`,
      kind: addingKind,
      name: draftName.trim(),
      roadAddress: draftRoadAddress.trim(),
      detailAddress: draftDetailAddress.trim(),
      isDefault: currentOfKind.length === 0,
    };
    void persist([...addresses, next]);
    cancelAddForm();
  }, [addingKind, addresses, cancelAddForm, draftDetailAddress, draftName, draftRoadAddress, persist]);

  const pickupAddresses = React.useMemo(
    () => addresses.filter((item) => item.kind === "pickup"),
    [addresses]
  );
  const dropoffAddresses = React.useMemo(
    () => addresses.filter((item) => item.kind === "dropoff"),
    [addresses]
  );

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
        sectionHeader: {
          marginTop: 8,
          marginBottom: 2,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,
        sectionTitle: { fontSize: 14, fontWeight: "900", color: c.text.secondary } as TextStyle,
        addBtn: {
          height: 32,
          borderRadius: 10,
          paddingHorizontal: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        addBtnText: { fontSize: 12, fontWeight: "800", color: c.brand.primary } as TextStyle,
        addCard: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 12,
          gap: 8,
        } as ViewStyle,
        label: { fontSize: 12, fontWeight: "800", color: c.text.secondary } as TextStyle,
        input: {
          minHeight: 40,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          paddingHorizontal: 10,
          color: c.text.primary,
          fontSize: 13,
          fontWeight: "700",
        } as TextStyle,
        addActionRow: { marginTop: 4, flexDirection: "row", justifyContent: "flex-end", gap: 8 } as ViewStyle,
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

  const renderSection = (kind: "pickup" | "dropoff", title: string, list: FavoriteAddress[]) => (
    <>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
        <Pressable style={s.addBtn} onPress={() => openAddForm(kind)}>
          <Ionicons name="add" size={14} color={c.brand.primary} />
          <Text style={s.addBtnText}>추가</Text>
        </Pressable>
      </View>

      {addingKind === kind ? (
        <View style={s.addCard}>
          <Text style={s.label}>주소 이름</Text>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            style={s.input}
            placeholder="예: 본사 상차지"
            placeholderTextColor={c.text.secondary}
          />
          <Text style={s.label}>도로명 주소</Text>
          <TextInput
            value={draftRoadAddress}
            onChangeText={setDraftRoadAddress}
            style={s.input}
            placeholder="예: 서울 강남구 테헤란로 123"
            placeholderTextColor={c.text.secondary}
          />
          <Text style={s.label}>상세 주소</Text>
          <TextInput
            value={draftDetailAddress}
            onChangeText={setDraftDetailAddress}
            style={s.input}
            placeholder="예: 8층 물류팀"
            placeholderTextColor={c.text.secondary}
          />
          <View style={s.addActionRow}>
            <Pressable style={s.ghostBtn} onPress={cancelAddForm}>
              <Text style={s.ghostBtnText}>취소</Text>
            </Pressable>
            <Pressable style={s.addBtn} onPress={saveAddress}>
              <Text style={s.addBtnText}>저장</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {list.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyTitle}>{title}가 없습니다</Text>
          <Text style={s.emptyDesc}>상단의 {title} 추가 버튼으로 등록하세요.</Text>
        </View>
      ) : (
        list.map((item) => (
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
                <Pressable style={s.ghostBtn} onPress={() => setDefault(item.id, kind)}>
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
    </>
  );

  return (
    <View style={s.wrap}>
      <ShipperScreenHeader
        title="자주 쓰는 주소지"
        onPressBack={goBack}
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {renderSection("pickup", "상차지", pickupAddresses)}
        {renderSection("dropoff", "하차지", dropoffAddresses)}
      </ScrollView>
    </View>
  );
}
