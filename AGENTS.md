# AGENTS.md

This file is the canonical project guidance for this repo, shared across every AI coding agent (Claude Code, Codex, and others). It is auto-loaded context and applies to the whole repository.

Section 0 covers the project, how we work, and the two surfaces' stacks. Sections 1 to 14 are design and code guidance and apply to **both** the website and the extension, except for the handful of rules marked **website-only** inline.

---

## 0. Project

QuickCards is two surfaces sharing one brand:

- `extension/`: browser extension (Chrome live, Firefox port in progress). Runs on quizlet.com, exports the open set (or merge of multiple open tabs) to Anki .apkg, PDF (vocab list, printable 2x4 cards), CSV, JSON, TXT, clipboard. Also one-click import to Knowt using the user's existing session.
- `website/`: SvelteKit web tool (`adapter-static`, deployed to Vercel). User pastes data (vocab lists, JSON, CSV, TSV, Markdown tables, TOML); same export targets as the extension except Knowt. State encoded into the URL via lz-string.
- `assets/`: shared screenshots used by READMEs.

Both surfaces are 100% client-side. No account, no server, no upload.

The extension and the website target overlapping but distinct audiences. The extension is for users *on Quizlet*; the website is for users *with flashcard data from anywhere* (CSV, ChatGPT output, Google Sheets, etc.). Both are part of the same product, and a design decision on one should be checked against the other.

### Shared conventions

- **Package manager.** `bun` everywhere. Never npm or pnpm or yarn.
- **Vocabulary.** See 0.1. The terms are load-bearing and the full list lives there; do not restate it here, so there is only one copy to keep current.
- **Commits.** Conventional Commits. Scopes used in this repo: `feat(extension)`, `feat(web)`, `fix(extension)`, `fix(web)`, `chore(extension)`, `chore(web)`, `docs`, `docs(store)`, `ci`. Match the existing style in `git log`.
- **Branching.** Feature branches off `main`, named `feat/<topic>` or `fix/<topic>`. Fast-forward back into `main` when the work is logically self-contained.
- **Linting.** Never trust inline IDE diagnostics or squiggles. Each surface has a `bun run check`; that is the gate, not the editor.

### Honest framing for the deadline feature

The deadline picker preconfigures DeckConfig values (`desiredRetention`, `learnSteps`, `maximumReviewInterval`) based on the user's exam date. It does NOT modify FSRS parameters or weights. It is most useful for tight deadlines (under ~14 days). Past 14 days the values land at Anki defaults anyway.

The feature CAN and SHOULD be promoted. We just cannot overclaim what it does. The owner researched it, used it personally, and has anecdotal evidence it helps in cram-style situations. There is no research paper. The honest version is: "we noticed it helps, your mileage may vary."

**Never write:**

- "Optimizes FSRS", "FSRS optimization", "tunes FSRS", "FSRS-tuned"
- "Science-backed", "research-backed", "proven"
- "Guarantees you'll learn it by [date]"
- "Magic", "AI-powered scheduling", or anything implying special algorithmic insight

**Fine and encouraged:**

- "Optional deadline mode"
- "Adjusts deck options for tight deadlines"
- "Useful for exam prep under two weeks"
- "Anecdotal, not science-backed"
- "We noticed it helps"
- "In our experience" / "your mileage may vary"
- "Experimental"
- "Not magic, just sensible presets"

State what it does literally (sets DR, max interval, learn steps), state when it helps (tight deadlines), state the evidence level (anecdotal). Users respect this; the Anki community especially respects this.

Do not lead with the deadline feature as a homepage hero. It belongs as an optional toggle on the Anki export step. A focused content page about cram/short-deadline study is fair game and can talk frankly about the feature's limits.

Past Anki community pushback (Discord, late Apr / early May 2026) was specifically about the OVERCLAIM, not the feature existing. Honest hedged promotion is the lane.

---

## 0.1 How we work on this project

The user's bar is "done right, not sprinted." Take time. Reason. Do not take shortcuts. The points below are non-negotiable for any non-trivial work anywhere in this repository, extension included.

### Think out loud, always

Never use hidden thinking / extended-thinking blocks for reasoning. Write all reasoning directly into the chat as visible prose. The user wants to see how conclusions are reached, not just the conclusion. It is fine, even encouraged, to correct yourself or change direction mid-thought. Live reasoning beats polished post-thought conclusions.

This applies to every verb that implies thinking: "reason", "weigh", "analyze", "brainstorm", "explore", "consider", "design", "decide", "roleplay", "list possibilities". All of those are prose, not hidden blocks.

### Brainstorm 5 options before committing to a page or surface

Before writing any non-trivial page, route, layout, or significant component, **think through at least 5 different ways** to do it (or each major section of it) and weigh them. Show the alternatives in chat so the user can redirect before code is written. Do not commit to "the first thing that came to mind."

For each option weigh the tradeoffs, then pick deliberately. Generic, forgettable layouts come from skipping this step.

### Design checklist for every page

Before designing or coding a page, walk through:

- **Content framing.** What does this page say. What is the one thing the user walks away with. Which audience is this. What search intent brought them here.
- **Reading order and eye flow.** What does the user see first, second, third. Where does the eye land. Does the page pull them down or dead-end. Are sections in the order a reader would actually want, or in the order they were easy to write.
- **Spacing and rhythm.** Internal vs external spacing per the spacing system below. White space as a feature.
- **Colors and primary palette.** The primary brand color is sparing on purpose. Where does it draw the eye. Where do we deliberately stay quiet.
- **Shapes and visual elements.** Cards, dividers, asymmetric layouts, image framings. Anything that breaks block-of-text monotony.
- **Graphics, screenshots, mockups.** What goes where. Is this proof or filler. Is it captioned, aligned, doing real work.
- **Repetition test.** Does the page feel repetitive when scanned. Sections that all look the same need visual variety.
- **Element necessity.** Every element earns its place. If removing it does not hurt, remove it.
- **Degenerate data.** Render the design mentally against 0 cards, 1 card, a 400-character definition, a set with no title, term equal to definition. Plural bugs and duplication live there. "1 cards" is the exact failure.
- **SEO for this page** (website). Target query cluster, exact phrasing in H1, semantic HTML for hierarchy, JSON-LD where it helps (FAQPage, HowTo, SoftwareApplication), internal links to related content pages.

