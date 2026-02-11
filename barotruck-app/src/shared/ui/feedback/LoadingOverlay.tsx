import React, { memo } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type LoadingOverlayProps = {
  open: boolean;
  label?: string;
};

export const LoadingOverlay = memo(function LoadingOverlay({
  open,
  label = "잠시만 기다려주세요",
}: LoadingOverlayProps) {
  const t = useAppTheme();
  const c = t.colors;

  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent>
      <View style={s.wrap}>
        <View style={[s.backdrop, { backgroundColor: "rgba(0,0,0,0.4)" }]} />
        <View style={[s.box, { backgroundColor: c.bg.surface }]}>
          <ActivityIndicator size="large" color={c.brand.primary} />
          {label ? (
            <Text style={[s.text, { color: c.text.primary }]}>{label}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
});

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  box: {
    minWidth: 160,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
