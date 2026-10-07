// Minimal CORS proxy towards the OneStock API.
// Browsers cannot always call https://{site_id}.api.onestock-retail.com directly
// (CORS), so the front-end can route its calls through /api/proxy?url=<target>.
// Only OneStock hosts are allowed as targets.

export const config = { runtime: "edge" };

const ALLOWED_HOST = /(^|\.)onestock-retail\.com$/i;
const FORWARDED_HEADERS = ["content-type", "x-http-method-override", "auth-user", "auth-password"];

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
  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
  });

  const responseHeaders = new Headers();
  responseHeaders.set("content-type", upstream.headers.get("content-type") ?? "application/json");
  const requestId = upstream.headers.get("request-id");
  if (requestId) responseHeaders.set("request-id", requestId);
  return new Response(await upstream.text(), { status: upstream.status, headers: responseHeaders });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export default proxyRequest;
