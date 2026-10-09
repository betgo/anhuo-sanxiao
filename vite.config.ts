import { defineConfig } from "vite";

export default defineConfig({
  base: "/anhuo-sanxiao/",
  server: { port: 5173, host: true },
  build: { outDir: "dist", assetsDir: "assets" },
});
