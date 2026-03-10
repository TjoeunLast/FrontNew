import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import PaymentTestService, {
  type DriverPayoutBatchStatusResponse,
} from "@/shared/api/paymentTestService";
import type { DriverPayoutItemStatusResponse } from "@/shared/models/payment";

type NoticeTone = "info" | "success" | "error";

type NoticeState = {
  tone: NoticeTone;
  text: string;
} | null;

const getTodayDateInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("ko-KR") : "-";

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: { data?: { message?: string } | string };
      }
    ).response;
    const responseData = response?.data;

    if (typeof responseData === "string" && responseData.trim()) {
      return responseData;
    }

    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string" &&
      responseData.message.trim()
    ) {
      return responseData.message;
    }
  }

  return error instanceof Error ? error.message : fallbackMessage;
};

const getStatusColors = (status?: string | null) => {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "COMPLETED" || normalized === "CONFIRMED") {
    return { backgroundColor: "#DCFCE7", color: "#15803D" };
  }
  if (normalized === "FAILED" || normalized.includes("FAIL")) {
    return { backgroundColor: "#FEE2E2", color: "#B91C1C" };
  }
  if (normalized === "REQUESTED" || normalized === "READY" || normalized === "RETRYING") {
    return { backgroundColor: "#FEF3C7", color: "#B45309" };
  }
  return { backgroundColor: "#E2E8F0", color: "#475569" };
};

const Notice = ({ notice }: { notice: NoticeState }) => {
  if (!notice) return null;

  const toneStyle =
    notice.tone === "success"
      ? styles.noticeSuccess
      : notice.tone === "error"
        ? styles.noticeError
        : styles.noticeInfo;

  return (
    <View style={[styles.noticeBox, toneStyle]}>
      <Text style={styles.noticeText}>{notice.text}</Text>
    </View>
  );
};

const StatusBadge = ({ status }: { status?: string | null }) => {
  const tone = getStatusColors(status);
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{status || "-"}</Text>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string | number | null | boolean }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>
      {value === null || value === undefined || value === "" ? "-" : String(value)}
    </Text>
  </View>
);

