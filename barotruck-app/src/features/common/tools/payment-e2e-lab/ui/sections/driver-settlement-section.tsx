import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import paymentTestService, {
  getPaymentTestErrorMessage,
} from "@/shared/api/paymentTestService";
import type { SettlementResponse } from "@/shared/models/Settlement";
import type { DriverPayoutItemStatusResponse } from "@/shared/models/payment";

type NoticeTone = "info" | "success" | "error";

type NoticeState = {
  tone: NoticeTone;
  text: string;
};

type ActivityLogItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string | null;
  tone: NoticeTone;
};

type TimelineItem = ActivityLogItem;

type Props = {
  orderId: number;
};

const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  READY: "정산 대기",
  COMPLETED: "정산 완료",
  WAIT: "정산 보류",
};

const PAYOUT_STATUS_LABELS: Record<string, string> = {
  READY: "지급 준비",
  REQUESTED: "지급 요청",
  COMPLETED: "지급 완료",
  FAILED: "지급 실패",
  RETRYING: "재시도 중",
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR");
};

const formatCompactDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSettlementStatusLabel = (status?: string | null) =>
  status ? SETTLEMENT_STATUS_LABELS[status] ?? status : "미조회";

const getPayoutStatusLabel = (status?: string | null) =>
  status ? PAYOUT_STATUS_LABELS[status] ?? status : "미조회";

const getNoticeStyle = (tone: NoticeTone) => {
  if (tone === "success") {
    return {
      container: styles.noticeSuccess,
      text: styles.noticeSuccessText,
    };
  }

  if (tone === "error") {
    return {
      container: styles.noticeError,
      text: styles.noticeErrorText,
    };
  }

  return {
    container: styles.noticeInfo,
    text: styles.noticeInfoText,
  };
};

const getTimelineToneStyle = (tone: NoticeTone) => {
  if (tone === "success") {
    return styles.timelineSuccess;
  }

  if (tone === "error") {
    return styles.timelineError;
  }

  return styles.timelineInfo;
};

const buildTimelineFromSnapshot = (
  settlement: SettlementResponse | null,
  payoutStatus: DriverPayoutItemStatusResponse | null
): TimelineItem[] => {
  const items: TimelineItem[] = [];

  if (settlement?.feeDate) {
    items.push({
      id: `settlement-created-${settlement.orderId}`,
      title: "정산 생성",
      description: `정산 상태 ${getSettlementStatusLabel(settlement.status)}`,
      timestamp: settlement.feeDate,
      tone: "info",
    });
  }

  if (settlement?.feeCompleteDate) {
    items.push({
      id: `settlement-completed-${settlement.orderId}`,
      title: "정산 완료",
      description: `차주 확인 이후 정산이 ${getSettlementStatusLabel(
        settlement.status
      )}로 반영되었습니다.`,
      timestamp: settlement.feeCompleteDate,
      tone: "success",
    });
  }

  if (payoutStatus?.requestedAt) {
    items.push({
      id: `payout-requested-${payoutStatus.orderId}`,
      title: "지급 요청 추적",
      description: `payout 상태 ${getPayoutStatusLabel(payoutStatus.status)}`,
      timestamp: payoutStatus.requestedAt,
      tone: "info",
    });
  }

  if (payoutStatus?.lastWebhookReceivedAt) {
    items.push({
      id: `webhook-received-${payoutStatus.orderId}`,
      title: "webhook 수신",
      description: `webhook 기준 ${getPayoutStatusLabel(
        payoutStatus.webhookStatus
      )}`,
      timestamp: payoutStatus.lastWebhookReceivedAt,
      tone: "info",
    });
  }

  if (payoutStatus?.lastWebhookProcessedAt) {
    items.push({
      id: `webhook-processed-${payoutStatus.orderId}`,
      title: "webhook 반영",
      description: `내부 payout 상태 ${getPayoutStatusLabel(payoutStatus.status)}`,
      timestamp: payoutStatus.lastWebhookProcessedAt,
      tone: "success",
    });
  }

  if (payoutStatus?.completedAt) {
    items.push({
      id: `payout-completed-${payoutStatus.orderId}`,
      title: "최종 지급 완료",
      description: `payoutRef ${payoutStatus.payoutRef ?? "-"}`,
      timestamp: payoutStatus.completedAt,
      tone: "success",
    });
  }

  if (payoutStatus?.failureReason) {
    items.push({
      id: `payout-failed-${payoutStatus.orderId}`,
      title: "지급 실패",
      description: payoutStatus.failureReason,
      timestamp:
        payoutStatus.lastWebhookProcessedAt ??
        payoutStatus.lastWebhookReceivedAt ??
        payoutStatus.requestedAt,
      tone: "error",
    });
  }

  return items;
};

