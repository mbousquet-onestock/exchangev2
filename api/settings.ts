// Settings of this extension, stored in the Settings API of the Extensions app.
// GET  ?site_id=&environment=  -> { values, secrets } (secret values are never returned)
// PUT  { site_id, environment, scope: "site" | "global", values, remove } -> { saved, removed }
import { deleteSettings, readMerged, settingsConfigured, SettingsApiError, writeSettings } from "./_lib/settings-store";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function fail(error: unknown): Response {
  if (error instanceof SettingsApiError)
    return json(error.status === 404 ? 502 : error.status, { error: error.message });
  return json(500, { error: String(error) });
}

export async function GET(request: Request): Promise<Response> {
  if (!settingsConfigured()) return json(503, { error: "not_configured: SETTINGS_API_KEY is not set" });
  const params = new URL(request.url).searchParams;
  const environment = params.get("environment");
  if (!environment) return json(400, { error: "missing_fields: environment" });
  try {
    return json(200, await readMerged(params.get("site_id") ?? "", environment));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request): Promise<Response> {
  if (!settingsConfigured()) return json(503, { error: "not_configured: SETTINGS_API_KEY is not set" });
  let body: {
    site_id?: string;
    environment?: string;
    scope?: "site" | "global";
    values?: Record<string, string>;
    remove?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (!body.environment) return json(400, { error: "missing_fields: environment" });
  const siteId = body.scope === "global" ? "" : (body.site_id ?? "");
  try {
    await writeSettings(siteId, body.environment, body.values ?? {});
    await deleteSettings(siteId, body.environment, body.remove ?? []);
    return json(200, { saved: Object.keys(body.values ?? {}).length, removed: (body.remove ?? []).length });
  } catch (error) {
    return fail(error);
  }
}
