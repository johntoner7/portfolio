"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Moon, SunMedium, Menu, X } from "lucide-react";
import { siteData } from "@/lib/data";

export function Nav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  const resolveHref = (href: string) => (href.startsWith("#") && pathname !== "/" ? `/${href}` : href);

  useEffect(() => {
    const updateScrolledState = () => setIsScrolled(window.scrollY > 8);

    const storedTheme = window.localStorage.getItem("theme") as "dark" | "light" | null;
    const preferredTheme =
      storedTheme ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(preferredTheme);
    document.documentElement.classList.toggle("light", preferredTheme === "light");

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

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
      ref={menuRef}
    >
      <div className="mx-auto flex w-full max-w-site items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-ink">
          {siteData.identity.name}
        </a>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          <nav aria-label="Primary" className="flex items-center gap-4 text-xs text-muted sm:gap-6 sm:text-sm">
            {siteData.nav.links.map((link) => (
              <a key={link.href} href={resolveHref(link.href)} className="hover:text-ink">
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

        {/* Mobile controls */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-surface text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-surface text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-divider/80 bg-page/95 backdrop-blur-xl">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {siteData.nav.links.map((link) => (
              <a
                key={link.href}
                href={resolveHref(link.href)}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 text-sm text-muted hover:text-ink transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
