import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
    proxy: {
      // em desenvolvimento, encaminha /api para o backend Express
      "/api": "http://localhost:3001",
    },
  },
});
