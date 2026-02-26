import React, { createContext, useContext, useEffect } from 'react';

// Dark-only theme — light and system modes are removed
type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setThemeMode: (mode: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Always force dark mode on mount and clear any saved preference
    const root = window.document.documentElement;
    root.classList.remove('light', 'system');
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // No-ops — kept so existing call sites don't break
  const toggleTheme = () => { };
  const setThemeMode = (_mode: Theme) => { };

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme, setThemeMode }}>
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
