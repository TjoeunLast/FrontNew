import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// 분리한 Model 훅 및 공통 UI 임포트
import { useOrderDetail } from "../model/useOrderDetail";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { ReceiptModal } from "@/features/driver/driving/ui/ReceiptModal"; // 🚩 인수증 모달 추가

const { width } = Dimensions.get("window");

export default function OrderDetailScreen() {
  const { colors: c } = useAppTheme();

  // Model 훅 사용 (로직 분리) - modalOpen, setModalOpen 포함
  const {
    order,
    loading,
    totalPrice,
    formatAddress,
    actions,
    buttonConfig,
    modalOpen,
    setModalOpen,
  } = useOrderDetail();

  // 1. 상태별 한글 명칭 매핑 (카드 리스트와 4단계 로직 통일)
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "배차 확정";
      case "LOADING":
        return "상차 중";
      case "IN_TRANSIT":
        return "운송 중";
      case "UNLOADING":
        return "하차 중";
      case "COMPLETED":
        return "운송 완료";
      default:
        return status;
    }
  };

  // 데이터 로딩 중이거나 데이터가 없는 경우 방어 코드 (타입 오류 방지를 위해 flatten 사용)
  if (!order || !buttonConfig) {
    return (
      <View
        style={StyleSheet.flatten([
          s.container,
          s.center,
          { backgroundColor: c.bg.canvas },
        ])}
      >
        <ActivityIndicator size="large" color={c.brand.primary} />
      </View>
    );
  }

  return (
    <View
      style={StyleSheet.flatten([
        s.container,
        { backgroundColor: c.bg.canvas },
      ])}
    >
      {/* --- 헤더 --- */}
      <View style={s.header}>
        <Pressable onPress={actions.goBack} style={s.headerBtn} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color={c.text.secondary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: c.text.primary }]}>
          오더 #{order.orderId}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* --- 1. 메인 정보 카드 --- */}
        <View style={s.card}>
          <View style={s.cardTop}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Badge
                label={order.instant ? "바로배차" : "직접배차"}
                tone={order.instant ? "urgent" : "direct"}
              />
              <Badge label={getStatusLabel(order.status)} tone="info" />
            </View>
            <Text style={s.dateText}>{order.createdAt?.substring(0, 10)}</Text>
          </View>

          <View style={s.routeBigRow}>
            <View style={s.addrBox}>
              <Text style={s.addrBig}>
                {formatAddress.big(order.startAddr)}
              </Text>
              <Text style={s.addrSmall}>
                {formatAddress.small(order.startAddr)}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#CBD5E1" />
            <View style={[s.addrBox, { alignItems: "flex-end" }]}>
              <Text style={s.addrBig}>{formatAddress.big(order.endAddr)}</Text>
              <Text style={s.addrSmall}>
                {formatAddress.small(order.endAddr)}
              </Text>
            </View>
          </View>

          <View style={s.infoBar}>
            <View style={s.infoItem}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={16}
                color="#64748B"
              />
              <Text style={s.infoText}>{order.distance}km</Text>
            </View>
            <View style={s.divider} />
            <View style={s.infoItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color="#64748B"
              />
              <Text style={s.infoText}>
                예상 {Math.floor(order.duration / 60)}시간 {order.duration % 60}
                분
              </Text>
            </View>
          </View>

          <View style={s.priceRow}>
            <Text style={s.priceLabel}>운송료</Text>
            <View style={s.priceRight}>
              <Text
                style={[
                  s.priceValue,
                  { color: order.instant ? "#EF4444" : c.brand.primary },
                ]}
              >
                {totalPrice.toLocaleString()}원
              </Text>
              <Badge
                label={order.payMethod}
                tone={
                  order.payMethod.includes("선착불")
                    ? "payPrepaid"
                    : "payDeferred"
                }
                style={{ marginLeft: 6 }}
              />
            </View>
          </View>
        </View>

        {/* --- 2. 운행 경로 타임라인 --- */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>운행 경로</Text>
          <View style={s.timelineContainer}>
            <View style={s.timelineLine} />
            <View style={s.timelineItem}>
              <View style={[s.timelineDot, { backgroundColor: "#1E293B" }]}>
                <Text style={s.dotText}>출</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={s.timeLabel}>{order.startSchedule} 상차</Text>
                <Text style={s.placeTitle}>{order.startAddr}</Text>
                <Text style={s.placeDetail}>{order.startPlace}</Text>
              </View>
            </View>
            <View style={[s.timelineItem, { marginTop: 20 }]}>
              <View style={[s.timelineDot, { backgroundColor: "#4F46E5" }]}>
                <Text style={s.dotText}>도</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={[s.timeLabel, { color: "#4F46E5" }]}>
                  하차 예정
                </Text>
                <Text style={s.placeTitle}>{order.endAddr}</Text>
                <Text style={s.placeDetail}>{order.endPlace}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- 3. 화물 정보 --- */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>화물 정보</Text>
          <View style={s.gridContainer}>
            <GridItem
              label="차종/톤수"
              value={`${order.reqTonnage} ${order.reqCarType}`}
            />
            <GridItem label="운송방식" value={order.driveMode || "독차"} />
            <GridItem label="화물종류" value={order.cargoContent || "파렛트"} />
            <GridItem
              label="중량"
              value={order.loadWeight ? `${order.loadWeight}톤` : "미지정"}
            />
          </View>
        </View>

        {/* --- 4. 화주 정보 --- */}
        <View
          style={StyleSheet.flatten([
            s.sectionCard,
            { backgroundColor: c.bg.surface },
          ])}
        >
          <Text style={s.sectionTitle}>화주 정보</Text>
          <View
            style={StyleSheet.flatten([
              s.managerBox,
              { backgroundColor: c.bg.canvas, borderColor: c.border.default },
            ])}
          >
            <View style={s.managerRow}>
              <Ionicons
                name="business-outline"
                size={18}
                color={c.text.secondary}
              />
              <Text style={s.managerLabel}>업체명</Text>
              <Text style={s.managerValue}>
                {order.user?.nickname || "개인화주"}
              </Text>
            </View>
            <View style={[s.managerRow, { marginTop: 12 }]}>
              <Ionicons
                name="person-circle-outline"
                size={18}
                color={c.text.secondary}
              />
              <Text style={s.managerLabel}>연락처</Text>
              <Text style={s.managerValue}>
                {["ACCEPTED", "LOADING", "IN_TRANSIT", "UNLOADING"].includes(
                  order.status,
                )
                  ? order.user?.phone
                  : "배차 후 공개"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- 5. 하단 액션 버튼 바 --- */}
      <View
        style={StyleSheet.flatten([
          s.bottomBar,
          { borderTopColor: c.border.default },
        ])}
      >
        <View style={s.iconBtnGroup}>
          <Pressable
            style={s.circleBtn}
            onPress={() => Alert.alert("알림", "채팅 준비 중")}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color="#333"
            />
          </Pressable>
          <Pressable
            style={s.circleBtn}
            onPress={() =>
              order.user?.phone
                ? actions.callPhone(order.user.phone)
                : Alert.alert("알림", "배차 후 통화 가능")
            }
          >
            <Ionicons name="call-outline" size={24} color="#333" />
          </Pressable>
        </View>

        <Pressable
          onPress={loading ? undefined : buttonConfig.onPress}
          style={({ pressed }) => [
            s.mainActionBtn,
            {
              backgroundColor: buttonConfig.color,
              opacity: pressed || loading ? 0.7 : 1,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name={buttonConfig.icon as any}
                size={22}
                color="#FFF"
              />
              <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800" }}>
                {buttonConfig.text}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* 🚩 6. 하차 완료 시 사진 인증 모달 추가 */}
      <ReceiptModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </View>
  );
}

const GridItem = ({ label, value }: { label: string; value: string }) => (
  <View style={s.gridItem}>
    <Text style={s.gridLabel}>{label}</Text>
    <Text style={s.gridValue}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateText: { fontSize: 12, color: "#94A3B8" },
  routeBigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  addrBox: { flex: 1 },
  addrBig: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  addrSmall: { fontSize: 14, color: "#64748B" },
  infoBar: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 16,
  },
  infoText: { fontSize: 13, color: "#475569", fontWeight: "600" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  priceLabel: { fontSize: 14, color: "#64748B" },
  priceRight: { flexDirection: "row", alignItems: "center" },
  priceValue: { fontSize: 22, fontWeight: "900" },
  timelineContainer: { position: "relative" },
  timelineLine: {
    position: "absolute",
    left: 14,
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: "#E2E8F0",
  },
  timelineItem: { flexDirection: "row", gap: 16 },
  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  dotText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  timelineContent: { flex: 1 },
  timeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6366F1",
    marginBottom: 4,
  },
  placeTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  placeDetail: { fontSize: 13, color: "#64748B", marginBottom: 8 },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: {
    width: (width - 82) / 2,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
  },
  gridLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
    fontWeight: "600",
  },
  gridValue: { fontSize: 15, fontWeight: "700", color: "#334155" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
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
  },
  mainActionBtn: { flex: 1, height: 54, borderRadius: 16 },
  managerBox: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  managerRow: { flexDirection: "row", alignItems: "center" },
  managerLabel: {
    fontSize: 14,
    width: 60,
    marginLeft: 8,
    color: "#64748B",
    fontWeight: "700",
  },
  managerValue: { fontSize: 15, fontWeight: "800", flex: 1 },
});
