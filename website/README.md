# QuickCards — web

The web app version of [QuickCards](../README.md). Paste a vocab list, JSON, CSV, TSV, Markdown table, or TOML and export to TXT / CSV / JSON / PDF / Anki — entirely in your browser.

Live at **[quickcards.oseifert.ch](https://quickcards.oseifert.ch)**.

## Run locally

```bash
bun install
bun run dev        # localhost:5173
```

### Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Vite dev server |
| `bun run build` | Static build to `build/` |
| `bun run preview` | Serve the static build |
| `bun test` | Parser unit tests (73 — 15 delimiters, JSON variants, CSV, TOML, Markdown tables, alternating + blank-line pairs, encoding edge cases) |
| `bun run check` | `svelte-check` type validation |

## Architecture

- **Fully static.** `adapter-static` with `prerender = true` on every route. No server runtime, no per-request SSR. Build-time SSR generates real HTML for SEO; the client hydrates.
- **URL-based state.** On Continue from the home page, the parsed set (title + cards) is JSON-serialized, compressed via [`lz-string`](https://github.com/pieroxy/lz-string), and placed in `/process?d=…`. Sharing the URL reproduces the export on the other side. Sets too large for a URL (> 8000 chars compressed) fall back to `sessionStorage` and mark themselves as non-shareable.
- **Lazy + warmed heavy libs.** `jspdf`, `ankipack`, and `sql.js` WASM are dynamic-`import()`ed only when a user clicks that export. On mount, they're also fetched in the background via `requestIdleCallback`, so first-click feels instant.
- **Real Save-As dialogs.** Downloads use the File System Access API (`showSaveFilePicker`) when available — the loading state on the button holds until the user accepts or cancels, and no stray files end up in `~/Downloads` when they change their mind. Falls back to a blob download on Firefox/Safari.
- **Dark theme only.** `<html class="dark">` at the shell level; `--primary` + cool neutral tokens match the extension exactly.

## Tech stack

- SvelteKit 2 + Svelte 5 (runes)
- Tailwind CSS v4
- [shadcn-svelte](https://shadcn-svelte.com) components (bits-ui + tailwind-variants)
- [Lucide](https://lucide.dev) icons (`@lucide/svelte`)
- [`lz-string`](https://github.com/pieroxy/lz-string) — URL compression
- [`jspdf`](https://github.com/parallax/jsPDF) + [`hyphen`](https://github.com/ytiurin/hyphen) — PDF generation with syllable-aware wrapping
- [`ankipack`](https://github.com/ImGajeed76/ankipack) + [`sql.js`](https://sql.js.org) — `.apkg` generation with FSRS settings

## SEO / social preview

- Per-page `<title>`, `<meta description>`, Open Graph, Twitter card
- Canonical URL per route
- JSON-LD `SoftwareApplication` schema on the homepage
- `/process` is `noindex` (URLs carry user content)
- `sitemap.xml` prerendered at build, `robots.txt` disallows `/process`
- 1200×630 `og.png` in `static/` — regenerate by temporarily adding a `/og` route with a fixed-size card, screenshotting the element, then `magick input.png -trim +repage -resize 1200x630! static/og.png`

## Deploy

Vercel — project settings:

| Setting | Value |
|---|---|
| Root Directory | `website` |
| Framework Preset | SvelteKit (auto-detected) |
| Build Command | `bun run build` |
| Output Directory | `build` |
| Install Command | `bun install` |

Then add `quickcards.oseifert.ch` as a custom domain via DNS CNAME to Vercel.

Because the output is pure static, the same `build/` folder also deploys to Cloudflare Pages, Netlify, GitHub Pages, or any static host — swap the adapter only if you need platform-specific features.

## Why Quizlet URLs don't fetch here

Quizlet's web API sits behind Cloudflare with `Cross-Origin-Resource-Policy: same-origin` and active bot challenges. Browsers can't `fetch()` it from another origin, and server-side proxies get challenged too (datacenter IPs are pre-flagged by Cloudflare's bot management). The extension works because it runs in the user's own browser session on `quizlet.com`, carrying their real cookies and TLS fingerprint.

When a Quizlet URL is pasted here, `/process` shows an install-the-extension view with the set URL(s) listed, instead of attempting a fetch that would fail.
