"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "rose" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "rose",
  setTheme: () => {},
  toggleTheme: () => {},
  cycleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("rose");
  function applyTheme(t: Theme) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("dark", "rose");
    if (t === "rose") {
      root.classList.add("rose");
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("galerikita_theme");
    if (saved === "light" || saved === "rose") {
      setThemeState(saved as Theme);
      applyTheme(saved as Theme);
    } else {
      // Default to "rose" (Pink Romantis berdua), reset if previously dark
      setThemeState("rose");
      applyTheme("rose");
      try {
        localStorage.setItem("galerikita_theme", "rose");
      } catch {
        // ignore
      }
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem("galerikita_theme", t);
    } catch {
      // ignore
    }
    applyTheme(t);
  };

  const cycleTheme = () => {
    if (theme === "rose") setTheme("light");
    else setTheme("rose");
  };

  const toggleTheme = () => {
    cycleTheme();
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
