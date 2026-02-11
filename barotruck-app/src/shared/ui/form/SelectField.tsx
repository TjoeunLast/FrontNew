import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/utils/color";

export type SelectOption<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  label?: string;
  placeholder?: string;
  value?: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  disabled?: boolean;

  // 스타일 커스텀(필요하면)
  containerStyle?: ViewStyle;
  inputWrapStyle?: ViewStyle;
};

export function SelectField<T extends string>({
  label,
  placeholder = "선택",
  value,
  options,
  onChange,
  disabled,
  containerStyle,
  inputWrapStyle,
}: Props<T>) {
  const t = useAppTheme();
  const c = t.colors;

  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found?.label;
  }, [options, value]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { width: "100%" } as ViewStyle,
        label: {
          fontSize: 13,
          fontWeight: "900",
          color: c.text.secondary,
          marginBottom: 8,
        } as TextStyle,

        inputWrap: {
          minHeight: 56,
          borderRadius: 18,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        } as ViewStyle,

        valueText: {
          fontSize: 16,
          fontWeight: "800",
          color: c.text.primary,
        } as TextStyle,
        placeholderText: {
          fontSize: 16,
          fontWeight: "800",
          color: withAlpha(c.text.secondary, 0.85),
        } as TextStyle,

        // modal
        dim: {
          flex: 1,
          backgroundColor: withAlpha("#000000", 0.35),
          justifyContent: "flex-end",
        } as ViewStyle,
        sheet: {
          backgroundColor: c.bg.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingTop: 10,
          paddingBottom: 16,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: c.border.default,
        } as ViewStyle,
        grabber: {
          width: 44,
          height: 5,
          borderRadius: 999,
          backgroundColor: c.border.default,
          alignSelf: "center",
          marginBottom: 10,
        } as ViewStyle,
        sheetTitle: {
          fontSize: 16,
          fontWeight: "900",
          color: c.text.primary,
          marginBottom: 10,
        } as TextStyle,

        option: {
          height: 54,
          borderRadius: 16,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: c.border.default,
          backgroundColor: c.bg.surface,
          marginBottom: 10,
        } as ViewStyle,
        optionText: { fontSize: 16, fontWeight: "800", color: c.text.primary } as TextStyle,
      }),
    [c]
  );

  return (
    <View style={[s.container, containerStyle]}>
      {!!label && <Text style={s.label}>{label}</Text>}

      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          s.inputWrap,
          inputWrapStyle,
          disabled && { opacity: 0.55 },
          pressed && !disabled && { backgroundColor: withAlpha(c.bg.muted, 0.35) },
        ]}
      >
        <Text style={value ? s.valueText : s.placeholderText}>
          {value ? selectedLabel : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.text.secondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.dim} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.grabber} />
            <Text style={s.sheetTitle}>{label ?? "선택"}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((o) => {
                const selected = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={[
                      s.option,
                      selected && { backgroundColor: withAlpha(c.brand.primarySoft, 0.9) },
                    ]}
                  >
                    <Text style={s.optionText}>{o.label}</Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={c.brand.primary} />
                    ) : (
                      <View />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
