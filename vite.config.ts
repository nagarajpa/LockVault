import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import manifest from "./public/manifest.json";

export default defineConfig({
  plugins: [crx({ manifest }), tailwindcss()],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
      "@popup": resolve(__dirname, "src/popup"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup.html"),
      },
    },
  },
});
