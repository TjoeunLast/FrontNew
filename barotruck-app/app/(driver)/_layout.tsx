import { SplashView } from "@/shared/ui/layout/SplashView";
import {
  clearStoredAuthSession,
  validateStoredSession,
} from "@/shared/utils/authSession";
import { Slot, usePathname, useRootNavigationState, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

export default function DriverLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!rootNavigationState?.key) {
      return;
    }

    let active = true;

    void (async () => {
      try {
        const result = await validateStoredSession("DRIVER");
        if (!active) return;

        if (!result.ok) {
          await clearStoredAuthSession();
          if (active) {
            setAuthorized(false);
            router.replace("/(auth)/login");
          }
          return;
        }

        setAuthorized(true);
      } catch {
        await clearStoredAuthSession();
        if (!active) return;
        setAuthorized(false);
        router.replace("/(auth)/login");
      }
    })();

    return () => {
      active = false;
    };
  }, [pathname, rootNavigationState?.key, router]);

  if (!authorized) {
    return <SplashView />;
  }

  return <Slot />;
}
