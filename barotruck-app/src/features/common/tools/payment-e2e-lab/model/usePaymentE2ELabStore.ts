import { create } from "zustand";

import type {
  PaymentE2ELabActivityLevel,
  PaymentE2ELabActivityLogItem,
  PaymentE2ELabActor,
  PaymentE2ELabEnvironmentSnapshot,
  PaymentE2ELabServerStatus,
  PaymentE2ELabSnapshotKind,
  PaymentE2ELabWorkflowSnapshot,
} from "./paymentE2ELabTypes";

type PaymentE2ELabSnapshots = Record<
  PaymentE2ELabSnapshotKind,
  PaymentE2ELabWorkflowSnapshot
>;

type PaymentE2ELabStore = {
  actor: PaymentE2ELabActor;
  serverBaseUrl: string;
  orderIdInput: string;
  selectedOrderId: number | null;
  environment: PaymentE2ELabEnvironmentSnapshot;
  serverStatus: PaymentE2ELabServerStatus;
  snapshots: PaymentE2ELabSnapshots;
  activityLog: PaymentE2ELabActivityLogItem[];
  setActor: (actor: PaymentE2ELabActor) => void;
  setServerBaseUrl: (serverBaseUrl: string) => void;
  setOrderIdInput: (value: string) => void;
  applyOrderId: (orderId: number) => void;
  commitOrderId: () => void;
  clearOrderId: () => void;
  setEnvironmentSnapshot: (
    environment: PaymentE2ELabEnvironmentSnapshot
  ) => void;
  setServerStatus: (serverStatus: PaymentE2ELabServerStatus) => void;
  setSnapshot: (
    kind: PaymentE2ELabSnapshotKind,
    patch: Partial<Omit<PaymentE2ELabWorkflowSnapshot, "kind">>
  ) => void;
  appendActivity: (
    message: string,
    level?: PaymentE2ELabActivityLevel
  ) => void;
  resetLab: () => void;
};

const MAX_ACTIVITY_ITEMS = 24;

function nowIso() {
  return new Date().toISOString();
}

function createActivity(
  message: string,
  level: PaymentE2ELabActivityLevel = "info"
): PaymentE2ELabActivityLogItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    message,
    createdAt: nowIso(),
  };
}

function prependActivity(
  items: PaymentE2ELabActivityLogItem[],
  next: PaymentE2ELabActivityLogItem
) {
  return [next, ...items].slice(0, MAX_ACTIVITY_ITEMS);
}

function createPlaceholderSnapshot(
  kind: PaymentE2ELabSnapshotKind,
  summary: string
): PaymentE2ELabWorkflowSnapshot {
  return {
    kind,
    status: "placeholder",
    summary,
    updatedAt: null,
  };
}

function createInitialSnapshots(): PaymentE2ELabSnapshots {
  return {
    payment: createPlaceholderSnapshot(
      "payment",
      "Shipper payment controls attach here."
    ),
    settlement: createPlaceholderSnapshot(
      "settlement",
      "Driver settlement checks attach here."
    ),
    payout: createPlaceholderSnapshot(
      "payout",
      "Admin payout controls attach here."
    ),
    webhook: createPlaceholderSnapshot(
      "webhook",
      "Webhook payload and timeline wiring attach here."
    ),
  };
}

function createInitialEnvironment(): PaymentE2ELabEnvironmentSnapshot {
  return {
    platform: "web",
    configuredBaseUrl: null,
    resolvedBaseUrl: "",
    expoHost: null,
    usesEnvOverride: false,
    isRemoteApi: false,
    hasAuthToken: false,
    sessionEmail: null,
    sessionRole: null,
    accountReadiness: "unknown",
    tossPaymentKeys: "unknown",
    tossPayoutKeys: "unknown",
    testScenario: "needs_setup",
    environmentNote: "Refresh the environment snapshot to inspect the active setup.",
  };
}

function createInitialServerStatus(): PaymentE2ELabServerStatus {
  return {
    state: "idle",
    message: "Server check has not run yet.",
    checkedAt: null,
    httpStatus: null,
  };
}

