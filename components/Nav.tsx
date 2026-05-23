"use client";

import { useEffect, useState } from "react";
import { Moon, SunMedium } from "lucide-react";

import { siteData } from "@/lib/data";

export function Nav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const updateScrolledState = () => {
      setIsScrolled(window.scrollY > 8);
    };

    const storedTheme = window.localStorage.getItem("theme") as "dark" | "light" | null;
    const preferredTheme =
      storedTheme ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

    setTheme(preferredTheme);
    document.documentElement.classList.toggle("light", preferredTheme === "light");

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
    window.localStorage.setItem("theme", nextTheme);
  };

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b border-transparent transition-all duration-300",
        isScrolled ? "border-divider/80 bg-page/80 backdrop-blur-xl" : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex w-full max-w-site items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="text-sm font-semibold uppercase tracking-[0.24em] text-ink"
        >
          {siteData.identity.name}
        </a>

        <div className="flex items-center gap-4">
          <nav aria-label="Primary" className="flex items-center gap-4 text-xs text-muted sm:gap-6 sm:text-sm">
            {siteData.nav.links.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-divider bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
