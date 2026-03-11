// src/shared/utils/AddressSearch.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Postcode from "@actbase/react-daum-postcode";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { KakaoLocalApi } from "@/shared/api/kakaoLocalService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

interface AddressData {
  zonecode: number | string;
  address: string;
  buildingName: string;
  addressType: string;
  bname: string;
  [key: string]: any;
}

export interface SelectedAddress {
  address: string;
  lat?: number;
  lng?: number;
}

type PostcodeJsOptions = Record<string, unknown>;

type NativeDaumPostcodeProps = {
  jsOptions?: PostcodeJsOptions;
  onError?: (error: unknown) => void;
  onSelected?: (data: AddressData) => void;
  style?: object;
};

const POSTCODE_BASE_URL = "https://postcode.map.daum.net";
const POSTCODE_SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const DEFAULT_POSTCODE_OPTIONS: PostcodeJsOptions = {
  animation: true,
  hideMapBtn: true,
};

const POSTCODE_HTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no"
  >
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; background-color: #ececec; }
  </style>
</head>
<body>
  <div id="layer" style="width: 100%; min-height: 100%;"></div>
  <script type="text/javascript">
    function callback() {
      var elementLayer = document.getElementById("layer");
      elementLayer.innerHTML = "";
      new daum.Postcode({
        ...window.options,
        onsearch: function () {
          window.scrollTo(0, 0);
        },
        oncomplete: function (data) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        },
        onresize: function (size) {
          elementLayer.style.height = size.height + "px";
        },
        onclose: function () {
          callback();
        },
        width: "100%",
        height: "100%",
      }).embed(elementLayer);
    }

    function initOnReady(options) {
      window.options = options;
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "${POSTCODE_SCRIPT_URL}";
      script.onreadystatechange = callback;
      script.onload = callback;
      var firstScript = document.getElementsByTagName("script")[0];
      firstScript.parentNode.insertBefore(script, firstScript);
    }
  </script>
</body>
</html>
`;

const WEBVIEW_NAVIGATION_FIX_SCRIPT = `
  (function () {
    window.open = function (url) {
      if (url) {
        window.location.href = url;
      }
      return null;
    };

    document.addEventListener("click", function (event) {
      var node = event.target;
      while (node && node.tagName !== "A") {
        node = node.parentElement;
      }

      if (node && node.href && node.target === "_blank") {
        event.preventDefault();
        window.location.href = node.href;
      }
    }, true);
  })();
  true;
`;

function NativeDaumPostcode({
  jsOptions,
  onError,
  onSelected,
  style,
}: NativeDaumPostcodeProps) {
  const mergedOptions = React.useMemo(
    () => ({ ...DEFAULT_POSTCODE_OPTIONS, ...jsOptions }),
    [jsOptions],
  );

  const injectedJavaScript = React.useMemo(
    () => `initOnReady(${JSON.stringify(mergedOptions)}); true;`,
    [mergedOptions],
  );

  const handleMessage = React.useCallback(
    ({ nativeEvent }: WebViewMessageEvent) => {
      try {
        if (nativeEvent.data && onSelected) {
          onSelected(JSON.parse(nativeEvent.data));
        }
      } catch (error) {
        onError?.(error);
      }
    },
    [onError, onSelected],
  );

  const handleShouldStartLoad = React.useCallback(
    (request: { url?: string | null }) => {
      const url = String(request.url ?? "").trim();

      if (!url) return false;
      if (
        url === "about:blank" ||
        url.startsWith("data:") ||
        url.startsWith("javascript:")
      ) {
        return true;
      }
      if (/^https?:\/\//i.test(url)) {
        return true;
      }

      void Linking.openURL(url).catch((error) => {
        console.warn("[AddressSearch] failed to open external url:", url, error);
      });
      return false;
    },
    [],
  );

  return (
    <View style={style}>
      <WebView
        style={styles.webview}
        source={{ html: POSTCODE_HTML, baseUrl: POSTCODE_BASE_URL }}
        originWhitelist={["*"]}
        mixedContentMode="compatibility"
        androidLayerType="hardware"
        renderToHardwareTextureAndroid
        useWebKit
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        injectedJavaScriptBeforeContentLoaded={WEBVIEW_NAVIGATION_FIX_SCRIPT}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onError={(event) => onError?.(event.nativeEvent)}
        renderLoading={() => (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#64748B" />
          </View>
        )}
      />
    </View>
  );
}

// 부모 컴포넌트로부터 받을 Props 정의
interface AddressSearchProps {
  visible: boolean;                  // 모달 열림/닫힘 상태
  onClose: () => void;               // 모달 닫기 함수
  onComplete: (result: SelectedAddress) => void; // 완료 시 주소/좌표를 넘겨줄 함수
}

const AddressSearch = ({ visible, onClose, onComplete }: AddressSearchProps) => {
  const { colors } = useAppTheme();

  const parseCoordinate = (value: unknown): number | undefined => {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };

  const pickCoordinate = (data: AddressData, keys: string[]): number | undefined => {
    for (const key of keys) {
      const parsed = parseCoordinate(data[key]);
      if (parsed !== undefined) return parsed;
    }
    return undefined;
  };

  const handleComplete = async (data: AddressData) => {
    let lat = pickCoordinate(data, ["y", "lat", "latitude"]);
    let lng = pickCoordinate(data, ["x", "lng", "longitude"]);

    console.log("[AddressSearch] selected address:", data.address);
    console.log("[AddressSearch] postcode coordinates:", { lat, lng });

    if (lat === undefined || lng === undefined) {
      try {
        console.log("[AddressSearch] postcode coordinates missing, fallback to Kakao Local API");
        const geocoded = await KakaoLocalApi.geocodeAddress(data.address);
        lat = geocoded?.lat;
        lng = geocoded?.lng;
        console.log("[AddressSearch] Kakao Local API coordinates:", geocoded);
      } catch (error) {
        console.error("Failed to geocode selected address:", error);
      }
    }

    console.log("[AddressSearch] final coordinates:", { address: data.address, lat, lng });
    onComplete({ address: data.address, lat, lng });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]} edges={["top", "bottom"]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.bg.canvas,
              borderBottomColor: colors.border.default,
            },
          ]}
        >
          <Pressable onPress={onClose} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>주소 검색</Text>
          <View style={styles.headerSpacer} />
        </View>

        {Platform.OS === "web" ? (
          <Postcode
            style={styles.postcode}
            jsOptions={DEFAULT_POSTCODE_OPTIONS}
            onSelected={handleComplete}
            onError={(error: unknown) => console.error(error)}
          />
        ) : (
          <NativeDaumPostcode
            style={styles.postcode}
            jsOptions={DEFAULT_POSTCODE_OPTIONS}
            onSelected={handleComplete}
            onError={(error: unknown) => console.error(error)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  postcode: {
    flex: 1,
    width: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECECEC",
  },
});

export default AddressSearch;
