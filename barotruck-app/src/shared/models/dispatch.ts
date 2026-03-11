export type DispatchJobType = "INITIAL" | "REASSIGN" | "RESCUE";

export type DispatchJobStatus =
  | "QUEUED"
  | "SEARCHING"
  | "OFFERING"
  | "WAITING_RESPONSE"
  | "MATCHED"
  | "FAILED"
  | "CANCELLED";

export type DispatchMode = "MANUAL" | "AUTO_OFFER" | "AUTO_ASSIGN";

export type DispatchPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type DispatchOfferStatus =
  | "PENDING"
  | "PUSH_SENT"
  | "OPENED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type DriverAvailabilityStatus =
  | "ONLINE"
  | "OFFLINE"
  | "BUSY"
  | "RESTING"
  | "BLOCKED";

export interface DispatchRunRequest {
  forceRebuild?: boolean;
  reason?: string;
}

export interface DispatchRetryRequest {
  jobType?: DispatchJobType;
  reasonCode?: string;
}

export interface DispatchOfferRejectRequest {
  reasonCode?: string;
}

export interface DriverAvailabilityUpdateRequest {
  availabilityStatus: DriverAvailabilityStatus;
}

export interface DriverLocationUpdateRequest {
  lat: number;
  lng: number;
  recordedAt?: string;
}

export interface DispatchOfferDecisionResponse {
  offerId: number;
  dispatchJobId: number;
  orderId: number;
  accepted: boolean;
  jobStatus: DispatchJobStatus | string;
  orderStatus: string;
}

export interface DriverDispatchOfferResponse {
  offerId: number;
  dispatchJobId: number;
  orderId: number;
  orderStatus: string;
  status: DispatchOfferStatus | string;
  wave: number;
  rank: number;
  score?: number;
  distanceKm?: number;
  etaMinutes?: number;
  expireAt?: string;
  scoreBreakdownJson?: string;
}

export interface DispatchJobSnapshot {
  dispatchJobId: number;
  jobType?: DispatchJobType | string;
  status?: DispatchJobStatus | string;
  wave?: number;
  dispatchMode?: DispatchMode | string;
  dispatchPriority?: DispatchPriority | string;
  candidateCount?: number;
  matchedDriverUserId?: number;
  failureReasonCode?: string;
  failureReasonMessage?: string;
  startedAt?: string;
  lastWaveStartedAt?: string;
  expiresAt?: string;
  closedAt?: string;
}

export interface DispatchSummary {
  offersSent: number;
  offersOpen: number;
  offersRejected: number;
  offersExpired: number;
  offersCancelled: number;
}

export interface DispatchMatchedDriver {
  driverUserId: number;
  driverId?: number;
  nickname?: string;
  carNum?: string;
  carType?: string;
  tonnage?: number;
}

export interface DispatchOfferSnapshot {
  offerId: number;
  driverUserId: number;
  wave: number;
  rank: number;
  status: DispatchOfferStatus | string;
  score?: number;
  distanceKm?: number;
  etaMinutes?: number;
  sentAt?: string;
  expireAt?: string;
  respondedAt?: string;
  rejectReasonCode?: string;
  closedReason?: string;
  scoreBreakdownJson?: string;
}

export interface DispatchStatusResponse {
  orderId: number;
  orderStatus: string;
  dispatchPublicStatus: string;
  job?: DispatchJobSnapshot | null;
  summary?: DispatchSummary | null;
  matchedDriver?: DispatchMatchedDriver | null;
  offers: DispatchOfferSnapshot[];
}

export interface DispatchJobListItemResponse {
  dispatchJobId: number;
  orderId: number;
  jobType?: DispatchJobType | string;
  status?: DispatchJobStatus | string;
  wave?: number;
  failureReasonCode?: string;
  startedAt?: string;
  expiresAt?: string;
  closedAt?: string;
}

export interface DriverAvailabilityPayload {
  driverUserId: number;
  availabilityStatus: DriverAvailabilityStatus | string;
  activeOrderId?: number;
  activeOrderStatus?: string;
  updatedAt?: string;
}
