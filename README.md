# QuickCards

Export Quizlet flashcards and vocab lists to PDF, Anki, TXT, CSV, JSON, or import them straight into Knowt. No account required, no server.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/kjbjdolelcchfcmainniifnpkgikjfkc?label=chrome%20web%20store)](https://chromewebstore.google.com/detail/quickcards/kjbjdolelcchfcmainniifnpkgikjfkc)
[![Chrome Web Store users](https://img.shields.io/chrome-web-store/users/kjbjdolelcchfcmainniifnpkgikjfkc)](https://chromewebstore.google.com/detail/quickcards/kjbjdolelcchfcmainniifnpkgikjfkc)
[![Chrome Web Store rating](https://img.shields.io/chrome-web-store/rating/kjbjdolelcchfcmainniifnpkgikjfkc)](https://chromewebstore.google.com/detail/quickcards/kjbjdolelcchfcmainniifnpkgikjfkc)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Web app](https://img.shields.io/badge/web-quickcards.oseifert.ch-7B4DE4)](https://quickcards.oseifert.ch)

![QuickCards popup](assets/popup_main.png)

## Two ways to use it

**Chrome extension** ([install from the Chrome Web Store](https://chromewebstore.google.com/detail/quickcards/kjbjdolelcchfcmainniifnpkgikjfkc))
Works directly on Quizlet set pages: floating banner, one-click copy, merge multiple open tabs, and one-click import into Knowt. Fetches cards from Quizlet's web API; the Knowt import uses your existing Knowt session, no extra login.

> Also works in Firefox (sideload from the [release ZIP](https://github.com/ImGajeed76/quick-cards/releases) for now). A Firefox Add-ons listing is planned for the next major release.

**Web** ([quickcards.oseifert.ch](https://quickcards.oseifert.ch))
Paste a vocab list, JSON, CSV, TSV, Markdown table, or TOML and get exports. Nothing to install. Share the URL and the export reproduces on the other side.

## Features

- **Paste anything.** Single or multiple Quizlet URLs, vocab lists with 15+ separator styles, JSON (common shapes: `{term,definition}`, `{front,back}`, tuples, flat key→value), JSON Lines, quoted CSV, TSV, Markdown tables, TOML.
- **Six export formats.** PDF vocab list, printable PDF flashcards (2×4 grid, double-sided, syllable hyphenation), Anki `.apkg`, TXT, CSV, JSON.
- **Import to Knowt** (extension). One-click creates a new flashcard set on your existing Knowt account. Runs in your browser session; no separate login, no copy-paste.
- **Anki with media.** Images, audio recordings, and Quizlet TTS get bundled into the .apkg so cards work offline. Optional FSRS preset paced to a deadline you pick, or use Anki's defaults.
- **Merge multiple sets** (extension). Combine cards from all open Quizlet tabs, with duplicate-removal toggle.
- **Shareable URLs** (web). The full card set is compressed into the URL; anyone with the link sees the same export.
- **Client-side only.** No server, no account, no data leaves your browser.

## Screenshots

| Popup | Export | Anki (paced) |
|:-:|:-:|:-:|
| ![Popup main](assets/popup_main.png) | ![Export screen](assets/pupup_export.png) | ![Anki paced](assets/anki_screen.png) |

| Anki (no preset) | PDF vocab list | PDF flashcards |
|:-:|:-:|:-:|
| ![Anki no preset](assets/anki_screen_no_pace.png) | ![PDF list](assets/pdf_list.png) | ![PDF cards](assets/pdf_cards.png) |

| Merge sets | Knowt import (form) | Knowt import (importing) |
|:-:|:-:|:-:|
| ![Merge screen](assets/merge_screen.png) | ![Knowt form](assets/knowt_import_settings.png) | ![Knowt importing](assets/knowt_importing_screen.png) |

## Repository layout

```
├── extension/       Chrome extension, source, build, manifest
├── website/         SvelteKit web app, hosted at quickcards.oseifert.ch
├── assets/          Shared screenshots
└── LICENSE          MIT
```

- [`extension/README.md`](extension/README.md): install, dev, release
- [`website/README.md`](website/README.md): dev, architecture, deploy

## Tech stack

**Extension.** TypeScript, Bun, Alpine.js (CSP build), Tailwind v4, jsPDF + hyphen, ankipack + sql.js, Manifest V3 (Chrome and Firefox)

**Web.** SvelteKit 2, Svelte 5 (runes), Tailwind v4, shadcn-svelte, Lucide, lz-string, jsPDF, ankipack, sql.js

## Develop

```bash
# Extension
cd extension
bun install
bun run build      # → extension/dist/chrome/ and extension/dist/firefox/
bun run dev        # Vite preview of popup HTML

# Web
cd website
bun install
bun run dev        # localhost:5173
bun run build      # → website/build/ (static)
bun test           # parser unit tests (73)
```

## Release

**Extension.** Push a version tag, GitHub Actions builds and zips, publishes a GitHub Release with auto-generated notes. The release ZIP is then uploaded to the Chrome Web Store dashboard.

```bash
git tag v1.5.0 && git push origin v1.5.0
```

**Web.** `main` auto-deploys to Vercel (static build, pure client-side, no runtime server).

## License

[MIT](LICENSE) · © Oliver Seifert
