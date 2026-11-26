import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,mdx}", "./pages/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        page: "rgb(var(--color-page) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        ocean: "rgb(var(--color-ocean) / <alpha-value>)",
        env: "rgb(var(--color-env) / <alpha-value>)",
        // figures and readings; the accent green (ocean) is for things you can press
        data: "rgb(var(--color-data) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        divider: "rgb(var(--color-divider) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(148, 163, 184, 0.08), 0 24px 48px rgba(4, 8, 16, 0.3)",
      },
      // two radii: tiles, and everything round (pills, chips, icon buttons)
      borderRadius: {
        tile: "1.25rem",
      },
      maxWidth: {
        site: "84rem",
      },
    },
  },
  plugins: [],
};

export default config;
