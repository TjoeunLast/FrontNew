import { OrderService } from "@/shared/api/orderService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/base/Button";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function OrderDetailScreen() {
  const router = useRouter();
  const { colors: c } = useAppTheme();

  // [수정] Expo Router의 useLocalSearchParams를 통해 전달된 데이터 수신
  const params = useLocalSearchParams();

  // [수정] params.orderData가 존재할 때만 파싱하도록 안전하게 처리
  const data = useMemo(() => {
    try {
      if (params.orderData) {
        return JSON.parse(params.orderData as string);
      }
      return null;
    } catch (e) {
      console.error("파싱 에러:", e);
      return null;
    }
  }, [params.orderData]);

  const [isDispatched, setIsDispatched] = useState(false);
  const [loading, setLoading] = useState(false);

  // 데이터가 없을 경우 예외 처리
  if (!data) {
    return (
      <View
        style={[
          s.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text>오더 정보를 불러올 수 없습니다.</Text>
        <Button
          title="뒤로가기"
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  // 배차 신청/확정 핸들러
  const handleDispatchAction = async () => {
    try {
      setLoading(true);
      await OrderService.acceptOrder(data.orderId);
      setIsDispatched(true);
      Alert.alert(
        "성공",
        data.isInstant
          ? "배차가 확정되었습니다."
          : "배차 신청이 완료되었습니다.",
      );
    } catch (error) {
      Alert.alert("오류", "처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: "#F8FAFC" }]}>
      {/* --- 상단 헤더 --- */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <View style={s.headerRight}>
          <Pressable style={s.headerBtn}>
            <Ionicons name="share-outline" size={24} color="#1E293B" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* --- 메인 카드 섹션 --- */}
        <View style={s.mainCard}>
          <View style={s.orderIdRow}>
            <Text style={s.orderIdText}>오더 #{data.orderId}</Text>
            <View style={[s.statusBadge, { backgroundColor: "#EEF2FF" }]}>
              <Text style={s.statusText}>운송전</Text>
            </View>
          </View>

          <View style={s.routeSummary}>
            <View style={s.cityGroup}>
              <Text style={s.cityName}>
                {data.startAddr?.split(" ")[0]} {data.startAddr?.split(" ")[1]}
              </Text>
              <Text style={s.dongName}>{data.startPlace}</Text>
            </View>
            <Feather name="arrow-right" size={24} color="#CBD5E1" />
            <View style={[s.cityGroup, { alignItems: "flex-end" }]}>
              <Text style={s.cityName}>
                {data.endAddr?.split(" ")[0]} {data.endAddr?.split(" ")[1]}
              </Text>
              <Text style={s.dongName}>{data.endPlace}</Text>
            </View>
          </View>

          <View style={s.specRow}>
            <View style={s.specItem}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={16}
                color="#64748B"
              />
              <Text style={s.specText}>{data.distance}km</Text>
            </View>
            <View style={s.dividerV} />
            <View style={s.specItem}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <Text style={s.specText}>약 4시간 30분</Text>
            </View>
          </View>

          <View style={s.priceRow}>
            <Text style={s.priceLabel}>운송료</Text>
            <View style={s.priceValGroup}>
              <Text style={s.priceVal}>
                {(data.basePrice + (data.laborFee || 0)).toLocaleString()}원
              </Text>
              <View style={s.payBadge}>
                <Text style={s.payBadgeText}>{data.payMethod}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- 운행 경로 상세 --- */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="location-sharp" size={18} color="#1E293B" />
            <Text style={s.sectionTitle}>운행 경로</Text>
          </View>
          <View style={s.timelineContainer}>
            <View style={s.timelineItem}>
              <View style={[s.timelineDot, { backgroundColor: "#1E293B" }]}>
                <Text style={s.dotInText}>상</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={s.timelineTime}>{data.startSchedule} 상차</Text>
                <Text style={s.timelineAddr}>
                  {data.startAddr} {data.startPlace}
                </Text>
                <Pressable style={s.copyBtn}>
                  <Text style={s.copyText}>주소복사</Text>
                </Pressable>
              </View>
            </View>
            <View style={[s.timelineLine, { height: "35%" }]} />
            <View style={s.timelineItem}>
              <View style={[s.timelineDot, { backgroundColor: "#4F46E5" }]}>
                <Text style={s.dotInText}>하</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={[s.timelineTime, { color: "#4F46E5" }]}>
                  14:00 하차예정
                </Text>
                <Text style={s.timelineAddr}>
                  {data.endAddr} {data.endPlace}
                </Text>
                <Pressable style={s.copyBtn}>
                  <Text style={s.copyText}>주소복사</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* --- 화물 정보 Grid --- */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="cube" size={18} color="#1E293B" />
            <Text style={s.sectionTitle}>화물 정보</Text>
          </View>
          <View style={s.grid}>
            <View style={s.gridBox}>
              <Text style={s.gridLabel}>차종/톤수</Text>
              <Text style={s.gridVal}>
                {data.reqTonnage} {data.reqCarType}
              </Text>
            </View>
            <View style={s.gridBox}>
              <Text style={s.gridLabel}>운송구분</Text>
              <Text style={s.gridVal}>{data.driveMode || "독차 (단독)"}</Text>
            </View>
            <View style={s.gridBox}>
              <Text style={s.gridLabel}>화물종류</Text>
              <Text style={s.gridVal}>{data.cargoContent}</Text>
            </View>
            <View style={s.gridBox}>
              <Text style={s.gridLabel}>중량</Text>
              <Text style={s.gridVal}>약 8톤</Text>
            </View>
          </View>
        </View>

        {/* --- 요청 사항 --- */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons
              name="text-box-search"
              size={18}
              color="#1E293B"
            />
            <Text style={s.sectionTitle}>요청사항</Text>
          </View>
          <View style={s.memoBox}>
            <Text style={s.memoText}>
              지게차 상하차 지원됩니다. 도착 30분 전에 담당자에게 연락
              부탁드립니다. 안전 운전 부탁드립니다.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* --- 하단 액션 바 --- */}
      <View style={s.bottomBar}>
        <View style={s.subButtons}>
          <Pressable style={s.iconBtn}>
            <Ionicons name="chatbubble-outline" size={24} color="#475569" />
          </Pressable>
          <Pressable
            style={s.iconBtn}
            onPress={() => Linking.openURL("tel:01012345678")}
          >
            <Ionicons name="call-outline" size={24} color="#475569" />
          </Pressable>
        </View>
        <Button
          style={s.mainActionBtn}
          title={
            isDispatched
              ? "길안내 시작"
              : data.isInstant
                ? "배차 확정"
                : "배차 신청"
          }
          onPress={
            isDispatched
              ? () => Alert.alert("내비게이션 실행")
              : handleDispatchAction
          }
          loading={loading}
          variant={
            isDispatched ? "primary" : data.isInstant ? "primary" : "outline"
          }
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  headerRight: { flexDirection: "row" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  mainCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  orderIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  orderIdText: { color: "#64748B", fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: "#4F46E5", fontSize: 11, fontWeight: "700" },
  routeSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cityName: { fontSize: 22, fontWeight: "900", color: "#1E293B" },
  dongName: { fontSize: 14, color: "#64748B", marginTop: 4 },
  cityGroup: { flex: 1 },
  specRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    justifyContent: "center",
  },
  specItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  specText: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  dividerV: {
    width: 1,
    height: 14,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 20,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  priceLabel: { fontSize: 14, color: "#64748B" },
  priceValGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceVal: { fontSize: 20, fontWeight: "900", color: "#1E293B" },
  payBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payBadgeText: { color: "#EA580C", fontSize: 11, fontWeight: "700" },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  timelineContainer: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  timelineItem: { flexDirection: "row", gap: 16, zIndex: 2 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineContent: {
    flex: 1,
  },
  dotInText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  timelineTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  timelineAddr: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  copyBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyText: { fontSize: 12, color: "#475569", fontWeight: "600" },
  timelineLine: {
    position: "absolute",
    left: 31,
    top: 35,
    width: 1,
    backgroundColor: "#E2E8F0",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridBox: {
    width: "48.5%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
  },
  gridLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 6 },
  gridVal: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  memoBox: {
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  memoText: { fontSize: 14, color: "#92400E", lineHeight: 22 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  subButtons: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  mainActionBtn: { flex: 1, height: 54, borderRadius: 16 },
});
