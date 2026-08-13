# Chrome Web Store listing

Source of truth for the public-facing listing copy.

---

## Short description

**Hard limit: 132 characters** including spaces.

```
Export Quizlet flashcards to PDF, Anki, TXT, CSV, JSON, or one-click import into Knowt. No login, no sign-up, free.
```

---

## Detailed description

Plain text only, line breaks supported, no HTML or Markdown.
**Hard limit: 16,000 characters.**

```
QuickCards turns any Quizlet set into the format you actually want to study with.

Open a Quizlet set, click the QuickCards icon, and one click later you have a PDF, Anki .apkg, TXT, CSV, or JSON file, or a fresh flashcard set on your Knowt account. No login, no sign-up, no card limit.

WHAT IT DOES

• Print-ready PDF flashcards (2x4 double-sided grid, terms front, definitions back, with cut guides)
• Formatted PDF vocab list with numbering and alternating row tints
• Anki .apkg with media (images, recorded audio, TTS) bundled in, two decks (flashcards + typing), optional FSRS preset paced to a deadline you pick or skip the preset to use Anki's default
• One-click Knowt import using the Knowt session you already have, no API keys, no 100-card cap
• Floating widget on Quizlet set pages: card count and instant clipboard copy, no need to open the popup
• Merge multiple Quizlet sets you have open into a single export, with optional duplicate removal
• Plain exports to TXT, CSV, and JSON
• Customizable separators between term/definition and between cards (Tab, comma, colon, arrow, or your own)

HOW IT WORKS

QuickCards talks to Quizlet's public web API directly from your browser, the same way the page itself does. There is no server on our side. Your cards do not leave your device unless you choose to import them to Knowt or download them.

The Knowt import is opt-in. When you click the Knowt button, the extension reads the session cookie Knowt has already set on your browser, takes the access token out of it, and sends your set straight to Knowt's own GraphQL API. We never see the token, the cookie, or the cards.

PRIVACY

• No accounts. No tracking cookies. No card content sent anywhere we control.
• Optional anonymous usage counts (which export format was used, did the import succeed) via a self-hosted Plausible instance with no PII, no IPs, no cookies.
• Full privacy policy: https://quickcards.org/privacy

OPEN SOURCE

MIT licensed. Source on GitHub: https://github.com/ImGajeed76/quick-cards

Also available as a web app: paste vocab lists, JSON, CSV, or TSV at https://quickcards.org and get the same exports without installing anything.
```

---

## Single purpose

The Web Store requires a single-sentence description of what the extension does.
**This must match the actual behavior of the extension.**

```
Export flashcard sets from Quizlet to common file formats (PDF, Anki .apkg, TXT, CSV, JSON) and to a Knowt account.
```

---

## Category

**Education** (primary).

Reasoning: Quizlet, Anki Web, and Knowt are all listed under Education. Users
searching for tools that work alongside those services look there. Productivity
is broader and lower-signal for this audience.
