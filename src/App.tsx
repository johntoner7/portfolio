import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { Projects } from "@/components/Projects";

export function App() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const target = document.querySelector(hash);
    target?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  return (
    <div className="home-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:outline-none"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main-content" className="mx-auto flex w-full max-w-site flex-col gap-20 px-3 pb-10 pt-1 sm:px-6 sm:pt-2 lg:gap-28 lg:px-16 lg:pb-14">
        <Hero />
        <About />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
