import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "../base/Button";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onPressAction?: () => void;
  icon?: React.ReactNode;
};

export const EmptyState = memo(function EmptyState({
  title,
  description,
  actionLabel,
  onPressAction,
  icon,
}: EmptyStateProps) {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View style={s.wrap}>
      {icon && <View style={s.iconArea}>{icon}</View>}
      <Text style={[s.title, { color: c.text.primary }]}>{title}</Text>
      {description ? (
        <Text style={[s.desc, { color: c.text.secondary }]}>{description}</Text>
      ) : null}
      {actionLabel && onPressAction ? (
        <View style={s.actionArea}>
          <Button
            title={actionLabel}
            variant="outline"
            onPress={onPressAction}
            size="md"
          />
        </View>
      ) : null}
    </View>
  );
});

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconArea: {
    marginBottom: 16,
    opacity: 0.8,
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
    textAlign: "center",
    lineHeight: 22,
  },
  actionArea: {
    marginTop: 24,
  },
});
