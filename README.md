# QuickCards

Chrome extension to export Quizlet flashcards quickly.

Copy to clipboard, download as TXT/CSV/JSON, or generate printable PDFs — all from a clean dark-themed popup.

![Popup main screen](assets/popup_main.png)

## Features

- **No login required** — fetches cards directly via Quizlet's web API, no account needed
- **Instant copy** — one click from the floating banner or popup
- **Export formats** — TXT, CSV, JSON, PDF vocab list, PDF printable flashcards
- **Customizable separators** — pick preset or type your own for term-definition and card separators
- **Floating banner** — auto-appears on Quizlet set pages with card count and quick copy
- **PDF vocab list** — formatted table with title, numbering, and alternating row tints
- **PDF flashcards** — 2x4 grid, double-sided (terms front, definitions back mirrored for printing), auto-wrapping text with syllable-based hyphenation
- **Settings persistence** — separator preferences saved across sessions

## Screenshots

### Floating banner
Appears automatically on Quizlet set pages (bottom-right).

![Floating banner](assets/floating_bottom_right.png)

### Export screen
Separator combos, clipboard copy, and all download options.

![Export screen](assets/pupup_export.png)

### PDF — Vocab list
Formatted table with violet header and alternating row tints.

![PDF vocab list](assets/pdf_list.png)

### PDF — Flashcards
Double-sided 2x4 grid with cut guides. Print, fold, study.

![PDF flashcards](assets/pdf_cards.png)

## Install

### From a release

1. Download the latest `quick-cards-v*.zip` from [Releases](https://github.com/ImGajeed76/quick-cards/releases)
2. Unzip the archive
3. Open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**
4. Select the unzipped folder

### From source

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/ImGajeed76/quick-cards.git
   cd quick-cards
   bun install
   ```

2. Build the extension:
   ```bash
   bun run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `dist/` folder

## Development

```bash
# Build extension (output: dist/)
bun run build

# Dev preview (Vite, opens localhost:3000)
bun run dev

# Generate test PDFs (output: test/output/)
bun run test:pdf
```

## Releasing

Pushing a version tag triggers a GitHub Actions workflow that builds the extension, zips it, and creates a GitHub Release with auto-generated notes.

```bash
git tag v1.1.0
git push origin v1.1.0
```

The manifest version is automatically patched to match the tag. Pre-release tags (e.g. `v2.0.0-beta.1`) are marked as pre-releases.

## How it works

QuickCards fetches flashcard data directly from Quizlet's web API (`/webapi/3.4/studiable-item-documents`) — no login or account required. It automatically paginates to retrieve all cards, even for large sets. If the API is unavailable, it falls back to scraping Quizlet's embedded `__NEXT_DATA__` JSON.

## Tech stack

- [Bun](https://bun.sh) — build, bundle, test
- [TypeScript](https://www.typescriptlang.org)
- [Alpine.js](https://alpinejs.dev) (CSP build) — popup interactivity
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [hyphen](https://github.com/ytiurin/hyphen) — syllable-based word breaking for PDFs
- Chrome Extension Manifest V3

## License

[MIT](LICENSE)
