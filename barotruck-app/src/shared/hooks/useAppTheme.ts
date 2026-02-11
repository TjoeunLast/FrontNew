// src/shared/hooks/useAppTheme.ts
import { useContext } from "react";
import { ThemeContext } from "@/shared/theme/ThemeProvider";
import type { AppTheme } from "@/shared/theme/appTheme";

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}
