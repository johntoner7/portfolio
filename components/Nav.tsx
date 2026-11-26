import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, Moon, SunMedium, X } from "lucide-react";

import { siteData } from "@/lib/data";
import { PolaroidPrint } from "@/components/PolaroidPrint";
import { Mark, Wordmark } from "@/components/Wordmark";

type Theme = "dark" | "light";

function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // index.html already applied the stored or preferred theme before paint
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  const apply = (next: Theme) => {
    setTheme(next);
    document.documentElement.classList.toggle("light", next === "light");
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // storage blocked: the choice lasts for this page only
    }
  };

  return [theme, apply] as const;
}

export function Nav() {
  const [theme, setTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const { pathname } = useLocation();

  // Section anchors only exist on the homepage; elsewhere they go back to it.
  const resolve = (href: string) => (href.startsWith("#") && pathname !== "/" ? `/${href}` : href);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // On the homepage the hero already shows the name in large type, so the nav
  // carries only the mark until that heading scrolls under the bar.
  const [heroNameVisible, setHeroNameVisible] = useState(pathname === "/");
  useEffect(() => {
    const heading = pathname === "/" ? document.getElementById("hero-name") : null;
    if (!heading) {
      setHeroNameVisible(false);
      return;
    }
    const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
    const observer = new IntersectionObserver(([entry]) => setHeroNameVisible(entry.isIntersecting), {
      rootMargin: `-${navHeight}px 0px 0px 0px`,
    });
    observer.observe(heading);
    return () => observer.disconnect();
  }, [pathname]);

  const close = () => setMenuOpen(false);

  return (
    <header
      className={[
        "sticky top-0 z-50 h-[var(--nav-h)] border-b transition-colors duration-300",
        scrolled ? "border-divider/80 bg-page/85 backdrop-blur-xl" : "border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-full w-full max-w-site items-center justify-between px-4 sm:px-6 lg:px-16">
        <a href="/" aria-label={siteData.identity.name} className="-my-2 grid items-center py-2 text-ink">
          <Mark
            className={[
              "col-start-1 row-start-1 h-8 w-8 motion-safe:transition-all motion-safe:duration-300",
              heroNameVisible ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
            ].join(" ")}
          />
          <Wordmark
            className={[
              "col-start-1 row-start-1 h-[18px] w-auto motion-safe:transition-all motion-safe:duration-300 sm:h-5",
              heroNameVisible ? "pointer-events-none translate-y-1 opacity-0" : "opacity-100",
            ].join(" ")}
          />
        </a>

        {/* Desktop: this page's sections | other pages | theme */}
        <nav aria-label="Primary" className="hidden items-center gap-1 text-[15px] md:flex">
          {siteData.nav.sections.map((link) => (
            <a key={link.href} href={resolve(link.href)} className="rounded-full px-3.5 py-2.5 text-muted transition-colors hover:text-ink">
              {link.label}
            </a>
          ))}
          <span aria-hidden className="mx-2 h-5 w-px bg-divider" />
          {siteData.nav.places.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="inline-flex items-center gap-1 rounded-full px-3.5 py-2.5 text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
            >
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          ))}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-divider text-muted transition-colors hover:border-ocean hover:text-ink"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <SunMedium className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center text-ink md:hidden"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <Menu className="h-[22px] w-[22px]" />
        </button>
      </div>

      {/* Phone: a full-screen sheet, numbered like the map's plates */}
      {menuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-page px-6 pb-7 md:hidden"
        >
          <div className="flex h-[var(--nav-h)] shrink-0 items-center justify-between">
            <Wordmark title={siteData.identity.name} className="h-[18px] w-auto text-ink" />
            <button type="button" onClick={close} className="-mr-3 inline-flex h-11 w-11 items-center justify-center text-ink" aria-label="Close menu">
              <X className="h-[22px] w-[22px]" />
            </button>
          </div>

          <nav aria-label="Primary" className="mt-10 flex flex-col">
            {siteData.nav.sections.map((link, index) => (
              <a
                key={link.href}
                ref={index === 0 ? firstLinkRef : undefined}
                href={resolve(link.href)}
                onClick={close}
                className="flex items-baseline gap-3.5 border-b border-divider py-3.5 font-display text-[40px] leading-tight text-ink"
              >
                <span className="font-mono text-xs text-data">0{index + 1}</span>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-8 grid gap-2.5">
            <a href={siteData.hero.photos.href} className="relative flex h-[120px] flex-col justify-end overflow-hidden rounded-tile bg-env/10 p-4">
              <PolaroidPrint id={siteData.hero.photos.featured[0]} width={120} tape={false} className="absolute right-4 top-3 w-12" style={{ rotate: "8deg" }} />
              <span className="font-display text-[19px] text-ink">{siteData.hero.photos.title} ↗</span>
            </a>
          </div>

          <div className="mt-auto flex items-center justify-between pt-8">
            <span className="flex gap-5 text-[15px] font-semibold">
              <a href={siteData.contact.github} className="text-ocean">GitHub</a>
              <a href={siteData.contact.linkedin} className="text-ocean">LinkedIn</a>
            </span>
            <span role="group" aria-label="Theme" className="flex rounded-full border border-divider p-[3px]">
              {(["dark", "light"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={theme === option}
                  onClick={() => setTheme(option)}
                  className="h-[38px] rounded-full px-3.5 text-sm capitalize text-muted aria-pressed:bg-surface aria-pressed:text-ink"
                >
                  {option}
                </button>
              ))}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
