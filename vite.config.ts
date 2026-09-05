import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "favicon.svg"],
      manifest: {
        name: "Chris Offline Vocabulary Coach",
        short_name: "Vocab Coach",
        description:
          "Offline English vocabulary study with Traditional Chinese explanations.",
        theme_color: "#1f5c4d",
        background_color: "#f6f1e8",
        display: "standalone",
        start_url: "/",
        lang: "en",
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
        globPatterns: ["**/*.{js,css,html,svg,png,json,webmanifest}"],
        // Audio is installed into IndexedDB, not precached with the app shell.
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /\/packs\/.*\.(?:json|mp3)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "content-packs",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
