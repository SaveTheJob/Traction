import React, { createContext, useContext, useEffect, useState } from "react";

interface BackgroundConfig {
  value: string;
  type: "color" | "image";
}

interface ThemeContextType {
  backgroundConfig: BackgroundConfig;
  setBackgroundConfig: (config: BackgroundConfig) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>(
    () => {
      try {
        const stored = localStorage.getItem("app-theme-config");
        return stored
          ? JSON.parse(stored)
          : { value: "/wallpapers/default.jpeg", type: "image" };
      } catch (e) {
        return { value: "/wallpapers/default.jpeg", type: "image" };
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
