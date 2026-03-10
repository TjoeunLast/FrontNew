import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { PaymentService } from "@/shared/api/paymentService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type TossCheckoutSession = {
  orderId: number;
  successUrl: string;
  failUrl: string;
  html: string;
};

function pickSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function escapeHtmlValue(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseQueryValue(url: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`[?&]${escaped}=([^&#]*)`);
  const match = url.match(regex);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch {
    return match[1];
  }
}

function isUrlMatched(targetUrl: string, expectedBaseUrl: string) {
  if (!targetUrl || !expectedBaseUrl) return false;
  return targetUrl.startsWith(expectedBaseUrl);
}

function isWebViewInternalUrl(url: string) {
  const lower = String(url || "").toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("about:blank") ||
    lower.startsWith("data:")
  );
}

function buildTossCheckoutHtml(input: {
  clientKey: string;
  amount: number;
  pgOrderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
}) {
  const clientKey = escapeHtmlValue(input.clientKey);
  const amount = Number(input.amount) || 0;
  const pgOrderId = escapeHtmlValue(input.pgOrderId);
  const orderName = escapeHtmlValue(input.orderName);
  const successUrl = escapeHtmlValue(input.successUrl);
  const failUrl = escapeHtmlValue(input.failUrl);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>Toss Payment</title>
  <script src="https://js.tosspayments.com/v1/payment"></script>
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .wrap { min-height: 100%; display: flex; align-items: center; justify-content: center; color: #334155; }
    #payBtn {
      border: 0;
      border-radius: 12px;
      height: 48px;
      padding: 0 18px;
      background: #2563eb;
      color: #fff;
      font-size: 16px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="wrap"><button id="payBtn">토스 결제 진행</button></div>
  <script>
    (function () {
      var started = false;
      function startPayment() {
        if (started) return;
        started = true;
        try {
          var tossPayments = TossPayments("${clientKey}");
          tossPayments.requestPayment("카드", {
            amount: ${amount},
            orderId: "${pgOrderId}",
            orderName: "${orderName}",
            successUrl: "${successUrl}",
            failUrl: "${failUrl}"
          }).catch(function (error) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "REQUEST_ERROR",
              message: String(error && error.message ? error.message : error)
            }));
            started = false;
          });
        } catch (e) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "SCRIPT_ERROR",
            message: String(e && e.message ? e.message : e)
          }));
          started = false;
        }
      }

      var payBtn = document.getElementById("payBtn");
      if (payBtn) payBtn.addEventListener("click", startPayment);
      setTimeout(startPayment, 120);
    })();
  </script>
