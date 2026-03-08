import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { TossCheckoutSession } from "../../settlement/model/shipperSettlementUtils";

interface Props {
  checkoutSession: TossCheckoutSession | null;
  isConfirming: boolean;
  onClose: () => void;
  onShouldStartLoadWithRequest: (request: { url: string }) => boolean;
  onNavigationStateChange: (navState: any) => void;
  onMessage: (event: WebViewMessageEvent) => void;
}

export function TossCheckoutModal({
  checkoutSession,
  isConfirming,
  onClose,
  onShouldStartLoadWithRequest,
  onNavigationStateChange,
  onMessage,
}: Props) {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = getStyles(c, insets);

  return (
    <Modal
      visible={!!checkoutSession}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.tossSheet}>
        <View style={s.tossHeader}>
          <Pressable
            style={s.tossCloseBtn}
            disabled={isConfirming}
            onPress={onClose}
          >
            <Ionicons
              name="close"
              size={24}
              color={isConfirming ? "#CBD5E1" : c.text.primary}
            />
          </Pressable>
          <Text style={s.tossTitle}>토스 결제</Text>
          <View style={s.tossCloseBtn} />
          {isConfirming ? (
            <Text style={s.tossLoading}>결제 확인 중...</Text>
          ) : null}
        </View>
        {checkoutSession ? (
          <WebView
            style={s.tossWebview}
            originWhitelist={["*"]}
            source={{ html: checkoutSession.html }}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            onNavigationStateChange={onNavigationStateChange}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
          />
        ) : null}
      </View>
    </Modal>
  );
}

const getStyles = (c: any, insets: any) =>
  StyleSheet.create({
    tossSheet: { flex: 1, backgroundColor: "#FFFFFF", paddingTop: insets.top },
    tossHeader: {
      height: 52,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border.default,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    tossTitle: { fontSize: 16, fontWeight: "800", color: c.text.primary },
    tossCloseBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    tossWebview: { flex: 1 },
    tossLoading: {
      position: "absolute",
      right: 12,
      top: 14,
      fontSize: 12,
      fontWeight: "700",
      color: c.text.secondary,
    },
  });
