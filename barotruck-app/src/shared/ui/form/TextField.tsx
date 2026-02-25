import React, { forwardRef, memo, useCallback, useMemo, useState } from "react";
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

// forwardRef와 memo를 결합한 형태입니다.
export const TextField = memo(
  forwardRef<TextInput, Props>(function TextField(
    {
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
    },
    ref // 1. 두 번째 인자로 ref를 받습니다.
  ) {
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
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: any) => {
        setFocused(false);
        onBlur?.(e);
      },
      [onBlur]
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
            ref={ref} // 2. 외부에서 받은 ref를 실제 TextInput에 연결합니다.
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
  })
);

// 스타일 정의는 동일하므로 생략합니다.

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
