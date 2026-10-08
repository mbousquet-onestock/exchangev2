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
   `item_features_lang` in the body. The fields are those of the reference
   payload, including `parent_order_id` (`{name}` features expanded to the
   features set in Settings). With login/password, a token is first
   requested through `POST /{version}/login`.
3. **Articles** — each line item group becomes a row (joined to its order item
   for price and features). Rows whose state is in *Eligible line states*
   (default `fulfilled`) can be selected for return / exchange; the others are
   listed as not eligible.
   **Return rules** (item sheet): a return needs `eligible_retour` to be true
   (oui / true / 1) and the withdrawal period `delai_retractation` (days) not to
   be over; it starts at the last state change of the line (fulfilment /
   delivery), or at the order date. A missing feature does not block the
   return. Items that cannot be returned can still be exchanged (reshipped).
4. **Language** (`src/lib/i18n.tsx`) — the interface follows the `lang` (and
   `locale`, for prices) sent in the context: English, French, Spanish, German
   and Italian, English as fallback. It can be forced in Settings. Item features
   are requested in the same language unless set otherwise.
5. **Reasons** — return and exchange have their own reason lists (switching the
   action resets the reason). Empty lists in Settings use translated defaults
   (return: *Rétractation, Ne convient pas*; exchange: *Casse, Perte
   transporteur* — reshipment only for breakage or carrier loss).
6. **Stock & substitutes** (`src/lib/catalog.ts`) — when an item is set to
   *exchange*: *Replacement* shows the sheet and stock of the ordered item;
   *Substitution* lists the substitution items whose ids are in the ordered
   item's `substitution` feature (`order_items.item.features.substitution`),
   with their item sheet (`GET /items`: `item_ids`, then a pattern search on
   each id as fallback) and their stock. Out-of-stock substitutes cannot be
   chosen. Stock comes from `GET /stock_export` with the stock query set in
   Settings (default `detailed`), summed over locations and stock types.
   Images come from the first image feature found (`image_url, image` by
   default), else from any feature value that looks like an image URL.
7. **Settings tab** — hidden from customers: open it with the invisible gear
   button left of *Cancel* in the footer (it appears on hover / focus). It holds
   everything the context doesn't provide: environment /
   base URL, API version, token or login/password, fallback site & order ids
   (to use the app outside OneStock), feature names (name, color, size, image,
   price, substitution, sheet features), stock query and locations,
   eligible states, return and exchange reasons. Stored in
   `localStorage`.

**Confirm** (`src/lib/exchange.ts`) — on the Validation step:

- every selected line goes from its current state to the return state
  (`returning` by default, set in Settings) with `PATCH /line_item_groups`
  (`order_id`, `from`, `to`, `item_quantities`);
- if there are exchanges, a sub-order is created with `POST /orders`, attached
  to the parent order of the initial order (`parent_order_id`, or the initial
  order itself when it has none): customer, ordering, rulesets, delivery (with the contact /
  address confirmed on the Validation step), types, sales channel and
  information are copied, and the exchanged items (replacement or chosen
  substitute) are added at 0.

The sub-order id is `{order_id}-S{n}` (format in Settings): `-S1`, or `-S2`,
`-S3`… when the id already exists (checked with `GET /orders/{id}`).

Then the extension ends: it posts `extension_close` and `extension_refresh`
to OneStock (message types in Settings; not documented by OneStock), and
reloads the page it was opened from (`parent_url`, or the URL set in
Settings): the opener when opened as a popup / new tab (then the window
closes), the top page when embedded in an iframe. If none of this is
possible, the order is reloaded and the result is shown above the items.

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
