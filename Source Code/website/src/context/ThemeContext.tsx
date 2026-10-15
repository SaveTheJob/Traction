/* eslint-disable react-refresh/only-export-components -- context file intentionally exports its provider and consumer hook together */
import React, { createContext, useContext, useEffect, useState } from "react";

interface BackgroundConfig {
  value: string;
  type: "color" | "image" | "mesh" | "aura";
  glassOpacity?: number; // 0-100
  showNoise?: boolean;
  showGeometric?: boolean;
}

interface ThemeContextType {
  backgroundConfig: BackgroundConfig;
  setBackgroundConfig: (
    config: BackgroundConfig | ((prev: BackgroundConfig) => BackgroundConfig),
  ) => void;
}

const DEFAULT_WALLPAPER = "#0B0F19";
const THEME_VERSION = "v13"; // bump to load Obsidian Dark defaults

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>(
    () => {
      try {
        // Version check: if stored version is old, wipe cached theme
        const storedVersion = localStorage.getItem("app-theme-version");
        if (storedVersion !== THEME_VERSION) {
          localStorage.removeItem("app-theme-config");
          localStorage.setItem("app-theme-version", THEME_VERSION);
        }
        const stored = localStorage.getItem("app-theme-config");
        if (stored) {
          const parsed = JSON.parse(stored);
          return { glassOpacity: 15, ...parsed };
        }
        return {
          value: DEFAULT_WALLPAPER,
          type: "color",
          glassOpacity: 15,
        };
      } catch {
        return {
          value: DEFAULT_WALLPAPER,
          type: "color",
          glassOpacity: 15,
        };
      }
    },
  );

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const prop =
      backgroundConfig.type === "image"
        ? `url('${backgroundConfig.value}')`
        : backgroundConfig.value;
    document.documentElement.style.setProperty("--primary-gradient", prop);

    const glass = backgroundConfig.glassOpacity ?? 28;
    document.documentElement.style.setProperty(
      "--app-glass-opacity",
      (glass / 100).toString(),
    );
    document.documentElement.style.setProperty(
      "--app-glass-heavy",
      Math.min(glass / 100 + 0.38, 1).toString(),
    );

    localStorage.setItem("app-theme-config", JSON.stringify(backgroundConfig));
  }, [backgroundConfig]);

  return (
    <ThemeContext.Provider value={{ backgroundConfig, setBackgroundConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
