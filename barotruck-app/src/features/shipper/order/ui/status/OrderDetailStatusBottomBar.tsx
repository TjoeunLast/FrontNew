import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { ActionButtonConfig, OrderDetailStatusGroup } from "./orderDetailStatus";

type Props = {
  statusGroup: OrderDetailStatusGroup;
  status?: string;
  insetsBottom: number;
  actionLoading: boolean;
  buttonConfig: ActionButtonConfig | null;
  onMainAction: () => void;
  onStartChat: () => void;
  onCall: () => void;
  onReport: () => void;
};

function CancelledBottomBar({ insetsBottom }: { insetsBottom: number }) {
  return (
    <View style={[s.bottomBar, { height: 84 + insetsBottom, paddingBottom: insetsBottom || 10 }]}>
      <View style={s.cancelNoticeWrap}>
        <Text style={s.cancelNoticeText}>취소된 오더입니다</Text>
      </View>
    </View>
  );
}

function IconButtonGroup({
  status,
  onStartChat,
  onCall,
  onReport,
}: {
  status?: string;
  onStartChat: () => void;
  onCall: () => void;
  onReport: () => void;
}) {
  return (
    <View style={s.iconBtnGroup}>
      {status === "COMPLETED" ? (
        <Pressable style={s.circleBtn} onPress={onReport}>
          <MaterialCommunityIcons name="alarm-light-outline" size={24} color="#DC2626" />
        </Pressable>
      ) : (
        <>
          <Pressable style={s.circleBtn} onPress={onStartChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#333" />
          </Pressable>
          <Pressable style={s.circleBtn} onPress={onCall}>
            <Ionicons name="call-outline" size={24} color="#333" />
          </Pressable>
        </>
      )}
    </View>
  );
}

export function OrderDetailStatusBottomBar({
  statusGroup,
  status,
  insetsBottom,
  actionLoading,
  buttonConfig,
  onMainAction,
  onStartChat,
  onCall,
  onReport,
}: Props) {
  if (statusGroup === "CANCELLED") {
    return <CancelledBottomBar insetsBottom={insetsBottom} />;
  }

  return (
    <View style={[s.bottomBar, { height: 84 + insetsBottom, paddingBottom: insetsBottom || 10 }]}>
      {statusGroup !== "WAITING" ? (
        <IconButtonGroup status={status} onStartChat={onStartChat} onCall={onCall} onReport={onReport} />
      ) : null}

      <Pressable
        onPress={actionLoading ? undefined : onMainAction}
        disabled={buttonConfig?.disabled}
        style={({ pressed }) => [
          s.mainActionBtn,
          {
            backgroundColor: buttonConfig?.color ?? "#2563EB",
            opacity: pressed || actionLoading || buttonConfig?.disabled ? 0.7 : 1,
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
          },
        ]}
      >
        {actionLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <View style={s.mainActionInner}>
            <Ionicons
              name={buttonConfig?.icon ?? "checkmark-circle-outline"}
              size={22}
              color="#FFF"
            />
            <Text style={s.mainActionText}>{buttonConfig?.text ?? "상세 보기"}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    gap: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  iconBtnGroup: { flexDirection: "row", gap: 10 },
  circleBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  mainActionBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
  },
  mainActionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mainActionText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  cancelNoticeWrap: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelNoticeText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#475569",
  },
});
