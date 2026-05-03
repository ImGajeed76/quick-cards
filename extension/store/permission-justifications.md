# Permission justifications

---

## API permissions

### `activeTab`

```
Used to detect whether the user is on a Quizlet set page and to read the URL of the active tab so the extension can fetch that specific set's flashcards. Without this, the popup cannot tell which set the user wants to export.
```

### `tabs`

```
Used by the optional "merge sets" feature, which combines flashcards from multiple Quizlet tabs the user has open in the current window. We enumerate tabs that match Quizlet URL patterns (*://*.quizlet.com/*) to offer them as merge candidates. URLs of tabs that don't match Quizlet are not used.
```

### `storage`

```
Stores the user's preferred separator characters (the character between term and definition, and between cards) in chrome.storage.sync, so the preferences persist across sessions and devices. Also stores a transient flag in chrome.storage.local that tells the popup which screen to open when the user clicks the floating widget on a Quizlet page.
```

### `clipboardWrite`

```
Writes the formatted flashcards to the clipboard when the user clicks the "Copy" button in the popup or in the floating widget injected on a Quizlet set page. The clipboard write is always triggered by an explicit user click.
```

### `downloads`

```
Used to save the user's exported file (TXT, CSV, JSON, PDF, or Anki .apkg) to their downloads folder via chrome.downloads.download. The download is always triggered by an explicit user click on an export button.
```

### `cookies`

```
Required only for the optional "Import to Knowt" feature. The extension calls chrome.cookies.getAll on knowt.com to read the session cookie Knowt has already set on the user's browser (specifically, the Cognito ID token cookie), so the user does not have to re-enter their Knowt credentials. The cookie is read inside the background service worker and used only to authenticate the request to Knowt's own API. It is never copied, logged, transmitted to our servers, or sent anywhere other than knowt.com's authenticated API.
```

---

## Host permissions

The Chrome Web Store dashboard collects all host-permission justifications in
a single 1,000-character field. Paste the block below verbatim.

```
- *://*.quizlet.com/*
Fetches set data from quizlet.com via its public web API and injects a small floating widget on Quizlet set pages for one-click copy/export. The widget only renders on /{numeric-id}/{slug} URLs (set main pages).

- https://knowt.com/*
Required for the chrome.cookies API to read Knowt's session cookie when the user clicks "Import to Knowt", so they don't re-enter credentials. No content scripts are injected into knowt.com.

- https://3gso5evnnzbr7l4ubazdtfa4wq.appsync-api.us-east-1.amazonaws.com/*
Knowt's GraphQL API endpoint on AWS AppSync (same as Knowt's own web app). Calls only createFlashcardSetV2 and batchUpdateFlashcard. Hardcoded to avoid broad host access.
```

---

## Remote code

"Are you using remote code?": **No**.

Justification:

```
The extension does not load or execute any remote code. All scripts and assets, including jsPDF, Alpine.js (CSP build), ankipack, and sql.js (with its WebAssembly file), are bundled at build time via Bun and ship as part of the extension package. The Content Security Policy in the manifest restricts script-src to 'self' and 'wasm-unsafe-eval' (for sql.js), and disallows remote sources. There is no eval, no new Function, no dynamic import(), and no fetch-then-execute code path. Source build pipeline: https://github.com/ImGajeed76/quick-cards/blob/main/extension/build.ts
```
