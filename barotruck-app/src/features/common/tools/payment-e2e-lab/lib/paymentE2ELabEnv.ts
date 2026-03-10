import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  getCurrentUserSnapshot,
  type CurrentUserRole,
} from "@/shared/utils/currentUserStorage";
import { tokenStorage } from "@/shared/utils/tokenStorage";

import type {
  PaymentE2ELabEnvironmentSnapshot,
  PaymentE2ELabServerStatus,
} from "../model/paymentE2ELabTypes";

const LOCAL_HOST_PATTERN = /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i;

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolvePaymentE2ELabApiBaseUrl() {
  const envBase = String(process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim();
  if (envBase) {
    return stripTrailingSlash(envBase);
  }

  if (__DEV__ && Platform.OS === "android") {
    return "http://10.0.2.2:8080";
  }

  const hostFromExpo = Constants.expoConfig?.hostUri?.split(":").shift();
  if (hostFromExpo && hostFromExpo !== "undefined") {
    return `http://${hostFromExpo}:8080`;
  }

  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location?.hostname
  ) {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }

  return "http://localhost:8080";
}

function isRemoteApi(baseUrl: string) {
  return /^https?:\/\//i.test(baseUrl) && !LOCAL_HOST_PATTERN.test(baseUrl);
}

function buildAccountReadiness(
  hasAuthToken: boolean,
  sessionRole: CurrentUserRole | null,
  sessionEmail: string | null
): PaymentE2ELabEnvironmentSnapshot["accountReadiness"] {
  if (hasAuthToken && sessionRole && sessionEmail) {
    return "ready";
  }

  if (hasAuthToken || sessionRole || sessionEmail) {
    return "partial";
  }

  return "needs_setup";
}

function buildEnvironmentNote(
  hasAuthToken: boolean,
  sessionRole: CurrentUserRole | null,
  selectedOrderId: number | null
) {
  if (!hasAuthToken) {
    return "No stored auth token was found. Login in the normal app flow, then return here.";
  }

  if (!sessionRole) {
    return "A token exists, but the cached user role is missing. Refresh profile state before actor-specific tests.";
  }

  if (!selectedOrderId) {
    return "Pick an orderId before running shipper, driver, or admin sections.";
  }

  return "Shared actor, server URL, and orderId are ready for downstream sections.";
}

export async function buildPaymentE2ELabEnvironmentSnapshot(
  selectedOrderId: number | null
): Promise<PaymentE2ELabEnvironmentSnapshot> {
  const configuredBaseUrl = String(
    process.env.EXPO_PUBLIC_API_BASE_URL ?? ""
  ).trim();
  const resolvedBaseUrl = resolvePaymentE2ELabApiBaseUrl();
  const currentUser = await getCurrentUserSnapshot();
  const token = await tokenStorage.getItem("userToken");
  const hasAuthToken = Boolean(token);
  const sessionEmail = currentUser?.email ?? null;
  const sessionRole = currentUser?.role ?? null;

  return {
    platform: Platform.OS,
    configuredBaseUrl: configuredBaseUrl || null,
    resolvedBaseUrl,
    expoHost: Constants.expoConfig?.hostUri ?? null,
    usesEnvOverride: Boolean(configuredBaseUrl),
    isRemoteApi: isRemoteApi(resolvedBaseUrl),
    hasAuthToken,
    sessionEmail,
    sessionRole,
    accountReadiness: buildAccountReadiness(
      hasAuthToken,
      sessionRole,
      sessionEmail
    ),
    tossPaymentKeys: "unknown",
    tossPayoutKeys: "unknown",
    testScenario: selectedOrderId ? "partial" : "needs_setup",
    environmentNote: buildEnvironmentNote(
      hasAuthToken,
      sessionRole,
      selectedOrderId
    ),
  };
}

export async function probePaymentE2ELabServer(
  baseUrl: string
): Promise<PaymentE2ELabServerStatus> {
  const checkedAt = new Date().toISOString();
  const normalizedBaseUrl = stripTrailingSlash(String(baseUrl ?? "").trim());

  if (!normalizedBaseUrl) {
    return {
      state: "unreachable",
      message: "No API base URL is configured.",
      checkedAt,
      httpStatus: null,
    };
  }

  const candidates = [`${normalizedBaseUrl}/actuator/health`, normalizedBaseUrl];
  let lastErrorMessage = "Unable to reach the configured server.";

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
        },
      });

      return {
        state: "reachable",
        message: `Response received from ${candidate} (${response.status}).`,
        checkedAt,
        httpStatus: response.status,
      };
    } catch (error) {
      lastErrorMessage =
        error instanceof Error ? error.message : "Unknown network error";
    }
  }

  return {
    state: "unreachable",
    message: lastErrorMessage,
    checkedAt,
    httpStatus: null,
  };
}