### Inspiration

`~/Coding/pdfy` has well-considered layouts. When stuck, look there. Some sections can be lifted as patterns directly. This is not a license to clone visually, only to reuse layout ideas.

### Vocabulary discipline

User research established the words our audience actually uses. Match them in copy, do not impose your own:

- **"Quizlet set"** (never "Quizlet deck"). **"Anki deck"** (never "Anki set").
- Primary verb is **"convert"** (not "migrate" or "transfer"). Secondary: "export", "import".
- Always say **".apkg"** with a parenthetical first usage: "Anki deck file (.apkg)".
- The phrase **"free, no account, in your browser, open source"** belongs above the fold on every landing page. Every word of it is what users have been searching for.
- H1s are literal: "Convert Quizlet to Anki", not "Bring your flashcards to life."

### Anti-patterns on every landing page

- No signup wall before the user sees output.
- No "free trial" anything. We are free, full stop, no qualifications. Do not write "free for students" or "free for educational use."
- No silent truncation. Always show card counts before convert runs.
- No exit-intent popups, no "wait don't leave" popups.
- No comparison tables that make the competitor look unfair. Show real strengths of the competitor too.
- Open-source link visible on every page.

---

## 0.2 Website (`website/`)

- **Framework:** SvelteKit with Svelte 5 (runes mode: `$state`, `$derived`, `$props`)
- **Styling:** Tailwind CSS 4
- **Components:** shadcn-svelte (under `src/lib/components/ui/`)
- **Icons:** Lucide (`@lucide/svelte`)
- **i18n:** Not used. English only.
- **Dark mode:** Always-on dark theme. `<html class="dark">` is hardcoded in `src/app.html`.
- **Deployment:** Vercel. Fully prerendered via `@sveltejs/adapter-static`.
- **Analytics:** Self-hosted Plausible. Use `track(event, props)` from `$lib/analytics`. Event names are Title Case with lowercase continuation (`Share link`, `Knowt import result`, `Install CTA`).
- **Site tokens:** `src/lib/site.ts` exports `SITE_NAME`, `SITE_URL`, `SITE_TAGLINE`, etc. Use these. Never hardcode the site name or URL.
- **State:** encoded into the URL with lz-string, which means a populated view is reproducible from a URL alone.
- **Gate:** `bun run check` (Prettier check, ESLint, `svelte-kit sync`, svelte-check). `bun run format` to auto-format.
- **Tests:** `bun test`. Note this is **not** part of `bun run check`, so run it separately whenever parsing or export logic changed. See 2.7.

## 0.3 Extension (`extension/`)

- **Platform:** Chrome extension, Manifest V3. Firefox port in progress; `build.ts` writes a per-target manifest from `public/manifest.json`.
- **Build:** Bun (`bun run build`, `bun run watch`). No framework bundler beyond Vite for dev.
- **Interactivity:** Alpine.js, **CSP build** (`@alpinejs/csp`). The manifest pins `script-src 'self' 'wasm-unsafe-eval'`, so no inline expressions and no `eval`. Alpine components must be registered, not written as inline strings.
- **Styling:** Tailwind CSS 4 via `src/styles/tailwind.css`. It defines the same shadcn token names as the website (`--color-background`, `--color-card`, `--color-primary`, `--color-ring`, `--radius`) with dark values, so sections 4 through 14 apply here unchanged.
- **Key dependencies:** `ankipack` and `sql.js` (.apkg generation), `jspdf` (PDF), `idb` (IndexedDB cache for sets and media), `hyphen`.
- **Permissions:** every entry in `permissions` and `host_permissions` is a thing we must justify in `store/permission-justifications.md`. Adding one is a product decision, not an implementation detail. See 1.7.
- **Store assets:** `store/` holds the Chrome Web Store listing, permission justifications, privacy disclosures, and screenshots. Copy there follows the same vocabulary and honest-framing rules as everything else.
- **Gate:** `bun run check` (Prettier check, ESLint, `tsc --noEmit`). `bun run format` to auto-format. `bun run test:pdf` exercises the PDF path.

## 0.4 Where to find what

| Topic                                                | File                    |
| ---------------------------------------------------- | ----------------------- |
| Project, work-style, design and code rules (this file) | `AGENTS.md`             |
| Repo overview, screenshots                           | `README.md` (root)      |
| Website readme                                       | `website/README.md`     |
| Extension overview, install, dev                     | `extension/README.md`   |
| Chrome Web Store submission assets                   | `extension/store/`      |
| Shared screenshots used by the READMEs               | `assets/`               |

