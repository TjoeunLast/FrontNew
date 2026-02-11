import React, { memo, useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Props = Omit<TextInputProps, "style"> & {
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputWrapStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  successTest?: string;
};

export const TextField = memo(function TextField({
  label,
  helperText,
  errorText,
  required,
  left,
  right,
  editable = true,
  containerStyle,
  inputWrapStyle,
  inputStyle,
  successTest,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const t = useAppTheme();
  const c = t.colors;

  const [focused, setFocused] = useState(false);
  const hasError = !!errorText;
  const hasSuccess = !!successTest;

  const handleFocus = useCallback(
    (e: any) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: any) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  const borderColor = useMemo(() => {
    if (hasError) return c.status.danger;
    if (hasSuccess) return c.status.success;
    if (focused) return c.brand.primary;
    return c.border.default;
  }, [hasError, hasSuccess, focused, c]);

  const bgColor = useMemo(() => {
    if (!editable) return c.bg.muted;
    return c.bg.surface;
  }, [editable, c]);

  const metaText = errorText ?? helperText;
  const metaColor = hasError
    ? c.status.danger
    : hasSuccess
      ? c.status.success
      : c.text.secondary;

  return (
    <View style={containerStyle}>
      {label ? (
        <View style={s.labelRow}>
          <Text style={[s.label, { color: c.text.primary }]}>{label}</Text>
          {required ? (
            <Text style={[s.req, { color: c.status.danger }]}>*</Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          s.wrap,
          {
            backgroundColor: bgColor,
            borderColor,
          },
          focused && { borderWidth: 1.5 },
          inputWrapStyle,
        ]}
      >
        {left ? <View style={s.slot}>{left}</View> : null}

        <TextInput
          {...props}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={c.text.secondary}
          style={[
            s.input,
            { color: editable ? c.text.primary : c.text.secondary },
            inputStyle,
          ]}
        />

        {right ? <View style={s.slot}>{right}</View> : null}
      </View>

      {metaText ? (
        <Text style={[s.meta, { color: metaColor }]} numberOfLines={2}>
          {metaText}
        </Text>
      ) : null}
    </View>
  );
});

const s = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  label: { fontSize: 13, fontWeight: "600" },
  req: { fontSize: 13, fontWeight: "700" },
  wrap: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  slot: {
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    paddingVertical: 0,
    height: "100%",
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
});
