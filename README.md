# OneStock Exchange Portal (v2)

Return / exchange workflow (Items → Options → Method → Validation) packaged as a
**OneStock UI Extension**. It reads the extension context, loads the real order
from the OneStock API and shows the articles eligible for an exchange.

## How it works

1. **Context** (`src/lib/context.ts`) — OneStock opens the extension in an iframe
   with query params (`site_id`, `user_id`, `parent_url`, `host_app`, …). The app
   posts `extension_ready` to the parent, receives `onestock_data`
   (`order_id` / `order_ids`, `site_id`, `api_url`, …) and keeps the iframe height
   in sync with `extension_resize`.
   The `extension_signature` is **not** verified (no backend / JWT on purpose).
2. **Order** (`src/lib/onestock.ts`) — `GET /{version}/orders/{order_id}` sent as
   `POST` + `X-HTTP-Method-Override: GET`, with `site_id`, `token`, `fields` and
   `item_features_lang` in the body. With login/password, a token is first
   requested through `POST /{version}/login`.
3. **Articles** — each line item group becomes a row (joined to its order item
   for price and features). Rows whose state is in *Eligible line states*
   (default `fulfilled`) can be selected for return / exchange; the others are
   listed as not eligible.
4. **Settings tab** — everything the context doesn't provide: environment /
   base URL, API version, token or login/password, fallback site & order ids
   (to use the app outside OneStock), feature names (name, color, size, image),
   eligible states, exchange sizes/colors and return reasons. Stored in
   `localStorage`.

The final step builds the return / exchange request payload (displayed on the
confirmation screen); it is not yet sent to any API.

## CORS proxy

Browsers may not be allowed to call `https://{site_id}.api(.qualif).onestock-retail.com`
directly. `api/proxy.ts` is a Vercel Edge Function (also served by `vite dev`)
that forwards calls to `*.onestock-retail.com` only. Toggle it in Settings.

## Development

```bash
npm install
npm run dev        # http://localhost:5173/?site_id=c00&order_id=ORD000001
npm run build
```

Deploy on Vercel as a Vite project (the `api/` folder is picked up automatically).
