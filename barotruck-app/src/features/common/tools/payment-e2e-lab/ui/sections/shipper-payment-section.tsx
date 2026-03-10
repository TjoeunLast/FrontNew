import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import PaymentTestService, {
  type ShipperPaymentLabSnapshot,
} from '@/shared/api/paymentTestService';
import { useAppTheme } from '@/shared/hooks/useAppTheme';
import type {
  MarkPaidRequest,
  PaymentMethod,
  ShipperBillingAgreementResponse,
  TossBillingContextResponse,
  TossPrepareResponse,
  TransportPaymentResponse,
} from '@/shared/models/payment';
import { Button } from '@/shared/ui/base';
import { TextField } from '@/shared/ui/form';
import { Chip } from '@/shared/ui/form/Chip';
import { withAlpha } from '@/shared/utils/color';

type Props = {
  orderId: number;
};

type ActivityTone = 'info' | 'success' | 'danger';

type ActivityItem = {
  id: string;
  title: string;
  message: string;
  at: string;
  tone: ActivityTone;
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  const hh = String(parsed.getHours()).padStart(2, '0');
  const min = String(parsed.getMinutes()).padStart(2, '0');
  const sec = String(parsed.getSeconds()).padStart(2, '0');

  return `${yyyy}.${mm}.${dd} ${hh}:${min}:${sec}`;
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '-';
  }

  return `${Number(value).toLocaleString('ko-KR')}원`;
}

function getErrorMessage(error: unknown, fallback: string) {
  const candidate = error as {
    message?: unknown;
    response?: { data?: { message?: unknown; error?: unknown } };
  };

  const message =
    candidate?.response?.data?.message ??
    candidate?.response?.data?.error ??
    candidate?.message ??
    fallback;

  return String(message || fallback);
}

function getToneColors(
  tone: ActivityTone,
  colors: ReturnType<typeof useAppTheme>['colors']
) {
  if (tone === 'success') {
    return {
      bg: withAlpha(colors.status.success, 0.08),
      border: withAlpha(colors.status.success, 0.22),
      text: colors.status.success,
    };
  }
  if (tone === 'danger') {
    return {
      bg: withAlpha(colors.status.danger, 0.08),
      border: withAlpha(colors.status.danger, 0.22),
      text: colors.status.danger,
    };
  }
  return {
    bg: withAlpha(colors.brand.primary, 0.08),
    border: withAlpha(colors.brand.primary, 0.22),
    text: colors.brand.primary,
  };
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

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { colors: c } = useAppTheme();

  return (
    <View
      style={{
        borderRadius: 20,
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: c.border.default,
        backgroundColor: c.bg.surface,
      }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: c.text.primary }}>{title}</Text>
        <Text
          style={{
            fontSize: 12,
            lineHeight: 18,
            fontWeight: '600',
            color: c.text.secondary,
          }}
        >
          {description}
        </Text>
      </View>
      {children}
    </View>
  );
}

