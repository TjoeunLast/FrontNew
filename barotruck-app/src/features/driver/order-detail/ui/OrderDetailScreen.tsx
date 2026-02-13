import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// 분리한 Model 훅 및 공통 UI 임포트
import { useOrderDetail } from "../model/useOrderDetail";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

const { width } = Dimensions.get("window");

export default function OrderDetailScreen() {
  const { colors: c } = useAppTheme();
  const t = useAppTheme();

  // Model 훅 사용 (로직 분리)
  const { order, loading, totalPrice, formatAddress, actions, buttonConfig } =
    useOrderDetail();

  // 데이터 로딩 전이거나 에러 시 아무것도 보여주지 않음 (혹은 로딩 스피너)
  if (!order || !buttonConfig) return null;

  return (
    <View style={[s.container, { backgroundColor: c.bg.canvas }]}>
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable onPress={actions.goBack} style={s.headerBtn}>
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
        {/* --- 1. 메인 정보 카드 (경로/금액) --- */}
        <View style={s.card}>
          <View style={s.cardTop}>
            <Badge
              label={order.instant ? "바로배차" : "직접배차"}
              tone={order.instant ? "urgent" : "direct"}
            />
            <Text style={s.dateText}>{order.createdAt?.substring(0, 10)}</Text>
          </View>

          {/* 경로 시각화 (화살표) */}
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

          {/* 거리/시간 정보 바 */}
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
              <Text style={s.infoText}>예상 4시간 30분</Text>
            </View>
          </View>

          {/* 금액 정보 */}
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>운송료</Text>
            <View style={s.priceRight}>
              <Text
                style={[
                  s.priceValue,
                  { color: order.instant ? "#EF4444" : c.brand.primary },
                ]}
              >
                {totalPrice.toLocaleString()}
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

            {/* 상차지 */}
            <View style={s.timelineItem}>
              <View style={[s.timelineDot, { backgroundColor: "#1E293B" }]}>
                <Text style={s.dotText}>출</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={s.timeLabel}>{order.startSchedule} 상차</Text>
                <Text style={s.placeTitle}>{order.startAddr}</Text>
                <Text style={s.placeDetail}>{order.startPlace}</Text>
                <Pressable
                  style={s.copyBtn}
                  onPress={() => actions.copyAddress(order.startAddr)}
                >
                  <Ionicons name="copy-outline" size={12} color="#475569" />
                  <Text style={s.copyText}>주소복사</Text>
                </Pressable>
              </View>
            </View>

            {/* 하차지 */}
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
                <Pressable
                  style={s.copyBtn}
                  onPress={() => actions.copyAddress(order.endAddr)}
                >
                  <Ionicons name="copy-outline" size={12} color="#475569" />
                  <Text style={s.copyText}>주소복사</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* --- 3. 화물 정보 그리드 --- */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>화물 정보</Text>
          <View style={s.gridContainer}>
            <GridItem
              label="차종/톤수"
              value={`${order.reqTonnage} ${order.reqCarType}`}
            />
            <GridItem label="운행구분" value={order.driveMode || "독차"} />
            <GridItem label="화물종류" value={order.cargoContent || "파렛트"} />
            <GridItem
              label="중량"
              value={order.loadWeight ? `${order.loadWeight}kg` : "정보 없음"}
            />
          </View>
        </View>

        {/* ******* 데이터 맞춰서 수정해야 됨 ******* */}
        {/* --- 화주 정보 --- */}
        <View style={[s.sectionCard, { backgroundColor: c.bg.surface }]}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={[
                s.sectionTitle,
                { color: c.text.primary, marginBottom: 0 },
              ]}
            >
              화주 정보
            </Text>
          </View>

          <View
            style={[
              s.managerBox,
              { backgroundColor: c.bg.canvas, borderColor: c.border.default },
            ]}
          >
            {/* 업체명 (목업의 customerName 또는 상호명) */}
            <View style={s.managerRow}>
              <Ionicons
                name="business-outline"
                size={18}
                color={c.text.secondary}
              />
              <Text style={[s.managerLabel, { color: c.text.secondary }]}>
                업체명
              </Text>
              <Text style={[s.managerValue, { color: c.text.primary }]}>
                {order.customerName || "개인화주"}
              </Text>
            </View>

            {/* 화주 닉네임 (목업의 nickName) */}
            <View style={[s.managerRow, { marginTop: 12 }]}>
              <Ionicons
                name="person-circle-outline"
                size={18}
                color={c.text.secondary}
              />
              <Text style={[s.managerLabel, { color: c.text.secondary }]}>
                화주명
              </Text>
              <Text style={[s.managerValue, { color: c.text.primary }]}>
                {order.nickName || "닉네임 없음"}
              </Text>
            </View>
          </View>
        </View>

        {/* --- 4. 요청사항 --- */}
        {order.remark && (
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>요청사항</Text>
            <View style={s.remarkBox}>
              <Text style={s.remarkText}>{order.remark}</Text>
            </View>
          </View>
        )}

        {/* 하단 여백 */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- 5. 하단 고정 버튼 바 --- */}
      <View style={s.bottomBar}>
        <View style={s.iconBtnGroup}>
          <Pressable style={s.circleBtn}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color="#333"
            />
          </Pressable>
          <Pressable
            style={s.circleBtn}
            onPress={() => actions.callPhone("01000000000")}
          >
            <Ionicons name="call-outline" size={24} color="#333" />
          </Pressable>
        </View>

        {/* 메인 액션 버튼 */}
        <Pressable
          onPress={loading ? undefined : buttonConfig.onPress}
          style={({ pressed }) => [
            s.mainActionBtn,
            {
              backgroundColor: buttonConfig.isInstantStyle
                ? "#EF4444"
                : buttonConfig.color,
              opacity: pressed || loading ? 0.7 : 1,
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "row",
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
              <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "700" }}>
                {buttonConfig.text}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// 그리드 아이템 (하위 컴포넌트)
const GridItem = ({ label, value }: { label: string; value: string }) => (
  <View style={s.gridItem}>
    <Text style={s.gridLabel}>{label}</Text>
    <Text style={s.gridValue}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1 },
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

  // 공통 카드 스타일
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
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

  // 1. 메인 카드
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateText: { fontSize: 12, color: "#94A3B8", marginTop: 6 },

  routeBigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  addrBox: { flex: 1 },
  addrBig: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
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
  priceValue: { fontSize: 22, fontWeight: "900", color: "#1E293B" },

  // 2. 타임라인
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
  placeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  placeDetail: { fontSize: 13, color: "#64748B", marginBottom: 8 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  copyText: { fontSize: 11, color: "#475569" },

  // 3. 그리드
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: {
    width: (width - 82) / 2,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
  },
  gridLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 4 },
  gridValue: { fontSize: 15, fontWeight: "700", color: "#334155" },

  // 4. 요청사항
  remarkBox: {
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  remarkText: { fontSize: 14, color: "#92400E", lineHeight: 20 },

  // 5. 하단 바
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
    height: 54, // 높이 고정
    borderRadius: 16,
  },
  managerBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  managerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  managerLabel: {
    fontSize: 14,
    width: 60,
    marginLeft: 8,
  },
  managerValue: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
});
