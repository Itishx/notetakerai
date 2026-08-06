import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// extension/ is the only source of truth for the shipped version. This used to
// read public/sidebrain-extension/ first, which is the retired build — so a
// version bump in extension/ was invisible to the site and the download button
// advertised a stale version next to a current zip.
const extensionManifestPaths = [
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
