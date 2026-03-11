import type {
  FeeLevelBucket,
  FeePolicySnapshot,
  FeePreviewInput,
  FeePreviewResult,
  ShipperOrderFeePreviewRequest,
  ShipperOrderFeePreviewResponse,
  ShipperOrderFeePreviewSnapshot,
} from "@/shared/models/feePolicy";

export const DEFAULT_FEE_POLICY: FeePolicySnapshot = {
  policyConfigId: null,
  shipperSide: {
    level0Rate: 0.025,
    level1Rate: 0.02,
    level2Rate: 0.018,
    level3PlusRate: 0.015,
  },
  driverSide: {
    level0Rate: 0.025,
    level1Rate: 0.02,
    level2Rate: 0.018,
    level3PlusRate: 0.015,
  },
  shipperFirstPaymentPromoRate: 0.015,
  driverFirstTransportPromoRate: 0.015,
  tossRate: 0.1,
  minFee: 2000,
  updatedAt: null,
};

export function normalizeFeeLevel(level?: number | null): FeeLevelBucket {
  if (!Number.isFinite(level)) return 0;
  if ((level ?? 0) <= 0) return 0;
  if ((level ?? 0) === 1) return 1;
  if ((level ?? 0) === 2) return 2;
  return 3;
}

export function getFeeLevelLabel(level: FeeLevelBucket) {
  return level >= 3 ? "Lv.3+" : `Lv.${level}`;
}

