import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import type { OrderResponse } from "@/shared/models/order";
import type { RoutePreviewData } from "@/features/shipper/order/ui/orderDetailRoute";
import { Badge } from "@/shared/ui/feedback/Badge";
import { RoutePreviewWebView } from "@/shared/ui/business/RoutePreviewModal";
import { s } from "@/features/shipper/order/ui/OrderDetailScreen.styles";
import {
  formatAddressBig,
  formatDetailSubText,
  formatEstimatedDuration,
  formatSchedule,
  formatYmd,
} from "@/features/shipper/order/ui/orderDetail.utils";

import { OrderDetailStatusBadges } from "./OrderDetailStatusBadges";
import { OrderDetailStatusBottomBar } from "./OrderDetailStatusBottomBar";
import type {
  ActionButtonConfig,
  OrderDetailStatusGroup,
  OrderStatusInfo,
} from "./orderDetailStatus";

type ShipperInfo = {
  label: string;
  name: string;
  phone: string;
};

type StatusViewColors = {
  bgSurface: string;
  bgCanvas: string;
  borderDefault: string;
  textPrimary: string;
  textSecondary: string;
  brandPrimary: string;
};

type BaseProps = {
  order: OrderResponse;
  statusGroup: OrderDetailStatusGroup;
  insetsBottom: number;
  isCompleted: boolean;
  isSettled: boolean;
  statusInfo: OrderStatusInfo;
  totalPrice: number;
  cargoName: string;
  packagingOx: string;
  shipperInfo: ShipperInfo;
  requestTags: string[];
  requestSummary: string;
  actionLoading: boolean;
  buttonConfig: ActionButtonConfig | null;
  colors: StatusViewColors;
  onOpenRouteMap: () => void;
  onCopyAddress: (baseAddr?: string, detailAddr?: string) => void;
  routePreviewData: RoutePreviewData | null;
  routeWebviewError: string;
  onChangeRouteWebviewError: (value: string) => void;
  canRenderRouteMap: boolean;
  onMainAction: () => void;
  onStartChat: () => void;
  onCall: () => void;
  onReport: () => void;
};

function GridItem({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <View style={s.gridItem}>
      <Text style={s.gridLabel}>{label}</Text>
      <Text style={s.gridValue}>{value}</Text>
      {!!subValue && <Text style={s.gridSubValue}>{subValue}</Text>}
    </View>
  );
}

