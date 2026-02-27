import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export const DoneOrderCard = ({ order, onDetail }: any) => {
  const { colors: c } = useAppTheme();

  const {
    orderId,
    settlementStatus,
    startAddr,
    startPlace, // 사용하지 않지만 로직 유지를 위해 구조 분해 할당은 남겨둠
    endAddr,
    endPlace, // 사용하지 않지만 로직 유지를 위해 구조 분해 할당은 남겨둠
    distance,
    reqTonnage,
    reqCarType,
    cargoContent,
    basePrice,
    laborFee,
    packagingPrice,
    payMethod,
  } = order;

  // 정산 상태 확인
  const isSettled = settlementStatus === "COMPLETED";

  // 총 금액 계산 (모든 비용 합산)
  const totalPrice = (basePrice || 0) + (laborFee || 0) + (packagingPrice || 0);

  // 주소 요약: "서울특별시 강남구" -> "서울 강남구" (디자인 통일)
  const getShortAddr = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return `${parts[0].replace("특별시", "").replace("광역시", "").replace("특별자치도", "")} ${parts[1] || ""}`;
  };

  return (
    <Pressable
      style={[
        s.container,
        { borderColor: c.border.default, backgroundColor: c.bg.surface },
      ]}
      onPress={() => onDetail(Number(orderId))}
    >
      {/* 상단 영역 */}
      <View style={s.topRow}>
        <View style={s.badgeRow}>
          <Badge
            label={isSettled ? "정산 완료" : "정산 대기"}
            tone={isSettled ? "success" : "warning"}
          />
        </View>
        <View style={s.detailLink}>
          <Text style={[s.detailText, { color: c.text.secondary }]}>
            #{orderId}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={c.text.secondary} />
        </View>
      </View>

      {/* 중단 영역 (운송 경로) - 패밀리룩 적용 및 상세주소 제거 */}
      <View style={s.routeRow}>
        <View style={s.locGroup}>
          <Text style={[s.locLabel, { color: c.text.secondary }]}>상차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary }]}
            numberOfLines={1}
          >
            {getShortAddr(startAddr)}
          </Text>
        </View>

        <View style={s.arrowArea}>
          <View
            style={[
              s.distBadge,
              { backgroundColor: c.bg.canvas, borderColor: c.border.default },
            ]}
          >
            <Text style={[s.distText, { color: c.text.secondary }]}>
              {distance ? `${distance}km` : "-"}
            </Text>
          </View>
          <View style={[s.line, { backgroundColor: c.border.default }]}>
            <View style={[s.arrowHead, { borderColor: c.border.default }]} />
          </View>
        </View>

        <View style={[s.locGroup, { alignItems: "flex-end" }]}>
          <Text style={[s.locLabel, { color: c.text.secondary }]}>하차지</Text>
          <Text
            style={[s.locName, { color: c.text.primary, textAlign: "right" }]}
            numberOfLines={1}
          >
            {getShortAddr(endAddr)}
          </Text>
        </View>
      </View>

      {/* 하단 정보 (운송 완료 정보 및 금액) */}
      <View style={[s.bottomRow, { borderTopColor: c.bg.canvas }]}>
        <View style={s.infoColumn}>
          <Text style={[s.loadDateText, { color: c.text.primary }]}>
            운송 완료
          </Text>
        </View>
        <View style={s.priceColumn}>
          <Text
            style={[
              s.priceText,
              { color: isSettled ? c.status.success : c.text.primary },
            ]}
          >
            {totalPrice.toLocaleString()}원
          </Text>
          <Badge
            label={payMethod}
            tone={payMethod?.includes("선착불") ? "payPrepaid" : "payDeferred"}
            style={{ marginTop: 6, alignSelf: "flex-end" }}
          />
        </View>
      </View>
    </Pressable>
  );
};

const s = StyleSheet.create({
  container: {
    padding: 16, // 20 -> 16으로 줄여 컴팩트하게
    borderRadius: 20, // 24 -> 20 살짝 둥글게 통일
    borderWidth: 1,
    marginBottom: 12, // 간격 살짝 줄임
    elevation: 3, // 그림자 다이어트
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  receiptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  receiptText: { fontSize: 11, fontWeight: "600" },
  detailLink: { flexDirection: "row", alignItems: "center" },
  detailText: { fontSize: 13, marginRight: 2 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center", // flex-start -> center 정렬
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locGroup: { flex: 1.5, justifyContent: "center" },
  locLabel: { fontSize: 12, fontWeight: "800", marginBottom: 4 }, // 라벨 스타일 굵게 통일
  locName: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 }, // 폰트 확대 (19->20)
  arrowArea: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  distBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  distText: { fontSize: 11, fontWeight: "800" },
  line: {
    width: "100%",
    height: 1,
    position: "relative",
  },
  arrowHead: {
    position: "absolute",
    right: 0,
    top: -3,
    width: 7,
    height: 7,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    transform: [{ rotate: "45deg" }],
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 14,
    borderTopWidth: 1,
  },
  infoColumn: { flex: 1.5, justifyContent: "flex-end" },
  loadDateText: { fontSize: 15, fontWeight: "800", marginBottom: 4 }, // 14 -> 15 폰트 확대
  priceColumn: { flex: 1.2, alignItems: "flex-end" },
  priceText: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 }, // 22 -> 24 폰트 확대 (제일 중요!)
});
