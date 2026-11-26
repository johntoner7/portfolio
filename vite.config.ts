import path from "path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { agentDocs } from "./scripts/agent-docs";

export default defineConfig({
  plugins: [react(), agentDocs()],
  server: {
    proxy: {
      "/api/unmarked-map": {
        target: "https://unmarked-game.vercel.app",
        changeOrigin: true,
        rewrite: () => "/api/players/salah/map",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
