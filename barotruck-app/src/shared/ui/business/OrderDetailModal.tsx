import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Linking,
  Animated,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "../base/Button";
import { IconButton } from "../base/IconButton";
import { OrderService } from "@/shared/api/orderService"; // [추가] 서비스 임포트
import { Alert } from "react-native"; // [추가] 에러 알림용


type OrderDetailModalProps = {
  
  open: boolean;
  onClose: () => void;
  isDispatched: boolean;
  onDispatch: () => void;
  data: any;
  loading: boolean; // [추가] 로딩 상태를 부모로부터 전달받음
};

// ... 상단 import 생략 (기존 유지)
const DetailRow = ({ label, value, color, isPrice }: any) => {
  const { colors: c } = useAppTheme();
  return (
    <View style={s.detailRow}>
      <Text style={[s.detailLabel, { color: c.text.secondary }]}>{label}</Text>
      <Text
        style={[
          s.detailVal,
          { color: color || c.text.primary },
          isPrice ? { fontSize: 20 } : { fontSize: 15 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
};
export const OrderDetailModal = ({
  open,
  onClose,
  isDispatched,
  onDispatch,
  data,
  loading
}: OrderDetailModalProps) => {
  const { colors: c } = useAppTheme();
  // basePrice가 있으면 highlightColor 적용
  const highlightColor = data.isInstant ? "#DC2626" : c.brand.primary;

  // ... 애니메이션 useEffect 생략 (기존 유지)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  return (
    <Modal visible={open} transparent onRequestClose={onClose} statusBarTranslucent animationType="none">
      <View style={s.fullOverlay}>
        <Animated.View style={[s.dim, { opacity: fadeAnim, backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[s.sheet, { backgroundColor: c.bg.surface, transform: [{ translateY: slideAnim }] }]}>
          <View style={[s.modalHeader, { borderBottomColor: c.border.default }]}>
            <Text style={s.modalTitle}>오더 상세 정보</Text>
            <IconButton variant="ghost" size={32} onPress={onClose}>
              <Ionicons name="close" size={24} color={c.text.secondary} />
            </IconButton>
          </View>

          <ScrollView contentContainerStyle={s.modalContent} showsVerticalScrollIndicator={false}>
            {/* 1. 경로 정보 (이미지 상단 레이아웃) */}
            <View style={s.modalRoute}>
              <View style={{flex: 1}}>
                <Text style={s.modalRouteCity}>{data.startAddr}</Text>
                <Text style={s.subPlace}>{data.startPlace}</Text>
              </View>
              <Feather name="arrow-right" size={24} color={c.text.secondary} />
              <View style={{flex: 1, alignItems: 'flex-end'}}>
                <Text style={s.modalRouteCity}>{data.endAddr}</Text>
                <Text style={s.subPlace}>{data.endPlace}</Text>
              </View>
            </View>

            {/* 2. 거리 및 소요시간 배지 */}
            <View style={s.statsRow}>
              <View style={s.statBadge}><Text style={s.statText}>🛣️ {(data.distance).toFixed(1)}km</Text></View>
              <View style={s.statBadge}><Text style={s.statText}>⏱️ {Math.floor(data.duration / 3600)}시간 {Math.floor((data.duration % 3600) / 60)}분</Text></View>
            </View>

            <View style={s.modalDivider} />

            {/* 3. 금액 정보 */}
            {/* --- 금액 정보 섹션 --- */}
            <DetailRow label="운송료" value={`${data.basePrice?.toLocaleString()}원`} color={highlightColor} isPrice />
            
            {/* laborFee: 0보다 클 때만 노출 */}
            {(data.laborFee ?? data.laborFee) > 0 && (
              <DetailRow label="수작업비" value={`${data.laborFee?.toLocaleString()}원`} color="#EF4444" />
            )}

            {/* [보강] 보험료도 안전하게 처리 */}
            {(data.insuranceFee ?? 0) > 0 && (
              <DetailRow 
                label="보험료" 
                value={`${data.insuranceFee?.toLocaleString()}원`} 
              />
            )}
            <DetailRow label="결제방식" value={data.payMethod} />

            <View style={s.modalDivider} />
            
            {/* 4. 운행 경로 상세 (이미지 타임라인 형태) */}
            <Text style={s.sectionTitle}>📍 운행 경로</Text>
            <View style={s.timelineItem}>
              <View style={s.dot} />
              <Text style={s.timeLabel}>{data.startSchedule} 상차</Text>
              <Text style={s.addrDetail}>{data.startAddr} {data.startPlace}</Text>
            </View>
            <View style={[s.timelineItem, { borderLeftWidth: 0 }]}>
              <View style={[s.dot, {backgroundColor: '#3B82F6'}]} />
              <Text style={s.timeLabel}>{data.endSchedule || "하차 예정"}</Text>
              <Text style={s.addrDetail}>{data.endAddr} {data.endPlace}</Text>
            </View>

            <View style={s.sectionGap} />

            {/* --- 화물 정보 섹션 (Grid) --- */}
            <Text style={s.sectionTitle}>📦 화물 정보</Text>
            <View style={s.grid}>
              <InfoBox label="차종/톤수" value={`${data.reqTonnage} ${data.reqCarType}`} />
              
              {/* driveMode: 기본값 '독차' */}
              <InfoBox label="운송구분" value={data.driveMode || "독차"} />
              
              <InfoBox label="화물종류" value={data.cargoContent} />
              
              {/* [변경] loadMethod: 있을 때만 InfoBox 렌더링 */}
              {data.loadMethod && (
                <InfoBox label="상차방법" value={data.loadMethod} />
              )}

              {/* [변경] workType: 있을 때만 InfoBox 렌더링 */}
              {data.workType && (
                <InfoBox label="작업구분" value={data.workType} />
              )}

              {/* loadWeight: 있을 때만 노출 */}
              {data.loadWeight && (
                <InfoBox label="중량" value={`${data.loadWeight}kg`} />
              )}
            </View>
          </ScrollView>

          {/* 하단 푸터 생략 (기존 유지) */}
        </Animated.View>
      </View>
    </Modal>
  );
};

// --- 추가 컴포넌트 ---
const InfoBox = ({ label, value }: any) => {
  const { colors: c } = useAppTheme();
  return (
    <View style={[s.infoBox, { backgroundColor: '#F8FAFC' }]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoVal}>{value}</Text>
    </View>
  );
};



const s = StyleSheet.create({
  fullOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalContent: { padding: 24 },
  modalRoute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalRouteCity: { fontSize: 20, fontWeight: "800" },
  modalDivider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 20 },
  // detailRow: {
  //   flexDirection: "row",
  //   justifyContent: "space-between",
  //   marginBottom: 16,
  // },
  // detailLabel: { color: "#64748B", fontSize: 14 },
  // detailVal: { fontWeight: "700", textAlign: "right", flex: 1 },
  memoBox: {
    backgroundColor: "#FFF7ED",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  memoText: { fontSize: 13, color: "#9A3412", lineHeight: 20 },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },

  // 추가한것들
  sideButtons: { flexDirection: "row", gap: 8 },
  circleBtn: { borderRadius: 14, borderWidth: 1.5 },
  mainBtn: { flex: 1, height: 54, borderRadius: 14 },
  subPlace: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 8 },
  sectionGap: { height: 24 },
  timelineItem: { marginLeft: 10, paddingLeft: 20, borderLeftWidth: 1, borderLeftColor: '#E2E8F0', paddingBottom: 20 },
  dot: { position: 'absolute', left: -5, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E293B' },
  timeLabel: { fontSize: 12, color: '#3B82F6', fontWeight: '700' },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailLabel: { 
    color: "#64748B", 
    fontSize: 14 
  },
  detailVal: { 
    fontWeight: "700", 
    textAlign: "right", 
    flex: 1 
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  infoBox: { 
    width: '48%', 
    padding: 12, 
    borderRadius: 10 
  },
  infoLabel: { 
    fontSize: 11, 
    color: "#64748B", 
    marginBottom: 4 
  },
  infoVal: { 
    fontSize: 14, 
    fontWeight: "700" 
  },
// [추가] 타임라인 내 상세 주소 텍스트 스타일
  addrDetail: { 
    fontSize: 15, 
    fontWeight: '600', 
    marginTop: 2,
    color: '#1E293B' // 텍스트 색상 추가 (선택)
  },

});
