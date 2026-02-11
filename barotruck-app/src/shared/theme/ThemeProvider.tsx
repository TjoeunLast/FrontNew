// src/shared/theme/ThemeProvider.tsx
import React, { createContext, useMemo, type PropsWithChildren } from "react";
import { appTheme, type AppTheme } from "./appTheme";

export const ThemeContext = createContext<AppTheme>(appTheme);

export function ThemeProvider({ children }: PropsWithChildren) {
  const value = useMemo(() => appTheme, []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}