function SnapshotCard({
  snapshot,
  lastPayment,
}: {
  snapshot: ShipperPaymentLabSnapshot | null;
  lastPayment: TransportPaymentResponse | null;
}) {
  const { colors: c } = useAppTheme();
  const order = snapshot?.order ?? null;
  const settlement = snapshot?.settlement ?? null;

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          borderRadius: 16,
          padding: 14,
          gap: 10,
          backgroundColor: c.bg.muted,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '900', color: c.text.primary }}>
          주문 상태 snapshot
        </Text>
        <DetailRow label="주문 상태" value={order?.status ?? '-'} />
        <DetailRow label="결제 상태" value={order?.paymentStatus ?? '-'} />
        <DetailRow label="정산 상태" value={order?.settlementStatus ?? '-'} />
        <DetailRow label="결제 방식" value={order?.payMethod ?? '-'} />
        <DetailRow label="기본 운임" value={formatMoney(order?.basePrice)} />
        <DetailRow label="조회 시각" value={formatDateTime(snapshot?.fetchedAt)} />
      </View>

      <View
        style={{
          borderRadius: 16,
          padding: 14,
          gap: 10,
          backgroundColor: c.bg.muted,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '900', color: c.text.primary }}>
          Settlement snapshot
        </Text>
        <DetailRow label="정산 상태" value={settlement?.status ?? '-'} />
        <DetailRow label="총 금액" value={formatMoney(settlement?.totalPrice)} />
        <DetailRow
          label="수수료율"
          value={
            settlement && Number.isFinite(settlement.feeRate)
              ? `${settlement.feeRate}%`
              : '-'
          }
        />
        <DetailRow label="정산 생성 시각" value={formatDateTime(settlement?.feeDate)} />
        <DetailRow
          label="정산 완료 시각"
          value={formatDateTime(settlement?.feeCompleteDate)}
        />
      </View>

      <View
        style={{
          borderRadius: 16,
          padding: 14,
          gap: 10,
          backgroundColor: c.bg.muted,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '900', color: c.text.primary }}>
          마지막 결제 응답
        </Text>
        <DetailRow label="결제 상태" value={lastPayment?.status ?? '-'} />
        <DetailRow label="결제 수단" value={lastPayment?.method ?? '-'} />
        <DetailRow label="결제 시점" value={lastPayment?.paymentTiming ?? '-'} />
        <DetailRow label="결제 금액" value={formatMoney(lastPayment?.amount)} />
        <DetailRow label="paidAt" value={formatDateTime(lastPayment?.paidAt)} />
        <DetailRow label="confirmedAt" value={formatDateTime(lastPayment?.confirmedAt)} />
      </View>
    </View>
  );
}

