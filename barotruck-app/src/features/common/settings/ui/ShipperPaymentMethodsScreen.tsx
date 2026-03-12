import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { PaymentService } from '@/shared/api/paymentService';
import { useAppTheme } from '@/shared/hooks/useAppTheme';
import type { BillingAgreementStatus, ShipperBillingAgreementResponse } from '@/shared/models/payment';
import { Button } from '@/shared/ui/base';
import { useToast } from '@/shared/ui/feedback/ToastProvider';
import ShipperScreenHeader from '@/shared/ui/layout/ShipperScreenHeader';
import {
  formatBillingAgreementDate,
  getBillingAgreementMethodLabel,
  getBillingAgreementStatusLabel,
} from '@/shared/utils/payment/billingAgreement';
import { withAlpha } from '@/shared/utils/color';

function getApiErrorMessage(error: unknown, fallback: string) {
  const candidate = error as {
    message?: unknown;
    response?: { data?: { message?: unknown } };
  };

  const message =
    candidate?.response?.data?.message ?? candidate?.message ?? fallback;

  return String(message || fallback);
}

function getStatusColors(status: BillingAgreementStatus | null | undefined, colors: ReturnType<typeof useAppTheme>['colors']) {
  switch (status) {
    case 'ACTIVE':
      return {
        bg: withAlpha(colors.status.success, 0.14),
        border: withAlpha(colors.status.success, 0.3),
        text: colors.status.success,
      };
    case 'INACTIVE':
      return {
        bg: withAlpha(colors.status.warning, 0.16),
        border: withAlpha(colors.status.warning, 0.34),
        text: colors.status.warning,
      };
    case 'DELETED':
      return {
        bg: withAlpha(colors.status.danger, 0.12),
        border: withAlpha(colors.status.danger, 0.28),
        text: colors.status.danger,
      };
    default:
      return {
        bg: withAlpha(colors.brand.primary, 0.1),
        border: withAlpha(colors.brand.primary, 0.22),
        text: colors.brand.primary,
      };
  }
}

function getCardSummary(agreement: ShipperBillingAgreementResponse | null) {
  if (!agreement) {
    return '자동 결제용 카드가 아직 등록되지 않았습니다.';
  }

  const cardCompany = String(agreement.cardCompany ?? '').trim();
  const cardNumberMasked = String(agreement.cardNumberMasked ?? '').trim();
  const pieces = [cardCompany, cardNumberMasked].filter(Boolean);

  if (pieces.length > 0) {
    return pieces.join(' ');
  }

  return agreement.status === 'ACTIVE'
    ? '등록된 카드 정보가 아직 동기화되지 않았습니다.'
    : '해지된 billing agreement입니다.';
}

function getAgreementDescription(agreement: ShipperBillingAgreementResponse | null) {
  if (!agreement) {
    return '등록된 자동결제 카드가 없습니다.';
  }

  if (agreement.status === 'ACTIVE') {
    return '현재 등록된 카드로 billing agreement가 활성화되어 있습니다.';
  }

  return '이전 billing agreement가 비활성 상태입니다.';
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors: c } = useAppTheme();

  return (
    <View style={detailStyles.row}>
      <Text style={[detailStyles.label, { color: c.text.secondary }]}>{label}</Text>
      <Text style={[detailStyles.value, { color: c.text.primary }]}>{value || '-'}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});

