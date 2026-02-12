import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DispatchStatusBadge } from "@/features/common/orders/ui/DispatchStatusBadge";
import { getLocalShipperOrders } from "@/features/shipper/home/model/localShipperOrders";
import { OrderApi } from "@/shared/api/orderService";
import { UserService } from "@/shared/api/userService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { OrderResponse, OrderStatus } from "@/shared/models/order";
import { Button } from "@/shared/ui/base/Button";
import { Card } from "@/shared/ui/base/Card";
import { Divider } from "@/shared/ui/base/Divider";
import { IconButton } from "@/shared/ui/base/IconButton";
import {
  getCurrentUserSnapshot,
  saveCurrentUserSnapshot,
} from "@/shared/utils/currentUserStorage";

type SummaryItem = {
  key: "matching" | "driving" | "done";
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
};

type LiveOrderItem = {
  id: string;
  status: "MATCHING" | "DISPATCHED" | "DRIVING" | "DONE";
  isInstantDispatch?: boolean;
  pickupTypeLabel?: string;
  dropoffTypeLabel?: string;
  from: string;
  to: string;
  distanceKm: number;
  cargoSummary: string;
  loadMethodShort: string;
  workToolShort: string;
  priceWon: number;
  updatedAtLabel: string;
  updatedAtMs?: number;
  pickupTimeHHmm?: string;
  dropoffTimeHHmm?: string;
};
type StatusFilter = "ALL" | LiveOrderItem["status"];
type SortMode = "LATEST" | "DATE";

const FORCE_MOCK_HOME_DATA = true;

const MOCK_HOME_ORDERS: LiveOrderItem[] = [
  {
    id: "m1",
    status: "MATCHING",
    from: "서울 강남",
    to: "부산 해운대",
    distanceKm: 340,
    cargoSummary: "11톤 윙바디",
    loadMethodShort: "독",
    workToolShort: "지",
    priceWon: 350000,
    updatedAtLabel: "10분 전",
  },
  {
    id: "m2",
    status: "MATCHING",
    from: "서울 구로",
    to: "경기 화성",
    distanceKm: 62,
    cargoSummary: "3.5톤 카고",
    loadMethodShort: "혼",
    workToolShort: "수",
    priceWon: 180000,
    updatedAtLabel: "22분 전",
  },
  {
    id: "m3",
    status: "DISPATCHED",
    isInstantDispatch: true,
    from: "인천 남동",
    to: "대전 유성",
    distanceKm: 120,
    cargoSummary: "5톤 카고",
    loadMethodShort: "독",
    workToolShort: "크",
    priceWon: 210000,
    updatedAtLabel: "오늘 14:00 상차",
  },
  {
    id: "m4",
    status: "DONE",
    from: "서울 영등포",
    to: "경기 수원",
    distanceKm: 45,
    cargoSummary: "1톤 용달",
    loadMethodShort: "혼",
    workToolShort: "호",
    priceWon: 80000,
    updatedAtLabel: "어제 완료",
  },
  {
    id: "m5",
    status: "DONE",
    from: "경기 평택",
    to: "충북 청주",
    distanceKm: 98,
    cargoSummary: "5톤 윙바디",
    loadMethodShort: "독",
    workToolShort: "지",
    priceWon: 190000,
    updatedAtLabel: "2일 전 완료",
  },
  {
    id: "m6",
    status: "DONE",
    from: "대구 달서구",
    to: "경북 구미시",
    distanceKm: 34,
    cargoSummary: "2.5톤 카고",
    loadMethodShort: "혼",
    workToolShort: "수",
    priceWon: 90000,
    updatedAtLabel: "3일 전 완료",
  },
  {
    id: "m7",
    status: "MATCHING",
    from: "광주 광산구",
    to: "전북 전주시",
    distanceKm: 92,
    cargoSummary: "5톤 카고",
    loadMethodShort: "독",
    workToolShort: "지",
    priceWon: 175000,
    updatedAtLabel: "5분 전",
  },
  {
    id: "m8",
    status: "DRIVING",
    from: "울산 남구",
    to: "경남 창원시",
    distanceKm: 54,
    cargoSummary: "3.5톤 윙바디",
    loadMethodShort: "혼",
    workToolShort: "수",
    priceWon: 120000,
    updatedAtLabel: "오늘 16:30 상차",
  },
  {
    id: "m9",
    status: "DONE",
    from: "충남 아산시",
    to: "대전 유성구",
    distanceKm: 41,
    cargoSummary: "1톤 용달",
    loadMethodShort: "독",
    workToolShort: "호",
    priceWon: 78000,
    updatedAtLabel: "4일 전 완료",
  },
  {
    id: "m10",
    status: "MATCHING",
    from: "서울 금천구",
    to: "인천 연수구",
    distanceKm: 38,
    cargoSummary: "2.5톤 카고",
    loadMethodShort: "혼",
    workToolShort: "크",
    priceWon: 98000,
    updatedAtLabel: "12분 전",
  },
  {
    id: "m11",
    status: "DISPATCHED",
    isInstantDispatch: true,
    from: "경기 고양시",
    to: "강원 원주시",
    distanceKm: 114,
    cargoSummary: "11톤 윙바디",
    loadMethodShort: "독",
    workToolShort: "지",
    priceWon: 265000,
    updatedAtLabel: "오늘 11:00 상차",
  },
  {
    id: "m12",
    status: "DONE",
    from: "부산 사상구",
    to: "경남 김해시",
    distanceKm: 19,
    cargoSummary: "1톤 탑차",
    loadMethodShort: "혼",
    workToolShort: "수",
    priceWon: 52000,
    updatedAtLabel: "5일 전 완료",
  },
  {
    id: "m13",
    status: "DONE",
    from: "경북 포항시",
    to: "대구 북구",
    distanceKm: 89,
    cargoSummary: "5톤 냉장",
    loadMethodShort: "독",
    workToolShort: "크",
    priceWon: 168000,
    updatedAtLabel: "1주 전 완료",
  },
];

