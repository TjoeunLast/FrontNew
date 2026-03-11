import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import {
  buildPaymentE2ELabEnvironmentSnapshot,
  probePaymentE2ELabServer,
} from "../lib/paymentE2ELabEnv";
import type {
  PaymentE2ELabActor,
  PaymentE2ELabActivityLogItem,
  PaymentE2ELabReadiness,
  PaymentE2ELabServerHealth,
  PaymentE2ELabSnapshotStatus,
} from "../model/paymentE2ELabTypes";
import { usePaymentE2ELabStore } from "../model/usePaymentE2ELabStore";
import { AdminPayoutSection } from "./sections/admin-payout-section";
import { DriverSettlementSection } from "./sections/driver-settlement-section";
import { ShipperPaymentSection } from "./sections/shipper-payment-section";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { Badge, type BadgeTone } from "@/shared/ui/feedback/Badge";
import { TextField } from "@/shared/ui/form/TextField";
import { AppTopBar } from "@/shared/ui/layout/AppTopBar";
import { withAlpha } from "@/shared/utils/color";

const ACTOR_OPTIONS: PaymentE2ELabActor[] = ["SHIPPER", "DRIVER", "ADMIN"];

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveNumber(value?: string) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function actorLabel(actor: PaymentE2ELabActor) {
  if (actor === "SHIPPER") return "화주";
  if (actor === "DRIVER") return "차주";
  return "관리자";
}

function readinessLabel(value: PaymentE2ELabReadiness) {
  if (value === "ready") return "Ready";
  if (value === "partial") return "Partial";
  if (value === "needs_setup") return "Needs setup";
  return "Unknown";
}

function readinessTone(value: PaymentE2ELabReadiness): BadgeTone {
  if (value === "ready") return "success";
  if (value === "partial") return "warning";
  if (value === "needs_setup") return "danger";
  return "neutral";
}

function serverTone(value: PaymentE2ELabServerHealth): BadgeTone {
  if (value === "reachable") return "success";
  if (value === "checking") return "info";
  if (value === "unreachable") return "danger";
  return "neutral";
}

function snapshotTone(value: PaymentE2ELabSnapshotStatus): BadgeTone {
  if (value === "ready") return "success";
  if (value === "warning") return "warning";
  if (value === "error") return "danger";
  return "neutral";
}

function activityTone(item: PaymentE2ELabActivityLogItem): BadgeTone {
  if (item.level === "error") return "danger";
  if (item.level === "warning") return "warning";
  return "info";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR");
}

function buildActorHint(
  actor: PaymentE2ELabActor,
  sessionRole: string | null,
  hasAuthToken: boolean
) {
  if (!hasAuthToken) {
    return "저장된 로그인 세션이 없습니다. 일반 로그인 화면에서 먼저 로그인한 뒤 다시 돌아오세요.";
  }

  if (!sessionRole) {
    return "토큰은 있지만 현재 세션 role을 확인하지 못했습니다. 프로필 캐시를 갱신한 뒤 테스트하세요.";
  }

  if (sessionRole === actor) {
    return `현재 저장된 세션 role이 ${actorLabel(actor)}와 일치합니다. 이 actor 기준으로 아래 섹션을 실행하면 됩니다.`;
  }

  return `현재 저장된 세션 role은 ${actorLabel(
    sessionRole as PaymentE2ELabActor
  )}입니다. ${actorLabel(actor)} 단계 실행 전 계정을 전환하세요.`;
}

