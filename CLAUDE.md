# CLAUDE.md

Repo-wide context for Claude. Apply to any work in this repository.

## Repo layout

QuickCards is two surfaces sharing one brand:

- `extension/` — browser extension (Chrome live, Firefox port in progress). Runs on quizlet.com, exports the open set (or merge of multiple open tabs) to Anki .apkg, PDF (vocab list, printable 2x4 cards), CSV, JSON, TXT, clipboard. Also one-click import to Knowt using the user's existing session.
- `website/` — SvelteKit web tool (`adapter-static`, deployed to Vercel). User pastes data (vocab lists, JSON, CSV, TSV, Markdown tables, TOML); same export targets as the extension except Knowt. State encoded into the URL via lz-string.
- `assets/` — shared screenshots used by READMEs.
- Both surfaces are 100% client-side. No account, no server, no upload.

The extension and the website target overlapping but distinct audiences. The extension is for users *on Quizlet*; the website is for users *with flashcard data from anywhere* (CSV, ChatGPT output, Google Sheets, etc.). Both are part of the same product.

## When making non-trivial changes

`website/CLAUDE.md` contains the canonical guidance for how the user wants serious work done on this project, including the work-style rules ("think out loud", brainstorm 5 options before committing to a page, the design checklist, vocabulary discipline, things never to claim, landing-page anti-patterns). Read it before doing any non-trivial design or content work, even if the change crosses subprojects. The work-style rules apply repo-wide, not only to the website. The technical rules (Svelte 5 runes, Tailwind tokens, shadcn-svelte, etc.) apply only to `website/`.

The extension follows Chrome extension conventions (Manifest V3, Bun build, Alpine.js CSP build, Tailwind v4) and does not follow the website's UI ruleset, but the work-style rules from `website/CLAUDE.md` (think out loud, brainstorm before committing, vocabulary discipline, no-FSRS-marketing-claims, etc.) still apply.

## Repo-wide conventions

- **Punctuation in prose.** Never use em dashes or double hyphens. Use commas, periods, colons, parens, or restructure.
- **Vocabulary.** "Quizlet set" (never "Quizlet deck"), "Anki deck" (never "Anki set"), primary verb "convert", always ".apkg" with a parenthetical first usage.
- **Commits.** Conventional Commits. Scopes used in this repo: `feat(extension)`, `feat(web)`, `fix(extension)`, `fix(web)`, `chore(extension)`, `chore(web)`, `docs`, `docs(store)`, `ci`. Match the existing style in `git log`.
- **Package manager.** `bun` everywhere. Never npm or pnpm or yarn.
- **Branching.** Feature branches off `main`, named `feat/<topic>` or `fix/<topic>`. Fast-forward back into `main` when the work is logically self-contained.
- **Honest framing for the deadline feature.** The deadline picker is a real, promotable feature, but it only preconfigures DeckConfig values (desiredRetention, learnSteps, maxInterval) based on the user's exam date. Never call it "FSRS optimization", "FSRS tuning", "science-backed", or claim it guarantees results. Acceptable hedges: "useful under two weeks", "anecdotal", "in our experience". See `website/CLAUDE.md` § "Honest framing for the deadline-mode feature" for the full vocabulary list.

## Where to find what

| Topic | File |
|---|---|
| Website design rules, work-style rules, anti-patterns | `website/CLAUDE.md` |
| Website readme | `website/README.md` |
| Extension overview, install, dev | `extension/README.md` |
| Chrome Web Store submission assets | `extension/store/` |
| Repo overview, screenshots | `README.md` (root) |
