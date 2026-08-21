import { useEffect, useState } from "react";

export function useThemeMode(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (document.documentElement.classList.contains("light") ? "light" : "dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
