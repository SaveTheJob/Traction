import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface BackgroundConfig {
  value: string;
  type: 'color' | 'image';
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setThemeMode: (mode: Theme) => void;
  backgroundConfig: BackgroundConfig;
  setBackgroundConfig: (config: BackgroundConfig) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      return savedTheme as Theme;
    }
    return 'system';
  });

  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>(() => {
    try {
      const stored = localStorage.getItem("app-theme-config");
      return stored ? JSON.parse(stored) : { value: "/wallpapers/default.jpeg", type: "image" };
    } catch (e) {
      return { value: "/wallpapers/default.jpeg", type: "image" };
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (currentTheme: Theme) => {
      root.classList.remove('light', 'dark');

      if (currentTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(systemPrefersDark ? 'dark' : 'light');
      } else {
        root.classList.add(currentTheme);
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  useEffect(() => {
    // Apply background logic to document root
    if (backgroundConfig.type === 'image') {
      document.documentElement.style.setProperty("--primary-gradient", `url('${backgroundConfig.value}')`);
    } else {
      document.documentElement.style.setProperty("--primary-gradient", backgroundConfig.value);
    }

    localStorage.setItem("app-theme-config", JSON.stringify(backgroundConfig));
  }, [backgroundConfig]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPrefersDark ? 'light' : 'dark';
    });
  };

  const setThemeMode = (mode: Theme) => {
    setTheme(mode);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      setThemeMode,
      backgroundConfig,
      setBackgroundConfig
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
