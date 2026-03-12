import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { s } from "@/features/shipper/order/ui/OrderDetailScreen.styles";
import {
  REPORT_TYPE_OPTIONS,
  type ReportTypeCode,
} from "@/shared/models/review";
import type { RoutePreviewData } from "@/features/shipper/order/ui/orderDetailRoute";
import type { AssignedDriverInfoResponse } from "@/shared/models/order";
import { RoutePreviewModal } from "@/shared/ui/business/RoutePreviewModal";

type ModalColors = {
  bgSurface: string;
  bgCanvas: string;
  borderDefault: string;
  textPrimary: string;
  textSecondary: string;
  brandPrimary: string;
};

export function OrderDetailModals({
  colors,
  insetTop,
  applicantsOpen,
  applicantsLoading,
  applicantList,
  onCloseApplicants,
  onSelectDriver,
  routePreviewOpen,
  routePreviewData,
  routeWebviewError,
  onChangeRouteWebviewError,
  onCloseRoutePreview,
  reportOpen,
  reportType,
  reportDescription,
  reportLoading,
  onCloseReport,
  onChangeReportType,
  onChangeReportDescription,
  onSubmitReport,
  reviewOpen,
  reviewRating,
  reviewContent,
  reviewLoading,
  onCloseReview,
  onChangeReviewRating,
  onChangeReviewContent,
  onSubmitReview,
}: {
  colors: ModalColors;
  insetTop: number;
  applicantsOpen: boolean;
  applicantsLoading: boolean;
  applicantList: AssignedDriverInfoResponse[];
  onCloseApplicants: () => void;
  onSelectDriver: (driver: AssignedDriverInfoResponse) => void;
  routePreviewOpen: boolean;
  routePreviewData: RoutePreviewData | null;
  routeWebviewError: string;
  onChangeRouteWebviewError: (value: string) => void;
  onCloseRoutePreview: () => void;
  reportOpen: boolean;
  reportType: ReportTypeCode;
  reportDescription: string;
  reportLoading: boolean;
  onCloseReport: () => void;
  onChangeReportType: (value: ReportTypeCode) => void;
  onChangeReportDescription: (value: string) => void;
  onSubmitReport: () => void;
  reviewOpen: boolean;
  reviewRating: number;
  reviewContent: string;
  reviewLoading: boolean;
  onCloseReview: () => void;
  onChangeReviewRating: (value: number) => void;
  onChangeReviewContent: (value: string) => void;
  onSubmitReview: () => void;
}) {
  return (
    <>
      <Modal
        visible={applicantsOpen}
        transparent
        animationType="fade"
        onRequestClose={onCloseApplicants}
      >
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { backgroundColor: colors.bgSurface }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>기사 선택</Text>
              <Pressable onPress={onCloseApplicants} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            {applicantsLoading ? (
              <View style={s.modalLoading}>
                <ActivityIndicator color={colors.brandPrimary} />
              </View>
            ) : applicantList.length === 0 ? (
              <View style={s.modalLoading}>
                <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>
                  신청한 기사가 없습니다.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {applicantList.map((driver) => {
                  const driverNo = Number(driver.driverId ?? driver.userId);
                  const careerLabel =
                    Number.isFinite(Number(driver.career)) && Number(driver.career) >= 0
                      ? `${Number(driver.career)}년`
                      : "-";
                  return (
                    <Pressable
                      key={String(driverNo)}
                      style={[s.applicantItem, { borderColor: colors.borderDefault }]}
                      onPress={() => onSelectDriver(driver)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.applicantName, { color: colors.textPrimary }]}>
                          {driver.nickname || "기사"}
                        </Text>
                        <Text style={[s.applicantMeta, { color: colors.textSecondary }]}>
                          {driver.tonnage || "-"} {driver.carType || "-"} | 경력 {careerLabel}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <RoutePreviewModal
        visible={routePreviewOpen}
        data={routePreviewData}
        errorMessage={routeWebviewError}
        onChangeError={onChangeRouteWebviewError}
        onClose={onCloseRoutePreview}
        insetTop={insetTop}
        colors={{
          bgCanvas: colors.bgCanvas,
          borderDefault: colors.borderDefault,
          textPrimary: colors.textPrimary,
          textSecondary: colors.textSecondary,
        }}
      />

      <Modal
        visible={reportOpen}
        transparent
        animationType="fade"
        onRequestClose={onCloseReport}
      >
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { backgroundColor: colors.bgSurface }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>신고 접수</Text>
              <Pressable onPress={onCloseReport} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[s.reviewLabel, { color: colors.textPrimary }]}>신고 유형</Text>
            <View style={s.reportTypeWrap}>
              {REPORT_TYPE_OPTIONS.map((item) => {
                const active = reportType === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => onChangeReportType(item.value)}
                    style={[
                      s.reportTypeChip,
                      {
                        borderColor: active ? colors.brandPrimary : colors.borderDefault,
                        backgroundColor: active ? "#EEF2FF" : colors.bgCanvas,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.brandPrimary : colors.textSecondary,
                        fontWeight: active ? "800" : "600",
                        fontSize: 13,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[s.reviewLabel, { color: colors.textPrimary, marginTop: 8 }]}>상세 내용</Text>
            <TextInput
              value={reportDescription}
              onChangeText={onChangeReportDescription}
              placeholder="신고 사유를 구체적으로 입력해주세요."
              placeholderTextColor="#94A3B8"
              style={[s.reviewInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
              multiline
            />

            <Pressable
              onPress={onSubmitReport}
              disabled={reportLoading}
              style={({ pressed }) => [
                s.reviewSubmitBtn,
                {
                  backgroundColor: "#DC2626",
                  opacity: pressed || reportLoading ? 0.75 : 1,
                },
              ]}
            >
              {reportLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.reviewSubmitText}>신고 접수</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={reviewOpen}
        transparent
        animationType="fade"
        onRequestClose={onCloseReview}
      >
        <Pressable style={s.modalBackdrop} onPress={Keyboard.dismiss}>
          <View
            style={[s.modalCard, { backgroundColor: colors.bgSurface }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>평점 남기기</Text>
              <Pressable onPress={onCloseReview} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[s.reviewLabel, { color: colors.textPrimary }]}>별점</Text>
            <View style={s.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => onChangeReviewRating(n)} style={s.starBtn}>
                  <Ionicons
                    name={n <= reviewRating ? "star" : "star-outline"}
                    size={30}
                    color={n <= reviewRating ? "#F59E0B" : "#CBD5E1"}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={[s.reviewLabel, { color: colors.textPrimary }]}>리뷰 내용</Text>
            <TextInput
              value={reviewContent}
              onChangeText={onChangeReviewContent}
              placeholder="기사님 운행에 대한 후기를 남겨주세요."
              placeholderTextColor="#94A3B8"
              style={[s.reviewInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
              multiline
            />

            <Pressable
              onPress={onSubmitReview}
              disabled={reviewLoading}
              style={({ pressed }) => [
                s.reviewSubmitBtn,
                {
                  backgroundColor: colors.brandPrimary,
                  opacity: pressed || reviewLoading ? 0.75 : 1,
                },
              ]}
            >
              {reviewLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.reviewSubmitText}>평점 등록</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
