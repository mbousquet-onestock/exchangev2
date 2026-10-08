import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { proxyRequest } from "./api/proxy";
import * as settingsApi from "./api/settings";

type Handler = (request: Request) => Promise<Response>;

// Serves the api/ functions during `vite dev`, as Vercel does once deployed.
function devApi(): Plugin {
  const routes: Record<string, Partial<Record<string, Handler>>> = {
    "/api/proxy": { GET: proxyRequest, POST: proxyRequest, PATCH: proxyRequest, PUT: proxyRequest },
    "/api/settings": { GET: settingsApi.GET, PUT: settingsApi.PUT },
  };
  return {
    name: "dev-api",
    configureServer(server) {
      for (const [path, handlers] of Object.entries(routes)) {
        server.middlewares.use(path, async (req, res) => {
          const handler = handlers[req.method ?? "GET"];
          if (!handler) {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === "string") headers.set(key, value);
          }
          const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
            method: req.method,
            headers,
            body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
          });
          try {
            const response = await handler(request);
            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            res.end(await response.text());
          } catch (error) {
            res.statusCode = 502;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: String(error) }));
          }
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Server-side variables (SETTINGS_API_KEY…) from .env files, for the dev API.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return { plugins: [react(), tailwindcss(), devApi()] };
});
