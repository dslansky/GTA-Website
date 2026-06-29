# Claude Code Prompt — Sullivan County Kosher & Jewish Business Directory site

Paste everything below the line into Claude Code, run from the directory where you want the site
(your existing site repo, or an empty folder). Put `sullivan_directory_FULL.json` in that folder first.

---

## Task

Build (or update, if a site already exists here) a fast, mobile-first **directory website** for kosher
and Jewish businesses and community services in Sullivan County, NY. All content comes from the data file
`sullivan_directory_FULL.json` in this folder. Do not hardcode listings in the markup — read them from the
JSON so the site can be re-generated when the data updates.

## Data

File: `sullivan_directory_FULL.json`. Shape:

```json
{
  "title": "Sullivan County Kosher & Jewish Directory",
  "source": "Country Vues, June 25 - July 1, 2026; merged with prior curated directory",
  "compiled": "2026-06-29",
  "category_order": ["Supermarkets & Groceries", "...", "Emergency & Community Services"],
  "verify_legend": {
    "confirmed": "Advertised/listed in current issue - open now",
    "verify": "Carried over - call to verify"
  },
  "count": 177,
  "items": [
    {
      "id": "sc-001",
      "name": "Landau's Supermarket",
      "category": "Supermarkets & Groceries",
      "town": "South Fallsburg",
      "address": "3 Railroad Plaza, South Fallsburg, NY 12779",
      "phone": "845-436-1267",
      "email": "",
      "website": "landausupstate.com",
      "verify_status": "confirmed",
      "notes": "On-site Main St Pizza + Boosur section",
      "source": "Curated + Vues 6/25/26"
    }
  ]
}
```

`id` is stable and unique — use it as the key for every list item and for future updates.
`verify_status` is either `confirmed` or `verify`.

## Required behavior

1. **Group by category**, in the exact order given by `category_order`. Render a section per category with
   its name as a heading and a count badge (e.g. "Bakeries · 6").
2. **Sticky top bar** with:
   - A **search box** that filters listings live by name, town, address, and category (case-insensitive).
   - A **town filter** dropdown built dynamically from the distinct `town` values.
   - A **category jump menu** (anchor links) to scroll to each section.
   - A **"Verified open only" toggle** that hides `verify` rows when on.
3. **Each listing card** shows: name, a verify badge, town, address, and action buttons that only appear
   when the field is non-empty:
   - Phone → `tel:` link (strip non-digits for the href, show the formatted number).
   - Email → `mailto:` link.
   - Website → `https://` link (the data stores bare domains; prefix `https://`), open in new tab, `rel="noopener"`.
   - "Directions" → Google Maps link built from the address.
   - Show `notes` as small muted text.
4. **Verify badge:** `confirmed` → green "Verified open"; `verify` → amber "Call to verify".
   Put a one-line legend near the top explaining both, using `verify_legend` text.
5. **Empty-state:** when search/filter yields nothing, show a friendly "No listings match" message.
6. **Footer:** show `source` and `compiled`, plus this note: "Catskills businesses are seasonal and change
   often — always call ahead. Verified = advertised in the current issue."

## Tech / quality constraints

- Mobile-first, responsive, accessible (semantic landmarks, labeled inputs, keyboard-navigable, sufficient
  contrast, `aria` where useful). Touch targets >= 44px.
- **No build step and no external runtime dependencies.** Vanilla HTML/CSS/JS, single `index.html` that
  `fetch`es `sullivan_directory_FULL.json` (keep the JSON as a separate file so data updates don't touch code).
- Fast: render all 177 items client-side without a framework; filtering must be instant.
- Clean, modern look. Use a deep-navy (#1F4E79) and light-blue palette to match existing materials; system
  font stack is fine. No tracking, no ads.
- If this folder already contains a site (detect framework: Next/Astro/Vite/Cloudflare Worker/Pages, etc.),
  **integrate into that stack and match its conventions** instead of scaffolding from scratch. If it is a
  Cloudflare Workers/Pages project, wire it up so `sullivan_directory_FULL.json` is served as a static asset.
- If scaffolding fresh, target static hosting (Cloudflare Pages-friendly): just `index.html` +
  `sullivan_directory_FULL.json` + optional `styles.css`/`app.js`.

## Update rules (important for future refreshes)

- Treat `sullivan_directory_FULL.json` as the single source of truth. Never edit listing data inside the HTML/JS.
- When a new data file is provided later, it will reuse the same `id`s. Updates should replace items by `id`,
  add new `id`s, and not create duplicates. If you add any tooling, key it on `id`.
- Keep `category_order` data-driven so new categories appear automatically.

## Deliverables

- The working site (scaffold or integrated).
- A short `README.md` documenting: how to update the data file, the JSON schema, the `id` update rule, and how
  to deploy (Cloudflare Pages or equivalent static host).
- Run/preview instructions so I can view it locally before deploying.
