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

// [컴포넌트 & 훅 임포트]
import { useOrderDetail } from "../model/useOrderDetail";
import { Badge } from "@/shared/ui/feedback/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { ReceiptModal } from "@/features/driver/driving/ui/ReceiptModal";

const { width } = Dimensions.get("window");

export default function OrderDetailScreen() {
  const { colors: c } = useAppTheme();

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

  // [방어 코드: 데이터 로딩 중 처리]
  if (loading) {
    return (
      <View style={[s.container, s.center, { backgroundColor: c.bg.canvas }]}>
        <ActivityIndicator size="large" color={c.brand.primary} />
      </View>
    );
  }

  // [방어 코드: 상세 데이터를 찾지 못한 경우]
  if (!order || !buttonConfig) {
    return (
      <View style={[s.container, s.center, { backgroundColor: c.bg.canvas, paddingHorizontal: 24 }]}>
        <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
          오더 상세 정보를 불러오지 못했습니다.
        </Text>
        <Pressable
          onPress={actions.goBack}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: c.brand.primary,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>목록으로</Text>
        </Pressable>
      </View>
    );
  }

  // [비즈니스 로직: 상태 및 정산 정보]
  const isCompleted = order.status === "COMPLETED";
  const isSettled = order.settlementStatus === "COMPLETED";

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "APPLIED":
        return { label: "승인 대기", tone: "warning" as const };
      case "ACCEPTED":
        return { label: "배차 확정", tone: "info" as const };
      case "LOADING":
        return { label: "상차 작업 중", tone: "neutral" as const };
      case "IN_TRANSIT":
        return { label: "운송 이동 중", tone: "neutral" as const };
      case "UNLOADING":
        return { label: "하차 작업 중", tone: "neutral" as const };
      case "COMPLETED":
        return { label: "운송 완료", tone: "neutral" as const };
      default:
        return { label: status, tone: "neutral" as const };
    }
  };

  const statusInfo = getStatusInfo(order.status);

  return (
    <View style={[s.container, { backgroundColor: c.bg.canvas }]}>
      {/* SECTION 1: 헤더 영역 */}
      <View
        style={[
          s.header,
          {
            backgroundColor: c.bg.surface,
            borderBottomWidth: isCompleted ? 0 : 1,
            borderBottomColor: c.border.default,
          },
        ]}
      >
        <Pressable onPress={actions.goBack} style={s.headerBtn} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color={c.text.secondary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: c.text.primary }]}>
          오더 #{order.orderId}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* SECTION 2: 정산 상태 알림바 (운송 완료 시 노출) */}
      {isCompleted && (
        <View
          style={[
            s.statusHeader,
            {
              backgroundColor: isSettled
                ? c.status.successSoft
                : c.status.warningSoft,
            },
          ]}
        >
          <View style={s.statusHeaderRow}>
            <Ionicons
              name={isSettled ? "cash-outline" : "time-outline"}
              size={18}
              color={isSettled ? c.status.success : c.status.warning}
            />
            <Text
              style={[
                s.statusHeaderText,
                { color: isSettled ? c.status.success : c.status.warning },
              ]}
            >
              {isSettled
                ? "운송료 정산이 완료되었습니다"
                : "운송은 종료되었으며, 정산 대기 중입니다"}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          isCompleted && { paddingTop: 10 },
        ]}
      >
        {/* SECTION 3: 메인 정보 카드 */}
        <View
          style={[
            s.card,
            {
              backgroundColor: c.bg.surface,
              borderColor: c.border.default,
              borderWidth: 1,
            },
          ]}
        >
          <View style={s.cardTop}>
            <View style={s.badgeGroup}>
              {isCompleted ? (
                <Badge
                  label={isSettled ? "정산완료" : "정산대기"}
                  tone={isSettled ? "success" : "warning"}
                  style={s.unifiedBadge}
                />
              ) : (
                <>
                  {order.status !== "REQUESTED" && (
                    <Badge
                      label={statusInfo.label}
                      tone={statusInfo.tone}
                      style={s.unifiedBadge}
                    />
                  )}
                  <Badge
                    label={order.instant ? "바로배차" : "직접배차"}
                    tone={order.instant ? "urgent" : "direct"}
                    style={s.unifiedBadge}
                  />
                </>
              )}
            </View>
            <Text style={[s.dateText, { color: c.text.secondary }]}>
              {order.createdAt?.substring(0, 10)}
            </Text>
          </View>

          {/* 주소 정보 */}
          <View style={s.routeBigRow}>
            <View style={s.addrBox}>
              <Text style={[s.addrBig, { color: c.text.primary }]}>
                {formatAddress.big(order.startAddr)}
              </Text>
              <Text style={[s.addrSmall, { color: c.text.secondary }]}>
                {formatAddress.small(order.startAddr)}
                {order.startPlace}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={c.border.default} />
            <View style={[s.addrBox, { alignItems: "flex-end" }]}>
              <Text
                style={[
                  s.addrBig,
                  { color: c.text.primary, textAlign: "right" },
                ]}
              >
                {formatAddress.big(order.endAddr)}
              </Text>
              <Text
                style={[
                  s.addrSmall,
                  { color: c.text.secondary, textAlign: "right" },
                ]}
              >
                {formatAddress.small(order.endAddr)}
                {order.endPlace}
              </Text>
            </View>
          </View>

          {/* 인포 바 (거리/시간) */}
          <View style={[s.infoBar, { backgroundColor: c.bg.canvas }]}>
            <View style={s.infoItem}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={16}
                color={c.text.secondary}
              />
              <Text style={[s.infoText, { color: c.text.primary }]}>
                {order.distance}km
              </Text>
            </View>
            <View style={[s.divider, { backgroundColor: c.border.default }]} />
            <View style={s.infoItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color={c.text.secondary}
              />
              <Text style={[s.infoText, { color: c.text.primary }]}>
                예상 {Math.floor(order.duration / 60)}시간 {order.duration % 60}
                분
              </Text>
            </View>
          </View>

          {/* 운송료 정보 */}
          <View style={[s.priceRow, { borderTopColor: c.bg.canvas }]}>
            <Text style={[s.priceLabel, { color: c.text.secondary }]}>
              최종 운송료
            </Text>
            <View style={s.priceRight}>
              <Text
                style={[
                  s.priceValue,
                  { color: isSettled ? c.status.success : c.text.primary },
                ]}
              >
                {totalPrice.toLocaleString()}원
              </Text>
            </View>
          </View>

          <View style={s.payMethodRow}>
            <Badge
              label={
                order.payMethod.includes("선착불") ? "현금/선불" : "인수증/후불"
              }
              tone={
                order.payMethod.includes("선착불")
                  ? "payPrepaid"
                  : "payDeferred"
              }
            />
            <Text style={[s.payMethodText, { color: c.text.secondary }]}>
              {isSettled
                ? "정산계좌로 입금이 완료되었습니다"
                : "화주 확인 후 정산 일정에 따라 입금됩니다"}
            </Text>
          </View>
        </View>

        {/* SECTION 4: 운행 경로 타임라인 */}
        <View style={[s.sectionCard, { backgroundColor: c.bg.surface }]}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            운행 경로
          </Text>
          <View style={s.timelineContainer}>
            <View
              style={[s.timelineLine, { backgroundColor: c.border.default }]}
            />
            <View style={s.timelineItem}>
              <View
                style={[s.timelineDot, { backgroundColor: c.brand.primary }]}
              >
                <Text style={s.dotText}>출</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={[s.timeLabel, { color: c.brand.primary }]}>
                  {order.startSchedule} 상차
                </Text>
                <Text style={[s.placeTitle, { color: c.text.primary }]}>
                  {order.startAddr}
                </Text>
                <Text style={[s.placeDetail, { color: c.text.secondary }]}>
                  {order.startPlace}
                </Text>
              </View>
            </View>
            <View style={[s.timelineItem, { marginTop: 24 }]}>
              <View
                style={[s.timelineDot, { backgroundColor: c.brand.primary }]}
              >
                <Text style={s.dotText}>도</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={[s.timeLabel, { color: c.brand.primary }]}>
                  하차
                </Text>
                <Text style={[s.placeTitle, { color: c.text.primary }]}>
                  {order.endAddr}
                </Text>
                <Text style={[s.placeDetail, { color: c.text.secondary }]}>
                  {order.endPlace}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 5: 화물 정보 */}
        <View style={[s.sectionCard, { backgroundColor: c.bg.surface }]}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            화물 정보
          </Text>
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

        {/* SECTION 6: 화주 정보 */}
        <View style={[s.sectionCard, { backgroundColor: c.bg.surface }]}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            화주 정보
          </Text>
          <View
            style={[
              s.managerBox,
              { backgroundColor: c.bg.canvas, borderColor: c.border.default },
            ]}
          >
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
                {order.user?.nickname || "개인화주"}
              </Text>
            </View>
            <View style={[s.managerRow, { marginTop: 12 }]}>
              <Ionicons
                name="person-circle-outline"
                size={18}
                color={c.text.secondary}
              />
              <Text style={[s.managerLabel, { color: c.text.secondary }]}>
                연락처
              </Text>
              <Text style={[s.managerValue, { color: c.text.primary }]}>
                {order.user?.phone || "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* SECTION 7: 하단 고정 액션바 */}
      <View
        style={[
          s.bottomBar,
          { backgroundColor: c.bg.surface, borderTopColor: c.border.default },
        ]}
      >
        {!isCompleted ? (
          <>
            <View style={s.iconBtnGroup}>
              <Pressable
                style={[s.circleBtn, { borderColor: c.border.default }]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={24}
                  color={c.text.primary}
                />
              </Pressable>
              <Pressable
                style={[s.circleBtn, { borderColor: c.border.default }]}
                onPress={() =>
                  order.user?.phone
                    ? actions.callPhone(order.user.phone)
                    : Alert.alert("알림", "통화 불가")
                }
              >
                <Ionicons
                  name="call-outline"
                  size={24}
                  color={c.text.primary}
                />
              </Pressable>
            </View>
            <Pressable
              onPress={loading ? undefined : buttonConfig.onPress}
              style={({ pressed }) => [
                s.mainActionBtn,
                {
                  backgroundColor: buttonConfig.color,
                  opacity: pressed || loading ? 0.7 : 1,
                },
              ]}
            >
              <View style={s.btnContent}>
                <Ionicons
                  name={buttonConfig.icon as any}
                  size={22}
                  color="#FFF"
                />
                <Text style={s.mainActionText}>{buttonConfig.text}</Text>
              </View>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[
              s.mainActionBtn,
              { backgroundColor: c.text.primary, flex: 1, height: 56 },
            ]}
            onPress={actions.goBack}
          >
            <Text style={s.mainActionText}>목록으로</Text>
          </Pressable>
        )}
      </View>

      <ReceiptModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </View>
  );
}

