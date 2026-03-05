import React from "react";

import { Badge } from "@/shared/ui/feedback/Badge";

import type { OrderStatusInfo } from "./orderDetailStatus";

export function OrderDetailStatusBadges({
  isCompleted,
  isSettled,
  statusInfo,
  isInstant,
}: {
  isCompleted: boolean;
  isSettled: boolean;
  statusInfo: OrderStatusInfo;
  isInstant: boolean;
}) {
  if (isCompleted) {
    return (
      <Badge
        label={isSettled ? "정산완료" : "정산대기"}
        tone={isSettled ? "success" : "warning"}
        style={{ alignItems: "center" }}
      />
    );
  }

  return (
    <>
      <Badge
        label={statusInfo.label}
        tone={statusInfo.tone}
        style={{ alignItems: "center" }}
      />
      <Badge
        label={isInstant ? "바로배차" : "직접배차"}
        tone={isInstant ? "urgent" : "direct"}
        style={{ alignItems: "center" }}
      />
    </>
  );
}
