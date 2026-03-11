import type { PaymentProvider } from "./payment";

export type FeeLevelBucket = 0 | 1 | 2 | 3;

export interface FeePolicySideSnapshot {
  level0Rate: number;
  level1Rate: number;
  level2Rate: number;
  level3PlusRate: number;
}

export interface FeePolicySnapshot {
  policyConfigId?: number | null;
  shipperSide: FeePolicySideSnapshot;
  driverSide: FeePolicySideSnapshot;
  shipperFirstPaymentPromoRate: number;
  driverFirstTransportPromoRate: number;
  tossRate: number;
  minFee: number;
  updatedAt?: string | null;
}

export interface LevelFeePolicySnapshot {
  requestedLevel?: number | null;
  appliedLevel: FeeLevelBucket;
  rate: number;
  firstPaymentPromoRate: number;
  minFee: number;
  updatedAt?: string | null;
}

export interface FeePreviewInput {
  amount: number;
  payMethod: "card" | "prepaid";
  userLevel?: number | null;
  firstPaymentPromoEligible?: boolean;
  policy?: Partial<FeePolicySnapshot>;
}

export interface FeePreviewResult {
  appliedLevel: FeeLevelBucket;
  appliedRate: number;
  appliedRateText: string;
  fee: number;
  postTossBaseAmount: number;
  chargedTotal: number;
  promoApplied: boolean;
  minFeeApplied: boolean;
}

export interface ShipperOrderFeePreviewRequest {
  baseFare: number;
  laborFee?: number;
  packagingPrice?: number;
  insuranceFee?: number;
  surcharge?: number;
  subtotal?: number;
  payMethod: "card" | "prepaid";
  userLevel?: number | null;
  firstPaymentPromoEligible?: boolean;
  loadMethod?: string | null;
  workType?: string | null;
}

export interface FeeBreakdownPreviewResponse {
  previewMode?: string | null;
  paymentProvider?: PaymentProvider | null;
  baseAmount?: number | null;
  postTossBaseAmount?: number | null;
  shipperAppliedLevel?: number | null;
  driverAppliedLevel?: number | null;
  shipperFeeRate?: number | null;
  driverFeeRate?: number | null;
  shipperFeeAmount?: number | null;
  driverFeeAmount?: number | null;
  shipperPromoEligible?: boolean | null;
  driverPromoEligible?: boolean | null;
  shipperPromoApplied?: boolean | null;
  driverPromoApplied?: boolean | null;
  shipperMinFeeApplied?: boolean | null;
  driverMinFeeApplied?: boolean | null;
  shipperChargeAmount?: number | null;
  driverPayoutAmount?: number | null;
  tossFeeRate?: number | null;
  tossFeeAmount?: number | null;
  platformGrossRevenue?: number | null;
  platformNetRevenue?: number | null;
  negativeMargin?: boolean | null;
  policyConfigId?: number | null;
  policyUpdatedAt?: string | null;
}

export type ShipperOrderFeePreviewResponse = FeeBreakdownPreviewResponse;

export interface ShipperOrderFeePreviewSnapshot {
  baseFare: number;
  surcharge: number;
  subtotal: number;
  postTossBaseAmount: number;
  feeRate: number;
  feeAmount: number;
  chargedTotal: number;
  promoApplied: boolean | null;
  minFeeApplied: boolean;
  appliedFeeLevel: FeeLevelBucket | null;
  appliedRateText: string;
  source: "server" | "fallback";
}
