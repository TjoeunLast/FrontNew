import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { PaymentService } from '@/shared/api/paymentService';
import { useAppTheme } from '@/shared/hooks/useAppTheme';
import { Button } from '@/shared/ui/base';
import { withAlpha } from '@/shared/utils/color';
import {
  APP_DEEP_LINK_PREFIX,
  isWebViewInternalUrl,
  openExternalCheckoutUrl,
} from '@/shared/utils/payment/externalCheckoutLinking';

type BillingCheckoutSession = {
  customerKey: string;
  successUrl: string;
  failUrl: string;
  html: string;
};

const DEFAULT_BILLING_SUCCESS_URL = `${APP_DEEP_LINK_PREFIX}billing/success`;
const DEFAULT_BILLING_FAIL_URL = `${APP_DEEP_LINK_PREFIX}billing/fail`;

function escapeHtmlValue(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseQueryValue(url: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`[?&]${escaped}=([^&#]*)`);
  const match = url.match(regex);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1].replace(/\+/g, ' '));
  } catch {
    return match[1];
  }
}

function isUrlMatched(targetUrl: string, expectedBaseUrl: string) {
  if (!targetUrl || !expectedBaseUrl) return false;
  return targetUrl.startsWith(expectedBaseUrl);
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const candidate = error as {
    message?: unknown;
    response?: { data?: { message?: unknown } };
  };
  const message =
    candidate?.response?.data?.message ?? candidate?.message ?? fallback;

  return String(message || fallback);
}

function resolveRedirectUrl(value: string | null | undefined, fallback: string) {
  const resolved = String(value ?? '').trim();
  if (!resolved) {
    return fallback;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(resolved)) {
    return resolved;
  }

  return fallback;
}

