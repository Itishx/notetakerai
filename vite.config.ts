import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

const extensionManifestPaths = [
  path.resolve(__dirname, "./public/sidebrain-extension/manifest.json"),
  path.resolve(__dirname, "./extension/manifest.json"),
];

function getExtensionVersion() {
  for (const manifestPath of extensionManifestPaths) {
    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { version?: string };
      if (typeof manifest.version === "string" && manifest.version.trim()) {
        return manifest.version.trim();
      }
    } catch (error) {
      console.warn(`Unable to read extension manifest at ${manifestPath}:`, error);
    }
  }

  return process.env.BRAINO_EXTENSION_VERSION ?? "0.0.0";
}

const extensionVersion = getExtensionVersion();

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