export function DriverSettlementSection({ orderId }: Props) {
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null);
  const [payoutStatus, setPayoutStatus] =
    useState<DriverPayoutItemStatusResponse | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingSettlement, setIsLoadingSettlement] = useState(false);
  const [isLoadingPayout, setIsLoadingPayout] = useState(false);

  useEffect(() => {
    setSettlement(null);
    setPayoutStatus(null);
    setSettlementError(null);
    setPayoutError(null);
    setNotice(null);
    setActivityLog([]);
  }, [orderId]);

  const appendLog = useCallback(
    (
      title: string,
      description: string,
      tone: NoticeTone,
      timestamp: string | null = new Date().toISOString()
    ) => {
      setActivityLog((prev) => [
        {
          id: `${title}-${timestamp ?? Date.now()}-${prev.length}`,
          title,
          description,
          tone,
          timestamp,
        },
        ...prev,
      ]);
    },
    []
  );

  const ensureOrderId = useCallback(() => {
    return orderId;
  }, [orderId]);

  const handleLoadSettlement = useCallback(async () => {
    const nextOrderId = ensureOrderId();
    if (!nextOrderId) {
      return;
    }

    try {
      setIsLoadingSettlement(true);
      const nextSettlement =
        await paymentTestService.getDriverSettlementStatus(nextOrderId);
      setSettlement(nextSettlement);
      setSettlementError(null);
      setNotice({
        tone: "success",
        text: `정산 상태를 갱신했습니다. (${getSettlementStatusLabel(
          nextSettlement.status
        )})`,
      });
      appendLog(
        "정산 상태 조회",
        `Settlement ${getSettlementStatusLabel(nextSettlement.status)}`,
        "success",
        nextSettlement.feeCompleteDate ?? nextSettlement.feeDate
      );
    } catch (error) {
      const message = getPaymentTestErrorMessage(
        error,
        "차주 정산 상태를 불러오지 못했습니다."
      );
      setSettlement(null);
      setSettlementError(message);
      setNotice({
        tone: "error",
        text: message,
      });
      appendLog("정산 상태 조회 실패", message, "error");
    } finally {
      setIsLoadingSettlement(false);
    }
  }, [appendLog, ensureOrderId]);

  const handleLoadPayoutStatus = useCallback(async () => {
    const nextOrderId = ensureOrderId();
    if (!nextOrderId) {
      return;
    }

    try {
      setIsLoadingPayout(true);
      const nextPayout = await paymentTestService.getDriverPayoutStatus(nextOrderId);
      setPayoutStatus(nextPayout);
      setPayoutError(null);
      setNotice({
        tone: "success",
        text: `payout 상태를 갱신했습니다. (${getPayoutStatusLabel(
          nextPayout.status
        )})`,
      });
      appendLog(
        "payout 상태 조회",
        `Payout ${getPayoutStatusLabel(nextPayout.status)}`,
        nextPayout.status === "FAILED" ? "error" : "success",
        nextPayout.completedAt ??
          nextPayout.lastWebhookProcessedAt ??
          nextPayout.requestedAt
      );
    } catch (error) {
      const message = getPaymentTestErrorMessage(
        error,
        "차주 payout 상태를 불러오지 못했습니다."
      );
      setPayoutStatus(null);
      setPayoutError(message);
      setNotice({
        tone: "error",
        text: message,
      });
      appendLog("payout 상태 조회 실패", message, "error");
    } finally {
      setIsLoadingPayout(false);
    }
  }, [appendLog, ensureOrderId]);

  const handleRefreshAll = useCallback(async () => {
    const nextOrderId = ensureOrderId();
    if (!nextOrderId) {
      return;
    }

    try {
      setIsLoadingSettlement(true);
      setIsLoadingPayout(true);
      const snapshot = await paymentTestService.getDriverStageSnapshot(nextOrderId);

      setSettlement(snapshot.settlement);
      setSettlementError(snapshot.settlementError);
      setPayoutStatus(snapshot.payoutStatus);
      setPayoutError(snapshot.payoutError);

      if (snapshot.settlement) {
        appendLog(
          "정산 스냅샷",
          `Settlement ${getSettlementStatusLabel(snapshot.settlement.status)}`,
          "success",
          snapshot.settlement.feeCompleteDate ?? snapshot.settlement.feeDate
        );
      } else if (snapshot.settlementError) {
        appendLog("정산 스냅샷", snapshot.settlementError, "error");
      }

      if (snapshot.payoutStatus) {
        appendLog(
          "payout 스냅샷",
          `Payout ${getPayoutStatusLabel(snapshot.payoutStatus.status)}`,
          snapshot.payoutStatus.status === "FAILED" ? "error" : "success",
          snapshot.payoutStatus.completedAt ??
            snapshot.payoutStatus.lastWebhookProcessedAt ??
            snapshot.payoutStatus.requestedAt
        );
      } else if (snapshot.payoutError) {
        appendLog(
          "payout 스냅샷",
          snapshot.payoutError,
          snapshot.payoutError.includes("아직") ? "info" : "error"
        );
      }

      setNotice({
        tone: "info",
        text: "차주 단계 스냅샷을 새로고침했습니다.",
      });
    } catch (error) {
      const message = getPaymentTestErrorMessage(
        error,
        "차주 단계 스냅샷을 불러오지 못했습니다."
      );
      setNotice({
        tone: "error",
        text: message,
      });
      appendLog("스냅샷 조회 실패", message, "error");
    } finally {
      setIsLoadingSettlement(false);
      setIsLoadingPayout(false);
    }
  }, [appendLog, ensureOrderId]);

  const handleConfirmByDriver = useCallback(async () => {
    const nextOrderId = ensureOrderId();
    if (!nextOrderId) {
      return;
    }

    try {
      setIsConfirming(true);
      setNotice({
        tone: "info",
        text: `주문 #${nextOrderId} driver confirm 호출 중입니다.`,
      });
      appendLog(
        "driver confirm 요청",
        `주문 #${nextOrderId} 차주 결제 확인 호출`,
        "info"
      );
      await paymentTestService.confirmByDriver(nextOrderId);
      appendLog(
        "driver confirm 완료",
        "차주 결제 확인 호출이 성공했습니다. 정산/payout 상태를 다시 조회합니다.",
        "success"
      );
      setNotice({
        tone: "success",
        text: "driver confirm 호출이 성공했습니다.",
      });
      await handleRefreshAll();
    } catch (error) {
      const message = getPaymentTestErrorMessage(
        error,
        "driver confirm 호출에 실패했습니다."
      );
      setNotice({
        tone: "error",
        text: message,
      });
      appendLog("driver confirm 실패", message, "error");
    } finally {
      setIsConfirming(false);
    }
  }, [appendLog, ensureOrderId, handleRefreshAll]);

  const lastConfirmLog = useMemo(
    () =>
      activityLog.find(
        (item) => item.title === "driver confirm 완료" || item.title === "driver confirm 실패"
      ) ?? null,
    [activityLog]
  );

  const timelineItems = useMemo(() => {
    const derived = buildTimelineFromSnapshot(settlement, payoutStatus);
    const merged = [...activityLog, ...derived];

    return merged.sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [activityLog, payoutStatus, settlement]);

  const noticeStyle = notice ? getNoticeStyle(notice.tone) : null;

  return (
    <View style={styles.section}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Driver Step</Text>
        <Text style={styles.title}>차주 결제 확인 / 지급 수령 확인</Text>
        <Text style={styles.description}>
          현재 로그인된 차주 토큰으로 driver confirm, 정산 상태, payout 상태를 직접 확인합니다.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>테스트 입력</Text>
        <Text style={styles.cardDescription}>
          공통 shell에서 선택한 주문을 기준으로 driver confirm과 상태 조회를 순서대로 실행하세요.
        </Text>
        <View style={styles.sharedOrderBox}>
          <Text style={styles.sharedOrderLabel}>공통 주문 ID</Text>
          <Text style={styles.sharedOrderValue}>#{orderId}</Text>
        </View>
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, styles.buttonPrimary, isConfirming && styles.buttonDisabled]}
            disabled={isConfirming}
            onPress={() => void handleConfirmByDriver()}
          >
            <Text style={styles.buttonPrimaryText}>
              {isConfirming ? "driver confirm 중..." : "driver confirm"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.button, isLoadingSettlement && styles.buttonDisabled]}
            disabled={isLoadingSettlement}
            onPress={() => void handleLoadSettlement()}
          >
            <Text style={styles.buttonText}>
              {isLoadingSettlement ? "정산 조회중..." : "정산 상태 조회"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.button, isLoadingPayout && styles.buttonDisabled]}
            disabled={isLoadingPayout}
            onPress={() => void handleLoadPayoutStatus()}
          >
            <Text style={styles.buttonText}>
              {isLoadingPayout ? "payout 조회중..." : "payout 상태 조회"}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.button,
              styles.buttonWide,
              (isLoadingSettlement || isLoadingPayout) && styles.buttonDisabled,
            ]}
            disabled={isLoadingSettlement || isLoadingPayout}
            onPress={() => void handleRefreshAll()}
          >
            <Text style={styles.buttonText}>전체 상태 새로고침</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>
          관리자 지급 요청은 이 화면에서 수행하지 않습니다. 지급 이후 상태 확인만 담당합니다.
        </Text>
      </View>

      {notice && noticeStyle ? (
        <View style={[styles.notice, noticeStyle.container]}>
          <Text style={[styles.noticeText, noticeStyle.text]}>{notice.text}</Text>
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryPrimary]}>
          <Text style={styles.summaryLabel}>현재 주문</Text>
          <Text style={styles.summaryValue}>{orderId ?? "-"}</Text>
          <Text style={styles.summaryMeta}>
            마지막 confirm {lastConfirmLog ? formatCompactDateTime(lastConfirmLog.timestamp) : "-"}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>정산 상태</Text>
          <Text style={styles.summaryValueDark}>
            {getSettlementStatusLabel(settlement?.status)}
          </Text>
          <Text style={styles.summaryMeta}>
            완료 시각 {formatCompactDateTime(settlement?.feeCompleteDate)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>payout 상태</Text>
          <Text style={styles.summaryValueDark}>
            {getPayoutStatusLabel(payoutStatus?.status)}
          </Text>
          <Text style={styles.summaryMeta}>
            완료 시각 {formatCompactDateTime(payoutStatus?.completedAt)}
          </Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>차주 정산 상태</Text>
          <Text style={styles.cardDescription}>
            driver confirm 이후 settlement 상태가 어떻게 변했는지 확인합니다.
          </Text>
          <View style={styles.detailList}>
            <Text style={styles.detailItem}>status {getSettlementStatusLabel(settlement?.status)}</Text>
            <Text style={styles.detailItem}>feeDate {formatDateTime(settlement?.feeDate)}</Text>
            <Text style={styles.detailItem}>
              feeCompleteDate {formatDateTime(settlement?.feeCompleteDate)}
            </Text>
            <Text style={styles.detailItem}>
              totalPrice {settlement?.totalPrice != null ? settlement.totalPrice.toLocaleString("ko-KR") : "-"}
            </Text>
          </View>
          {settlementError ? (
            <Text style={styles.errorText}>{settlementError}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>차주 payout 상태</Text>
          <Text style={styles.cardDescription}>
            최종 지급 상태와 webhook 반영 흔적을 차주 기준으로 확인합니다.
          </Text>
          <View style={styles.detailList}>
            <Text style={styles.detailItem}>status {getPayoutStatusLabel(payoutStatus?.status)}</Text>
            <Text style={styles.detailItem}>requestedAt {formatDateTime(payoutStatus?.requestedAt)}</Text>
            <Text style={styles.detailItem}>completedAt {formatDateTime(payoutStatus?.completedAt)}</Text>
            <Text style={styles.detailItem}>payoutRef {payoutStatus?.payoutRef ?? "-"}</Text>
            <Text style={styles.detailItem}>sellerStatus {payoutStatus?.sellerStatus ?? "-"}</Text>
            <Text style={styles.detailItem}>webhookStatus {payoutStatus?.webhookStatus ?? "-"}</Text>
            <Text style={styles.detailItem}>
              lastWebhookProcessedAt {formatDateTime(payoutStatus?.lastWebhookProcessedAt)}
            </Text>
          </View>
          {payoutStatus?.failureReason ? (
            <Text style={styles.errorText}>failureReason {payoutStatus.failureReason}</Text>
          ) : null}
          {payoutError ? <Text style={styles.errorText}>{payoutError}</Text> : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>상태 타임라인</Text>
        <Text style={styles.cardDescription}>
          confirm 호출, settlement 변화, payout/webhook 상태를 시간순으로 모아 봅니다.
        </Text>
        {timelineItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              아직 기록이 없습니다. 주문 ID를 입력하고 상태 조회를 시작하세요.
            </Text>
          </View>
        ) : (
          <View style={styles.timelineList}>
            {timelineItems.map((item) => (
              <View key={item.id} style={styles.timelineRow}>
                <View
                  style={[styles.timelineDot, getTimelineToneStyle(item.tone)]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineDescription}>{item.description}</Text>
                  <Text style={styles.timelineTime}>
                    {formatDateTime(item.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#0F172A",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#93C5FD",
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#CBD5E1",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  cardDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
  },
  input: {
    marginTop: 14,
  },
  sharedOrderBox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  sharedOrderLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  sharedOrderValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  buttonRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonWide: {
    minWidth: 140,
  },
  buttonPrimary: {
    borderColor: "#0F172A",
    backgroundColor: "#0F172A",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  buttonPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
  notice: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeInfo: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  noticeSuccess: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  noticeError: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  noticeInfoText: {
    color: "#1D4ED8",
  },
  noticeSuccessText: {
    color: "#15803D",
  },
  noticeErrorText: {
    color: "#B91C1C",
  },
  summaryRow: {
    gap: 12,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  summaryPrimary: {
    backgroundColor: "#E0F2FE",
    borderColor: "#BAE6FD",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#64748B",
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
  },
  summaryValueDark: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  summaryMeta: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748B",
  },
  detailsGrid: {
    gap: 12,
  },
  detailList: {
    marginTop: 14,
    gap: 8,
  },
  detailItem: {
    fontSize: 13,
    lineHeight: 20,
    color: "#334155",
  },
  errorText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: "#B91C1C",
  },
  emptyState: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
  },
  timelineList: {
    marginTop: 14,
    gap: 14,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  timelineDot: {
    marginTop: 6,
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  timelineInfo: {
    backgroundColor: "#38BDF8",
  },
  timelineSuccess: {
    backgroundColor: "#22C55E",
  },
  timelineError: {
    backgroundColor: "#EF4444",
  },
  timelineContent: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
    paddingLeft: 12,
    paddingBottom: 10,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  timelineDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
  },
  timelineTime: {
    marginTop: 6,
    fontSize: 12,
    color: "#94A3B8",
  },
});

export default DriverSettlementSection;
