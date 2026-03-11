import React from "react";

import { PaymentService } from "@/shared/api/paymentService";
import type {
  ShipperOrderFeePreviewRequest,
  ShipperOrderFeePreviewSnapshot,
} from "@/shared/models/feePolicy";
import {
  createFallbackShipperOrderFeePreview,
  normalizeShipperOrderFeePreview,
  resolveShipperSurchargeAmount,
} from "@/shared/utils/feePolicy";

type PreviewState = {
  key: string;
  preview: ShipperOrderFeePreviewSnapshot | null;
  loading: boolean;
  errorMessage: string | null;
};

const INITIAL_STATE: PreviewState = {
  key: "",
  preview: null,
  loading: false,
  errorMessage: null,
};

export function useShipperOrderFeePreview(
  request: ShipperOrderFeePreviewRequest,
) {
  const baseFare = Math.max(0, Math.round(Number(request.baseFare) || 0));
  const laborFee = Math.max(0, Math.round(Number(request.laborFee) || 0));
  const packagingPrice = Math.max(
    0,
    Math.round(Number(request.packagingPrice) || 0),
  );
  const insuranceFee = Math.max(
    0,
    Math.round(Number(request.insuranceFee) || 0),
  );
  const surcharge = resolveShipperSurchargeAmount({
    laborFee,
    packagingPrice,
    insuranceFee,
    surcharge: request.surcharge,
  });
  const subtotal = Math.max(
    0,
    Math.round(Number(request.subtotal ?? baseFare + surcharge) || 0),
  );
  const requestKey = [
    baseFare,
    laborFee,
    packagingPrice,
    insuranceFee,
    surcharge,
    subtotal,
    request.payMethod,
    request.userLevel ?? "",
    request.firstPaymentPromoEligible ?? "",
    request.loadMethod ?? "",
    request.workType ?? "",
  ].join(":");

  const normalizedRequest = React.useMemo(
    () => ({
      baseFare,
      laborFee,
      packagingPrice,
      insuranceFee,
      surcharge,
      subtotal,
      payMethod: request.payMethod,
      userLevel: request.userLevel,
      firstPaymentPromoEligible: request.firstPaymentPromoEligible,
      loadMethod: request.loadMethod,
      workType: request.workType,
    }),
    [
      baseFare,
      insuranceFee,
      laborFee,
      packagingPrice,
      request.firstPaymentPromoEligible,
      request.loadMethod,
      request.payMethod,
      request.userLevel,
      request.workType,
      subtotal,
      surcharge,
    ],
  );

  const fallbackPreview = React.useMemo(
    () => createFallbackShipperOrderFeePreview(normalizedRequest),
    [normalizedRequest],
  );
  const [state, setState] = React.useState<PreviewState>(INITIAL_STATE);

  React.useEffect(() => {
    if (subtotal <= 0) {
      setState({
        key: requestKey,
        preview: null,
        loading: false,
        errorMessage: null,
      });
      return;
    }

    let active = true;
    setState({
      key: requestKey,
      preview: null,
      loading: true,
      errorMessage: null,
    });

    void PaymentService.previewShipperOrderCharge(normalizedRequest)
      .then((response) => {
        if (!active) return;
        setState({
          key: requestKey,
          preview: normalizeShipperOrderFeePreview(response, normalizedRequest),
          loading: false,
          errorMessage: null,
        });
      })
      .catch((error: any) => {
        if (!active) return;
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "서버 preview를 불러오지 못했습니다.";
        setState({
          key: requestKey,
          preview: null,
          loading: false,
          errorMessage: String(errorMessage),
        });
      });

    return () => {
      active = false;
    };
  }, [normalizedRequest, requestKey, subtotal]);

  const serverPreview = state.key === requestKey ? state.preview : null;

  return {
    preview: serverPreview ?? fallbackPreview,
    hasServerPreview: serverPreview !== null,
    isFallback: serverPreview === null,
    isLoading: state.key === requestKey && state.loading,
    errorMessage: state.key === requestKey ? state.errorMessage : null,
  };
}