</body>
</html>`;
}

export default function ShipperTossCheckoutScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string | string[];
    clientKey?: string | string[];
    pgOrderId?: string | string[];
    amount?: string | string[];
    orderName?: string | string[];
    successUrl?: string | string[];
    failUrl?: string | string[];
  }>();

  const orderId = useMemo(() => {
    // expo-router 라우트 파라미터는 string|string[] 형태로 들어올 수 있다.
    const text = pickSearchParam(params.orderId);
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [params.orderId]);

  const preparedCheckout = useMemo(() => {
    const clientKey = String(pickSearchParam(params.clientKey) ?? "").trim();
    const pgOrderId = String(pickSearchParam(params.pgOrderId) ?? "").trim();
    const successUrl = String(pickSearchParam(params.successUrl) ?? "").trim();
    const failUrl = String(pickSearchParam(params.failUrl) ?? "").trim();
    const orderName =
      String(pickSearchParam(params.orderName) ?? "").trim() || `운송 결제 #${orderId}`;
    const amount = Number(pickSearchParam(params.amount));

    if (
      !orderId ||
      !clientKey ||
      !pgOrderId ||
      !successUrl ||
      !failUrl ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return null;
    }

    return {
      orderId,
      successUrl,
      failUrl,
      html: buildTossCheckoutHtml({
        clientKey,
        amount,
        pgOrderId,
        orderName,
        successUrl,
        failUrl,
      }),
    } satisfies TossCheckoutSession;
  }, [
    orderId,
    params.amount,
    params.clientKey,
    params.failUrl,
    params.orderName,
    params.pgOrderId,
    params.successUrl,
  ]);

  const [preparing, setPreparing] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [checkout, setCheckout] = useState<TossCheckoutSession | null>(null);
  const handledUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      Alert.alert("결제 오류", "주문 정보를 확인할 수 없습니다.");
      router.back();
      return;
    }

    if (preparedCheckout) {
      handledUrlRef.current = null;
      setCheckout(preparedCheckout);
      setPreparing(false);
      return;
    }

    let mounted = true;
    setPreparing(true);
    handledUrlRef.current = null;

    void (async () => {
      try {
        // 1단계: 백엔드에서 토스 결제 세션을 준비한다.
        const prepared = await PaymentService.prepareTossPayment(orderId, {
          method: "CARD",
          payChannel: "CARD",
        });
        if (!mounted) return;
        setCheckout({
          orderId,
          successUrl: prepared.successUrl,
          failUrl: prepared.failUrl,
          html: buildTossCheckoutHtml({
            clientKey: prepared.clientKey,
            amount: prepared.amount,
            pgOrderId: prepared.pgOrderId,
            orderName: prepared.orderName || `운송 결제 #${orderId}`,
            successUrl: prepared.successUrl,
            failUrl: prepared.failUrl,
          }),
        });
      } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || "토스 결제를 시작할 수 없습니다.";
        if (mounted) {
          Alert.alert("결제 오류", String(msg));
          router.back();
        }
      } finally {
        if (mounted) setPreparing(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [orderId, preparedCheckout, router]);

  const onClose = useCallback(() => {
    if (confirming) return;
    router.back();
  }, [confirming, router]);

  const handleTossSuccessUrl = useCallback(
    async (url: string) => {
      if (!checkout) return;
      const paymentKey = parseQueryValue(url, "paymentKey");
      const pgOrderId = parseQueryValue(url, "orderId");
      const amountRaw = parseQueryValue(url, "amount");
      const amount = Number(amountRaw);

      if (!paymentKey) {
        handledUrlRef.current = null;
        Alert.alert("결제 오류", "결제 키를 확인할 수 없습니다.");
        return;
      }

      try {
        setConfirming(true);
        // 2단계: 성공 콜백의 paymentKey로 백엔드 결제를 확정한다.
        await PaymentService.confirmTossPayment(checkout.orderId, {
          paymentKey,
          pgOrderId: pgOrderId || undefined,
          amount: Number.isFinite(amount) ? amount : undefined,
        });
        Alert.alert("결제 완료", "토스 결제가 완료되었습니다.", [
          {
            text: "확인",
            onPress: () => router.back(),
          },
        ]);
      } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || "토스 결제 확정 중 오류가 발생했습니다.";
        handledUrlRef.current = null;
        Alert.alert("결제 오류", String(msg));
      } finally {
        setConfirming(false);
      }
    },
    [checkout, router]
  );

  const handleTossFailUrl = useCallback((url: string) => {
    const code = parseQueryValue(url, "code");
    const message = parseQueryValue(url, "message");
    handledUrlRef.current = null;
    Alert.alert("결제 실패", message || code || "토스 결제가 취소되었거나 실패했습니다.");
  }, []);

  const handleTossResultUrl = useCallback(
    (url: string) => {
      if (!checkout) return false;
      if (isUrlMatched(url, checkout.successUrl)) {
        if (handledUrlRef.current === url) return true;
        handledUrlRef.current = url;
        void handleTossSuccessUrl(url);
        return true;
      }
      if (isUrlMatched(url, checkout.failUrl)) {
        if (handledUrlRef.current === url) return true;
        handledUrlRef.current = url;
        handleTossFailUrl(url);
        return true;
      }
      return false;
    },
    [checkout, handleTossFailUrl, handleTossSuccessUrl]
  );

  const onShouldStart = useCallback(
    (request: { url: string }) => {
      const url = String(request.url ?? "");
      const handled = handleTossResultUrl(url);
      if (handled) return false;

      if (!isWebViewInternalUrl(url)) {
        // 카드/은행 앱 스킴은 WebView 내부가 아니라 Linking으로 열어야 한다.
        void Linking.openURL(url).catch(() => {
          Alert.alert("결제 안내", "외부 결제 앱을 열 수 없습니다. 카드/은행 앱 설치 여부를 확인해 주세요.");
        });
        return false;
      }
      return true;
    },
    [handleTossResultUrl]
  );

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data ?? "{}");
      if (payload?.type === "REQUEST_ERROR" || payload?.type === "SCRIPT_ERROR") {
        handledUrlRef.current = null;
        Alert.alert("결제 오류", String(payload?.message || "토스 결제창을 열 수 없습니다."));
      }
    } catch {
      // 무시
    }
  }, []);

  const s = useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: "#FFFFFF" } as ViewStyle,
        header: {
          height: 52 + insets.top,
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: c.border.default,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,
        closeBtn: {
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
        } as ViewStyle,
        title: { fontSize: 16, fontWeight: "800", color: c.text.primary } as TextStyle,
        loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" } as ViewStyle,
        loadingText: { fontSize: 14, fontWeight: "700", color: c.text.secondary } as TextStyle,
        webview: { flex: 1 } as ViewStyle,
        confirming: {
          position: "absolute",
          right: 12,
          top: insets.top + 14,
          fontSize: 12,
          fontWeight: "700",
          color: c.text.secondary,
        } as TextStyle,
      }),
    [c, insets.top]
  );

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Pressable style={s.closeBtn} disabled={confirming} onPress={onClose}>
          <Ionicons name="close" size={24} color={confirming ? "#CBD5E1" : c.text.primary} />
        </Pressable>
        <Text style={s.title}>토스 결제</Text>
        <View style={s.closeBtn} />
        {confirming ? <Text style={s.confirming}>결제 확인 중...</Text> : null}
      </View>

      {preparing ? (
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>결제창을 준비하고 있습니다.</Text>
        </View>
      ) : checkout ? (
        <WebView
          style={s.webview}
          originWhitelist={["*"]}
          source={{ html: checkout.html }}
          onShouldStartLoadWithRequest={onShouldStart}
          onNavigationStateChange={(navState) => {
            handleTossResultUrl(navState.url);
          }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
      ) : (
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>결제 화면을 불러오지 못했습니다.</Text>
        </View>
      )}
    </View>
  );
}