function toLoadMethodShort(v?: string) {
  if (!v) return "-";
  if (v.includes("혼")) return "혼";
  return "독";
}

function toWorkToolShort(v?: string) {
  if (!v) return "-";
  if (v.includes("지")) return "지";
  if (v.includes("수")) return "수";
  if (v.includes("크")) return "크";
  if (v.includes("호")) return "호";
  return "-";
}

function mapStatus(status: OrderStatus): LiveOrderItem["status"] {
  if (status === "COMPLETED") return "DONE";
  if (status === "REQUESTED" || status === "PENDING") return "MATCHING";
  if (status === "ACCEPTED") return "DISPATCHED";
  return "DRIVING";
}

function toRelativeLabel(iso?: string) {
  if (!iso) return "방금 전";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "방금 전";
  const diffMin = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function toTimestampMs(iso?: string) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function parseLabelToMs(label: string) {
  const now = new Date();

  if (label.includes("방금")) return now.getTime();

  const minMatch = label.match(/(\d+)\s*분\s*전/);
  if (minMatch) return now.getTime() - Number(minMatch[1]) * 60_000;

  const hourMatch = label.match(/(\d+)\s*시간\s*전/);
  if (hourMatch) return now.getTime() - Number(hourMatch[1]) * 3_600_000;

  const dayMatch = label.match(/(\d+)\s*일\s*전/);
  if (dayMatch) return now.getTime() - Number(dayMatch[1]) * 86_400_000;

  const weekMatch = label.match(/(\d+)\s*주\s*전/);
  if (weekMatch) return now.getTime() - Number(weekMatch[1]) * 7 * 86_400_000;

  if (label.includes("어제")) return now.getTime() - 86_400_000;

  const todayTimeMatch = label.match(/오늘\s*(\d{1,2}):(\d{2})/);
  if (todayTimeMatch) {
    const d = new Date(now);
    d.setHours(Number(todayTimeMatch[1]), Number(todayTimeMatch[2]), 0, 0);
    return d.getTime();
  }

  return 0;
}

function sortLiveOrdersByLatest(items: LiveOrderItem[]) {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ta = a.item.updatedAtMs ?? parseLabelToMs(a.item.updatedAtLabel);
      const tb = b.item.updatedAtMs ?? parseLabelToMs(b.item.updatedAtLabel);
      if (tb !== ta) return tb - ta;
      return a.index - b.index;
    })
    .map((x) => x.item);
}

