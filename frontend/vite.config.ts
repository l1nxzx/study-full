import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Identifies the deploy (Netlify sets COMMIT_REF), so data saved by an older build is discarded.
process.env.VITE_BUILD_ID ??= process.env.COMMIT_REF ?? String(Date.now());

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The manifest lives in public/; this only adds the service worker.
      manifest: false,
      registerType: "prompt",
      injectRegister: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // The main bundle is large (editor, KaTeX, charts); it still has to be cached.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
