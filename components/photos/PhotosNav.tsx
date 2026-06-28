import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, SunMedium, Menu, X } from "lucide-react";
import { siteData } from "@/lib/data";

export function PhotosNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateScrolled = () => setIsScrolled(window.scrollY > 8);
    const storedTheme = window.localStorage.getItem("theme") as "dark" | "light" | null;
    const preferredTheme =
      storedTheme ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(preferredTheme);
    document.documentElement.classList.toggle("light", preferredTheme === "light");
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("light", next === "light");
    window.localStorage.setItem("theme", next);
  };

  const borderColor = isScrolled ? "rgba(255,255,255,0.08)" : "transparent";
  const bgColor = isScrolled ? "rgba(8,13,20,0.82)" : "transparent";

  return (
    <header
      ref={menuRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderBottom: `1px solid ${borderColor}`,
        background: bgColor,
        backdropFilter: isScrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: isScrolled ? "blur(20px)" : "none",
        transition: "background 0.3s, border-color 0.3s",
      }}
    >
      <div style={{
        margin: "0 auto",
        maxWidth: 1280,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
      }}>
        <Link
          to="/"
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 600,
            fontSize: "14px",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--foreground)",
            textDecoration: "none",
          }}
        >
          {siteData.identity.name}
        </Link>

        {/* Desktop nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }} className="hidden-mobile">
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link
              to="/"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "var(--color-muted)" as string,
                textDecoration: "none",
              }}
            >
              ← Back
            </Link>
          </nav>
          <button
            onClick={toggleTheme}
            style={{
              display: "inline-flex",
              height: 40,
              alignItems: "center",
              gap: 8,
              borderRadius: 9999,
              border: "1px solid rgb(var(--color-divider))",
              background: "rgb(var(--color-surface))",
              padding: "0 16px",
              fontSize: "14px",
              fontWeight: 500,
              color: "rgb(var(--color-ink))",
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
            }}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark"
              ? <SunMedium size={16} />
              : <Moon size={16} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>

        {/* Mobile controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="show-mobile">
          <button
            onClick={toggleTheme}
            style={{
              display: "inline-flex",
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "1px solid rgb(var(--color-divider))",
              background: "rgb(var(--color-surface))",
              color: "rgb(var(--color-ink))",
              cursor: "pointer",
            }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: "inline-flex",
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "1px solid rgb(var(--color-divider))",
              background: "rgb(var(--color-surface))",
              color: "rgb(var(--color-ink))",
              cursor: "pointer",
            }}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(8,13,20,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}>
          <div style={{ padding: "8px 24px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "10px 0",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
              }}
            >
              ← Back to home
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
