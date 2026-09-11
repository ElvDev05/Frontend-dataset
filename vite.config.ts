import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "Registro Bovino · Captura de datos",
        short_name: "Registro Bovino",
        description: "Bovinos, evaluaciones y registro fotográfico en campo.",
        lang: "es",
        theme_color: "#064e3b",
        background_color: "#f5f7f6",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2,ttf}"],
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/health(?:\/|$)/],
        cleanupOutdatedCaches: true,
        // No runtime caching: API responses and signed R2 URLs never enter Cache Storage.
        runtimeCaching: [],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            /[\\/]node_modules[\\/](?:@vue[\\/]|vue[\\/]|vue-router[\\/]|pinia[\\/])/.test(
              id,
            )
          )
            return "vue-core";
          if (/[\\/]node_modules[\\/]axios[\\/]/.test(id)) return "http-client";
        },
      },
    },
  },
});
