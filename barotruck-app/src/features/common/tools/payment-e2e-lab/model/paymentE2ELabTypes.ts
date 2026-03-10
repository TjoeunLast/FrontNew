import type { PlatformOSType } from "react-native";

import type { CurrentUserRole } from "@/shared/utils/currentUserStorage";

export type PaymentE2ELabActor = "SHIPPER" | "DRIVER" | "ADMIN";

export type PaymentE2ELabReadiness =
  | "unknown"
  | "partial"
  | "ready"
  | "needs_setup";

export type PaymentE2ELabServerHealth =
  | "idle"
  | "checking"
  | "reachable"
  | "unreachable";

export type PaymentE2ELabSnapshotKind =
  | "payment"
  | "settlement"
  | "payout"
  | "webhook";

export type PaymentE2ELabSnapshotStatus =
  | "placeholder"
  | "ready"
  | "warning"
  | "error";

export type PaymentE2ELabActivityLevel = "info" | "warning" | "error";

export type PaymentE2ELabEnvironmentSnapshot = {
  platform: PlatformOSType;
  configuredBaseUrl: string | null;
  resolvedBaseUrl: string;
  expoHost: string | null;
  usesEnvOverride: boolean;
  isRemoteApi: boolean;
  hasAuthToken: boolean;
  sessionEmail: string | null;
  sessionRole: CurrentUserRole | null;
  accountReadiness: PaymentE2ELabReadiness;
  tossPaymentKeys: PaymentE2ELabReadiness;
  tossPayoutKeys: PaymentE2ELabReadiness;
  testScenario: PaymentE2ELabReadiness;
  environmentNote: string;
};

export type PaymentE2ELabServerStatus = {
  state: PaymentE2ELabServerHealth;
  message: string;
  checkedAt: string | null;
  httpStatus: number | null;
};

export type PaymentE2ELabWorkflowSnapshot = {
  kind: PaymentE2ELabSnapshotKind;
  status: PaymentE2ELabSnapshotStatus;
  summary: string;
  updatedAt: string | null;
  metadata?: Record<string, string | number | null>;
};

export type PaymentE2ELabActivityLogItem = {
  id: string;
  level: PaymentE2ELabActivityLevel;
  message: string;
  createdAt: string;
};
