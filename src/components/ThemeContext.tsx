// src/components/ThemeContext.tsx
"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type Theme = {
  accent:    string;
  pageBg:    string;
  navBg:     string;
  navStyle:  number;
  cardStyle: number;
  fontSize:  string;
  fontFam:   string;
};

const DEFAULT: Theme = {
  accent:    "#E8A5A5",
  pageBg:    "#FDF8F4",
  navBg:     "#FDF8F4",
  navStyle:  0,
  cardStyle: 0,
  fontSize:  "normal",
  fontFam:   "nunito",
};

const FONT_MAP: Record<string, string> = {
  nunito:  "'Nunito', system-ui, sans-serif",
  rounded: "'Trebuchet MS', sans-serif",
  serif:   "'Fraunces', Georgia, serif",
  mono:    "'Courier New', monospace",
};

const FONT_SIZE_MAP: Record<string, string> = {
  normal: "14px",
  large:  "16px",
  xlarge: "18px",
};

type Ctx = {
  theme: Theme;
  setTheme: (t: Partial<Theme>) => void;
  saved: boolean;
  saveTheme: () => void;
};

const ThemeCtx = createContext<Ctx>({
  theme: DEFAULT,
  setTheme: () => {},
  saved: false,
  saveTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT);
  const [saved, setSaved] = useState(false);

  // On mount, load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("familytime-theme");
      if (stored) setThemeState(JSON.parse(stored));
    } catch {}
  }, []);

  // Apply CSS vars whenever theme changes
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent",      theme.accent);
    r.style.setProperty("--accent-soft", theme.accent + "22");
    r.style.setProperty("--cream",       theme.pageBg);
    r.style.setProperty("--nav-bg",      theme.navBg);
    r.style.setProperty("--font-body",   FONT_MAP[theme.fontFam] || FONT_MAP.nunito);
    r.style.setProperty("--font-size-base", FONT_SIZE_MAP[theme.fontSize] || "14px");
    document.body.style.background = theme.pageBg;
    document.body.style.fontSize   = FONT_SIZE_MAP[theme.fontSize] || "14px";
  }, [theme]);

  const setTheme = useCallback((partial: Partial<Theme>) => {
    setThemeState(prev => ({ ...prev, ...partial }));
  }, []);

  const saveTheme = useCallback(() => {
    try { localStorage.setItem("familytime-theme", JSON.stringify(theme)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, saved, saveTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() { return useContext(ThemeCtx); }
