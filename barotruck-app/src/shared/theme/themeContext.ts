// src/shared/theme/themeContext.ts
import React from "react";
import { appTheme, type AppTheme } from "./appTheme";

export const ThemeContext = React.createContext<AppTheme>(appTheme);