export function formatFeeRatePercent(rate: number) {
  const percent = rate * 100;
  const rounded = Math.round(percent * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}%`;
}

export function resolveFeeRate(
  level: FeeLevelBucket,
  policy: FeePolicySnapshot = DEFAULT_FEE_POLICY,
) {
  const side = policy.shipperSide ?? DEFAULT_FEE_POLICY.shipperSide;
  if (level === 0) return side.level0Rate;
  if (level === 1) return side.level1Rate;
  if (level === 2) return side.level2Rate;
  return side.level3PlusRate;
}

export function calculateShipperFeePreview(
  input: FeePreviewInput,
): FeePreviewResult {
  const amount = Math.max(0, Math.round(Number(input.amount) || 0));
  const policy: FeePolicySnapshot = {
    ...DEFAULT_FEE_POLICY,
    ...input.policy,
    shipperSide: {
      ...DEFAULT_FEE_POLICY.shipperSide,
      ...input.policy?.shipperSide,
    },
    driverSide: {
      ...DEFAULT_FEE_POLICY.driverSide,
      ...input.policy?.driverSide,
    },
  };
  const appliedLevel = normalizeFeeLevel(input.userLevel);

  if (amount <= 0) {
    return {
      appliedLevel,
      appliedRate: 0,
      appliedRateText: "0%",
      fee: 0,
      postTossBaseAmount: 0,
      chargedTotal: amount,
      promoApplied: false,
      minFeeApplied: false,
    };
  }

  let appliedRate = resolveFeeRate(appliedLevel, policy);
  let promoApplied = false;
  if (input.firstPaymentPromoEligible) {
    appliedRate = policy.shipperFirstPaymentPromoRate;
    promoApplied = true;
  }

  const tossFeeAmount =
    input.payMethod === "card"
      ? Math.round(amount * policy.tossRate)
      : 0;
  const postTossBaseAmount = Math.max(0, amount - tossFeeAmount);

  let fee = Math.round(postTossBaseAmount * appliedRate);
  let minFeeApplied = false;
  if (fee < policy.minFee) {
    fee = policy.minFee;
    minFeeApplied = true;
  }
  fee = Math.min(fee, postTossBaseAmount);

  return {
    appliedLevel,
    appliedRate,
    appliedRateText: formatFeeRatePercent(appliedRate),
    fee,
    postTossBaseAmount,
    chargedTotal: amount,
    promoApplied,
    minFeeApplied,
  };
}

function sanitizeAmount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.round(parsed));
}

function sanitizeRate(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, parsed);
}

function sumDefinedAmounts(values: unknown[]) {
  let hasValue = false;
  let total = 0;

  values.forEach((value) => {
    const amount = sanitizeAmount(value);
    if (amount === undefined) return;
    hasValue = true;
    total += amount;
  });

  return hasValue ? total : undefined;
}

export function resolveShipperSurchargeAmount(
  input: Pick<
    ShipperOrderFeePreviewRequest,
    "laborFee" | "packagingPrice" | "insuranceFee" | "surcharge"
  >,
) {
  const explicit = sanitizeAmount(input.surcharge);
  if (explicit !== undefined) return explicit;

  return (
    sumDefinedAmounts([
      input.laborFee,
      input.packagingPrice,
      input.insuranceFee,
    ]) ?? 0
  );
}

export function createFallbackShipperOrderFeePreview(
  input: ShipperOrderFeePreviewRequest,
): ShipperOrderFeePreviewSnapshot {
  const baseFare = sanitizeAmount(input.baseFare) ?? 0;
  const surcharge = resolveShipperSurchargeAmount(input);
  const subtotal = sanitizeAmount(input.subtotal) ?? baseFare + surcharge;
  const feePreview = calculateShipperFeePreview({
    amount: subtotal,
    payMethod: input.payMethod,
    userLevel: input.userLevel,
    firstPaymentPromoEligible: input.firstPaymentPromoEligible,
  });

  return {
    baseFare,
    surcharge,
    subtotal,
    postTossBaseAmount: feePreview.postTossBaseAmount,
    feeRate: feePreview.appliedRate,
    feeAmount: feePreview.fee,
    chargedTotal: feePreview.chargedTotal,
    promoApplied:
      input.firstPaymentPromoEligible === undefined
        ? null
        : feePreview.promoApplied,
    minFeeApplied: feePreview.minFeeApplied,
    appliedFeeLevel: feePreview.appliedLevel,
    appliedRateText: feePreview.appliedRateText,
    source: "fallback",
  };
}

export function normalizeShipperOrderFeePreview(
  response: ShipperOrderFeePreviewResponse,
  input: ShipperOrderFeePreviewRequest,
): ShipperOrderFeePreviewSnapshot {
  const fallback = createFallbackShipperOrderFeePreview(input);
  const raw = response as Record<string, unknown>;

  const baseFare = fallback.baseFare;
  const surcharge =
    fallback.surcharge;
  const subtotal = sanitizeAmount(response.baseAmount) ?? fallback.subtotal;
  const feeRate = sanitizeRate(response.shipperFeeRate) ?? fallback.feeRate;
  const feeAmount = sanitizeAmount(response.shipperFeeAmount) ?? fallback.feeAmount;
  const chargedTotal =
    sanitizeAmount(response.shipperChargeAmount) ?? fallback.chargedTotal;
  const appliedFeeLevelRaw =
    response.shipperAppliedLevel ?? raw.appliedFeeLevel ?? raw.appliedLevel;
  const appliedFeeLevel =
    appliedFeeLevelRaw === undefined || appliedFeeLevelRaw === null
      ? fallback.appliedFeeLevel
      : normalizeFeeLevel(Number(appliedFeeLevelRaw));

  return {
    baseFare,
    surcharge,
    subtotal,
    postTossBaseAmount:
      sanitizeAmount(response.postTossBaseAmount) ?? fallback.postTossBaseAmount,
    feeRate,
    feeAmount,
    chargedTotal,
    promoApplied:
      typeof response.shipperPromoApplied === "boolean"
        ? response.shipperPromoApplied
        : fallback.promoApplied,
    minFeeApplied:
      typeof response.shipperMinFeeApplied === "boolean"
        ? response.shipperMinFeeApplied
        : fallback.minFeeApplied,
    appliedFeeLevel,
    appliedRateText:
      formatFeeRatePercent(feeRate),
    source: "server",
  };
}
