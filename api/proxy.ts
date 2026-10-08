// Proxy towards the OneStock API: works around CORS (/api/proxy?url=<target>) and
// adds the OneStock credentials kept in the Settings API, so that the token never
// reaches the browser. Only OneStock hosts are allowed as targets.
import { readCredentials, settingsConfigured } from "./_lib/settings-store.js";

const ALLOWED_HOST = /(^|\.)onestock-retail\.com$/i;
const FORWARDED_HEADERS = ["content-type", "x-http-method-override", "auth-user", "auth-password"];

/** Tokens obtained through POST /login with the stored credentials, per site / environment. */
const loginTokens = new Map<string, { token: string; expires: number }>();
const LOGIN_TTL_MS = 10 * 60 * 1000;

/** "qualif" for *.api.qualif.onestock-retail.com, else "prod". */
function environmentOf(host: string): string {
  return /\.qualif\./i.test(host) ? "qualif" : "prod";
}

async function serverToken(target: URL, siteId: string, forceLogin: boolean): Promise<string | undefined> {
  if (!settingsConfigured() || !siteId) return undefined;
  // In prod without stored credentials, the qualif ones are used.
  // Cached credentials, re-read after a 401 (token changed in the Settings API).
  const { values, environment } = await readCredentials(siteId, environmentOf(target.hostname), {
    fresh: forceLogin,
  });
  if (values.onestock_token && !forceLogin) return values.onestock_token;

  const userId = values.onestock_user_id;
  const password = values.onestock_password;
  if (!userId || !password) return values.onestock_token;
  const cacheKey = `${environment}|${siteId}|${userId}`;
  const cached = loginTokens.get(cacheKey);
  if (cached && cached.expires > Date.now() && !forceLogin) return cached.token;

  // Same host and API version as the target call.
  const version = target.pathname.match(/^\/v\d+/)?.[0] ?? "";
  const response = await fetch(`${target.origin}${version}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ site_id: siteId, user_id: userId, password }),
  });
  if (!response.ok) return undefined;
  const { token } = (await response.json()) as { token?: string };
  if (token) loginTokens.set(cacheKey, { token, expires: Date.now() + LOGIN_TTL_MS });
  return token;
}

export async function proxyRequest(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) return json(400, { error: "Missing 'url' query parameter" });

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return json(400, { error: "Invalid target url" });
  }
  if (targetUrl.protocol !== "https:" || !ALLOWED_HOST.test(targetUrl.hostname)) {
    return json(403, { error: `Target host not allowed: ${targetUrl.hostname}` });
  }

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const rawBody = hasBody ? await request.text() : undefined;
  let body: Record<string, unknown> | undefined;
  try {
    body = rawBody ? JSON.parse(rawBody) : undefined;
  } catch {
    body = undefined;
  }
  // No token from the browser: use the credentials of the Settings API (except for /login itself).
  const injectToken = !!body && !body.token && !/\/login$/.test(targetUrl.pathname);

  const send = async (forceLogin: boolean) => {
    let payload = rawBody;
    if (injectToken && body) {
      const token = await serverToken(targetUrl, String(body.site_id ?? ""), forceLogin);
      if (token) payload = JSON.stringify({ ...body, token });
    }
    return fetch(targetUrl, { method: request.method, headers, body: payload });
  };

  let upstream = await send(false);
  // Expired login token: log in again once.
  if (upstream.status === 401 && injectToken) upstream = await send(true);

  const responseHeaders = new Headers();
  responseHeaders.set("content-type", upstream.headers.get("content-type") ?? "application/json");
  const requestId = upstream.headers.get("request-id");
  if (requestId) responseHeaders.set("request-id", requestId);
  return new Response(await upstream.text(), { status: upstream.status, headers: responseHeaders });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// Vercel Node.js functions (Web Request / Response signature).
export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