function buildBillingCheckoutHtml(input: {
  clientKey: string;
  customerKey: string;
  successUrl: string;
  failUrl: string;
}) {
  const clientKey = escapeHtmlValue(input.clientKey);
  const customerKey = escapeHtmlValue(input.customerKey);
  const successUrl = escapeHtmlValue(input.successUrl);
  const failUrl = escapeHtmlValue(input.failUrl);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>Toss Billing</title>
  <script src="https://js.tosspayments.com/v2/standard"></script>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .wrap { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
    .card { width: 100%; max-width: 360px; border: 1px solid #E2E8F0; border-radius: 20px; padding: 24px; box-sizing: border-box; text-align: left; }
    .eyebrow { font-size: 12px; line-height: 18px; font-weight: 700; color: #2563EB; }
    .title { margin-top: 8px; font-size: 24px; line-height: 32px; font-weight: 800; color: #0F172A; }
    .desc { margin-top: 10px; font-size: 14px; line-height: 22px; color: #475569; }
    .button { width: 100%; margin-top: 18px; border: 0; border-radius: 14px; height: 52px; background: #2563EB; color: #ffffff; font-size: 16px; font-weight: 800; }
    .meta { margin-top: 12px; font-size: 12px; line-height: 18px; color: #64748B; word-break: break-all; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="eyebrow">Toss Billing Agreement</div>
      <div class="title">자동결제용 카드 등록</div>
      <div class="desc">토스 인증 완료 후 billing agreement를 발급합니다.</div>
      <button id="billingBtn" class="button">카드 인증 시작</button>
      <div class="meta">customerKey: ${customerKey}</div>
    </div>
  </div>
  <script>
    (function () {
      var started = false;

      function post(type, message) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, message: message }));
        }
      }

      function startBilling() {
        if (started) return;
        started = true;

        try {
          var tossPayments = TossPayments("${clientKey}");
          var payment = tossPayments.payment({
            customerKey: "${customerKey}"
          });

          payment.requestBillingAuth({
            method: "CARD",
            successUrl: "${successUrl}",
            failUrl: "${failUrl}",
            appScheme: "${APP_DEEP_LINK_PREFIX}",
            windowTarget: "self"
          }).catch(function (error) {
            post("REQUEST_ERROR", String(error && error.message ? error.message : error));
            started = false;
          });
        } catch (e) {
          post("SCRIPT_ERROR", String(e && e.message ? e.message : e));
          started = false;
        }
      }

      var button = document.getElementById("billingBtn");
      if (button) {
        button.addEventListener("click", startBilling);
      }

      setTimeout(startBilling, 120);
    })();
  </script>
</body>
</html>`;
}

export default function ShipperBillingCheckoutScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [preparing, setPreparing] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<BillingCheckoutSession | null>(null);
  const handledUrlRef = useRef<string | null>(null);

  const loadCheckout = useCallback(async () => {
    setPreparing(true);
    setLoadError(null);
    handledUrlRef.current = null;

    try {
      const context = await PaymentService.getBillingContext();
      const clientKey = String(context.clientKey ?? '').trim();
      const customerKey = String(context.customerKey ?? '').trim();

      if (!clientKey) {
        throw new Error('billing clientKey가 설정되지 않았습니다.');
      }
      if (!customerKey) {
        throw new Error('billing customerKey를 확인할 수 없습니다.');
      }

      const successUrl = resolveRedirectUrl(
        context.successUrl,
        DEFAULT_BILLING_SUCCESS_URL
      );
      const failUrl = resolveRedirectUrl(
        context.failUrl,
        DEFAULT_BILLING_FAIL_URL
      );

      setCheckout({
        customerKey,
        successUrl,
        failUrl,
        html: buildBillingCheckoutHtml({
          clientKey,
          customerKey,
          successUrl,
          failUrl,
        }),
      });
    } catch (error) {
      setCheckout(null);
      setLoadError(
        getApiErrorMessage(error, 'billing 등록 화면을 준비하지 못했습니다.')
      );
    } finally {
      setPreparing(false);
    }
  }, []);

  useEffect(() => {
    void loadCheckout();
  }, [loadCheckout]);

  const onClose = useCallback(() => {
    if (issuing) return;
    router.back();
  }, [issuing, router]);

  const handleBillingSuccessUrl = useCallback(
    async (url: string) => {
      if (!checkout) return;

      const authKey = parseQueryValue(url, 'authKey');
      const customerKey =
        parseQueryValue(url, 'customerKey') || checkout.customerKey;

      if (!authKey) {
        handledUrlRef.current = null;
        const message = 'authKey를 확인할 수 없어 billing agreement를 발급하지 못했습니다.';
        setLoadError(message);
        Alert.alert('등록 오류', message);
        return;
      }

      try {
        setIssuing(true);
        setLoadError(null);

        await PaymentService.issueBillingAgreement({
          authKey,
          customerKey,
        });

        Alert.alert('등록 완료', '자동결제 카드가 등록되었습니다.', [
          {
            text: '확인',
            onPress: () => {
              router.back();
            },
          },
        ]);
      } catch (error) {
        handledUrlRef.current = null;
        const message = getApiErrorMessage(
          error,
          'billing agreement 발급 중 오류가 발생했습니다.'
        );
        setLoadError(message);
        Alert.alert('등록 오류', message);
      } finally {
        setIssuing(false);
      }
    },
    [checkout, router]
  );

  const handleBillingFailUrl = useCallback((url: string) => {
    const code = parseQueryValue(url, 'code');
    const message = parseQueryValue(url, 'message');
    const resolvedMessage =
      message || code || '토스 billing 인증이 취소되었거나 실패했습니다.';

    handledUrlRef.current = null;
    setLoadError(resolvedMessage);
    Alert.alert('등록 실패', resolvedMessage);
  }, []);

  const handleBillingResultUrl = useCallback(
    (url: string) => {
      if (!checkout) return false;

      if (isUrlMatched(url, checkout.successUrl)) {
        if (handledUrlRef.current === url) return true;
        handledUrlRef.current = url;
        void handleBillingSuccessUrl(url);
        return true;
      }

      if (isUrlMatched(url, checkout.failUrl)) {
        if (handledUrlRef.current === url) return true;
        handledUrlRef.current = url;
        handleBillingFailUrl(url);
        return true;
      }

      return false;
    },
    [checkout, handleBillingFailUrl, handleBillingSuccessUrl]
  );

  const onShouldStart = useCallback(
    (request: { url: string }) => {
      const url = String(request.url ?? '');
      const handled = handleBillingResultUrl(url);
      if (handled) return false;

      if (!isWebViewInternalUrl(url)) {
        void openExternalCheckoutUrl(url).then((opened) => {
          if (!opened) {
            const message =
              '외부 카드 앱을 열 수 없습니다. 카드사 앱 설치 여부를 확인해 주세요.';
            setLoadError(message);
            Alert.alert('등록 안내', message);
          }
        });
        return false;
      }

      return true;
    },
    [handleBillingResultUrl]
  );

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data ?? '{}') as {
        type?: string;
        message?: string;
      };

      if (payload?.type === 'REQUEST_ERROR' || payload?.type === 'SCRIPT_ERROR') {
        handledUrlRef.current = null;
        const message = String(
          payload?.message || '토스 billing 인증창을 열 수 없습니다.'
        );
        setLoadError(message);
        Alert.alert('등록 오류', message);
      }
    } catch {
      // ignore
    }
  }, []);

  const s = useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: '#FFFFFF' } as ViewStyle,
        header: {
          height: 52 + insets.top,
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: c.border.default,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
        } as ViewStyle,
        closeBtn: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        } as ViewStyle,
        title: {
          fontSize: 16,
          fontWeight: '800',
          color: c.text.primary,
        } as TextStyle,
        issuingText: {
          position: 'absolute',
          right: 12,
          top: insets.top + 14,
          fontSize: 12,
          fontWeight: '700',
          color: c.text.secondary,
        } as TextStyle,
        errorBanner: {
          margin: 12,
          marginBottom: 0,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: withAlpha(c.status.danger, 0.24),
          backgroundColor: withAlpha(c.status.danger, 0.08),
          padding: 12,
          gap: 4,
        } as ViewStyle,
        errorTitle: {
          fontSize: 12,
          fontWeight: '800',
          color: c.status.danger,
        } as TextStyle,
        errorText: {
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 18,
          color: c.text.secondary,
        } as TextStyle,
        loadingWrap: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          gap: 14,
        } as ViewStyle,
        loadingText: {
          fontSize: 14,
          fontWeight: '700',
          lineHeight: 20,
          textAlign: 'center',
          color: c.text.secondary,
        } as TextStyle,
        actionRow: {
          flexDirection: 'row',
          gap: 10,
        } as ViewStyle,
        webview: { flex: 1 } as ViewStyle,
      }),
    [c, insets.top]
  );

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Pressable style={s.closeBtn} disabled={issuing} onPress={onClose}>
          <Ionicons name="close" size={24} color={issuing ? '#CBD5E1' : c.text.primary} />
        </Pressable>
        <Text style={s.title}>billing 카드 등록</Text>
        <View style={s.closeBtn} />
        {issuing ? <Text style={s.issuingText}>agreement 발급 중...</Text> : null}
      </View>

      {loadError ? (
        <View style={s.errorBanner}>
          <Text style={s.errorTitle}>실패 메시지</Text>
          <Text style={s.errorText}>{loadError}</Text>
        </View>
      ) : null}

      {preparing ? (
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>billing 인증 화면을 준비하고 있습니다.</Text>
        </View>
      ) : checkout ? (
        <WebView
          style={s.webview}
          originWhitelist={['*']}
          source={{ html: checkout.html }}
          onShouldStartLoadWithRequest={onShouldStart}
          onNavigationStateChange={(navState) => {
            handleBillingResultUrl(navState.url);
          }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
      ) : (
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>
            billing 등록에 필요한 정보를 불러오지 못했습니다.
          </Text>
          <View style={s.actionRow}>
            <Button title="다시 시도" onPress={() => void loadCheckout()} />
            <Button title="닫기" variant="outline" onPress={onClose} />
          </View>
        </View>
      )}
    </View>
  );
}