`CLAUDE.md` at the repo root is a shim that imports this file. Edit `AGENTS.md`, not the shim.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Tooling & Libraries](#2-tooling--libraries)
3. [Code Quality](#3-code-quality)
4. [Spacing System](#4-spacing-system)
5. [Typography](#5-typography)
6. [Colors & Theme](#6-colors--theme)
7. [Components](#7-components)
8. [Animation & Motion](#8-animation--motion)
9. [Responsive Design](#9-responsive-design)
10. [UX Patterns](#10-ux-patterns)
11. [Interaction & States](#11-interaction--states)
12. [Accessibility](#12-accessibility)
13. [CSS Practices](#13-css-practices)
14. [Anti-Patterns](#14-anti-patterns)

---

## Severity Ratings

Each rule is rated by importance:

| Rating    | Label        | Meaning                                              |
| --------- | ------------ | ---------------------------------------------------- |
| **[5/5]** | Critical     | Breaking this creates serious UX problems. Must fix. |
| **[4/5]** | Important    | Should follow unless there's a strong reason not to. |
| **[3/5]** | Recommended  | Good practice, some flexibility allowed.             |
| **[2/5]** | Nice-to-have | Implement when time allows.                          |
| **[1/5]** | Optional     | Edge cases, special situations only.                 |

---

## 1. Philosophy

### 1.1 Every Element Earns Its Place [5/5]

Every UI element must serve a clear purpose. If an element can be removed without losing functionality or clarity, remove it.

**Before adding any element, ask:**

- Does this help the user complete their task?
- Is this information necessary right now?
- Can this be combined with something else?
- Would the interface work without this?

**Remove:**

- Decorative dividers that don't separate meaningful sections
- Labels that repeat what's already obvious
- Icons that don't add meaning beyond the text
- "Helper" text that states the obvious
- Unnecessary borders and backgrounds
- Empty states that just say "empty"

### 1.2 Think Before You Build [5/5]

Before writing any UI code, understand the context:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: What feeling should the UI convey? (productive, calm, playful, serious)
- **Constraints**: Framework, performance budget, accessibility requirements.

Every design choice should be intentional. Don't produce generic, thoughtless UI. Don't default to the first thing that comes to mind. Consider the context, then make a deliberate choice.

### 1.3 Every Action Feels Natural [5/5]

Users bring expectations from other applications they use daily. The interface should work the way users expect it to work, even if they're trying something for the first time.

**Core principle:** If a user tries an action by instinct (based on experience with other apps), it should work.

**Mental models to respect:**

- Ctrl/Cmd+S saves
- Ctrl/Cmd+Z undoes
- Escape closes modals/cancels
- Enter submits forms
- Tab moves between fields
- Right-click shows context menu
- Drag and drop reorders items
- Double-click edits/opens
- Clicking outside closes dropdowns/modals

**Platform conventions:**

- Follow OS conventions for keyboard shortcuts
- Match browser behavior for navigation (back, forward, refresh)
- Use familiar iconography (trash for delete, pencil for edit, plus for add)

### 1.4 Consistency Over Creativity [5/5]

Internal consistency is more important than novelty. The same action should look and behave the same way everywhere.

**Maintain consistency in:**

- Button styles and sizes for same-level actions
- Spacing between similar elements
- Error message patterns
- Loading state presentation
- Modal/dialog structure
- Icon usage and sizing
- Color usage for same semantic meaning

Consistency here spans both surfaces. The same export step should not be worded one way in the popup and another way on the site.

### 1.5 Less Is More [4/5]

Once a feature is released, it never goes away. Avoid adding features that don't offer high user value for the cost in maintenance, complexity, and payload size. When in doubt, leave it out.

This applies especially to providing two different APIs or patterns to accomplish the same thing. Prefer sticking to a single approach.

Note the distinction from a shortcut: this rule is about doing *less*, not about doing a kept feature the cheap way.

### 1.6 Prefer Small, Focused Modules [4/5]

Keeping modules to a single responsibility makes the code easier to test, consume, and maintain. Ideally, individual files are 200-300 lines of code.

As a rule of thumb, once a file draws near 400 lines (barring long constants or comments), start considering how to refactor into smaller pieces.

### 1.7 Privacy and Security by Default [5/5]

Treat every decision as if a privacy-conscious user is reading the code. This is not a general aspiration here, it is the product claim: "free, no account, in your browser, open source" and "100% client-side, no server, no upload" appear in the READMEs, the store listing, and above the fold on every landing page. The code has to keep making that true.

- **The user's card data never leaves the device.** Parsing, conversion, and file generation are local. There is no analytics event, error report, or debug log that carries card content, set titles, or pasted text.
- **Every network call needs a stated reason.** The legitimate ones are narrow: fetching media the user's own set references, and the Knowt import that uses the user's existing session. A new `fetch` outside that set is a product decision, not an implementation detail. Name it in the commit message and check it against the privacy copy.
- **Every new permission or host match is the same kind of decision.** Manifest V3 `permissions` and `host_permissions` are user-visible at install and must be justified in `store/permission-justifications.md`. Do not add one to make an implementation easier.
- **Collect the minimum.** Plausible is self-hosted and event-level. Events record that something happened, never what was converted. No fingerprinting, no third-party trackers, no surprise telemetry.
- **Never log secrets or session material.** Cookies and session tokens used for the Knowt path do not go into logs, error messages, or state that outlives the request.
- **Treat scraped page content as untrusted input.** Quizlet content is arbitrary user-authored HTML from a third party. It gets escaped, never injected raw.

When privacy and another goal conflict, document the tradeoff in a comment or the commit message, and default toward more private.

### 1.8 Stay Client-Side and Lean [4/5]

The whole product is a static site and a browser extension. That constraint is a feature, and it decides architecture questions before they get interesting.

- **No server, no database, no account.** If a feature seems to need persistence beyond `localStorage`, the URL, or IndexedDB, that is a design smell to raise, not a backend to add.
- **No build-time or runtime service dependency.** The website is fully prerendered; the extension ships everything it needs. Nothing is fetched from us at startup.
- **Payload size is a real budget**, especially in the extension, where `sql.js` and `jspdf` are already heavy. A new dependency is something every user downloads.
- **Dependencies earn their place.** Prefer the platform. See 2.1 and 3.9.
- **Do not hammer third parties.** Media fetches for a set are batched and bounded, and a failure is surfaced to the user (the failed-media count) rather than retried into the ground.

Compromises here follow the same rule as in 1.7: flag the tradeoff in the commit message or a comment.

---

## 2. Tooling & Libraries

### 2.1 Universal Flow [5/5]

For every tool or library category, follow this decision flow:

1. **Check** if the project already uses something for this purpose
2. **If yes**, follow its existing conventions exactly
3. **If no**, recommend a specific default (listed below) and ask before adding it
4. **Never** reinvent what already exists in the project's dependencies

This is cross-surface. Before adding a parser, formatter, or export helper to one surface, check whether the other already has one. A second CSV splitter is the exact failure this rule exists to prevent.

### 2.2 Component Library [5/5], website-only

Before building ANY custom component on the website, check whether shadcn-svelte already provides it. Only build custom if it genuinely doesn't exist.

**Flow:**

1. Need a dialog? Check shadcn-svelte first.
2. It exists? Use it. Follow its patterns. Don't wrap it unnecessarily.
3. It doesn't exist? Build a reusable component following the same patterns the library uses.

The extension has no component library installed. Build its UI from the shared Tailwind tokens and keep the metrics in sections 4 through 7; do not pull shadcn-svelte into an Alpine surface.

### 2.3 Styling (Tailwind CSS) [4/5]

Both surfaces use Tailwind 4. Follow its conventions:

- Use the spacing scale (multiples of the base unit), don't use arbitrary values like `m-[17px]`
- Use theme tokens (`bg-primary`, `text-muted-foreground`) instead of raw colors (`bg-blue-500`)
- Specify transition properties (`transition-colors`) instead of `transition-all`

### 2.4 Icons (Lucide) [4/5]

The website uses `@lucide/svelte`. Never write SVG markup directly there; always use icon components. In the extension, where there is no icon component layer, keep icons in one place and reuse them rather than pasting SVG at each call site. If an icon doesn't exist in Lucide, create a reusable component rather than inlining it repeatedly.

### 2.5 Internationalization [4/5]

Neither surface uses i18n. English only. Do not add an i18n system without asking.

If one is ever added, no user-facing string may be hardcoded from that point on, and keys follow `{scope}_{feature}_{element}_{modifier}` (e.g. `export_anki_button_primary`, `common_button_cancel`), with `common_*` for reusable text.

### 2.6 Framework-Specific Conventions [3/5]

**SvelteKit (website-only):**

- Use `$lib` for imports from the lib directory
- Use Svelte transitions (`slide`, `fade`) for enter/exit animations
- Prefer runes (`$derived`) over manual watchers
- Use SvelteKit's form actions for form handling when appropriate

**Alpine.js, CSP build (extension-only):**

- Components are registered with `Alpine.data(...)`, never written as inline expression strings. The manifest's CSP forbids the latter and it will fail silently in ways that look like a logic bug.
- `x-cloak` is already handled in `tailwind.css`; use it rather than inventing a flash-prevention scheme.

**General:**

- Follow whatever patterns are already established in the codebase
- Don't introduce a new pattern when an equivalent one already exists

### 2.7 Testing [3/5]

The test runners are `bun test` in `website/` and `bun run test:pdf` in `extension/`. Follow the conventions already in `website/src/lib/parse.test.ts` for location, naming, and assertion style. Don't introduce a different testing framework as a side effect of writing one test.

**What to test:**

- The parsers and export converters. This is the core risk surface of the whole product: vocab lists, CSV, TSV, Markdown tables, TOML, JSON going in, and .apkg / PDF / CSV / JSON / TXT going out.
- Non-obvious edge cases: consecutive delimiters, empty fields, trailing newlines, a quoted delimiter, single-column input, a term equal to its definition, and off-by-ones.
- Contracts consumers rely on: the .apkg note GUID derivation, the URL state encoding, anything whose output lands in a user's real deck.

**What NOT to test:**

- Trivial getters and pass-through wrappers.
- Library code. Don't test that `jspdf` works.
- Implementation details that would change with a normal refactor.
- The same thing in five places.

**When a bug gets through that a test should have caught, write the failing test first, then fix it.** Reproduce as red, then fix to green, and keep the test. A test that has never failed is not yet evidence.

Each test exists for a specific reason. Quality over quantity: a few sharp tests beat a hundred shallow ones. Coverage is not the goal; confidence in the parts that need it is.

---

## 3. Code Quality

### 3.1 Write Useful Comments [4/5]

Comments that explain **why** are invaluable. Comments that explain **what** are nice but secondary.

**Not very useful:**

```ts
// Set default tabindex.
if (!this.getAttribute("tabindex")) {
  this.setAttribute("tabindex", "-1");
}
```

**Much more useful:**

```ts
// Unless the user specifies so, the element should not be a tab stop.
// This is necessary because the framework might add a tabindex to anything
// with a model binding.
if (!this.getAttribute("tabindex")) {
  this.setAttribute("tabindex", "-1");
}
```

**Keep them short.** Two lines is the budget for a why, written once on the thing that owns it, never restated at call sites or copied into tests. A why that needs more than two lines means the code is wrong, not the comment. Never write a comment that only defends a choice made wrong the first time; the right version needs no defense.

### 3.2 Naming [4/5]

- Prefer full words over abbreviations
- Prefer exact names over short names (`labelPosition` > `align`)
- Use `is` and `has` prefixes for boolean properties/methods
- Method names should describe the action performed, not when it's called (`openDialog()` > `handleClick()`)
- Class names should capture what the code does, not how it is used (`UniqueSelectionDispatcher` > `RadioService`)

### 3.3 TypeScript Practices [4/5]

- Avoid `any` where possible. Consider generics when tempted to use `any`.
- All public API types must be explicitly specified.
- Use JsDoc-style comments for descriptions on classes, members, etc.
- Use `//` comments for explanations and background info.
- Boolean properties: use "Whether..." phrasing in docs (`/** Whether the button is disabled. */`)
- **A cast is a compiler blindfold.** Treat every `as unknown as T` as an unverified claim about runtime shape, and check it against a real working call site.

### 3.4 Boolean Arguments [3/5]

Avoid boolean arguments that mean "do something extra." Prefer separate functions.

```ts
// Avoid
function getTargetElement(createIfNotFound = false) { ... }

// Prefer
function getExistingTargetElement() { ... }
function createTargetElement() { ... }
```

### 3.5 Prefer Modern Syntax [3/5]

- Use `for...of` instead of `forEach` for multi-line operations
- Use nullish coalescing (`??`) and optional chaining (`?.`) to shorten code
- Use `const` by default, `let` when reassignment is needed, never `var`

### 3.6 Try-Catch [3/5]

Avoid `try-catch` blocks. Prefer preventing errors from being thrown in the first place. When unavoidable, include a comment explaining the specific error being caught and why it cannot be prevented.

### 3.7 Event Naming [3/5]

Use `before` prefix for events that fire before an action (e.g. `beforeopen` and `open`).

### 3.8 Don't Reach for Regex [4/5]

Regex is hard to read, hard to maintain, almost always subtly wrong, and brittle in ways that bite months later. This repo parses text for a living, so the rule needs to be precise rather than absolute.

**Never use regex for:**

- Validating input (emails, URLs, language codes, numbers)
- Replacing tokens or building strings
- Splitting user-pasted text on a guessed delimiter
- Extracting structure out of scraped HTML

**Prefer instead:**

- String operations: `startsWith`, `endsWith`, `includes`, `split`, indexed scanning, character-by-character iteration
- Proper parsers: the `URL` constructor, `Date.parse`, `DOMParser` for markup, dedicated libraries for locales and time zones
- Explicit state machines for the format parsers, which is what a CSV or Markdown-table reader actually is

**Where it is legitimate:** narrow character classification inside a tokenizer, the "is this a quote, a digit, a line boundary" question. That is the rare case the rule carves out. When you use one there, comment it in one line and pin the exact inputs and expected outputs in a test. A regex without a test that would fail if it broke is not finished.

**The delimiter bullet above bans the guessing, not the tokenizer.** The scan that decides which delimiter a pasted block uses stays explicit code, read character by character, because its failure mode is silent and lands in someone's deck. See the `smart delimiter scan` cases in `website/src/lib/parse.test.ts` for the shape that has to keep working.

Default position: there is a simpler tool, and for a parser the simpler tool is usually an explicit scan.

### 3.9 Don't Hand-Roll What the Platform Provides [4/5]

Before writing a validator, parser, or text transform by hand, check what the platform already does correctly: `Intl`, `URL`, `Date`, `TextDecoder`, `Intl.Segmenter`, `DOMParser`. The hand-rolled version is subtly wrong in ways that surface much later, and it usually ships with a comment asking a human to keep two things in sync, which is the tell. If a comment says "must stay in step with X", that is duplication to remove, not a note to write.

Verify the platform tool actually fits before adopting it. The more standard-looking option is not automatically the correct one.

---

## 4. Spacing System

### 4.1 Base Grid [5/5]

All spacing uses multiples of a base unit (8px recommended). This creates visual rhythm and consistency.

**Scale (with Tailwind equivalents):**

```
4px   (space-1)   - Tight spacing, rare use
8px   (space-2)   - Minimal gaps, icon+text
12px  (space-3)   - Compact spacing
16px  (space-4)   - Standard spacing (DEFAULT)
20px  (space-5)   - Form field spacing
24px  (space-6)   - Section spacing, card padding
32px  (space-8)   - Major section separation (DEFAULT for sections)
40px  (space-10)  - Large gaps
48px  (space-12)  - Hero spacing
```

### 4.2 Spacing Defaults [5/5]

**Gap (between items):**

- 8px - Icon + text, tightly related items
- 16px - Standard spacing (DEFAULT)
- 24px - Loose spacing
- 32px - Section separation

**Padding (inside elements):**

- 8px - Dense UI, badges, small buttons
- 16px - Standard padding
- 24px - Cards, modals, panels (DEFAULT for cards)
- 32px - Large containers, page content

**Vertical spacing:**

- 8px - Label + input pairs
- 16px - Component groups
- 20px - Form field groups (DEFAULT for forms)
- 24px - Card sections
- 32px - Major page sections (DEFAULT for sections)

The extension popup is a dense surface, so it sits at the tighter end of these defaults. It still uses the same scale; it does not get arbitrary values.

### 4.3 Internal <= External Rule [4/5]

Spacing inside an element should be less than or equal to spacing outside it. This creates clear visual grouping.

**Correct:** Card has 24px internal padding, 24px gap between cards. Internal content has 16px spacing (16px < 24px).

**Incorrect:** 8px between cards but 32px inside them. Elements feel disconnected from their containers.

---

## 5. Typography

### 5.1 Size Hierarchy [4/5]

```
12px (text-xs)   - Captions, timestamps, metadata
14px (text-sm)   - UI labels, secondary content (DEFAULT for UI)
16px (text-base) - Body text, paragraphs (DEFAULT for body)
18px (text-lg)   - Emphasized text, lead paragraphs
20px (text-xl)   - Small headings (H4)
24px (text-2xl)  - Section headings (H3)
30px (text-3xl)  - Page headings (H2) (DEFAULT for headings)
36px (text-4xl)  - Hero headings (H1)
```

### 5.2 Font Weights [4/5]

Limit to 3 weights for visual clarity:

```
400 (normal)     - Body text, descriptions
500 (medium)     - Emphasized text, UI labels
600 (semibold)   - Headings, important actions (DEFAULT for headings)
```

Avoid 300 (light) and 700 (bold) unless absolutely necessary.

### 5.3 Line Height [3/5]

```
1.25  (tight)    - Headings, large text (DEFAULT for headings)
1.375 (snug)     - Subheadings
1.5   (normal)   - Body text (DEFAULT for body)
1.625 (relaxed)  - Long-form content
```

### 5.4 Letter Spacing [3/5]

```
-0.025em (tight)  - Large headings (24px and above)
0        (normal) - Default
0.025em  (wide)   - Small caps, labels (12px uppercase)
```

### 5.5 Font Choice [3/5]

Choose fonts intentionally based on the project's purpose and tone. Don't default to whatever comes to mind first. Consider pairing a display font with a body font that complement each other.

### 5.6 Standard Patterns [4/5]

```
Page heading:      text-3xl, font-semibold, tracking-tight, leading-tight
Section heading:   text-2xl, font-semibold, tracking-tight, leading-tight
Card title:        text-lg, font-medium, leading-snug
UI label:          text-sm, font-medium
Body text:         text-base, leading-normal
Secondary text:    text-sm, muted color
Caption/metadata:  text-xs, muted color
```

---

## 6. Colors & Theme

Both surfaces are dark-only and share the same token names. The website hardcodes `<html class="dark">`; the extension's `tailwind.css` defines the dark values directly in `@theme`. There is no light mode to support, and adding one is a product decision, not a styling detail.

### 6.1 Never Hardcode Colors [5/5]

Always use theme tokens. Never use color utilities or hex values directly.

**Correct:** `bg-card`, `text-foreground`, `border-destructive`

**Incorrect:** `bg-gray-100`, `text-gray-700`, `bg-[#f5f5f5]`

### 6.2 Semantic Color Usage [5/5]

**Backgrounds:**

```
background       - Main app background
card             - Elevated surfaces (cards, modals, panels)
muted            - Subtle backgrounds, disabled states
accent           - Hover states, highlighted areas
primary          - Primary action buttons
destructive      - Destructive actions, error states
```

**Text:**

```
foreground           - Primary text (DEFAULT)
muted-foreground     - Secondary text, hints, placeholders
primary              - Accent text, links
destructive          - Error messages
primary-foreground   - Text on primary background
```

**Borders:**

```
border           - Default borders
input            - Form inputs
primary          - Focused/active elements
destructive      - Error states
```

### 6.3 Status Colors [4/5]

For status indicators:

- **Success**: Green tones
- **Warning**: Yellow/amber tones
- **Error**: Use the destructive token
- **Info**: Use the primary token

If a status color is needed in more than one place, define it as a token rather than repeating a literal.

### 6.4 No Gradients [4/5]

Use flat, solid colors only. Gradients add visual noise without functional benefit.

### 6.5 Shadows [3/5]

Use shadows sparingly and only for elevation hierarchy:

- **Dropdowns/popovers**: Medium shadow
- **Modals**: Large shadow
- **Floating elements** (FABs, toasts): Medium shadow
- **Cards**: No shadow, use borders instead
- **Buttons**: No shadow

---

## 7. Components

### 7.1 Check Before You Build [5/5]

Before creating any component:

1. Check if the surface's component library already provides it (shadcn-svelte on the website)
2. If yes, use it. Follow its patterns.
3. If no, build a reusable component following the same patterns the library uses

Never wrap a library component unnecessarily. Never duplicate functionality that already exists.

### 7.2 Button & Input Heights [4/5]

```
32px (h-8)  - Small/compact (table actions, inline buttons)
40px (h-10) - Default (most buttons and inputs)
44px (h-11) - Large/prominent (primary CTAs, auth forms)
```

### 7.3 Icon Sizes [4/5]

```
12px (h-3 w-3) - Inline with small text
16px (h-4 w-4) - Standard UI icons (DEFAULT)
20px (h-5 w-5) - Larger UI elements, sidebar icons
24px (h-6 w-6) - Hero icons, emphasis
```

**Icon + text pattern:** Always use a flex container with a small gap (8px).

### 7.4 Cards & Panels [4/5]

**Standard card:** Rounded corners (8px), border, card background, 24px padding.

**Border radius scale:**

```
2px  - Small elements, tags
6px  - Buttons, inputs (DEFAULT for small elements)
8px  - Cards, panels (DEFAULT for cards)
12px - Large modals, hero sections
```

### 7.5 Container Widths [4/5]

```
384px  - Auth forms, narrow dialogs
448px  - Standard forms
512px  - Wide forms
672px  - Reading content
896px  - Wide content areas
```

### 7.6 Prefer Composition Over Wrapping [3/5]

Instead of wrapping other elements or forwarding props down, prefer slots/children for content projection. Let consumers provide content directly rather than passing it through layers of props.

### 7.7 Separate Variants Into Separate Components [3/5]

If a component has fundamentally different variants, prefer separate components over a single component with mode switches. Extension/composition is cheap and improves readability.

---

## 8. Animation & Motion

### 8.1 Organic Easing [4/5]

Use easing curves with slight overshoot for spatial animations. This creates a natural, "alive" feel.

**For position/transform changes:**

```css
transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
```

The overshoot (1.56 exceeds 1.0) makes the element go slightly past its target and settle back, mimicking real-world physics.

**For color/opacity changes:** Standard ease is fine, no overshoot needed.

### 8.2 Duration Hierarchy [4/5]

```
75ms   - Instant feedback (button press)
150ms  - Quick transitions (color, opacity) (DEFAULT for colors)
200ms  - Standard transitions (transforms, scale) (DEFAULT for transforms)
300ms  - Layout changes, spatial movement (DEFAULT for position)
400ms+ - Large/complex animations (use sparingly)
```

### 8.3 What to Animate [3/5]

**Always animate:**

- Hover state changes (color, background)
- Focus indicators
- Modal/dropdown open/close
- Drag operations
- State transitions (expanded/collapsed)

**Consider animating:**

- List item additions/removals
- Tab switches
- Loading skeleton shimmer

**Never animate:**

- Initial page load (content should appear ready)
- User input (typing, clicking)
- Error states (should appear instantly)
- Critical information

The extension popup opens and closes constantly, so it is the surface where a 300ms entrance becomes a 300ms tax. Keep its motion at the short end.

### 8.4 Subtle Delight [3/5]

Playful design works when it enhances without distracting. Delight is the icing on the cake, it comes after functional, reliable, and usable.

**Where it works:** Transitions, success moments, empty states, loading states, drag and drop.

**Where to avoid it:** Error states, destructive confirmations, core editing/writing, frequently repeated actions.

**Rules:**

- Under 500ms, anything longer interrupts
- Every animation has a reason to exist
- Power users shouldn't be slowed down
- Match the emotional moment (don't celebrate errors)

---

## 9. Responsive Design

### 9.1 Desktop-First, Mobile-Aware [3/5]

Primary target is desktop. Mobile should work but is lower priority unless specified otherwise.

**Breakpoints:**

```
640px  (sm)  - Small tablets
768px  (md)  - Tablets
1024px (lg)  - Small desktops
1280px (xl)  - Standard desktops
1536px (2xl) - Large screens
```

The extension popup has a fixed narrow viewport rather than breakpoints. It still respects touch targets and the spacing scale.

### 9.2 Touch Targets [4/5]

Interactive elements must be at least 44x44px on touch devices.

### 9.3 Responsive Patterns [3/5]

- Stack on mobile, row on desktop
- Full width on mobile, constrained on desktop
- Adjust padding for screen size

---

## 10. UX Patterns

### 10.1 Feedback States [5/5]

Every action must have immediate, visible feedback.

**Loading:** Disable the trigger, show a spinner or loading text, indicate progress. Conversion and export are the slow paths here and both need real progress, not a frozen button.

**Success:** Brief, non-blocking confirmation (toast or inline message).

**Error:** Appear instantly (no animation delay), specific and actionable message, placed near the source. A partial failure is not a success: surface the failed-media count rather than hiding it.

### 10.2 Empty States [4/5]

Empty states should guide users toward action, not just state "nothing here."

**Structure:**

1. An icon (muted, not prominent)
2. Brief title explaining the state
3. Short description with next step
4. Primary action button when applicable

### 10.3 Form Validation [4/5]

**When to validate:**

- On blur for individual fields
- On submit for the whole form
- Real-time only for specific cases (password strength)

**Error messages must:**

- Be specific ("Email must include @" not "Invalid email")
- Appear immediately below the field
- Not shift layout unexpectedly (reserve space or use transitions)

### 10.4 User Control [4/5]

Users must always be able to escape, undo, or go back.

**Escape hatches:**

- Escape key closes modals/dropdowns
- Click outside closes popups
- Cancel button on forms
- Back navigation works

**Destructive actions:**

- Reversible: Provide undo (toast with undo button)
- Irreversible: Require confirmation dialog with clear consequences

### 10.5 Progressive Disclosure [4/5]

Show only what's needed. Hide complexity until the user asks for it.

- Collapsible sections for advanced options
- "Show more" for long lists
- Tooltips for explanations
- Modals for detailed settings

### 10.6 Micro-copy [4/5]

**Button labels:** Use verbs. Be specific when context is unclear ("Save Document" not just "Save"). Match the severity ("Delete" for destructive, "Remove" for reversible). Follow the vocabulary rules in 0.1: the verb is "convert".

**Error messages:** Explain what happened and how to fix it. Don't blame the user.

**Placeholder text:** Show format examples ("name@example.com"). Don't repeat the label. Don't use as the only label.

**Confirmation dialogs:** Title states what will happen. Description states consequences. Actions use clear verb labels.

**Counts:** always handle singular and plural. "1 cards" is a bug.

### 10.7 Reduce Cognitive Load [3/5]

- Limit ungrouped options to 3-5 items (Hick's Law)
- Break long lists into groups
- Don't show more than 7 ungrouped items at once (Miller's Law)
- Provide sensible defaults
- Use progressive disclosure for advanced options

---

## 11. Interaction & States

### 11.1 Hover [4/5]

All interactive elements need hover feedback. Use color/background transitions (150ms).

For accessibility, the visual highlight must not be reduced to color alone. Include cursor change, translation, or other effects that are understandable for visually impaired users.

### 11.2 Focus [5/5]

Focus indicators must be visible for keyboard navigation. Use a visible ring on `:focus-visible`. Never remove focus outlines.

### 11.3 Active/Pressed [3/5]

Provide visual feedback on press (scale down slightly or darken).

### 11.4 Disabled [4/5]

- Reduce opacity
- Change cursor to not-allowed
- Prevent keyboard and mouse interaction
- Consider keeping pointer events to allow tooltips explaining why it's disabled

### 11.5 Checked [3/5]

For form elements (radio, checkbox), visually indicate the checked state clearly. Indeterminate is a sub-state of this.

### 11.6 Readonly [3/5]

Must be accessible via keyboard and mouse, but content/selection cannot be changed. Visually distinguish from editable and disabled states.

### 11.7 Error [4/5]

Visually and textually indicate the error state. Use the destructive color token. Place error messages near the source.

---

## 12. Accessibility

### 12.1 ARIA Labels [4/5]

Icon-only buttons must have labels (`aria-label`). Provide context for screen readers on any element where the visual meaning isn't conveyed through text.

When hand-rolled markup is replaced with a library primitive, sweep the leftover `role` / `aria-expanded` / `aria-haspopup` / `aria-controls` attributes. The primitive supplies its own, and the ones left behind now lie.

### 12.2 Form Labels [4/5]

All inputs must have associated labels. Use `aria-describedby` for supplementary help text.

### 12.3 Semantic HTML [4/5]

Use semantic elements: `nav`, `main`, `article`, `aside`, `header`, `footer`, `button`, `a`.

Never use `div` or `span` with click handlers as interactive elements.

### 12.4 Color Contrast [4/5]

Minimum contrast ratios (WCAG AA):

- Normal text: 4.5:1
- Large text (18px+): 3:1
- UI components: 3:1

### 12.5 Keyboard Support [3/5]

All functionality should be accessible via keyboard:

- Tab / Shift+Tab navigates between elements
- Enter / Space activates buttons and links
- Escape closes modals and cancels actions
- Arrow keys navigate within components (menus, tabs)

For custom interactive elements, add `role`, `tabindex`, and keyboard event handlers.

### 12.6 Windows High-Contrast Mode [2/5]

Support forced-colors mode. Add explicit borders in high-contrast mode for elements that rely on background color alone for visibility. Low effort, big impact for low-vision users.

---

## 13. CSS Practices

### 13.1 Use CSS Variables [4/5]

Use CSS variables wherever possible. Define rules once with CSS variables and change them conditionally rather than rewriting rules.

Define component-level CSS variables in the component's root, and change them via modifiers or media queries.

### 13.2 Use Existing Design Tokens [4/5]

Both surfaces define the same token set. Use them. Don't define new variables for things that already exist. If a token is missing on one surface but present on the other, add it with the same name and value rather than inventing a parallel one.

### 13.3 Lowest Specificity Possible [4/5]

Prioritize lower specificity. Most style definitions should be a single class plus necessary state modifiers. Avoid nesting for the sake of organization.

**Avoid:**

```css
.calendar .month .date.selected {
  font-weight: bold;
}
```

**Prefer:**

```css
.calendar-date.selected {
  font-weight: bold;
}
```

### 13.4 No Margin on Root/Host Elements [4/5]

The consumer of a component should decide its external spacing. Never set margin on the outermost element of a component.

### 13.5 Prefer Styling Inner Elements [3/5]

To avoid unwanted style overrides from outside, encapsulate styles on inner elements. Expose CSS variables as the public styling API.

### 13.6 Avoid SCSS & Concatenation [3/5]

Neither surface uses SCSS and neither should start. If it ever appears, don't use `&` rule concatenation: it hurts readability and makes selectors harder to search for.

### 13.7 Be Cautious With display: flex on Outermost Elements [3/5]

Flex baseline calculation differs from other display values, making alignment with standard elements difficult. Component root elements should prefer block or inline-block.

---

## 14. Anti-Patterns

### Things to Never Do

**[5/5] Missing loading states:**
Never leave an async action without visible feedback.

**[5/5] No error handling:**
Never silently swallow errors. Always provide a catch path and display errors to the user.

**[5/5] Hardcoded colors:**
Never use raw color values. Always use theme tokens.

**[5/5] Shipping card data off the device:**
No network call, log, or analytics event carries card content, set titles, or pasted text. See 1.7.

**[5/5] Silent truncation:**
Never drop cards, fields, or media without telling the user. Show counts before and after.

**[4/5] Removed focus outlines:**
Never remove focus outlines. This breaks keyboard accessibility.

**[4/5] Inline SVG scattered across call sites:**
Use the icon component (website) or a single shared source (extension).

**[4/5] Gradients:**
No gradients. Flat, solid colors only.

**[4/5] Layout shift on state change:**
Error messages and dynamic content appearing should not push other content around. Use transitions or reserve space. This bites on parse-on-paste, media thumbnails, export progress, and IndexedDB cache reads.

**[4/5] Inconsistent spacing:**
Don't mix spacing systems. Stick to the base grid. No arbitrary pixel values.

**[3/5] Overusing animations:**
Not everything needs to animate. Be purposeful.

**[3/5] Using transition-all:**
Specify which properties animate. `transition-all` has performance cost and causes unintended animations.

---

## Review Checklist

Before considering work complete:

- [ ] Every element serves a purpose (no decorative extras)
- [ ] Checked the component library, and the other surface, before building custom
- [ ] Spacing follows the base grid
- [ ] No hardcoded colors (theme tokens only)
- [ ] No gradients (flat colors only)
- [ ] Icons come from the shared source (no scattered inline SVG)
- [ ] Correct component sizes (standard button/input heights)
- [ ] Loading state implemented for async actions
- [ ] Error state implemented and visible, including partial failures
- [ ] Counts handle singular and plural
- [ ] No layout shift when async content lands
- [ ] Hover states on interactive elements
- [ ] Focus states visible (no outline removal)
- [ ] Keyboard accessible
- [ ] ARIA labels on icon-only buttons, and no stale ones left behind
- [ ] No new network call, permission, or host match without a stated reason
- [ ] Tests cover the parser or converter edge case that prompted the change
- [ ] `bun run check` clean on the surface(s) touched, plus `bun test` if parsing or export changed
- [ ] Matches existing patterns in the codebase
