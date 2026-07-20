# Greentree Acres Website

Community site for Greentree Acres (GTA) — a single Cloudflare Worker (`worker.js`) that serves the static pages in this repo and handles all dynamic API routes (uploads, admin, orders, push notifications, etc). No build step, no framework, no npm dependencies.

## Stack

- **Hosting/runtime:** Cloudflare Workers, deployed via [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- **Static assets:** served directly from the repo root via the `[assets]` binding in `wrangler.toml`
- **Data:** one KV namespace (`ORDERS`, despite the name — it's the general-purpose store for orders, memories metadata, gazette/magazine metadata, push subscriptions, the residents gate, rate limits, etc., all separated by key prefix) and one R2 bucket (`MEMORIES` — photos/videos, gazette/magazine PDFs, same prefix-separation approach)
- **Pages:** `index.html`, `shop.html`, `memories.html`, `residents.html`, `gazette.html`, `magazines.html`, `entertainment.html`, `ferndale.html`, `local.html`, `zmanim.html` — each self-contained (inline `<style>`/`<script>`), sharing `css/styles.css` and `js/main.js` for nav/reveal/video-modal behavior. Nav markup is duplicated across all pages (no templating) — a nav change means editing all of them.

## Local development

Requires Node 22+.

```bash
npx wrangler dev --persist-to <some-dir-outside-the-repo>
```

`--persist-to` keeps local KV/R2 state out of the repo. Secrets for local dev live in `.dev.vars` (gitignored — see below for what's needed).

## Deploying

```bash
npx wrangler deploy
```

If a deploy touches `css/styles.css` or any `js/*.js` file, bump `CACHE_VERSION` at the top of `sw.js` first — the service worker cache-first-loads those and won't pick up changes for returning visitors otherwise. Plain HTML content changes don't need a bump (HTML navigations are network-first).

## Secrets

Set via `wrangler secret put <NAME>` (production) and mirrored in `.dev.vars` (local, gitignored):

| Secret | Purpose |
|---|---|
| `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` | Admin panel login (`/admin/login`) |
| `SESSION_SECRET` | HMAC-signs the admin session cookie and the residents-directory gate token |
| `UPDATES_API_KEY` | Bearer key for the Colony Updates ingestion endpoint |
| `SHEETS_WEBHOOK_URL` / `SHEETS_WEBHOOK_SECRET` | Google Apps Script webhook that mirrors shop orders into a Google Sheet — see below |

## Admin panel

`/admin` (behind `/admin/login`) has tabs for notifications, gazette, magazines, memories, colony updates, residents-directory management, and analytics. Shop orders aren't in a dedicated tab yet — they're exported as CSV from `/order` (GET, admin-authenticated).

## Shop + Google Sheets order sync

`shop.html` is a full cart/checkout flow (size + qty pickers, some items also offer a color option, slide-in cart drawer, running total). Submitting an order POSTs to `/order`, which:

1. Writes the order to the `ORDERS` KV namespace (source of truth; also what the admin CSV export reads from).
2. Best-effort POSTs the same order to `env.SHEETS_WEBHOOK_URL` (a Google Apps Script Web App bound to a Google Sheet), so the order list can be shared with volunteers without giving them admin access. Wrapped in try/catch — a Sheets outage never blocks or fails an order.

The Apps Script writes **one row per line-item** (not per order) — columns: `Order ID | Timestamp | Name | Email | Item Name | Color | Size | Quantity | Item Cost`. Multiple items in one order share the same Order ID/Timestamp so they can be grouped. It expects a shared secret in the POST body matching `SHEETS_WEBHOOK_SECRET`.

There's no npm dependencies in this repo, so rather than doing OAuth/JWT signing to call the Sheets API directly, this uses a Google Apps Script Web App as a lightweight authenticated proxy — same shared-secret-bearer idiom as `UPDATES_API_KEY` elsewhere in `worker.js`. To point this at a new/different Sheet: open it, Extensions → Apps Script, paste a `doPost(e)` handler with the same shape (validate `body.secret`, loop `body.items` and `appendRow` per item), deploy as a Web App (Execute as: Me, Access: Anyone), and set the deployment URL + your chosen secret as the two Worker secrets above.

Apps Script gotcha worth knowing: its `/exec` URLs always respond with an HTTP 302 to a `script.googleusercontent.com` echo URL — that's normal, not an error. The actual script execution (e.g. the `appendRow` calls) happens synchronously on the initial request, before the redirect is returned.
