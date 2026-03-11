import type {
  DispatchJobListItemResponse,
  DispatchOfferDecisionResponse,
  DispatchOfferRejectRequest,
  DispatchRetryRequest,
  DispatchRunRequest,
  DispatchStatusResponse,
  DriverAvailabilityPayload,
  DriverAvailabilityStatus,
  DriverDispatchOfferResponse,
} from "../models/dispatch";
import apiClient from "./apiClient";

const API_BASE = "/api/v1/dispatch";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ApiResponse<T>>;
  return (
    typeof candidate.success === "boolean" &&
    "data" in candidate &&
    "message" in candidate
  );
};

const unwrap = <T>(payload: unknown): T => {
  if (!isApiResponse<T>(payload)) {
    return payload as T;
  }
  if (!payload.success) {
    throw new Error(payload.message ?? "dispatch api request failed");
  }
  return payload.data;
};

export const DispatchService = {
  runOrderDispatch: async (
    orderId: number,
    request?: DispatchRunRequest,
  ): Promise<DispatchStatusResponse> => {
    const res = await apiClient.post(`${API_BASE}/orders/${orderId}/run`, request ?? {});
    return unwrap<DispatchStatusResponse>(res.data);
  },

  retryOrderDispatch: async (
    orderId: number,
    request?: DispatchRetryRequest,
  ): Promise<DispatchStatusResponse> => {
    const res = await apiClient.post(`${API_BASE}/orders/${orderId}/retry`, request ?? {});
    return unwrap<DispatchStatusResponse>(res.data);
  },

  getOrderDispatchStatus: async (
    orderId: number,
  ): Promise<DispatchStatusResponse> => {
    const res = await apiClient.get(`${API_BASE}/orders/${orderId}/status`);
    return unwrap<DispatchStatusResponse>(res.data);
  },

  getDispatchJobStatus: async (
    dispatchJobId: number,
  ): Promise<DispatchStatusResponse> => {
    const res = await apiClient.get(`${API_BASE}/jobs/${dispatchJobId}`);
    return unwrap<DispatchStatusResponse>(res.data);
  },

  getRecentJobs: async (): Promise<DispatchJobListItemResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/jobs/recent`);
    return unwrap<DispatchJobListItemResponse[]>(res.data);
  },

  forceMatch: async (
    dispatchJobId: number,
    driverUserId: number,
  ): Promise<DispatchStatusResponse> => {
    const res = await apiClient.post(
      `${API_BASE}/jobs/${dispatchJobId}/force-match`,
      null,
      { params: { driverUserId } },
    );
    return unwrap<DispatchStatusResponse>(res.data);
  },

  updateDriverAvailability: async (
    availabilityStatus: DriverAvailabilityStatus,
  ): Promise<DriverAvailabilityPayload> => {
    const res = await apiClient.patch(`${API_BASE}/driver/availability`, {
      availabilityStatus,
    });
    return unwrap<DriverAvailabilityPayload>(res.data);
  },

  updateDriverLocation: async (
    lat: number,
    lng: number,
    recordedAt?: string,
  ): Promise<DriverAvailabilityPayload> => {
    const res = await apiClient.patch(`${API_BASE}/driver/location`, {
      lat,
      lng,
      recordedAt,
    });
    return unwrap<DriverAvailabilityPayload>(res.data);
  },

  getMyOpenOffers: async (): Promise<DriverDispatchOfferResponse[]> => {
    const res = await apiClient.get(`${API_BASE}/driver/offers`);
    return unwrap<DriverDispatchOfferResponse[]>(res.data);
  },

  acceptOffer: async (
    offerId: number,
  ): Promise<DispatchOfferDecisionResponse> => {
    const res = await apiClient.post(`${API_BASE}/offers/${offerId}/accept`);
    return unwrap<DispatchOfferDecisionResponse>(res.data);
  },

  rejectOffer: async (
    offerId: number,
    request?: DispatchOfferRejectRequest,
  ): Promise<DispatchOfferDecisionResponse> => {
    const res = await apiClient.post(
      `${API_BASE}/offers/${offerId}/reject`,
      request ?? {},
    );
    return unwrap<DispatchOfferDecisionResponse>(res.data);
  },
};
