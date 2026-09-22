/**
 * 主题 Provider：light / dark 切换，持久化到 localStorage。
 *
 * 用法：
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 *
 *   const { colors, theme, toggleTheme } = useTheme();
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { darkColors, lightColors } from "./index";
import type { ThemeMode } from "./index";

/** 颜色键集合（与 lightColors 完全一致），值为字符串色值，兼容 light / dark 两套色板 */
type Colors = { readonly [K in keyof typeof lightColors]: string };

interface ThemeContextValue {
  theme: ThemeMode;
  colors: Colors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "caloplan_theme";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage 不可用时回退
  }
  // 跟随系统偏好
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // 忽略持久化失败
    }
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const colors = theme === "dark" ? darkColors : lightColors;

  // 主题切换时：同步根背景 CSS 变量（消除深色主题下边缘浅色缝）+ 手机状态栏/浏览器栏 theme-color
  useEffect(() => {
    document.documentElement.style.setProperty("--app-bg", colors.bg);
    document.documentElement.style.setProperty("color-scheme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", colors.bg);
  }, [colors.bg, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colors, toggleTheme, setTheme }),
    [theme, colors, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx == null) {
    throw new Error("useTheme 必须在 <ThemeProvider> 内使用");
  }
  return ctx;
}