export function ShipperPaymentSection({ orderId }: Props) {
  const router = useRouter();
  const { colors: c } = useAppTheme();

  const [billingContext, setBillingContext] = React.useState<TossBillingContextResponse | null>(
    null
  );
  const [agreement, setAgreement] = React.useState<ShipperBillingAgreementResponse | null>(null);
  const [prepared, setPrepared] = React.useState<TossPrepareResponse | null>(null);
  const [snapshot, setSnapshot] = React.useState<ShipperPaymentLabSnapshot | null>(null);
  const [lastPayment, setLastPayment] = React.useState<TransportPaymentResponse | null>(null);
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [markPaidMethod, setMarkPaidMethod] = React.useState<PaymentMethod>('CARD');
  const [proofUrl, setProofUrl] = React.useState('');
  const [billingLoading, setBillingLoading] = React.useState(false);
  const [agreementLoading, setAgreementLoading] = React.useState(false);
  const [preparing, setPreparing] = React.useState(false);
  const [markingPaid, setMarkingPaid] = React.useState(false);
  const [snapshotLoading, setSnapshotLoading] = React.useState(false);
  const [snapshotError, setSnapshotError] = React.useState<string | null>(null);

  const appendActivity = React.useCallback(
    (tone: ActivityTone, title: string, message: string) => {
      const item: ActivityItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tone,
        title,
        message,
        at: new Date().toISOString(),
      };
      setActivities((prev) => [item, ...prev].slice(0, 12));
    },
    []
  );

  React.useEffect(() => {
    setPrepared(null);
    setLastPayment(null);
    setSnapshot(null);
    setSnapshotError(null);
    setActivities([]);
  }, [orderId]);

  const refreshBillingContext = React.useCallback(async () => {
    try {
      setBillingLoading(true);
      const next = await PaymentTestService.getBillingContext();
      setBillingContext(next);
      appendActivity('success', 'billing context 조회', 'SDK 초기화 정보 조회에 성공했습니다.');
    } catch (error) {
      const message = getErrorMessage(
        error,
        'billing context를 조회하지 못했습니다.'
      );
      appendActivity('danger', 'billing context 조회 실패', message);
      Alert.alert('조회 오류', message);
    } finally {
      setBillingLoading(false);
    }
  }, [appendActivity]);

  const refreshAgreement = React.useCallback(async () => {
    try {
      setAgreementLoading(true);
      const next = await PaymentTestService.getBillingAgreement();
      setAgreement(next);
      appendActivity(
        'success',
        'billing agreement 조회',
        next
          ? `agreement 상태는 ${next.status} 입니다.`
          : '등록된 billing agreement가 없습니다.'
      );
    } catch (error) {
      const message = getErrorMessage(
        error,
        'billing agreement를 조회하지 못했습니다.'
      );
      appendActivity('danger', 'billing agreement 조회 실패', message);
      Alert.alert('조회 오류', message);
    } finally {
      setAgreementLoading(false);
    }
  }, [appendActivity]);

  const refreshSnapshot = React.useCallback(async () => {
    try {
      setSnapshotLoading(true);
      setSnapshotError(null);
      const next = await PaymentTestService.getShipperPaymentSnapshot(orderId);
      setSnapshot(next);

      const summary = [
        `order=${next.order?.status ?? '-'}`,
        `payment=${next.order?.paymentStatus ?? '-'}`,
        `settlement=${next.settlement?.status ?? next.order?.settlementStatus ?? '-'}`,
      ].join(', ');
      appendActivity('info', 'snapshot 갱신', summary);
    } catch (error) {
      const message = getErrorMessage(error, '주문 snapshot을 갱신하지 못했습니다.');
      setSnapshotError(message);
      appendActivity('danger', 'snapshot 갱신 실패', message);
    } finally {
      setSnapshotLoading(false);
    }
  }, [appendActivity, orderId]);

  const prepareTossPayment = React.useCallback(async () => {
    try {
      setPreparing(true);
      const next = await PaymentTestService.prepareTossPayment(orderId, {
        method: 'CARD',
        payChannel: 'CARD',
      });
      setPrepared(next);
      appendActivity(
        'success',
        'Toss prepare 성공',
        `pgOrderId=${next.pgOrderId}, amount=${next.amount}`
      );
    } catch (error) {
      const message = getErrorMessage(error, 'Toss prepare 호출에 실패했습니다.');
      appendActivity('danger', 'Toss prepare 실패', message);
      Alert.alert('prepare 오류', message);
    } finally {
      setPreparing(false);
    }
  }, [appendActivity, orderId]);

  const openCheckout = React.useCallback(() => {
    if (!prepared) {
      Alert.alert('안내', '먼저 Toss prepare를 실행해 주세요.');
      return;
    }

    appendActivity(
      'info',
      '결제창 진입',
      `prepared session(${prepared.pgOrderId})으로 checkout을 엽니다.`
    );

    router.push(
      {
        pathname: '/(shipper)/payment-checkout',
        params: {
          orderId: String(orderId),
          clientKey: prepared.clientKey,
          pgOrderId: prepared.pgOrderId,
          amount: String(prepared.amount),
          orderName: prepared.orderName,
          successUrl: prepared.successUrl,
          failUrl: prepared.failUrl,
        },
      } as any
    );
  }, [appendActivity, orderId, prepared, router]);

  const onMarkPaid = React.useCallback(async () => {
    const request: MarkPaidRequest = {
      method: markPaidMethod,
      paidAt: new Date().toISOString(),
    };

    if (markPaidMethod === 'TRANSFER') {
      const trimmedProofUrl = proofUrl.trim();
      if (!trimmedProofUrl) {
        Alert.alert('입력 필요', 'TRANSFER 수동 결제는 proofUrl이 필요합니다.');
        return;
      }
      request.proofUrl = trimmedProofUrl;
    }

    try {
      setMarkingPaid(true);
      const next = await PaymentTestService.markPaid(orderId, request);
      setLastPayment(next);
      appendActivity(
        'success',
        'mark-paid 성공',
        `status=${next.status}, method=${next.method}, amount=${next.amount}`
      );
      await refreshSnapshot();
    } catch (error) {
      const message = getErrorMessage(error, '수동 결제 반영에 실패했습니다.');
      appendActivity('danger', 'mark-paid 실패', message);
      Alert.alert('mark-paid 오류', message);
    } finally {
      setMarkingPaid(false);
    }
  }, [appendActivity, markPaidMethod, orderId, proofUrl, refreshSnapshot]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshSnapshot();
      return undefined;
    }, [refreshSnapshot])
  );

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          gap: 16,
        } as ViewStyle,
        actionRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
        } as ViewStyle,
        noteCard: {
          borderRadius: 16,
          padding: 14,
          gap: 6,
          borderWidth: 1,
          borderColor: withAlpha(c.brand.primary, 0.22),
          backgroundColor: withAlpha(c.brand.primary, 0.08),
        } as ViewStyle,
        noteTitle: {
          fontSize: 13,
          fontWeight: '900',
          color: c.brand.primary,
        } as TextStyle,
        noteText: {
          fontSize: 12,
          lineHeight: 18,
          fontWeight: '600',
          color: c.text.secondary,
        } as TextStyle,
        groupTitle: {
          fontSize: 13,
          fontWeight: '900',
          color: c.text.secondary,
        } as TextStyle,
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        } as ViewStyle,
        mutedCard: {
          borderRadius: 16,
          padding: 14,
          gap: 10,
          backgroundColor: c.bg.muted,
        } as ViewStyle,
        emptyText: {
          fontSize: 12,
          lineHeight: 18,
          fontWeight: '600',
          color: c.text.secondary,
        } as TextStyle,
        activityItem: {
          borderRadius: 14,
          padding: 12,
          gap: 6,
          borderWidth: 1,
        } as ViewStyle,
        activityTitle: {
          fontSize: 13,
          fontWeight: '900',
        } as TextStyle,
        activityMessage: {
          fontSize: 12,
          lineHeight: 18,
          fontWeight: '600',
          color: c.text.secondary,
        } as TextStyle,
        activityTime: {
          fontSize: 11,
          fontWeight: '700',
          color: c.text.secondary,
        } as TextStyle,
        sectionDivider: {
          height: 1,
          backgroundColor: withAlpha(c.border.default, 0.9),
        } as ViewStyle,
      }),
    [c]
  );

  return (
    <View style={s.wrap}>
      <View style={s.noteCard}>
        <Text style={s.noteTitle}>선택된 주문 #{orderId}</Text>
        <Text style={s.noteText}>
          이 섹션은 화주 단계만 다룹니다. 결제창에서 돌아오면 snapshot을 자동으로 다시
          조회해 내부 상태 변화를 확인합니다.
        </Text>
      </View>

      <SectionCard
        title="billing 상태"
        description="billing context와 최신 agreement 상태를 각각 조회해 환경과 카드 등록 상태를 분리해서 확인합니다."
      >
        <View style={s.actionRow}>
          <Button
            title={billingLoading ? '조회 중...' : 'billing context 조회'}
            variant="outline"
            onPress={() => void refreshBillingContext()}
            disabled={billingLoading}
          />
          <Button
            title={agreementLoading ? '조회 중...' : 'billing agreement 조회'}
            variant="outline"
            onPress={() => void refreshAgreement()}
            disabled={agreementLoading}
          />
        </View>

        <Text style={s.groupTitle}>billing context</Text>
        {billingContext ? (
          <View style={s.mutedCard}>
            <DetailRow
              label="clientKey"
              value={billingContext.clientKey ? '설정됨' : '미설정'}
            />
            <DetailRow label="customerKey" value={billingContext.customerKey || '-'} />
            <DetailRow label="successUrl" value={billingContext.successUrl || '-'} />
            <DetailRow label="failUrl" value={billingContext.failUrl || '-'} />
          </View>
        ) : (
          <View style={s.mutedCard}>
            <Text style={s.emptyText}>아직 billing context를 조회하지 않았습니다.</Text>
          </View>
        )}

        <Text style={s.groupTitle}>billing agreement</Text>
        {agreement ? (
          <View style={s.mutedCard}>
            <DetailRow label="상태" value={agreement.status} />
            <DetailRow label="카드" value={agreement.cardCompany || '-'} />
            <DetailRow label="마스킹 번호" value={agreement.cardNumberMasked || '-'} />
            <DetailRow label="customerKey" value={agreement.customerKey || '-'} />
            <DetailRow label="billingKey" value={agreement.billingKeyMasked || '-'} />
            <DetailRow
              label="authenticatedAt"
              value={formatDateTime(agreement.authenticatedAt)}
            />
          </View>
        ) : (
          <View style={s.mutedCard}>
            <Text style={s.emptyText}>
              조회 결과가 없으면 미등록 상태이거나 아직 조회하지 않은 것입니다.
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Toss 준비 / 결제창 진입"
        description="prepare 응답을 먼저 눈으로 확인한 뒤 같은 세션으로 checkout을 열 수 있습니다."
      >
        <View style={s.actionRow}>
          <Button
            title={preparing ? 'prepare 중...' : 'Toss prepare'}
            onPress={() => void prepareTossPayment()}
            disabled={preparing}
          />
          <Button
            title="payment checkout 열기"
            variant="outline"
            onPress={openCheckout}
            disabled={!prepared}
          />
        </View>
        {prepared ? (
          <View style={s.mutedCard}>
            <DetailRow label="provider" value={prepared.provider} />
            <DetailRow label="pgOrderId" value={prepared.pgOrderId} />
            <DetailRow label="amount" value={formatMoney(prepared.amount)} />
            <DetailRow label="orderName" value={prepared.orderName || '-'} />
            <DetailRow label="successUrl" value={prepared.successUrl} />
            <DetailRow label="failUrl" value={prepared.failUrl} />
            <DetailRow label="expiresAt" value={formatDateTime(prepared.expiresAt)} />
          </View>
        ) : (
          <View style={s.mutedCard}>
            <Text style={s.emptyText}>
              prepare를 실행하면 `pgOrderId`, 금액, redirect URL을 바로 확인할 수 있습니다.
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="수동 결제 반영"
        description="운영 fallback인 mark-paid 경로를 바로 호출해 내부 결제 상태를 PAID로 반영합니다."
      >
        <View style={{ gap: 10 }}>
          <Text style={s.groupTitle}>결제 수단</Text>
          <View style={s.chipRow}>
            <Chip
              label="CARD"
              selected={markPaidMethod === 'CARD'}
              onPress={() => setMarkPaidMethod('CARD')}
            />
            <Chip
              label="TRANSFER"
              selected={markPaidMethod === 'TRANSFER'}
              onPress={() => setMarkPaidMethod('TRANSFER')}
            />
          </View>
          {markPaidMethod === 'TRANSFER' ? (
            <TextField
              label="proofUrl"
              placeholder="https://example.com/proof.png"
              value={proofUrl}
              onChangeText={setProofUrl}
              helperText="TRANSFER 수동 결제는 proofUrl을 함께 전달합니다."
            />
          ) : null}
          <Button
            title={markingPaid ? '반영 중...' : 'mark-paid 호출'}
            variant="danger"
            onPress={() => void onMarkPaid()}
            disabled={markingPaid}
          />
        </View>
      </SectionCard>

      <SectionCard
        title="결제 후 snapshot"
        description="order/payment/settlement 상태를 다시 조회해 내부 상태 변화를 확인합니다."
      >
        <View style={s.actionRow}>
          <Button
            title={snapshotLoading ? '갱신 중...' : 'snapshot 새로고침'}
            variant="outline"
            onPress={() => void refreshSnapshot()}
            disabled={snapshotLoading}
          />
        </View>
        {snapshotError ? (
          <View style={s.mutedCard}>
            <Text style={[s.emptyText, { color: c.status.danger }]}>{snapshotError}</Text>
          </View>
        ) : null}
        <SnapshotCard snapshot={snapshot} lastPayment={lastPayment} />
      </SectionCard>

      <SectionCard
        title="Activity Log"
        description="화주 단계에서 수행한 API와 상태 변화를 최근 순으로 남깁니다."
      >
        {activities.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ gap: 10, minWidth: '100%' }}>
              {activities.map((activity) => {
                const toneColors = getToneColors(activity.tone, c);
                return (
                  <View
                    key={activity.id}
                    style={[
                      s.activityItem,
                      {
                        backgroundColor: toneColors.bg,
                        borderColor: toneColors.border,
                      },
                    ]}
                  >
                    <Text style={[s.activityTitle, { color: toneColors.text }]}>
                      {activity.title}
                    </Text>
                    <Text style={s.activityMessage}>{activity.message}</Text>
                    <View style={s.sectionDivider} />
                    <Text style={s.activityTime}>{formatDateTime(activity.at)}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View style={s.mutedCard}>
            <Text style={s.emptyText}>
              아직 수행한 액션이 없습니다. 먼저 조회, prepare, checkout, mark-paid 중 하나를
              실행해 주세요.
            </Text>
          </View>
        )}
      </SectionCard>
    </View>
  );
}