const GridItem = ({ label, value }: { label: string; value: string }) => {
  const { colors: c } = useAppTheme();
  return (
    <View style={[s.gridItem, { backgroundColor: c.bg.canvas }]}>
      <Text style={[s.gridLabel, { color: c.text.secondary }]}>{label}</Text>
      <Text style={[s.gridValue, { color: c.text.primary }]}>{value}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
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
  scrollContent: { padding: 16 },
  card: { borderRadius: 24, padding: 20, marginBottom: 16 },
  sectionCard: { borderRadius: 24, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 16 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  badgeGroup: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  unifiedBadge: { alignItems: "center" },
  dateText: { fontSize: 12 },
  routeBigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  addrBox: { flex: 1 },
  addrBig: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  addrSmall: { fontSize: 14, marginTop: 2 },
  infoBar: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  divider: { width: 1, height: 12, marginHorizontal: 16 },
  infoText: { fontSize: 13, fontWeight: "700" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 18,
    borderTopWidth: 1,
  },
  priceLabel: { fontSize: 14, fontWeight: "600" },
  priceRight: { flexDirection: "row", alignItems: "center" },
  priceValue: { fontSize: 24, fontWeight: "900" },
  payMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  payMethodText: { fontSize: 12, fontWeight: "500" },
  timelineContainer: { position: "relative" },
  timelineLine: {
    position: "absolute",
    left: 14,
    top: 24,
    bottom: 24,
    width: 2,
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
  dotText: { fontSize: 12, fontWeight: "900", color: "#FFF" },
  timelineContent: { flex: 1 },
  timeLabel: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  placeTitle: { fontSize: 16, fontWeight: "800" },
  placeDetail: { fontSize: 13, marginTop: 2 },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: (width - 82) / 2, padding: 16, borderRadius: 16 },
  gridLabel: { fontSize: 12, marginBottom: 4, fontWeight: "700" },
  gridValue: { fontSize: 15, fontWeight: "800" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
  },
  iconBtnGroup: { flexDirection: "row", gap: 10 },
  circleBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mainActionBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  mainActionText: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  managerBox: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  managerRow: { flexDirection: "row", alignItems: "center" },
  managerLabel: { fontSize: 14, width: 60, marginLeft: 8, fontWeight: "700" },
  managerValue: { fontSize: 15, fontWeight: "800", flex: 1 },
});
