import { About } from "@/components/About";
import { EmbedsSection } from "@/components/EmbedsSection";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { Projects } from "@/components/Projects";

export function App() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:outline-none"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main-content" className="mx-auto flex w-full max-w-site flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Hero />
        <About />
        <Projects />
        <EmbedsSection />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