function mapOrderToLiveItem(o: OrderResponse): LiveOrderItem {
  const updatedIso = o.updated ?? o.createdAt;
  const toHHmm = (v?: string) => {
    if (!v) return undefined;
    const normalized = v.includes("T") ? v : v.replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) {
      const m = v.match(/(\d{2}):(\d{2})/);
      return m ? `${m[1]}:${m[2]}` : undefined;
    }
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  return {
    id: String(o.orderId),
    status: mapStatus(o.status),
    isInstantDispatch: o.driveMode === "instant",
    pickupTypeLabel: toScheduleTypeLabel(o.startType, "당상"),
    dropoffTypeLabel: toScheduleTypeLabel(o.endType, "당착"),
    from: o.startAddr || o.startPlace || "-",
    to: o.endAddr || o.endPlace || "-",
    distanceKm: Math.round(o.distance ?? 0),
    cargoSummary: `${o.reqTonnage ?? ""} ${o.reqCarType ?? ""}`.trim() || o.cargoContent || "-",
    loadMethodShort: toLoadMethodShort(o.loadMethod),
    workToolShort: toWorkToolShort(o.workType),
    priceWon: o.basePrice ?? 0,
    updatedAtLabel: toRelativeLabel(updatedIso),
    updatedAtMs: toTimestampMs(updatedIso),
    pickupTimeHHmm: toHHmm(o.startSchedule),
    dropoffTimeHHmm: toHHmm(o.endSchedule),
  };
}

