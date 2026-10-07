import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { proxyRequest } from "./api/proxy";

// Serves /api/proxy during `vite dev`, mirroring the Vercel function in api/proxy.ts.
function devProxy(): Plugin {
  return {
    name: "onestock-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/proxy", async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = Buffer.concat(chunks);
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (typeof value === "string") headers.set(key, value);
        }
        const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
          method: req.method,
          headers,
          body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
        });
        try {
          const response = await proxyRequest(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devProxy()],
});