export default function PaymentE2ELabScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const paramOrderId = useMemo(
    () => parsePositiveNumber(getFirstParam(params.orderId)),
    [params.orderId]
  );

  const actor = usePaymentE2ELabStore((state) => state.actor);
  const serverBaseUrl = usePaymentE2ELabStore((state) => state.serverBaseUrl);
  const orderIdInput = usePaymentE2ELabStore((state) => state.orderIdInput);
  const selectedOrderId = usePaymentE2ELabStore((state) => state.selectedOrderId);
  const environment = usePaymentE2ELabStore((state) => state.environment);
  const serverStatus = usePaymentE2ELabStore((state) => state.serverStatus);
  const snapshots = usePaymentE2ELabStore((state) => state.snapshots);
  const activityLog = usePaymentE2ELabStore((state) => state.activityLog);
  const setActor = usePaymentE2ELabStore((state) => state.setActor);
  const setOrderIdInput = usePaymentE2ELabStore((state) => state.setOrderIdInput);
  const applyOrderId = usePaymentE2ELabStore((state) => state.applyOrderId);
  const commitOrderId = usePaymentE2ELabStore((state) => state.commitOrderId);
  const clearOrderId = usePaymentE2ELabStore((state) => state.clearOrderId);
  const setEnvironmentSnapshot = usePaymentE2ELabStore(
    (state) => state.setEnvironmentSnapshot
  );
  const setServerStatus = usePaymentE2ELabStore((state) => state.setServerStatus);
  const appendActivity = usePaymentE2ELabStore((state) => state.appendActivity);
  const resetLab = usePaymentE2ELabStore((state) => state.resetLab);

  const [isRefreshingEnv, setIsRefreshingEnv] = useState(false);
  const autoProbedBaseUrl = useRef<string | null>(null);

  const parsedInputOrderId = useMemo(
    () => parsePositiveNumber(orderIdInput),
    [orderIdInput]
  );

  useEffect(() => {
    if (!paramOrderId) {
      return;
    }

    if (selectedOrderId === paramOrderId) {
      return;
    }

    applyOrderId(paramOrderId);
  }, [applyOrderId, paramOrderId, selectedOrderId]);

  const refreshEnvironment = useCallback(async () => {
    setIsRefreshingEnv(true);

    try {
      const snapshot = await buildPaymentE2ELabEnvironmentSnapshot(selectedOrderId);
      setEnvironmentSnapshot(snapshot);
    } catch (error) {
      appendActivity(
        `환경 점검 갱신 실패: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
        "error"
      );
    } finally {
      setIsRefreshingEnv(false);
    }
  }, [appendActivity, selectedOrderId, setEnvironmentSnapshot]);

  const runServerCheck = useCallback(async () => {
    const baseUrl = environment.resolvedBaseUrl || serverBaseUrl;

    setServerStatus({
      state: "checking",
      message: `Checking ${baseUrl || "configured server"}...`,
      checkedAt: serverStatus.checkedAt,
      httpStatus: null,
    });

    const nextStatus = await probePaymentE2ELabServer(baseUrl);
    setServerStatus(nextStatus);
  }, [
    environment.resolvedBaseUrl,
    serverBaseUrl,
    serverStatus.checkedAt,
    setServerStatus,
  ]);

  useEffect(() => {
    void refreshEnvironment();
  }, [refreshEnvironment]);

  useEffect(() => {
    if (!environment.resolvedBaseUrl) {
      return;
    }

    if (autoProbedBaseUrl.current === environment.resolvedBaseUrl) {
      return;
    }

    autoProbedBaseUrl.current = environment.resolvedBaseUrl;
    void runServerCheck();
  }, [environment.resolvedBaseUrl, runServerCheck]);

  const actorHint = useMemo(
    () =>
      buildActorHint(actor, environment.sessionRole, environment.hasAuthToken),
    [actor, environment.hasAuthToken, environment.sessionRole]
  );

  const snapshotEntries = useMemo(
    () => [
      { key: "payment", label: "payment", value: snapshots.payment },
      { key: "settlement", label: "settlement", value: snapshots.settlement },
      { key: "payout", label: "payout", value: snapshots.payout },
      { key: "webhook", label: "webhook", value: snapshots.webhook },
    ],
    [snapshots]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flex: 1,
          backgroundColor: c.bg.canvas,
        } as ViewStyle,
        content: {
          padding: 20,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 16,
        } as ViewStyle,
        heroCard: {
          borderRadius: 22,
          padding: 18,
          gap: 10,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        eyebrow: {
          fontSize: 12,
          fontWeight: "800",
          color: c.brand.primary,
        } as TextStyle,
        title: {
          fontSize: 22,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        desc: {
          fontSize: 13,
          lineHeight: 20,
          fontWeight: "600",
          color: c.text.secondary,
        } as TextStyle,
        summaryRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        } as ViewStyle,
        summaryCard: {
          minWidth: 150,
          flexGrow: 1,
          borderRadius: 18,
          padding: 14,
          gap: 8,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        summaryLabel: {
          fontSize: 12,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        summaryValue: {
          fontSize: 18,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        shellCard: {
          borderRadius: 20,
          padding: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        cardTitle: {
          fontSize: 16,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        cardDesc: {
          fontSize: 12,
          lineHeight: 18,
          fontWeight: "600",
          color: c.text.secondary,
        } as TextStyle,
        infoBox: {
          borderRadius: 16,
          padding: 14,
          gap: 6,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.muted,
        } as ViewStyle,
        infoLabel: {
          fontSize: 12,
          fontWeight: "800",
          color: c.text.secondary,
        } as TextStyle,
        infoValue: {
          fontSize: 15,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        helperText: {
          fontSize: 12,
          lineHeight: 18,
          fontWeight: "600",
          color: c.text.secondary,
        } as TextStyle,
        statusGrid: {
          gap: 10,
        } as ViewStyle,
        statusRow: {
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 10,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        statusHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        } as ViewStyle,
        buttonRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        } as ViewStyle,
        actorRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        } as ViewStyle,
        actorButton: {
          minWidth: 88,
        } as ViewStyle,
        snapshotRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        } as ViewStyle,
        snapshotChip: {
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: withAlpha(c.brand.primary, 0.05),
        } as ViewStyle,
        snapshotLabel: {
          fontSize: 12,
          fontWeight: "800",
          color: c.text.primary,
        } as TextStyle,
        logList: {
          gap: 8,
        } as ViewStyle,
        logItem: {
          borderRadius: 14,
          padding: 12,
          gap: 6,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.muted,
        } as ViewStyle,
        logHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        } as ViewStyle,
        logText: {
          fontSize: 13,
          lineHeight: 19,
          fontWeight: "700",
          color: c.text.primary,
        } as TextStyle,
        logTime: {
          fontSize: 11,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
        emptyCard: {
          borderRadius: 20,
          padding: 18,
          gap: 8,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
        } as ViewStyle,
        emptyTitle: {
          fontSize: 15,
          fontWeight: "900",
          color: c.text.primary,
        } as TextStyle,
        emptyDesc: {
          fontSize: 12,
          lineHeight: 18,
          fontWeight: "600",
          color: c.text.secondary,
        } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={s.page}>
      <AppTopBar
        title="Payment E2E Lab"
        onPressBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/" as any);
        }}
      />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <Text style={s.eyebrow}>E2E TEST SHELL</Text>
          <Text style={s.title}>결제 {"->"} 정산 {"->"} 지급 공통 랩</Text>
          <Text style={s.desc}>
            서버 주소, actor, 공통 orderId를 한 화면에서 관리하고, 아래 단계별 섹션은 이
            공통 컨텍스트를 기준으로 동작합니다.
          </Text>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>현재 actor</Text>
            <Text style={s.summaryValue}>{actorLabel(actor)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>공통 orderId</Text>
            <Text style={s.summaryValue}>
              {selectedOrderId ? `#${selectedOrderId}` : "미선택"}
            </Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>서버 상태</Text>
            <Badge
              label={serverStatus.state === "reachable" ? "Connected" : "Pending"}
              tone={serverTone(serverStatus.state)}
            />
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>계정 준비</Text>
            <Badge
              label={readinessLabel(environment.accountReadiness)}
              tone={readinessTone(environment.accountReadiness)}
            />
          </View>
        </View>

        <View style={s.shellCard}>
          <Text style={s.cardTitle}>환경 점검</Text>
          <Text style={s.cardDesc}>
            서버 주소, 현재 세션, Toss readiness placeholder를 먼저 확인해 환경 미설정과
            실제 결제 실패를 구분합니다.
          </Text>

          <View style={s.infoBox}>
            <Text style={s.infoLabel}>현재 서버 주소</Text>
            <Text style={s.infoValue}>
              {environment.resolvedBaseUrl || "미확인"}
            </Text>
            <Text style={s.helperText}>
              {environment.usesEnvOverride
                ? "EXPO_PUBLIC_API_BASE_URL 기준"
                : "Expo runtime fallback 기준"}
            </Text>
          </View>

          <View style={s.statusGrid}>
            <View style={s.statusRow}>
              <View style={s.statusHeader}>
                <View>
                  <Text style={s.cardTitle}>로그인 가능한 테스트 계정</Text>
                  <Text style={s.cardDesc}>
                    {environment.sessionEmail
                      ? `${environment.sessionEmail} / ${environment.sessionRole ?? "unknown"}`
                      : "저장된 세션 정보가 없습니다."}
                  </Text>
                </View>
                <Badge
                  label={readinessLabel(environment.accountReadiness)}
                  tone={readinessTone(environment.accountReadiness)}
                />
              </View>
            </View>

            <View style={s.statusRow}>
              <View style={s.statusHeader}>
                <View>
                  <Text style={s.cardTitle}>Toss 결제 키 준비 상태</Text>
                  <Text style={s.cardDesc}>
                    서버 기반 readiness probe는 아직 연결되지 않았습니다.
                  </Text>
                </View>
                <Badge
                  label={readinessLabel(environment.tossPaymentKeys)}
                  tone={readinessTone(environment.tossPaymentKeys)}
                />
              </View>
            </View>

            <View style={s.statusRow}>
              <View style={s.statusHeader}>
                <View>
                  <Text style={s.cardTitle}>Toss payout 키 준비 상태</Text>
                  <Text style={s.cardDesc}>
                    payout ops readiness는 이후 섹션에서 이어 붙일 수 있게 비워 둡니다.
                  </Text>
                </View>
                <Badge
                  label={readinessLabel(environment.tossPayoutKeys)}
                  tone={readinessTone(environment.tossPayoutKeys)}
                />
              </View>
            </View>

            <View style={s.statusRow}>
              <View style={s.statusHeader}>
                <View>
                  <Text style={s.cardTitle}>현재 주문/정산 테스트 가능 여부</Text>
                  <Text style={s.cardDesc}>
                    {selectedOrderId
                      ? `주문 ${selectedOrderId}이 선택됐습니다. 실제 결제 가능 여부는 각 섹션에서 검증합니다.`
                      : "공통 orderId를 아직 선택하지 않았습니다."}
                  </Text>
                </View>
                <Badge
                  label={readinessLabel(environment.testScenario)}
                  tone={readinessTone(environment.testScenario)}
                />
              </View>
            </View>
          </View>

          <View style={s.infoBox}>
            <Text style={s.infoLabel}>서버 연결 확인</Text>
            <Text style={s.infoValue}>{serverStatus.message}</Text>
            <Text style={s.helperText}>
              마지막 확인 {formatDateTime(serverStatus.checkedAt)}
              {serverStatus.httpStatus ? ` / HTTP ${serverStatus.httpStatus}` : ""}
            </Text>
          </View>

          <Text style={s.helperText}>{environment.environmentNote}</Text>

          <View style={s.buttonRow}>
            <Button
              title={isRefreshingEnv ? "환경 갱신 중..." : "환경 다시 확인"}
              variant="outline"
              loading={isRefreshingEnv}
              onPress={() => void refreshEnvironment()}
            />
            <Button
              title={serverStatus.state === "checking" ? "" : ""}
              loading={serverStatus.state === "checking"}
              onPress={() => void runServerCheck()}
            />
          </View>
        </View>

        <View style={s.shellCard}>
          <Text style={s.cardTitle}>계정 전환</Text>
          <Text style={s.cardDesc}>
            선택한 actor는 이후 섹션이 어떤 로그인 컨텍스트를 기대하는지 알려주는 공통 기준입니다.
          </Text>
          <View style={s.actorRow}>
            {ACTOR_OPTIONS.map((option) => (
              <Button
                key={option}
                title={actorLabel(option)}
                size="sm"
                variant={actor === option ? "primary" : "outline"}
                onPress={() => setActor(option)}
                style={s.actorButton}
              />
            ))}
          </View>
          <Text style={s.helperText}>{actorHint}</Text>
        </View>

        <View style={s.shellCard}>
          <Text style={s.cardTitle}>공통 orderId 선택</Text>
          <Text style={s.cardDesc}>
            화주 결제, 차주 확인, 관리자 지급 섹션이 모두 같은 orderId를 참조하도록 맞춥니다.
          </Text>
          <TextField
            label="orderId"
            placeholder="예: 101"
            keyboardType="number-pad"
            value={orderIdInput}
            onChangeText={setOrderIdInput}
            helperText={
              selectedOrderId
                ? `현재 공통 orderId: ${selectedOrderId}`
                : "숫자 orderId를 입력해 공통 상태에 적용하세요."
            }
          />
          <View style={s.buttonRow}>
            <Button
              title="orderId 적용"
              disabled={!parsedInputOrderId}
              onPress={commitOrderId}
            />
            <Button
              title="초기화"
              variant="ghost"
              disabled={!orderIdInput && !selectedOrderId}
              onPress={clearOrderId}
            />
          </View>
        </View>

        <View style={s.shellCard}>
          <Text style={s.cardTitle}>공통 상태 요약</Text>
          <Text style={s.cardDesc}>
            후속 섹션이 붙을 수 있도록 snapshot slot과 shell activity log를 따로 유지합니다.
          </Text>
          <View style={s.snapshotRow}>
            {snapshotEntries.map((entry) => (
              <View key={entry.key} style={s.snapshotChip}>
                <Text style={s.snapshotLabel}>{entry.label}</Text>
                <Badge
                  label={entry.value.summary}
                  tone={snapshotTone(entry.value.status)}
                />
              </View>
            ))}
          </View>

          <View style={s.logList}>
            {activityLog.slice(0, 6).map((item) => (
              <View key={item.id} style={s.logItem}>
                <View style={s.logHeader}>
                  <Badge
                    label={item.level.toUpperCase()}
                    tone={activityTone(item)}
                  />
                  <Text style={s.logTime}>{formatDateTime(item.createdAt)}</Text>
                </View>
                <Text style={s.logText}>{item.message}</Text>
              </View>
            ))}
          </View>

          <View style={s.buttonRow}>
            <Button title="Lab 상태 초기화" variant="ghost" onPress={resetLab} />
          </View>
        </View>

        {selectedOrderId ? (
          <>
            <ShipperPaymentSection orderId={selectedOrderId} />
            <DriverSettlementSection orderId={selectedOrderId} />
            <AdminPayoutSection orderId={selectedOrderId} />
          </>
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>공통 orderId를 먼저 선택하세요.</Text>
            <Text style={s.emptyDesc}>
              orderId가 정해지면 화주 결제, 차주 확인, 관리자 지급 섹션이 모두 같은
              주문을 기준으로 이어집니다.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