export default function ShipperPaymentMethodsScreen() {
  const router = useRouter();
  const toast = useToast();
  const t = useAppTheme();
  const c = t.colors;

  const [agreement, setAgreement] = React.useState<ShipperBillingAgreementResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [deactivating, setDeactivating] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);

  const statusLabel = getBillingAgreementStatusLabel(agreement?.status);
  const statusColors = getStatusColors(agreement?.status, c);
  const paymentMethodLabel = getBillingAgreementMethodLabel(agreement);

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(shipper)/(tabs)/my' as any);
  }, [router]);

  const fetchAgreement = React.useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const nextAgreement = await PaymentService.getMyBillingAgreement();
        setAgreement(nextAgreement);
        setLastError(null);
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          'billing agreement 상태를 불러오지 못했습니다.'
        );
        setLastError(message);
        toast.show(message, 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setHasLoadedOnce(true);
      }
    },
    [toast]
  );

  useFocusEffect(
    React.useCallback(() => {
      void fetchAgreement(hasLoadedOnce ? 'refresh' : 'initial');
    }, [fetchAgreement, hasLoadedOnce])
  );

  const executeDeactivate = React.useCallback(async () => {
    if (!agreement || agreement.status !== 'ACTIVE' || deactivating) {
      return;
    }

    try {
      setDeactivating(true);
      const nextAgreement = await PaymentService.deactivateMyBillingAgreement();
      setAgreement(nextAgreement);
      setLastError(null);
      toast.show('billing agreement를 해지했습니다.', 'success');
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'billing agreement 해지에 실패했습니다.'
      );
      setLastError(message);
      toast.show(message, 'danger');
    } finally {
      setDeactivating(false);
    }
  }, [agreement, deactivating, toast]);

  const onPressDeactivate = React.useCallback(() => {
    if (!agreement || agreement.status !== 'ACTIVE' || deactivating) {
      return;
    }

    Alert.alert(
      '자동결제 카드 해지',
      '현재 등록된 billing agreement를 해지할까요? 이후 자동청구가 중단됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해지',
          style: 'destructive',
          onPress: () => {
            void executeDeactivate();
          },
        },
      ]
    );
  }, [agreement, deactivating, executeDeactivate]);

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: c.bg.canvas } as ViewStyle,
        content: {
          padding: 20,
          paddingTop: 12,
          paddingBottom: 32,
          gap: 14,
        } as ViewStyle,
        heroCard: {
          borderRadius: 22,
          padding: 18,
          gap: 14,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ViewStyle,
        heroTop: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        } as ViewStyle,
        heroIcon: {
          width: 52,
          height: 52,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        heroTitle: {
          fontSize: 17,
          fontWeight: '900',
          color: c.text.primary,
        } as TextStyle,
        heroDesc: {
          marginTop: 4,
          fontSize: 13,
          fontWeight: '600',
          lineHeight: 19,
          color: c.text.secondary,
        } as TextStyle,
        heroFoot: {
          borderRadius: 16,
          padding: 14,
          gap: 6,
          backgroundColor: withAlpha(c.brand.primary, 0.06),
        } as ViewStyle,
        heroFootTitle: {
          fontSize: 13,
          fontWeight: '800',
          color: c.text.primary,
        } as TextStyle,
        heroFootDesc: {
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 18,
          color: c.text.secondary,
        } as TextStyle,
        sectionTitle: {
          marginTop: 2,
          fontSize: 13,
          fontWeight: '900',
          color: c.text.secondary,
        } as TextStyle,
        errorCard: {
          borderRadius: 16,
          padding: 14,
          gap: 8,
          borderWidth: 1,
          borderColor: withAlpha(c.status.danger, 0.24),
          backgroundColor: withAlpha(c.status.danger, 0.08),
        } as ViewStyle,
        errorTitle: {
          fontSize: 13,
          fontWeight: '800',
          color: c.status.danger,
        } as TextStyle,
        errorText: {
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 18,
          color: c.text.secondary,
        } as TextStyle,
        statusCard: {
          borderRadius: 20,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 18,
          gap: 14,
        } as ViewStyle,
        statusTop: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 10,
        } as ViewStyle,
        statusTitleWrap: {
          flex: 1,
          gap: 8,
        } as ViewStyle,
        statusTitle: {
          fontSize: 18,
          fontWeight: '900',
          color: c.text.primary,
        } as TextStyle,
        statusDesc: {
          fontSize: 13,
          fontWeight: '600',
          lineHeight: 19,
          color: c.text.secondary,
        } as TextStyle,
        badge: {
          height: 30,
          borderRadius: 15,
          paddingHorizontal: 12,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
        } as ViewStyle,
        badgeText: {
          fontSize: 12,
          fontWeight: '900',
        } as TextStyle,
        cardSummary: {
          borderRadius: 16,
          padding: 14,
          gap: 6,
          backgroundColor: c.bg.muted,
        } as ViewStyle,
        cardSummaryLabel: {
          fontSize: 12,
          fontWeight: '700',
          color: c.text.secondary,
        } as TextStyle,
        cardSummaryValue: {
          fontSize: 16,
          fontWeight: '900',
          color: c.text.primary,
        } as TextStyle,
        cardSummaryMeta: {
          fontSize: 12,
          fontWeight: '600',
          color: c.text.secondary,
        } as TextStyle,
        divider: {
          height: 1,
          backgroundColor: withAlpha(c.border.default, 0.9),
        } as ViewStyle,
        detailGroup: {
          gap: 10,
        } as ViewStyle,
        actionRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
        } as ViewStyle,
        emptyCard: {
          borderRadius: 20,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 22,
          alignItems: 'center',
          gap: 8,
        } as ViewStyle,
        emptyTitle: {
          fontSize: 16,
          fontWeight: '900',
          color: c.text.primary,
        } as TextStyle,
        emptyDesc: {
          fontSize: 13,
          fontWeight: '600',
          lineHeight: 19,
          textAlign: 'center',
          color: c.text.secondary,
        } as TextStyle,
        guideCard: {
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          padding: 16,
          gap: 12,
        } as ViewStyle,
        guideRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        } as ViewStyle,
        guideIndex: {
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(c.brand.primary, 0.12),
        } as ViewStyle,
        guideIndexText: {
          fontSize: 12,
          fontWeight: '900',
          color: c.brand.primary,
        } as TextStyle,
        guideTitle: {
          fontSize: 13,
          fontWeight: '800',
          color: c.text.primary,
        } as TextStyle,
        guideDesc: {
          marginTop: 3,
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 18,
          color: c.text.secondary,
        } as TextStyle,
        loadingCard: {
          borderRadius: 18,
          padding: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ViewStyle,
        loadingText: {
          fontSize: 13,
          fontWeight: '700',
          color: c.text.secondary,
        } as TextStyle,
        subtleAction: {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        } as ViewStyle,
        subtleActionText: {
          fontSize: 13,
          fontWeight: '800',
          color: c.brand.primary,
        } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <ShipperScreenHeader
        title="결제 수단 관리"
        subtitle="화주 자동청구용 billing agreement 상태를 조회하고 해지할 수 있습니다."
        onPressBack={goBack}
      />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <MaterialCommunityIcons
                name="credit-card-check-outline"
                size={26}
                color={c.brand.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>자동 결제 카드 상태</Text>
              <Text style={s.heroDesc}>
                현재 자동청구 카드 등록 상태를 확인할 수 있습니다.
              </Text>
            </View>
          </View>
          <View style={s.heroFoot}>
            <Text style={s.heroFootTitle}>현재 표시 상태</Text>
            <Text style={s.heroFootDesc}>
              {paymentMethodLabel} · {statusLabel}
            </Text>
          </View>
        </View>

        {lastError ? (
          <View style={s.errorCard}>
            <Text style={s.errorTitle}>최근 실패 메시지</Text>
            <Text style={s.errorText}>{lastError}</Text>
            <Pressable
              style={s.subtleAction}
              onPress={() => {
                void fetchAgreement('refresh');
              }}
            >
              <Ionicons name="refresh" size={14} color={c.brand.primary} />
              <Text style={s.subtleActionText}>다시 조회</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={s.sectionTitle}>billing agreement 상태</Text>
        {loading ? (
          <View style={s.loadingCard}>
            <Text style={s.loadingText}>billing agreement 정보를 불러오는 중입니다.</Text>
          </View>
        ) : agreement ? (
          <View style={s.statusCard}>
            <View style={s.statusTop}>
              <View style={s.statusTitleWrap}>
                <Text style={s.statusTitle}>{statusLabel}</Text>
                <Text style={s.statusDesc}>{getAgreementDescription(agreement)}</Text>
              </View>
              <View
                style={[
                  s.badge,
                  {
                    backgroundColor: statusColors.bg,
                    borderColor: statusColors.border,
                  },
                ]}
              >
                <Text style={[s.badgeText, { color: statusColors.text }]}>
                  {agreement.provider}
                </Text>
              </View>
            </View>

            <View style={s.cardSummary}>
              <Text style={s.cardSummaryLabel}>등록 카드</Text>
              <Text style={s.cardSummaryValue}>{getCardSummary(agreement)}</Text>
              <Text style={s.cardSummaryMeta}>
                {[
                  agreement.method,
                  agreement.cardType || null,
                  agreement.ownerType || null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '카드 세부 정보가 아직 없습니다.'}
              </Text>
            </View>

            <View style={s.divider} />

            <View style={s.detailGroup}>
              <DetailRow label="고객 키" value={agreement.customerKey || '-'} />
              <DetailRow label="billing key" value={agreement.billingKeyMasked || '-'} />
              <DetailRow
                label="최초 인증 시각"
                value={formatBillingAgreementDate(agreement.authenticatedAt)}
              />
              <DetailRow
                label="마지막 자동청구"
                value={formatBillingAgreementDate(agreement.lastChargedAt)}
              />
              <DetailRow
                label="해지 시각"
                value={formatBillingAgreementDate(agreement.deactivatedAt)}
              />
              <DetailRow
                label="해지 사유"
                value={agreement.deactivationReason || '-'}
              />
            </View>

            <View style={s.actionRow}>
              <Button
                title={refreshing ? '조회 중...' : '새로고침'}
                variant="outline"
                onPress={() => {
                  void fetchAgreement('refresh');
                }}
                disabled={refreshing}
                style={{ flexGrow: 1 }}
              />
              {agreement.status === 'ACTIVE' ? (
                <Button
                  title={deactivating ? '해지 중...' : '해지'}
                  variant="danger"
                  onPress={onPressDeactivate}
                  disabled={deactivating}
                  style={{ flexGrow: 1 }}
                />
              ) : null}
            </View>
          </View>
        ) : (
          <View style={s.emptyCard}>
            <MaterialCommunityIcons
              name="credit-card-off-outline"
              size={34}
              color={c.text.secondary}
            />
            <Text style={s.emptyTitle}>등록된 billing agreement가 없습니다.</Text>
            <Text style={s.emptyDesc}>
              현재 자동청구 카드가 등록되어 있지 않습니다.
            </Text>
            <View style={s.actionRow}>
              <Button
                title={refreshing ? '조회 중...' : '새로고침'}
                variant="outline"
                onPress={() => {
                  void fetchAgreement('refresh');
                }}
                disabled={refreshing}
                style={{ minWidth: 140 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
