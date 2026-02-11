import { useAppTheme } from "@/shared/hooks/useAppTheme";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

type ToastTone = "neutral" | "success" | "warning" | "danger" | "info";

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastApi = {
  show: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const v = useContext(ToastContext);
  if (!v) throw new Error("useToast must be used within ToastProvider");
  return v;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const t = useAppTheme();
  const c = t.colors;
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  }, [opacity]);

  const show = useCallback(
    (message: string, tone: ToastTone = "neutral") => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const id = String(Date.now());
      setToast({ id, message, tone });

      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        hide();
        timerRef.current = null;
      }, 2500);
    },
    [hide, opacity],
  );

  const api = useMemo(() => ({ show }), [show]);

  const toneStyle = useMemo(() => {
    if (!toast) return { bg: "#333333", fg: "#FFFFFF" };
    switch (toast.tone) {
      case "success":
        return { bg: c.status.success, fg: c.text.inverse };
      case "warning":
        return { bg: c.status.warning, fg: c.text.primary };
      case "danger":
        return { bg: c.status.danger, fg: c.text.inverse };
      case "info":
        return { bg: c.status.info, fg: c.text.inverse };
      default:
        return { bg: "rgba(30, 30, 30, 0.95)", fg: "#FFFFFF" };
    }
  }, [toast, c]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={s.portal}>
          <Animated.View
            style={[s.toast, { backgroundColor: toneStyle.bg, opacity }]}
          >
            <Text style={[s.text, { color: toneStyle.fg }]}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  portal: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 46,
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  toast: {
    maxWidth: 400,
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
});