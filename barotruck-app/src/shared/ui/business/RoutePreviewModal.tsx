import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

export type RoutePathPoint = {
  lat: number;
  lng: number;
};

export type RoutePreviewData = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startLabel: string;
  endLabel: string;
  path: RoutePathPoint[];
};

type RoutePreviewModalProps = {
  visible: boolean;
  data: RoutePreviewData | null;
  errorMessage: string;
  onChangeError: (message: string) => void;
  onClose: () => void;
  insetTop: number;
  colors: {
    bgCanvas: string;
    borderDefault: string;
    textPrimary: string;
    textSecondary: string;
  };
};

const KAKAO_MAP_JS_KEY = String(process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "").trim();
const KAKAO_MAP_WEBVIEW_BASE_URL = String(process.env.EXPO_PUBLIC_KAKAO_WEBVIEW_BASE_URL ?? "https://localhost").trim();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildMarkerSvgDataUrl(fillColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
  <path d="M17 1C8.163 1 1 8.163 1 17c0 12.2 14.1 23.6 15.3 24.6a1.2 1.2 0 0 0 1.4 0C18.9 40.6 33 29.2 33 17 33 8.163 25.837 1 17 1z" fill="${fillColor}" stroke="#ffffff" stroke-width="2"/>
  <circle cx="17" cy="17" r="6" fill="#ffffff"/>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildRoutePreviewHtml(payload: RoutePreviewData): string {
  const safeStartLabel = escapeHtml(payload.startLabel || "출발지");
  const safeEndLabel = escapeHtml(payload.endLabel || "도착지");
  const startMarkerImageUrl = buildMarkerSvgDataUrl("#111827");
  const endMarkerImageUrl = buildMarkerSvgDataUrl("#6D28D9");
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
      }
      .legend {
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 10;
        background: rgba(255,255,255,0.96);
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12px;
        line-height: 1.45;
        color: #0f172a;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
      }
      .dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        margin-right: 6px;
      }
      .marker-label {
        padding: 3px 7px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        color: #fff;
        white-space: nowrap;
        box-shadow: 0 3px 10px rgba(15, 23, 42, 0.18);
      }
      .marker-label.start {
        background: #111827;
      }
      .marker-label.end {
        background: #6d28d9;
      }
    </style>
    <script>
      window.__notify = function (payload) {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        } catch (e) {}
      };
    </script>
    <script
      src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_JS_KEY}&autoload=false"
      onerror="window.__notify({ type: 'sdk_error', message: '카카오 지도 SDK 로드 실패(도메인/키 확인 필요)' })"
    ></script>
  </head>
  <body>
    <div class="legend">
      <div><span class="dot" style="background:#1E293B"></span>${safeStartLabel}</div>
      <div><span class="dot" style="background:#4F46E5"></span>${safeEndLabel}</div>
    </div>
    <div id="map"></div>
    <script>
      (function () {
        var start = { lat: ${payload.startLat}, lng: ${payload.startLng} };
        var end = { lat: ${payload.endLat}, lng: ${payload.endLng} };
        var rawPath = ${JSON.stringify(payload.path)};
        if (!window.kakao || !window.kakao.maps) {
          window.__notify({ type: "sdk_missing", message: "kakao 객체가 없습니다." });
          return;
        }
        kakao.maps.load(function () {
          var mapContainer = document.getElementById("map");
          var centerLat = (start.lat + end.lat) / 2;
          var centerLng = (start.lng + end.lng) / 2;
          var map = new kakao.maps.Map(mapContainer, {
            center: new kakao.maps.LatLng(centerLat, centerLng),
            level: 7
          });

          var startPos = new kakao.maps.LatLng(start.lat, start.lng);
          var endPos = new kakao.maps.LatLng(end.lat, end.lng);
          var routePath = Array.isArray(rawPath)
            ? rawPath
                .map(function (p) {
                  return new kakao.maps.LatLng(Number(p.lat), Number(p.lng));
                })
                .filter(function (p) {
                  return Number.isFinite(p.getLat()) && Number.isFinite(p.getLng());
                })
            : [];

          var markerSize = new kakao.maps.Size(34, 42);
          var markerOffset = new kakao.maps.Point(17, 41);
          var startMarkerImage = new kakao.maps.MarkerImage("${startMarkerImageUrl}", markerSize, {
            offset: markerOffset
          });
          var endMarkerImage = new kakao.maps.MarkerImage("${endMarkerImageUrl}", markerSize, {
            offset: markerOffset
          });

          new kakao.maps.Marker({ map: map, position: startPos, image: startMarkerImage });
          new kakao.maps.Marker({ map: map, position: endPos, image: endMarkerImage });
          new kakao.maps.CustomOverlay({
            map: map,
            position: startPos,
            yAnchor: 1.8,
            content: '<div class="marker-label start">출발</div>',
          });
          new kakao.maps.CustomOverlay({
            map: map,
            position: endPos,
            yAnchor: 1.8,
            content: '<div class="marker-label end">도착</div>',
          });

          var polyline = new kakao.maps.Polyline({
            map: map,
            path: routePath.length >= 2 ? routePath : [startPos, endPos],
            strokeWeight: 5,
            strokeColor: "#2563EB",
            strokeOpacity: 0.9,
            strokeStyle: "solid"
          });
          polyline.setMap(map);

          var bounds = new kakao.maps.LatLngBounds();
          bounds.extend(startPos);
          bounds.extend(endPos);
          map.setBounds(bounds, 40, 40, 40, 40);
          var currentLevel = map.getLevel();
          var zoomedLevel = Math.max(1, currentLevel - 1);
          map.setLevel(zoomedLevel);
          window.__notify({ type: "map_ready" });
        });
      })();
    </script>
  </body>
</html>`;
}

export function hasKakaoMapJsKey() {
  return Boolean(KAKAO_MAP_JS_KEY);
}

export function RoutePreviewModal({
  visible,
  data,
  errorMessage,
  onChangeError,
  onClose,
  insetTop,
  colors,
}: RoutePreviewModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.wrap, { backgroundColor: colors.bgCanvas }]}>
        <View
          style={[
            s.header,
            {
              borderBottomColor: colors.borderDefault,
              paddingTop: insetTop,
              height: 56 + insetTop,
            },
          ]}
        >
          <Pressable style={s.backBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
          </Pressable>
          <Text style={[s.title, { color: colors.textPrimary }]}>경로 미리보기</Text>
          <View style={s.placeholder} />
        </View>
        <View style={s.body}>
          {errorMessage ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          {data ? (
            <WebView
              originWhitelist={["*"]}
              source={{
                html: buildRoutePreviewHtml(data),
                baseUrl: KAKAO_MAP_WEBVIEW_BASE_URL,
              }}
              style={s.webview}
              javaScriptEnabled
              domStorageEnabled
              onMessage={(event) => {
                try {
                  const payload = JSON.parse(event.nativeEvent.data ?? "{}");
                  if (payload?.type === "map_ready") {
                    onChangeError("");
                    return;
                  }
                  if (payload?.type === "sdk_error" || payload?.type === "sdk_missing") {
                    onChangeError("카카오 지도 SDK 로드 실패: JavaScript 키와 Web 플랫폼 도메인을 확인해주세요.");
                  }
                } catch {
                  // noop
                }
              }}
              onError={() => onChangeError("지도 로딩 중 오류가 발생했습니다. 네트워크/도메인 설정을 확인해주세요.")}
            />
          ) : (
            <View style={s.empty}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  body: { flex: 1 },
  errorBox: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    zIndex: 10,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "700",
  },
  webview: { flex: 1, backgroundColor: "#fff" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
});