function normalizeOrderIdInput(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export const usePaymentE2ELabStore = create<PaymentE2ELabStore>((set) => ({
  actor: "SHIPPER",
  serverBaseUrl: "",
  orderIdInput: "",
  selectedOrderId: null,
  environment: createInitialEnvironment(),
  serverStatus: createInitialServerStatus(),
  snapshots: createInitialSnapshots(),
  activityLog: [
    createActivity(
      "Payment E2E lab shell initialized. Attach feature sections below."
    ),
  ],
  setActor: (actor) =>
    set((state) => {
      if (state.actor === actor) {
        return state;
      }

      return {
        actor,
        activityLog: prependActivity(
          state.activityLog,
          createActivity(`Actor switched to ${actor}.`)
        ),
      };
    }),
  setServerBaseUrl: (serverBaseUrl) =>
    set({ serverBaseUrl: serverBaseUrl.trim() }),
  setOrderIdInput: (value) =>
    set({
      orderIdInput: normalizeOrderIdInput(value),
    }),
  applyOrderId: (orderId) =>
    set((state) => ({
      orderIdInput: String(orderId),
      selectedOrderId: orderId,
      activityLog: prependActivity(
        state.activityLog,
        createActivity(`Shared orderId set to ${orderId}.`)
      ),
    })),
  commitOrderId: () =>
    set((state) => {
      const normalized = normalizeOrderIdInput(state.orderIdInput);
      const nextOrderId = Number(normalized);

      if (!normalized || !Number.isSafeInteger(nextOrderId) || nextOrderId <= 0) {
        return {
          orderIdInput: normalized,
          activityLog: prependActivity(
            state.activityLog,
            createActivity("A positive numeric orderId is required.", "warning")
          ),
        };
      }

      return {
        orderIdInput: normalized,
        selectedOrderId: nextOrderId,
        activityLog: prependActivity(
          state.activityLog,
          createActivity(`Shared orderId set to ${nextOrderId}.`)
        ),
      };
    }),
  clearOrderId: () =>
    set((state) => ({
      orderIdInput: "",
      selectedOrderId: null,
      activityLog: prependActivity(
        state.activityLog,
        createActivity("Shared orderId cleared.")
      ),
    })),
  setEnvironmentSnapshot: (environment) =>
    set((state) => ({
      environment,
      serverBaseUrl: environment.resolvedBaseUrl,
      activityLog: prependActivity(
        state.activityLog,
        createActivity(
          `Environment refreshed for ${environment.resolvedBaseUrl || "unknown server"}.`
        )
      ),
    })),
  setServerStatus: (serverStatus) =>
    set((state) => ({
      serverStatus,
      activityLog:
        serverStatus.state === "checking"
          ? state.activityLog
          : prependActivity(
              state.activityLog,
              createActivity(
                `Server check: ${serverStatus.message}`,
                serverStatus.state === "unreachable" ? "error" : "info"
              )
            ),
    })),
  setSnapshot: (kind, patch) =>
    set((state) => ({
      snapshots: {
        ...state.snapshots,
        [kind]: {
          ...state.snapshots[kind],
          ...patch,
          kind,
          updatedAt: patch.updatedAt ?? nowIso(),
        },
      },
      activityLog: prependActivity(
        state.activityLog,
        createActivity(
          `${kind} snapshot updated: ${
            patch.summary ?? state.snapshots[kind].summary
          }`
        )
      ),
    })),
  appendActivity: (message, level = "info") =>
    set((state) => ({
      activityLog: prependActivity(state.activityLog, createActivity(message, level)),
    })),
  resetLab: () =>
    set({
      actor: "SHIPPER",
      serverBaseUrl: "",
      orderIdInput: "",
      selectedOrderId: null,
      environment: createInitialEnvironment(),
      serverStatus: createInitialServerStatus(),
      snapshots: createInitialSnapshots(),
      activityLog: [
        createActivity("Lab state reset. Re-run environment checks as needed."),
      ],
    }),
}));
