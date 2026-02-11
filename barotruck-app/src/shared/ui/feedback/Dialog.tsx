import React, { memo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "../base/Button";

type Action = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "accent" | "outline" | "ghost" | "danger";
};

type Props = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  primary?: Action;
  secondary?: Action;
  style?: ViewStyle;
};

export const Dialog = memo(function Dialog({
  open,
  title,
  description,
  onClose,
  primary,
  secondary,
  style,
}: Props) {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.backdropWrap}>
        <Pressable
          style={[s.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={onClose}
        />
        <View style={s.center}>
          <View style={[s.dialog, { backgroundColor: c.bg.surface }, style]}>
            <Text style={[s.title, { color: c.text.primary }]}>{title}</Text>
            {description ? (
              <Text style={[s.desc, { color: c.text.secondary }]}>
                {description}
              </Text>
            ) : null}
            <View style={s.actions}>
              {secondary ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title={secondary.label}
                    variant={secondary.variant ?? "outline"}
                    onPress={secondary.onPress}
                    size="md"
                    fullWidth
                  />
                </View>
              ) : !primary ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title="닫기"
                    variant="outline"
                    onPress={onClose}
                    size="md"
                    fullWidth
                  />
                </View>
              ) : null}
              {secondary && primary && <View style={{ width: 10 }} />}
              {primary ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title={primary.label}
                    variant={primary.variant ?? "primary"}
                    onPress={primary.onPress}
                    size="md"
                    fullWidth
                  />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const s = StyleSheet.create({
  backdropWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  center: {
    width: "100%",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});
