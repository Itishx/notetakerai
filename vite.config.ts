import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

const extensionManifestPath = path.resolve(__dirname, "./extension/manifest.json");
const extensionManifest = JSON.parse(fs.readFileSync(extensionManifestPath, "utf8")) as { version?: string };
const extensionVersion = extensionManifest.version ?? "0.0.0";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  define: {
    __EXTENSION_VERSION__: JSON.stringify(extensionVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
});
