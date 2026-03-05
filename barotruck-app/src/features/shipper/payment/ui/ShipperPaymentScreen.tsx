import React from "react";

import ShipperPaymentMethodsScreen from "@/features/common/settings/ui/ShipperPaymentMethodsScreen";

export default function ShipperPaymentScreen() {
  // 화주 결제 화면은 기존 결제수단 설정 UI를 재사용.
  return <ShipperPaymentMethodsScreen />;
}
