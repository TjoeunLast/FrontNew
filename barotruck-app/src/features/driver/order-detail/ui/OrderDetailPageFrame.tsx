import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type OrderDetailPageFrameProps = {
  title: string;
  onPressBack: () => void;
  isCompleted?: boolean;
  isSettled?: boolean;
  surfaceColor: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  successSoft: string;
  warningSoft: string;
  success: string;
  warning: string;
  children: React.ReactNode;
};

export default function OrderDetailPageFrame({
  title,
  onPressBack,
  isCompleted = false,
  isSettled = false,
  surfaceColor,
  borderColor,
  textPrimary,
  textSecondary,
  successSoft,
  warningSoft,
  success,
  warning,
  children,
}: OrderDetailPageFrameProps) {
  return (
    <>
      <View
        style={[
          s.header,
          {
            backgroundColor: surfaceColor,
            borderBottomWidth: isCompleted ? 0 : 1,
            borderBottomColor: borderColor,
          },
        ]}
      >
        <Pressable onPress={onPressBack} style={s.headerBtn} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color={textSecondary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: textPrimary }]}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isCompleted && (
        <View
          style={[
            s.statusHeader,
            {
              backgroundColor: isSettled ? successSoft : warningSoft,
            },
          ]}
        >
          <View style={s.statusHeaderRow}>
            <Ionicons
              name={isSettled ? "cash-outline" : "time-outline"}
              size={18}
              color={isSettled ? success : warning}
            />
            <Text
              style={[
                s.statusHeaderText,
                { color: isSettled ? success : warning },
              ]}
            >
              {isSettled ? "운송료 정산이 완료되었습니다." : "운송은 완료되었고, 정산 대기 중입니다."}
            </Text>
          </View>
        </View>
      )}

      {children}
    </>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  statusHeader: { margin: 16, marginBottom: 0, padding: 14, borderRadius: 16 },
  statusHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusHeaderText: { fontSize: 14, fontWeight: "700", flex: 1 },
});
