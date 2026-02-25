import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
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

const STORAGE_KEY = "baro_shipper_payment_methods_v1";

type CardItem = {
  id: string;
  cardCompany: string;
  cardNumber: string;
  holderName: string;
  expiry: string;
  isDefault: boolean;
};

type RefundAccountItem = {
  id: string;
  bankName: string;
  accountNumber: string;
  holderName: string;
  isDefault: boolean;
};

type PaymentStore = {
  cards: CardItem[];
  refundAccounts: RefundAccountItem[];
};

const INITIAL_STORE: PaymentStore = {
  cards: [
    {
      id: "card-1",
      cardCompany: "신한카드",
      cardNumber: "1234123412345678",
      holderName: "홍길동",
      expiry: "1228",
      isDefault: true,
    },
  ],
  refundAccounts: [
    {
      id: "refund-1",
      bankName: "국민은행",
      accountNumber: "12345678901234",
      holderName: "홍길동",
      isDefault: true,
    },
  ],
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskCardNumber(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "-";
  if (digits.length <= 8) return digits;
  const head = digits.slice(0, 4);
  const tail = digits.slice(-4);
  return `${head} **** **** ${tail}`;
}

function maskAccountNumber(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "-";
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 3)}*****${digits.slice(-3)}`;
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function ShipperPaymentMethodsScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const c = t.colors;

  const [cards, setCards] = React.useState<CardItem[]>([]);
  const [refundAccounts, setRefundAccounts] = React.useState<RefundAccountItem[]>([]);
  const [showCardForm, setShowCardForm] = React.useState(false);
  const [showAccountForm, setShowAccountForm] = React.useState(false);

  const [cardDraft, setCardDraft] = React.useState({
    cardCompany: "",
    cardNumber: "",
    holderName: "",
    expiry: "",
  });
  const [accountDraft, setAccountDraft] = React.useState({
    bankName: "",
    accountNumber: "",
    holderName: "",
  });

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      void (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (!active) return;
          if (!raw) {
            setCards(INITIAL_STORE.cards);
            setRefundAccounts(INITIAL_STORE.refundAccounts);
            return;
          }

          const parsed = JSON.parse(raw) as Partial<PaymentStore> | null;
          const nextCards = Array.isArray(parsed?.cards) ? parsed?.cards : [];
          const nextAccounts = Array.isArray(parsed?.refundAccounts) ? parsed?.refundAccounts : [];
          setCards(nextCards);
          setRefundAccounts(nextAccounts);
        } catch {
          if (!active) return;
          setCards(INITIAL_STORE.cards);
          setRefundAccounts(INITIAL_STORE.refundAccounts);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const persist = React.useCallback(async (nextCards: CardItem[], nextAccounts: RefundAccountItem[]) => {
    setCards(nextCards);
    setRefundAccounts(nextAccounts);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          cards: nextCards,
          refundAccounts: nextAccounts,
        })
      );
    } catch {
      Alert.alert("저장 실패", "결제 수단 저장에 실패했습니다.");
    }
  }, []);

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(shipper)/(tabs)/my" as any);
  }, [router]);

  const setDefaultCard = React.useCallback(
    (id: string) => {
      const nextCards = cards.map((card) => ({ ...card, isDefault: card.id === id }));
      void persist(nextCards, refundAccounts);
    },
    [cards, persist, refundAccounts]
  );

  const setDefaultAccount = React.useCallback(
    (id: string) => {
      const nextAccounts = refundAccounts.map((account) => ({ ...account, isDefault: account.id === id }));
      void persist(cards, nextAccounts);
    },
    [cards, persist, refundAccounts]
  );

  const removeCard = React.useCallback(
    (id: string) => {
      Alert.alert("카드 삭제", "이 카드를 삭제할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            const nextCards = cards.filter((card) => card.id !== id);
            void persist(nextCards, refundAccounts);
          },
        },
      ]);
    },
    [cards, persist, refundAccounts]
  );

  const removeAccount = React.useCallback(
    (id: string) => {
      Alert.alert("계좌 삭제", "이 환불 계좌를 삭제할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            const nextAccounts = refundAccounts.filter((account) => account.id !== id);
            void persist(cards, nextAccounts);
          },
        },
      ]);
    },
    [cards, persist, refundAccounts]
  );

  const saveCard = React.useCallback(() => {
    if (!cardDraft.cardCompany.trim() || !cardDraft.cardNumber.trim() || !cardDraft.holderName.trim()) {
      Alert.alert("입력 확인", "카드사, 카드번호, 카드 소유자명을 입력해 주세요.");
      return;
    }
    if (onlyDigits(cardDraft.cardNumber).length < 12) {
      Alert.alert("입력 확인", "카드번호를 정확히 입력해 주세요.");
      return;
    }

    const nextCard: CardItem = {
      id: `card-${Date.now()}`,
      cardCompany: cardDraft.cardCompany.trim(),
      cardNumber: onlyDigits(cardDraft.cardNumber),
      holderName: cardDraft.holderName.trim(),
      expiry: onlyDigits(cardDraft.expiry).slice(0, 4),
      isDefault: cards.length === 0,
    };
    void persist([...cards, nextCard], refundAccounts);
    setCardDraft({ cardCompany: "", cardNumber: "", holderName: "", expiry: "" });
    setShowCardForm(false);
  }, [cardDraft, cards, persist, refundAccounts]);

  const saveAccount = React.useCallback(() => {
    if (!accountDraft.bankName.trim() || !accountDraft.accountNumber.trim() || !accountDraft.holderName.trim()) {
      Alert.alert("입력 확인", "은행명, 계좌번호, 예금주명을 입력해 주세요.");
      return;
    }

    const nextAccount: RefundAccountItem = {
      id: `account-${Date.now()}`,
      bankName: accountDraft.bankName.trim(),
      accountNumber: onlyDigits(accountDraft.accountNumber),
      holderName: accountDraft.holderName.trim(),
      isDefault: refundAccounts.length === 0,
    };
    void persist(cards, [...refundAccounts, nextAccount]);
    setAccountDraft({ bankName: "", accountNumber: "", holderName: "" });
    setShowAccountForm(false);
  }, [accountDraft, cards, persist, refundAccounts]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
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
        formCard: {
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
        row2: { flexDirection: "row", gap: 8 } as ViewStyle,
        col: { flex: 1, gap: 6 } as ViewStyle,
        formActions: { marginTop: 4, flexDirection: "row", justifyContent: "flex-end", gap: 8 } as ViewStyle,
        card: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 14,
          gap: 8,
        } as ViewStyle,
        titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as ViewStyle,
        title: { fontSize: 15, fontWeight: "900", color: c.text.primary } as TextStyle,
        defaultBadge: {
          height: 22,
          borderRadius: 11,
          paddingHorizontal: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(c.brand.primary, 0.16),
        } as ViewStyle,
        defaultBadgeText: { fontSize: 11, fontWeight: "800", color: c.brand.primary } as TextStyle,
        bodyText: { fontSize: 13, fontWeight: "700", color: c.text.primary } as TextStyle,
        subText: { fontSize: 12, fontWeight: "600", color: c.text.secondary } as TextStyle,
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
    <View style={s.page}>
      <ShipperScreenHeader title="결제 수단 관리" onPressBack={goBack} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>카드 관리</Text>
          <Pressable
            style={s.addBtn}
            onPress={() => {
              setShowCardForm(true);
              setShowAccountForm(false);
            }}
          >
            <Ionicons name="add" size={14} color={c.brand.primary} />
            <Text style={s.addBtnText}>카드 등록</Text>
          </Pressable>
        </View>

        {showCardForm ? (
          <View style={s.formCard}>
            <Text style={s.label}>카드사</Text>
            <TextInput
              value={cardDraft.cardCompany}
              onChangeText={(v) => setCardDraft((p) => ({ ...p, cardCompany: v }))}
              style={s.input}
              placeholder="예: 신한카드"
              placeholderTextColor={c.text.secondary}
            />
            <Text style={s.label}>카드번호</Text>
            <TextInput
              value={cardDraft.cardNumber}
              onChangeText={(v) => setCardDraft((p) => ({ ...p, cardNumber: onlyDigits(v) }))}
              style={s.input}
              keyboardType="number-pad"
              maxLength={16}
              placeholder="숫자만 입력"
              placeholderTextColor={c.text.secondary}
            />
            <View style={s.row2}>
              <View style={s.col}>
                <Text style={s.label}>카드 소유자명</Text>
                <TextInput
                  value={cardDraft.holderName}
                  onChangeText={(v) => setCardDraft((p) => ({ ...p, holderName: v }))}
                  style={s.input}
                  placeholder="예: 홍길동"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
              <View style={s.col}>
                <Text style={s.label}>유효기간(MMYY)</Text>
                <TextInput
                  value={cardDraft.expiry}
                  onChangeText={(v) => setCardDraft((p) => ({ ...p, expiry: onlyDigits(v).slice(0, 4) }))}
                  style={s.input}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="예: 1228"
                  placeholderTextColor={c.text.secondary}
                />
              </View>
            </View>
            <View style={s.formActions}>
              <Pressable style={s.ghostBtn} onPress={() => setShowCardForm(false)}>
                <Text style={s.ghostBtnText}>취소</Text>
              </Pressable>
              <Pressable style={s.addBtn} onPress={saveCard}>
                <Text style={s.addBtnText}>저장</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {cards.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>등록된 카드가 없습니다</Text>
            <Text style={s.emptyDesc}>카드 등록 버튼으로 결제 카드를 추가해 주세요.</Text>
          </View>
        ) : (
          cards.map((card) => (
            <View key={card.id} style={s.card}>
              <View style={s.titleRow}>
                <Text style={s.title}>{card.cardCompany}</Text>
                {card.isDefault ? (
                  <View style={s.defaultBadge}>
                    <Text style={s.defaultBadgeText}>기본</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.bodyText}>{maskCardNumber(card.cardNumber)}</Text>
              <Text style={s.subText}>
                {card.holderName} · {formatExpiry(card.expiry) || "-"}
              </Text>
              <View style={s.actionRow}>
                {!card.isDefault ? (
                  <Pressable style={s.ghostBtn} onPress={() => setDefaultCard(card.id)}>
                    <Text style={s.ghostBtnText}>기본카드 설정</Text>
                  </Pressable>
                ) : null}
                <Pressable style={s.dangerBtn} onPress={() => removeCard(card.id)}>
                  <Text style={s.dangerBtnText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>환불 계좌 관리</Text>
          <Pressable
            style={s.addBtn}
            onPress={() => {
              setShowAccountForm(true);
              setShowCardForm(false);
            }}
          >
            <Ionicons name="add" size={14} color={c.brand.primary} />
            <Text style={s.addBtnText}>계좌 등록</Text>
          </Pressable>
        </View>

        {showAccountForm ? (
          <View style={s.formCard}>
            <Text style={s.label}>은행명</Text>
            <TextInput
              value={accountDraft.bankName}
              onChangeText={(v) => setAccountDraft((p) => ({ ...p, bankName: v }))}
              style={s.input}
              placeholder="예: 국민은행"
              placeholderTextColor={c.text.secondary}
            />
            <Text style={s.label}>계좌번호</Text>
            <TextInput
              value={accountDraft.accountNumber}
              onChangeText={(v) => setAccountDraft((p) => ({ ...p, accountNumber: onlyDigits(v) }))}
              style={s.input}
              keyboardType="number-pad"
              placeholder="숫자만 입력"
              placeholderTextColor={c.text.secondary}
            />
            <Text style={s.label}>예금주명</Text>
            <TextInput
              value={accountDraft.holderName}
              onChangeText={(v) => setAccountDraft((p) => ({ ...p, holderName: v }))}
              style={s.input}
              placeholder="예: 홍길동"
              placeholderTextColor={c.text.secondary}
            />
            <View style={s.formActions}>
              <Pressable style={s.ghostBtn} onPress={() => setShowAccountForm(false)}>
                <Text style={s.ghostBtnText}>취소</Text>
              </Pressable>
              <Pressable style={s.addBtn} onPress={saveAccount}>
                <Text style={s.addBtnText}>저장</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {refundAccounts.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>등록된 환불 계좌가 없습니다</Text>
            <Text style={s.emptyDesc}>계좌 등록 버튼으로 환불 계좌를 추가해 주세요.</Text>
          </View>
        ) : (
          refundAccounts.map((account) => (
            <View key={account.id} style={s.card}>
              <View style={s.titleRow}>
                <Text style={s.title}>{account.bankName}</Text>
                {account.isDefault ? (
                  <View style={s.defaultBadge}>
                    <Text style={s.defaultBadgeText}>기본</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.bodyText}>{maskAccountNumber(account.accountNumber)}</Text>
              <Text style={s.subText}>{account.holderName}</Text>
              <View style={s.actionRow}>
                {!account.isDefault ? (
                  <Pressable style={s.ghostBtn} onPress={() => setDefaultAccount(account.id)}>
                    <Text style={s.ghostBtnText}>기본계좌 설정</Text>
                  </Pressable>
                ) : null}
                <Pressable style={s.dangerBtn} onPress={() => removeAccount(account.id)}>
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
