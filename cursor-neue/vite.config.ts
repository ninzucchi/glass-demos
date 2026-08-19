import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Two demo surfaces, one build: / (desktop) and /mobile.html (mobile).
  build: {
    rollupOptions: {
      input: {
        desktop: fileURLToPath(new URL("./index.html", import.meta.url)),
        mobile: fileURLToPath(new URL("./mobile.html", import.meta.url)),
      },
    },
  },
});