function formatWon(v: number) {
  const s = Math.round(v).toString();
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

function toHomePlaceLabel(addr: string) {
  const parts = addr.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "-";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

function toScheduleTypeLabel(v: string | undefined, fallback: "당상" | "당착") {
  if (!v) return fallback;
  if (v.startsWith("당상")) return "당상";
  if (v.startsWith("익상")) return "익상";
  if (v.startsWith("당착")) return "당착";
  if (v.startsWith("익착")) return "익착";
  if (v.startsWith("내착")) return "내착";
  return v;
}

function mapLocalToLiveItem(): LiveOrderItem[] {
  return getLocalShipperOrders().map((item) => {
    const status: LiveOrderItem["status"] = item.status === "CONFIRMED" ? "DISPATCHED" : item.status;
    return {
      id: item.id,
      status,
      isInstantDispatch: item.dispatchMode === "instant",
      pickupTypeLabel: toScheduleTypeLabel(item.pickupTypeLabel, "당상"),
      dropoffTypeLabel: toScheduleTypeLabel(item.dropoffTypeLabel, "당착"),
      from: item.from,
      to: item.to,
      distanceKm: item.distanceKm,
      cargoSummary: item.cargoSummary,
      loadMethodShort: toLoadMethodShort(item.loadMethod),
      workToolShort: toWorkToolShort(item.workTool),
      priceWon: item.priceWon,
      updatedAtLabel: item.updatedAtLabel,
      updatedAtMs: parseLabelToMs(item.updatedAtLabel),
      pickupTimeHHmm: item.pickupTimeHHmm || "09:00",
      dropoffTimeHHmm: item.dropoffTimeHHmm || "15:00",
    };
  });
}

export function ShipperHomeScreen() {
  const t = useAppTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState("화주");
  const [liveOrders, setLiveOrders] = useState<LiveOrderItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("LATEST");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (FORCE_MOCK_HOME_DATA) {
        setDisplayName("화주");
        return () => {};
      }

      let active = true;
      void (async () => {
        try {
          const me = await UserService.getMyInfo();
          if (!active) return;
          setDisplayName(me.nickname || "화주");
          await saveCurrentUserSnapshot({
            email: me.email,
            nickname: me.nickname,
            role: me.role,
          });
        } catch {
          const cached = await getCurrentUserSnapshot();
          if (!active) return;
          if (cached?.nickname) setDisplayName(cached.nickname);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (FORCE_MOCK_HOME_DATA) {
        setLiveOrders([...mapLocalToLiveItem(), ...MOCK_HOME_ORDERS]);
        return () => {};
      }

      let active = true;
      void (async () => {
        try {
          const rows = await OrderApi.getAvailableOrders();
          if (!active) return;
          setLiveOrders([...mapLocalToLiveItem(), ...rows.map(mapOrderToLiveItem).slice(0, 50)]);
        } catch {
          if (!active) return;
          setLiveOrders(mapLocalToLiveItem());
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const summary: SummaryItem[] = useMemo(() => {
    const matching = liveOrders.filter((x) => x.status === "MATCHING" || x.status === "DISPATCHED").length;
    const driving = liveOrders.filter((x) => x.status === "DRIVING").length;
    const done = liveOrders.filter((x) => x.status === "DONE").length;
    return [
      { key: "matching", label: "배차", value: matching, icon: "time-outline" },
      { key: "driving", label: "운송중", value: driving, icon: "car-outline" },
      { key: "done", label: "완료", value: done, icon: "checkmark-circle-outline" },
    ];
  }, [liveOrders]);

  const goCreateOrder = () => router.push("/(shipper)/create-order/step1-route" as any);

  const goNotificationsTab = () => router.push("/(shipper)/(tabs)/notifications" as any);

  const goOrderDetail = (id: string) => {
    router.push(`/(common)/orders/${id}` as any);
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return liveOrders;
    if (statusFilter === "MATCHING") {
      return liveOrders.filter((x) => x.status === "MATCHING" || x.status === "DISPATCHED");
    }
    if (statusFilter === "DRIVING") {
      return liveOrders.filter((x) => x.status === "DRIVING");
    }
    return liveOrders.filter((x) => x.status === statusFilter);
  }, [liveOrders, statusFilter]);

  const sortedOrders = useMemo(() => {
    if (sortMode === "LATEST") return filteredOrders;
    return sortLiveOrdersByLatest(filteredOrders);
  }, [filteredOrders, sortMode]);

  const visibleOrders = useMemo(() => {
    if (showAll) return sortedOrders;
    return sortedOrders.slice(0, 3);
  }, [sortedOrders, showAll]);

  return (
    <View style={[s.page, { backgroundColor: c.bg.canvas }]}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: Math.max(18, insets.top + 10) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topRow}>
          <Text style={[s.brandText, { color: c.brand.primary }]}>Baro Truck</Text>

          <View style={s.topActions}>
            <IconButton onPress={() => {}} variant="ghost">
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={c.text.primary} />
            </IconButton>

            <IconButton onPress={goNotificationsTab} variant="ghost">
              <Ionicons name="notifications-outline" size={18} color={c.text.primary} />
            </IconButton>
          </View>
        </View>

        <View style={s.hello}>
          <Text style={[s.helloSmall, { color: c.text.secondary }]}>오늘도 안전운송 하세요! 🚚</Text>
          <Text style={[s.helloName, { color: c.brand.primary }]}>{displayName}님,</Text>
          <Text style={[s.helloTitle, { color: c.text.primary }]}>화물 등록 하시나요?</Text>
        </View>

        <View style={s.summaryRow}>
          {summary.map((it) => {
            const iconBg =
              it.key === "matching"
                ? c.status.warningSoft
                : it.key === "driving"
                ? c.status.infoSoft
                : c.status.successSoft;

            const iconColor =
              it.key === "matching"
                ? c.status.warning
                : it.key === "driving"
                ? c.status.info
                : c.status.success;

            return (
              <Card
                key={it.key}
                padding={14}
                onPress={() => {
                  const next = it.key === "matching" ? "MATCHING" : it.key === "driving" ? "DRIVING" : "DONE";
                  setStatusFilter(next);
                  setShowAll(true);
                }}
                style={[
                  s.summaryCard,
                  {
                    backgroundColor: c.bg.surface,
                    borderColor:
                      (it.key === "matching" && statusFilter === "MATCHING") ||
                      (it.key === "driving" && statusFilter === "DRIVING") ||
                      (it.key === "done" && statusFilter === "DONE")
                        ? c.brand.primary
                        : c.border.default,
                  },
                ]}
              >
                <View style={s.summaryCenter}>
                  <View style={[s.summaryIconWrap, { backgroundColor: iconBg }]}>
                    <Ionicons name={it.icon} size={18} color={iconColor} />
                  </View>

                  <Text style={[s.summaryValue, { color: c.text.primary }]}>{it.value}</Text>
                  <Text style={[s.summaryLabel, { color: c.text.secondary }]}>{it.label}</Text>
                </View>
              </Card>
            );
          })}
        </View>

        <View style={s.ctaWrap}>
          <Button title="화물 등록하기" onPress={goCreateOrder} fullWidth />
        </View>

        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <Text style={[s.sectionTitle, { color: c.text.primary }]}>실시간 운송 현황</Text>
            <View style={s.sortDropdownWrap}>
              <Pressable
                onPress={() => setSortDropdownOpen((v) => !v)}
                style={[s.sortDropdownButton, { borderColor: c.border.default, backgroundColor: c.bg.surface }]}
              >
                <Text style={[s.sortDropdownText, { color: c.text.secondary }]}>
                  {sortMode === "LATEST" ? "최신순" : "날짜순"}
                </Text>
                <Ionicons
                  name={sortDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={c.text.secondary}
                />
              </Pressable>

              {sortDropdownOpen ? (
                <View style={[s.sortDropdownMenu, { borderColor: c.border.default, backgroundColor: c.bg.surface }]}>
                  {([
                    { key: "LATEST" as const, label: "최신순" },
                    { key: "DATE" as const, label: "날짜순" },
                  ]).map((item) => {
                    const active = sortMode === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => {
                          setSortMode(item.key);
                          setSortDropdownOpen(false);
                        }}
                        style={[
                          s.sortDropdownItem,
                          {
                            borderColor: c.border.default,
                            backgroundColor: c.bg.surface,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? c.brand.primary : c.text.primary,
                            fontWeight: "600",
                            fontSize: 12,
                            flex: 1,
                          }}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>

          <Text
            style={[s.sectionLink, { color: c.text.secondary }]}
            onPress={() => setShowAll((v) => !v)}
          >
            {showAll ? "간단보기" : "전체보기"}
          </Text>
        </View>

        {statusFilter !== "ALL" ? (
          <Text
            style={[s.sectionLink, { color: c.brand.primary, marginBottom: 8 }]}
            onPress={() => setStatusFilter("ALL")}
          >
            필터 해제
          </Text>
        ) : null}

        {visibleOrders.map((o) => (
          <Card
            key={o.id}
            padding={16}
            style={[
              s.orderCard,
              o.status === "DISPATCHED"
                ? {
                    borderWidth: 1.5,
                    borderColor: "#F59E0B",
                  }
                : null,
              o.status === "DONE"
                ? {
                    backgroundColor: "#F8FAFC",
                    shadowOpacity: 0,
                    elevation: 0,
                  }
                : null,
            ]}
            onPress={() => goOrderDetail(String(o.id))}
          >
            <View style={s.orderTopRow}>
              <DispatchStatusBadge
                status={
                  o.status === "MATCHING"
                    ? "WAITING"
                    : o.status === "DISPATCHED"
                    ? "CONFIRMED"
                    : o.status === "DRIVING"
                    ? "DRIVING"
                    : "COMPLETED"
                }
              />
              <View style={s.timeRow}>
                <Ionicons name="time-outline" size={12} color={c.text.secondary} />
                <Text style={[s.updatedAt, { color: c.text.secondary }]}>{o.updatedAtLabel}</Text>
              </View>
            </View>

            <View style={s.routeRow}>
              <View style={s.placeBlock}>
                <Text style={[s.placeText, { color: c.text.primary }]}>{toHomePlaceLabel(o.from)}</Text>
                <Text style={[s.placeTimeText, { color: c.text.secondary }]}>
                  {(o.pickupTypeLabel || "당상")} {(o.pickupTimeHHmm || "09:00")}
                </Text>
              </View>
              <View style={s.routeCenter}>
                <View style={[s.distancePill, { backgroundColor: "#EEF1F6" }]}>
                  <Text style={[s.distanceText, { color: "#8A94A6" }]}>{o.distanceKm}km</Text>
                </View>
                <Text style={[s.routeArrow, { color: "#8A94A6" }]}>→</Text>
              </View>
              <View style={[s.placeBlock, { alignItems: "flex-end" }]}>
                <Text style={[s.placeText, { color: c.text.primary }]}>{toHomePlaceLabel(o.to)}</Text>
                <Text style={[s.placeTimeText, { color: c.text.secondary }]}>
                  {(o.dropoffTypeLabel || "당착")} {(o.dropoffTimeHHmm || "15:00")}
                </Text>
              </View>
            </View>

            <Divider />

            <View style={s.metaRow}>
              <View style={s.cargoRow}>
                <Text style={[s.cargo, { color: c.text.secondary }]}>{o.cargoSummary}</Text>
                <Text style={[s.methodTool, { color: c.text.secondary }]}> · {o.loadMethodShort} · {o.workToolShort}</Text>
              </View>
              <Text style={[s.price, { color: c.text.primary }]}>{formatWon(o.priceWon)}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  container: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  brandText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },

  hello: { marginBottom: 16 },
  helloSmall: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  helloName: { fontSize: 18, fontWeight: "900", marginBottom: 4 },
  helloTitle: { fontSize: 20, fontWeight: "900" },

  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 16, marginBottom: 0 },

  summaryCenter: { alignItems: "center", justifyContent: "center" },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryValue: { fontSize: 20, fontWeight: "900", marginBottom: 2 },
  summaryLabel: { fontSize: 12, fontWeight: "800" },

  ctaWrap: { marginBottom: 22 },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "900" },
  sectionLink: { fontSize: 12, fontWeight: "800" },
  sortDropdownWrap: { position: "relative", zIndex: 20 },
  sortDropdownButton: {
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    minWidth: 84,
  },
  sortDropdownText: { fontSize: 12, fontWeight: "600", flex: 1 },
  sortDropdownMenu: {
    position: "absolute",
    top: 38,
    left: 0,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    width: 84,
  },
  sortDropdownItem: {
    height: 34,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },

  orderCard: { borderRadius: 16, marginBottom: 12 },
  orderTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  updatedAt: { fontSize: 11, fontWeight: "800" },

  routeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  placeBlock: { flex: 1 },
  placeText: { fontSize: 14, fontWeight: "900" },
  placeTimeText: { fontSize: 11, fontWeight: "700", marginTop: 6 },
  routeCenter: { width: 84, alignItems: "center" },
  routeArrow: { fontSize: 12, fontWeight: "900" },
  distancePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  distanceText: { fontSize: 11, fontWeight: "900" },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  cargoRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  cargo: { fontSize: 12, fontWeight: "800" },
  methodTool: { fontSize: 11, fontWeight: "800" },
  price: { fontSize: 16, fontWeight: "900" },
});