function BaseStatusDetailView({
  order,
  statusGroup,
  insetsBottom,
  isCompleted,
  isSettled,
  statusInfo,
  totalPrice,
  cargoName,
  packagingOx,
  shipperInfo,
  requestTags,
  requestSummary,
  actionLoading,
  buttonConfig,
  colors,
  onOpenRouteMap,
  onCopyAddress,
  routePreviewData,
  routeWebviewError,
  onChangeRouteWebviewError,
  canRenderRouteMap,
  onMainAction,
  onStartChat,
  onCall,
  onReport,
}: BaseProps) {
  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          isCompleted && { paddingTop: 10 },
          { paddingBottom: 112 + Math.max(insetsBottom, 10) },
        ]}
      >
        <View
          style={[
            s.card,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
              borderWidth: 1,
            },
          ]}
        >
          <View style={s.cardTop}>
            <View style={s.badgeGroup}>
              <OrderDetailStatusBadges
                isCompleted={isCompleted}
                isSettled={isSettled}
                statusInfo={statusInfo}
                isInstant={order.instant}
              />
            </View>
            <Text style={[s.dateText, { color: colors.textSecondary }]}>{formatYmd(order.createdAt)}</Text>
          </View>

          <View style={s.routeBigRow}>
            <View style={s.addrBox}>
              <Text style={s.addrBig}>{formatAddressBig(order.startAddr)}</Text>
              <Text style={s.addrSmall} numberOfLines={1}>
                {formatDetailSubText(order.startAddr, order.startPlace)}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#CBD5E1" />
            <View style={[s.addrBox, { alignItems: "flex-end" }]}>
              <Text style={s.addrBig}>{formatAddressBig(order.endAddr)}</Text>
              <Text style={s.addrSmall} numberOfLines={1}>
                {formatDetailSubText(order.endAddr, order.endPlace)}
              </Text>
            </View>
          </View>

          <View style={s.infoBar}>
            <View style={s.infoItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color="#64748B" />
              <Text style={s.infoText}>{Math.round(order.distance || 0)}km</Text>
            </View>
            <View style={s.divider} />
            <View style={s.infoItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#64748B" />
              <Text style={s.infoText}>{formatEstimatedDuration(order.duration)}</Text>
            </View>
          </View>

          <View style={s.priceRow}>
            <Text style={s.priceLabel}>운송료</Text>
            <View style={s.priceRight}>
              <Text style={[s.priceValue, { color: order.instant ? "#EF4444" : colors.brandPrimary }]}>
                {totalPrice.toLocaleString()}
              </Text>
              <Badge
                label={order.payMethod || "결제방식 미정"}
                tone={String(order.payMethod || "").includes("선착불") ? "payPrepaid" : "payDeferred"}
                style={{ marginLeft: 6, marginTop: 3 }}
              />
            </View>
          </View>
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>운행 경로</Text>
          <View style={s.timelineContainer}>
            <View style={s.timelineLine} />

            <View style={s.timelineItem}>
              <View style={[s.timelineDot, { backgroundColor: "#1E293B" }]}>
                <Text style={s.dotText}>출</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={s.timeLabel}>{formatSchedule(order.startSchedule)}</Text>
                <Text style={s.placeTitle}>{order.startAddr || "-"}</Text>
                <Text style={s.placeDetail}>{order.startPlace || "-"}</Text>
                <Pressable style={s.copyBtn} onPress={() => onCopyAddress(order.startAddr, order.startPlace)}>
                  <Ionicons name="copy-outline" size={12} color="#475569" />
                  <Text style={s.copyText}>주소복사</Text>
                </Pressable>
              </View>
            </View>

            <View style={[s.timelineItem, { marginTop: 20 }]}>
              <View style={[s.timelineDot, { backgroundColor: "#4F46E5" }]}>
                <Text style={s.dotText}>도</Text>
              </View>
              <View style={s.timelineContent}>
                <Text style={[s.timeLabel, { color: "#4F46E5" }]}>하차 예정</Text>
                <Text style={s.placeTitle}>{order.endAddr || "-"}</Text>
                <Text style={s.placeDetail}>{order.endPlace || "-"}</Text>
                <Pressable style={s.copyBtn} onPress={() => onCopyAddress(order.endAddr, order.endPlace)}>
                  <Ionicons name="copy-outline" size={12} color="#475569" />
                  <Text style={s.copyText}>주소복사</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={[s.routeMiniCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
          <View style={s.routeMiniHeader}>
            <Text style={[s.routeMiniTitle, { color: colors.textPrimary }]}>경로 지도</Text>
            <Pressable style={s.routeMiniExpandBtn} onPress={onOpenRouteMap}>
              <Text style={s.routeMiniExpandText}>확대</Text>
            </Pressable>
          </View>
          {!canRenderRouteMap ? (
            <View style={[s.routeMiniEmpty, { borderColor: colors.borderDefault, backgroundColor: colors.bgCanvas }]}>
              <Text style={[s.routeMiniEmptyText, { color: colors.textSecondary }]}>
                지도 키 설정 후 경로 지도를 표시할 수 있습니다.
              </Text>
            </View>
          ) : routePreviewData ? (
            <View style={s.routeMiniMapWrap}>
              <RoutePreviewWebView
                data={routePreviewData}
                onChangeError={onChangeRouteWebviewError}
                style={s.routeMiniMapWebview}
              />
            </View>
          ) : (
            <View style={[s.routeMiniEmpty, { borderColor: colors.borderDefault, backgroundColor: colors.bgCanvas }]}>
              <ActivityIndicator size="small" color="#64748B" />
              <Text style={[s.routeMiniEmptyText, { color: colors.textSecondary }]}>경로를 불러오는 중입니다.</Text>
            </View>
          )}
          {routeWebviewError ? (
            <Text style={s.routeMiniErrorText} numberOfLines={2}>
              {routeWebviewError}
            </Text>
          ) : null}
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>화물 정보</Text>
          <View style={s.gridContainer}>
            <GridItem label="화물종류" value={cargoName} subValue={`포장 여부 ${packagingOx}`} />
            <GridItem label="운송방식" value={order.driveMode || "독차"} />
            <GridItem label="상하차방법" value={order.loadMethod || "지게차"} />
            <GridItem label="요청차종" value={order.reqCarType || "카고"} />
            <GridItem label="요청톤수" value={order.reqTonnage || `${Math.max(1, Number(order.tonnage || 1))}톤`} />
            <GridItem label="작업유형" value={order.workType || "일반"} />
          </View>
        </View>

        <View style={[s.sectionCard, { backgroundColor: colors.bgSurface }]}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>화주 정보</Text>
          <View style={[s.managerBox, { backgroundColor: colors.bgCanvas, borderColor: colors.borderDefault }]}>
            <View style={s.managerRow}>
              <Ionicons
                name={shipperInfo.label === "업체명" ? "business-outline" : "person-circle-outline"}
                size={18}
                color={colors.textSecondary}
              />
              <Text style={[s.managerLabel, { color: colors.textSecondary }]}>{shipperInfo.label}</Text>
              <Text style={[s.managerValue, { color: colors.textPrimary }]}>{shipperInfo.name}</Text>
            </View>

            <View style={[s.managerRow, { marginTop: 12 }]}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
              <Text style={[s.managerLabel, { color: colors.textSecondary }]}>전화번호</Text>
              <Text style={[s.managerValue, { color: colors.textPrimary }]}>{shipperInfo.phone}</Text>
            </View>
          </View>
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>요청사항</Text>
          {requestTags.length > 0 ? (
            <View style={s.requestTagWrap}>
              {requestTags.map((tag, idx) => (
                <View key={`${tag}-${idx}`} style={s.requestTagChip}>
                  <Text style={s.requestTagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {requestSummary ? (
            <View style={[s.remarkBox, requestTags.length > 0 && { marginTop: 10 }]}>
              <Text style={s.remarkText}>{requestSummary}</Text>
            </View>
          ) : requestTags.length === 0 ? (
            <View style={s.remarkBox}>
              <Text style={s.remarkText}>요청사항 없음</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <OrderDetailStatusBottomBar
        statusGroup={statusGroup}
        status={order.status}
        insetsBottom={insetsBottom}
        actionLoading={actionLoading}
        buttonConfig={buttonConfig}
        onMainAction={onMainAction}
        onStartChat={onStartChat}
        onCall={onCall}
        onReport={onReport}
      />
    </>
  );
}

function WaitingOrderDetailView(props: BaseProps) {
  return <BaseStatusDetailView {...props} statusGroup="WAITING" isCompleted={false} />;
}

function ActiveOrderDetailView(props: BaseProps) {
  return <BaseStatusDetailView {...props} statusGroup="ACTIVE" isCompleted={false} />;
}

function CompletedOrderDetailView(props: BaseProps) {
  return <BaseStatusDetailView {...props} statusGroup="COMPLETED" isCompleted={true} />;
}

function CancelledOrderDetailView(props: BaseProps) {
  return <BaseStatusDetailView {...props} statusGroup="CANCELLED" isCompleted={false} />;
}

export function OrderDetailStatusContent(props: BaseProps) {
  if (props.statusGroup === "WAITING") return <WaitingOrderDetailView {...props} />;
  if (props.statusGroup === "COMPLETED") return <CompletedOrderDetailView {...props} />;
  if (props.statusGroup === "CANCELLED") return <CancelledOrderDetailView {...props} />;
  return <ActiveOrderDetailView {...props} />;
}
