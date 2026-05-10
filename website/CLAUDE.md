# CLAUDE.md

This file is auto-loaded context for Claude. Follow these guidelines when writing frontend code, reviewing UI, or making design decisions.

---

## 0. Project

QuickCards is a Chrome extension (in `extension/`) with a companion SvelteKit website (in `website/`). This CLAUDE.md applies to the **website** subproject only. The extension has its own Chrome-extension conventions and does not follow these rules.

- **Package manager:** Always use `bun` (not npm, pnpm, or yarn)
- **Framework:** SvelteKit with Svelte 5 (runes mode: `$state`, `$derived`, `$props`)
- **Styling:** Tailwind CSS 4
- **Components:** shadcn-svelte (under `src/lib/components/ui/`)
- **Icons:** Lucide (`@lucide/svelte`)
- **i18n:** Not used. English only.
- **Dark mode:** Always-on dark theme. `<html class="dark">` is hardcoded in `src/app.html`.
- **Deployment:** Vercel. Fully prerendered via `@sveltejs/adapter-static`.
- **Analytics:** Self-hosted Plausible. Use `track(event, props)` from `$lib/analytics`. Event names are Title Case with lowercase continuation (`Share link`, `Knowt import result`, `Install CTA`).
- **Site tokens:** `src/lib/site.ts` exports `SITE_NAME`, `SITE_URL`, `SITE_TAGLINE`, etc. Use these. Never hardcode the site name or URL.
- **Punctuation:** Never use em dashes (—) or double hyphens (--). Use commas, periods, or restructure the sentence instead. **Pre-commit check (mandatory):** before every commit, run `git diff --cached | grep -nP "—|--"` (or scan the changed files directly) and confirm no em dashes slipped into prose, comments, test names, or any other added content. Functional uses inside regex literals or test fixtures that exercise em-dash parsing are allowed; everything else must go.
- **Linting:** Never trust inline IDE diagnostics/squiggles. Always verify by running `bun run check`, which runs Prettier, ESLint, and svelte-check.
- **Formatting:** Run `bun run format` to auto-format all files before committing.
- **Commits:** Always use [Conventional Commits](https://www.conventionalcommits.org/). Scope website changes as `feat(web): ...`, `fix(web): ...`, `chore(web): ...`, matching the existing git history.

---

## 0.1 How we work on this project

The user's bar is "done right, not sprinted." Take time. Reason. Do not take shortcuts. The points below are non-negotiable for any non-trivial work on this codebase.

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
- **SEO for this page.** Target query cluster, exact phrasing in H1, semantic HTML for hierarchy, JSON-LD where it helps (FAQPage, HowTo, SoftwareApplication), internal links to related content pages.

### Inspiration

`~/Coding/pdfy` has well-considered layouts. When stuck, look there. Some sections can be lifted as patterns directly. This is not a license to clone visually, only to reuse layout ideas.

### Vocabulary discipline

User research established the words our audience actually uses. Match them in copy, do not impose your own:

- **"Quizlet set"** (never "Quizlet deck"). **"Anki deck"** (never "Anki set").
- Primary verb is **"convert"** (not "migrate" or "transfer"). Secondary: "export", "import".
- Always say **".apkg"** with a parenthetical first usage: "Anki deck file (.apkg)".
- The phrase **"free, no account, in your browser, open source"** belongs above the fold on every landing page. Every word of it is what users have been searching for.
- H1s are literal: "Convert Quizlet to Anki", not "Bring your flashcards to life."

### Honest framing for the deadline-mode feature

The deadline picker preconfigures DeckConfig values (`desiredRetention`, `learnSteps`, `maximumReviewInterval`) based on the user's exam date. It does NOT modify FSRS parameters/weights. It is most useful for tight deadlines (under ~14 days). Past 14 days the values land at Anki defaults anyway.

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

### Anti-patterns on every landing page

- No signup wall before the user sees output.
- No "free trial" anything. We are free, full stop, no qualifications. Do not write "free for students" or "free for educational use."
- No silent truncation. Always show card counts before convert runs.
- No exit-intent popups, no "wait don't leave" popups.
- No comparison tables that make the competitor look unfair. Show real strengths of the competitor too.
- Open-source link visible on every page.

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

### 1.5 Less Is More [4/5]

Once a feature is released, it never goes away. Avoid adding features that don't offer high user value for the cost in maintenance, complexity, and payload size. When in doubt, leave it out.

This applies especially to providing two different APIs or patterns to accomplish the same thing. Prefer sticking to a single approach.

### 1.6 Prefer Small, Focused Modules [4/5]

Keeping modules to a single responsibility makes the code easier to test, consume, and maintain. Ideally, individual files are 200-300 lines of code.

As a rule of thumb, once a file draws near 400 lines (barring long constants or comments), start considering how to refactor into smaller pieces.

---

## 2. Tooling & Libraries

### 2.1 Universal Flow [5/5]

For every tool or library category, follow this decision flow:

1. **Check** if the project already uses something for this purpose
2. **If yes**, follow its existing conventions exactly
3. **If no**, recommend a specific default (listed below) and ask before adding it
4. **Never** reinvent what already exists in the project's dependencies

### 2.2 Component Library (default: shadcn/ui) [5/5]

Before building ANY custom component, always check if the project's component library already provides it. Only build custom if it genuinely doesn't exist.

**If no component library exists:** Recommend shadcn/ui. It provides unstyled, composable primitives that you own and can customize.

**Flow:**

1. Need a dialog? Check shadcn/ui (or whatever library the project uses) first.
2. It exists? Use it. Follow its patterns. Don't wrap it unnecessarily.
3. It doesn't exist? Build a reusable component following the same patterns the library uses.

### 2.3 Styling (default: Tailwind CSS) [4/5]

If the project uses Tailwind, follow its conventions. If using something else (CSS modules, styled-components, etc.), follow that system's patterns.

**If no styling system exists:** Recommend Tailwind CSS. Use theme tokens, not raw color values.

**Tailwind-specific conventions (when applicable):**

- Use the spacing scale (multiples of the base unit), don't use arbitrary values like `m-[17px]`
- Use theme tokens (`bg-primary`, `text-muted-foreground`) instead of raw colors (`bg-blue-500`)
- Specify transition properties (`transition-colors`) instead of `transition-all`

### 2.4 Icons (default: Lucide) [4/5]

If the project has an icon library, use it. Never write SVG markup directly; always use icon components.

**If no icon library exists:** Recommend Lucide. If an icon doesn't exist in the library, create a reusable component rather than inlining SVG.

### 2.5 Internationalization (default: ParaglideJS) [4/5]

If an i18n system already exists, use it the way it already gets used. Never hardcode user-facing strings if i18n is set up.

**If no i18n system exists:** Recommend ParaglideJS and use these conventions:

**Key Naming Convention:**

Structure: `{scope}_{feature}_{element}_{modifier}`

| Part         | Description              | Examples                                                                        |
| ------------ | ------------------------ | ------------------------------------------------------------------------------- |
| **scope**    | Top-level section        | `auth`, `editor`, `settings`, `dashboard`, `common`                             |
| **feature**  | Specific feature/page    | `unlock`, `signin`, `profile`, `document`, `sidebar`                            |
| **element**  | UI element type          | `button`, `input`, `label`, `title`, `description`, `error`, `success`, `toast` |
| **modifier** | Variant/state (optional) | `primary`, `secondary`, `loading`, `empty`, `incorrect`, `placeholder`          |

**Examples:**

```
auth_unlock_title                    - "Welcome back"
auth_unlock_button_primary           - "Unlock"
auth_unlock_error_incorrect          - "Incorrect password"
common_button_save                   - "Save"
common_button_cancel                 - "Cancel"
common_error_network                 - "Network error. Please try again."
editor_document_title_placeholder    - "Untitled"
```

**Rules:**

- For reusable text (Save, Cancel, Delete), use `common_*` prefix
- Keys are deterministic: following the pattern, you know exactly what the key should be
- Related keys group alphabetically for easy scanning

### 2.6 Framework-Specific Conventions [3/5]

Use the frontend framework's standard practices. Some specifics:

**SvelteKit:**

- Use `$lib` for imports from the lib directory
- Use Svelte transitions (`slide`, `fade`) for enter/exit animations
- Prefer reactive declarations (`$:` / `$derived`) over manual watchers
- Use SvelteKit's form actions for form handling when appropriate

**React:**

- Prefer functional components with hooks
- Use the framework's state management patterns (useState, useReducer, context)
- Avoid prop drilling; use composition or context

**General:**

- Follow whatever patterns are already established in the codebase
- Don't introduce a new pattern when an equivalent one already exists

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

### 6.1 Never Hardcode Colors [5/5]

Always use theme tokens. Never use color utilities or hex values directly.

**Correct:** `bg-card`, `text-foreground`, `border-destructive`

**Incorrect:** `bg-gray-100`, `text-gray-700`, `bg-[#f5f5f5]`

Theme tokens automatically adapt to light/dark mode.

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

For status indicators, always provide both light and dark mode variants:

- **Success**: Green tones
- **Warning**: Yellow/amber tones
- **Error**: Use the destructive token
- **Info**: Use the primary token

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

1. Check if the project's component library (e.g. shadcn/ui) already provides it
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

**Loading:** Disable the trigger, show a spinner or loading text, indicate progress.

**Success:** Brief, non-blocking confirmation (toast or inline message).

**Error:** Appear instantly (no animation delay), specific and actionable message, placed near the source.

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

**Button labels:** Use verbs. Be specific when context is unclear ("Save Document" not just "Save"). Match the severity ("Delete" for destructive, "Remove" for reversible).

**Error messages:** Explain what happened and how to fix it. Don't blame the user.

**Placeholder text:** Show format examples ("name@example.com"). Don't repeat the label. Don't use as the only label.

**Confirmation dialogs:** Title states what will happen. Description states consequences. Actions use clear verb labels.

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

If the project provides global design tokens or CSS variables, use them. Don't define new variables for things that already exist. If a token is missing, flag it.

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

Don't use `&` rule concatenation in SCSS. It hurts readability and makes selectors harder to search for.

```scss
// Avoid
.divider {
  &--negative { ... }
}

// Prefer
.divider--negative { ... }
```

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

**[5/5] Hardcoded user-facing strings (when i18n exists):**
If the project has an i18n system, every user-facing string must go through it.

**[4/5] Removed focus outlines:**
Never remove focus outlines. This breaks keyboard accessibility.

**[4/5] Inline SVG instead of icon components:**
Never write SVG markup directly. Use the project's icon library.

**[4/5] Gradients:**
No gradients. Flat, solid colors only.

**[4/5] Layout shift on state change:**
Error messages and dynamic content appearing should not push other content around. Use transitions or reserve space.

**[4/5] Inconsistent spacing:**
Don't mix spacing systems. Stick to the base grid. No arbitrary pixel values.

**[3/5] Overusing animations:**
Not everything needs to animate. Be purposeful.

**[3/5] Using transition-all:**
Specify which properties animate. `transition-all` has performance cost and causes unintended animations.

---

## Review Checklist

Before considering frontend work complete:

- [ ] Every element serves a purpose (no decorative extras)
- [ ] Checked component library before building custom
- [ ] Spacing follows the base grid
- [ ] No hardcoded colors (theme tokens only)
- [ ] No gradients (flat colors only)
- [ ] User-facing strings use i18n (if set up)
- [ ] Icons use the project's icon library (no inline SVG)
- [ ] Correct component sizes (standard button/input heights)
- [ ] Loading state implemented for async actions
- [ ] Error state implemented and visible
- [ ] Hover states on interactive elements
- [ ] Focus states visible (no outline removal)
- [ ] Keyboard accessible
- [ ] ARIA labels on icon-only buttons
- [ ] Matches existing patterns in the codebase
