import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(root, "client", "src") } },
  root: path.resolve(root, "client"),
  publicDir: path.resolve(root, "client", "public"),
  build: { outDir: path.resolve(root, "dist/public"), emptyOutDir: true },
  server: {
    host: true,
    port: 3000,
    proxy: { "/api": "http://localhost:3001" },
  },
});
