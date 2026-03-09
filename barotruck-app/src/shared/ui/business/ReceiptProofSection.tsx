import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProofResponse } from "@/shared/models/proof";

type ReceiptProofSectionProps = {
  proof: ProofResponse | null;
  loading: boolean;
  colors: {
    bgSurface: string;
    bgCanvas: string;
    borderDefault: string;
    textPrimary: string;
    textSecondary: string;
  };
};

export function ReceiptProofSection({
  proof,
  loading,
  colors,
}: ReceiptProofSectionProps) {
  const hasReceiptImage = Boolean(proof?.receiptImageUrl);

  return (
    <View
      style={[
        sectionStyles.card,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      <View style={sectionStyles.header}>
        <View>
          <Text style={[sectionStyles.title, { color: colors.textPrimary }]}>
            인수증
          </Text>
          <Text style={[sectionStyles.subtitle, { color: colors.textSecondary }]}>
            운송 완료 후 등록된 인수증 사진입니다.
          </Text>
        </View>
        <View
          style={[
            sectionStyles.badge,
            { backgroundColor: hasReceiptImage ? "#DCFCE7" : "#E2E8F0" },
          ]}
        >
          <Text
            style={[
              sectionStyles.badgeText,
              { color: hasReceiptImage ? "#166534" : "#475569" },
            ]}
          >
            {hasReceiptImage ? "등록됨" : "미등록"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View
          style={[
            sectionStyles.emptyBox,
            {
              backgroundColor: colors.bgCanvas,
              borderColor: colors.borderDefault,
            },
          ]}
        >
          <ActivityIndicator color="#64748B" />
          <Text style={[sectionStyles.emptyText, { color: colors.textSecondary }]}>
            인수증을 불러오는 중입니다.
          </Text>
        </View>
      ) : hasReceiptImage ? (
        <>
          <Image
            source={{ uri: proof?.receiptImageUrl }}
            style={sectionStyles.image}
            resizeMode="cover"
          />
          <View
            style={[
              sectionStyles.metaBox,
              {
                backgroundColor: colors.bgCanvas,
                borderColor: colors.borderDefault,
              },
            ]}
          >
            <View style={sectionStyles.metaRow}>
              <Ionicons name="person-outline" size={16} color="#64748B" />
              <Text
                style={[sectionStyles.metaLabel, { color: colors.textSecondary }]}
              >
                수령인
              </Text>
              <Text
                style={[sectionStyles.metaValue, { color: colors.textPrimary }]}
              >
                {proof?.recipientName?.trim() || "-"}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <Pressable
          style={[
            sectionStyles.emptyBox,
            {
              backgroundColor: colors.bgCanvas,
              borderColor: colors.borderDefault,
            },
          ]}
        >
          <Ionicons name="image-outline" size={24} color="#94A3B8" />
          <Text style={[sectionStyles.emptyText, { color: colors.textSecondary }]}>
            등록된 인수증 사진이 없습니다.
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  metaBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaLabel: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  metaValue: {
    marginLeft: "auto",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyBox: {
    minHeight: 140,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
