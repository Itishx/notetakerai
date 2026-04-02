import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "default" | "clean";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "default", toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("sb-theme") as Theme) || "default";
    }
    return "default";
  });

  useEffect(() => {
    localStorage.setItem("sb-theme", theme);
    document.documentElement.classList.toggle("theme-clean", theme === "clean");
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "default" ? "clean" : "default"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
