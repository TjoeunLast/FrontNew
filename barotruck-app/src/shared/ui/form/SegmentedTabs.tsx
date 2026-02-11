import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export type SegmentedItem<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (next: T) => void;
};

function SegmentedTabsInner<T extends string>({
  items,
  value,
  onChange,
}: Props<T>) {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <View style={[s.wrap, { backgroundColor: c.bg.muted }]}>
      {items.map((it) => {
        const selected = it.key === value;

        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={({ pressed }) => [
              s.item,
              selected && { backgroundColor: c.bg.surface, ...s.shadow },
              pressed && !selected && { backgroundColor: "rgba(0,0,0,0.05)" },
            ]}
          >
            <Text
              style={[
                s.label,
                {
                  color: selected ? c.text.primary : c.text.secondary,
                  fontWeight: selected ? "700" : "500",
                },
              ]}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const SegmentedTabs = memo(SegmentedTabsInner) as unknown as <
  T extends string,
>(
  props: Props<T>,
) => React.ReactElement;

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    height: 48,
  },
  item: {
    flex: 1,
    height: "100%",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  shadow: {
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  label: {
    fontSize: 14,
  },
});