export function AdminPayoutSection({ orderId }: { orderId: number }) {
  const [batchDateInput, setBatchDateInput] = useState(getTodayDateInput());
  const [notice, setNotice] = useState<NoticeState>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [payoutItem, setPayoutItem] = useState<DriverPayoutItemStatusResponse | null>(null);
  const [batchStatus, setBatchStatus] = useState<DriverPayoutBatchStatusResponse | null>(null);

  useEffect(() => {
    setNotice(null);
    setBusyAction(null);
    setPayoutItem(null);
    setBatchStatus(null);
  }, [orderId]);

  const ensureOrderId = () => {
    return orderId;
  };

  const runWithOrderId = async (
    actionKey: string,
    action: (orderId: number) => Promise<DriverPayoutItemStatusResponse>,
    successMessage: string
  ) => {
    const nextOrderId = ensureOrderId();
    if (!nextOrderId) return;

    try {
      setBusyAction(actionKey);
      setNotice(null);
      const response = await action(nextOrderId);
      setPayoutItem(response);
      setNotice({ tone: "success", text: successMessage });
    } catch (error) {
      setNotice({
        tone: "error",
        text: getErrorMessage(error, "지급 운영 요청 중 오류가 발생했습니다."),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRequestPayout = async () => {
    await runWithOrderId(
      "request",
      (orderId) => PaymentTestService.requestAdminPayout(orderId),
      "지급 요청을 보냈습니다. 최신 payout item 상태를 표시합니다."
    );
  };

  const handleSyncPayout = async () => {
    await runWithOrderId(
      "sync",
      (orderId) => PaymentTestService.syncAdminPayout(orderId),
      "지급 상태 동기화를 실행했습니다."
    );
  };

  const handleFetchPayoutItem = async () => {
    await runWithOrderId(
      "detail",
      (orderId) => PaymentTestService.getAdminPayoutItemStatus(orderId),
      "주문 기준 payout item 상세를 조회했습니다."
    );
  };

  const handleFetchBatchStatus = async () => {
    if (!batchDateInput.trim()) {
      Alert.alert("확인", "배치 조회 날짜를 입력하세요.");
      return;
    }

    try {
      setBusyAction("batch");
      setNotice(null);
      const response = await PaymentTestService.getAdminPayoutBatchStatus(batchDateInput.trim());
      setBatchStatus(response);
      setNotice({ tone: "success", text: "지급 배치 상태를 조회했습니다." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: getErrorMessage(error, "지급 배치 상태 조회 중 오류가 발생했습니다."),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const isBusy = busyAction !== null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.sectionEyebrow}>관리자 지급 운영</Text>
          <Text style={styles.sectionTitle}>Payout Request / Sync / Batch Status</Text>
          <Text style={styles.sectionDescription}>
            관리자 토큰으로 지급 요청, 상태 동기화, 배치 상태 조회를 한 화면에서 테스트합니다.
          </Text>
        </View>
        {isBusy ? <ActivityIndicator size="small" color="#0F172A" /> : null}
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          이 섹션은 `/api/admin/payment/**`를 호출합니다. 현재 로그인 사용자가 `ADMIN` 권한이어야 합니다.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>공통 orderId</Text>
        <View style={styles.sharedOrderBox}>
          <Text style={styles.sharedOrderValue}>#{orderId}</Text>
          <Text style={styles.sharedOrderCaption}>
            상단 shell에서 선택한 주문을 그대로 사용합니다.
          </Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>배치 조회 날짜</Text>
        <TextInput
          value={batchDateInput}
          onChangeText={setBatchDateInput}
          autoCapitalize="none"
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
      </View>

      <View style={styles.buttonGrid}>
        <Pressable
          disabled={isBusy}
          onPress={() => void handleRequestPayout()}
          style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
        >
          <Text style={styles.primaryButtonText}>
            {busyAction === "request" ? "요청중..." : "지급 요청"}
          </Text>
        </Pressable>

        <Pressable
          disabled={isBusy}
          onPress={() => void handleSyncPayout()}
          style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
        >
          <Text style={styles.secondaryButtonText}>
            {busyAction === "sync" ? "동기화중..." : "지급 동기화"}
          </Text>
        </Pressable>

        <Pressable
          disabled={isBusy}
          onPress={() => void handleFetchPayoutItem()}
          style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
        >
          <Text style={styles.secondaryButtonText}>
            {busyAction === "detail" ? "조회중..." : "payout item 조회"}
          </Text>
        </Pressable>

        <Pressable
          disabled={isBusy}
          onPress={() => void handleFetchBatchStatus()}
          style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
        >
          <Text style={styles.secondaryButtonText}>
            {busyAction === "batch" ? "조회중..." : "batch status 조회"}
          </Text>
        </Pressable>
      </View>

      <Notice notice={notice} />

      <View style={styles.panelGrid}>
        <View style={styles.panelCard}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Payout Item Detail</Text>
            <StatusBadge status={payoutItem?.status} />
          </View>
          <InfoRow label="itemId" value={payoutItem?.itemId} />
          <InfoRow label="orderId" value={payoutItem?.orderId} />
          <InfoRow label="batchId" value={payoutItem?.batchId} />
          <InfoRow label="driverUserId" value={payoutItem?.driverUserId} />
          <InfoRow label="retryCount" value={payoutItem?.retryCount} />
          <InfoRow label="requestedAt" value={formatDateTime(payoutItem?.requestedAt)} />
          <InfoRow label="completedAt" value={formatDateTime(payoutItem?.completedAt)} />
          <InfoRow label="failureReason" value={payoutItem?.failureReason} />
          <InfoRow label="payoutRef" value={payoutItem?.payoutRef} />
          <InfoRow label="sellerId" value={payoutItem?.sellerId} />
          <InfoRow label="sellerRef" value={payoutItem?.sellerRef} />
          <InfoRow label="sellerStatus" value={payoutItem?.sellerStatus} />
          <InfoRow label="webhookStatus" value={payoutItem?.webhookStatus} />
          <InfoRow
            label="lastWebhookReceivedAt"
            value={formatDateTime(payoutItem?.lastWebhookReceivedAt)}
          />
          <InfoRow
            label="lastWebhookProcessedAt"
            value={formatDateTime(payoutItem?.lastWebhookProcessedAt)}
          />
          <InfoRow
            label="webhookMatchesPayoutStatus"
            value={
              payoutItem?.webhookMatchesPayoutStatus === undefined ||
              payoutItem?.webhookMatchesPayoutStatus === null
                ? "-"
                : payoutItem.webhookMatchesPayoutStatus
                  ? "true"
                  : "false"
            }
          />
        </View>

        <View style={styles.panelCard}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Payout Batch Status</Text>
            <StatusBadge status={batchStatus?.status} />
          </View>
          <InfoRow label="batchId" value={batchStatus?.batchId} />
          <InfoRow label="batchDate" value={batchStatus?.batchDate} />
          <InfoRow label="totalItems" value={batchStatus?.totalItems} />
          <InfoRow label="failedItems" value={batchStatus?.failedItems} />
          <InfoRow label="requestedAt" value={formatDateTime(batchStatus?.requestedAt)} />
          <InfoRow label="completedAt" value={formatDateTime(batchStatus?.completedAt)} />
          <InfoRow label="failureReason" value={batchStatus?.failureReason} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D7E0EA",
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
  },
  warningBox: {
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#9A3412",
    fontWeight: "700",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#0F172A",
  },
  sharedOrderBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
  },
  sharedOrderValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  sharedOrderCaption: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "600",
  },
  buttonGrid: {
    gap: 8,
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  noticeBox: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeInfo: {
    backgroundColor: "#EFF6FF",
  },
  noticeSuccess: {
    backgroundColor: "#ECFDF5",
  },
  noticeError: {
    backgroundColor: "#FEF2F2",
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#0F172A",
    fontWeight: "700",
  },
  panelGrid: {
    gap: 12,
  },
  panelCard: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 8,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 10,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "800",
    textAlign: "right",
  },
});
