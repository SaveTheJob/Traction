import React, { createContext, useContext, useEffect, useState } from "react";

interface BackgroundConfig {
  value: string;
  type: "color" | "image";
  overlayOpacity?: number; // 0-100
  glassOpacity?: number;   // 0-100
}

interface ThemeContextType {
  backgroundConfig: BackgroundConfig;
  setBackgroundConfig: (config: BackgroundConfig | ((prev: BackgroundConfig) => BackgroundConfig)) => void;
}

const DEFAULT_WALLPAPER = "/wallpapers/default.jpeg";
const THEME_VERSION = "v3"; // bump to reset all users to new default

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
          return { overlayOpacity: 14, glassOpacity: 32, ...parsed };
        }
        return { value: DEFAULT_WALLPAPER, type: "image", overlayOpacity: 14, glassOpacity: 32 };
      } catch (e) {
        return { value: DEFAULT_WALLPAPER, type: "image", overlayOpacity: 14, glassOpacity: 32 };
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

    // Apply the opacity CSS rules dynamically (converting 0-100 to 0.0-1.0)
    const overlay = backgroundConfig.overlayOpacity ?? 14;
    const glass = backgroundConfig.glassOpacity ?? 32;

    document.documentElement.style.setProperty("--app-bg-overlay", (overlay / 100).toString());
    document.documentElement.style.setProperty("--app-glass-opacity", (glass / 100).toString());

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
