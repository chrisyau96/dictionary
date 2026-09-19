import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = (globalThis as { process?: { env?: { VITE_BASE?: string } } }).process?.env?.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "icons/icon-mark.png", "favicon.svg", "favicon-32.png"],
      manifest: {
        name: "Vocab AI",
        short_name: "Vocab AI",
        description:
          "Offline English vocabulary study with Traditional Chinese explanations.",
        theme_color: "#6d5cff",
        background_color: "#f6f3ff",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "browser"],
        start_url: "./",
        scope: "./",
        id: "./",
        lang: "en",
        categories: ["education"],
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
        globIgnores: ["**/packs/**"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /\/packs\/.*\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "content-pack-meta",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/packs\/.*\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "content-packs",
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
