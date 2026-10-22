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

/* Local dev: serve Vercel's /api/foundry-apify route from the same file, so
   Braino Foundry's search works on localhost (needs APIFY_TOKEN in .env.local). */
function foundryApi() {
  return {
    name: "foundry-api",
    configureServer(server: { middlewares: { use: (path: string, fn: (req: any, res: any) => void) => void }; ssrLoadModule: (p: string) => Promise<any> }) {
      server.middlewares.use("/api/foundry-apify", async (req, res) => {
        try {
          const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
          const tok = (env.match(/^APIFY_TOKEN=(.*)$/m) || [])[1];
          if (tok && !process.env.APIFY_TOKEN) process.env.APIFY_TOKEN = tok.trim().replace(/^["']|["']$/g, "");
          let body = "";
          for await (const c of req) body += c;
          const url = new URL(req.originalUrl || req.url, "http://localhost");
          const mod = await server.ssrLoadModule(path.resolve(__dirname, "./api/foundry-apify.js"));
          const out = { code: 200, headers: {} as Record<string, string> };
          await mod.default(
            { method: req.method, query: Object.fromEntries(url.searchParams), body: body ? JSON.parse(body) : {} },
            { setHeader: (k: string, v: string) => { out.headers[k] = v; }, status(c: number) { out.code = c; return this; }, json(d: unknown) { res.statusCode = out.code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(d)); } },
          );
        } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e) })); }
      });
    },
  };
}

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), foundryApi()],
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
