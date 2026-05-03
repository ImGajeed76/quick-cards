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

### `*://*.quizlet.com/*`

```
Where the user's flashcard sets live. The extension fetches set data from quizlet.com via the public web API (https://quizlet.com/webapi/3.4/studiable-item-documents) and injects a small floating widget on Quizlet set pages so users can copy or export with one click. The widget only renders on URLs matching /{numeric-id}/{slug} (i.e. Quizlet set main pages), not on Quizlet's homepage, study modes, or other pages.
```

### `https://knowt.com/*`

```
Required by the chrome.cookies API to read Knowt's own session cookie when the user clicks "Import to Knowt". Used to authenticate the request to Knowt's API on the user's behalf, so they don't have to re-enter their credentials. The extension does not inject content scripts into knowt.com.
```

### `https://3gso5evnnzbr7l4ubazdtfa4wq.appsync-api.us-east-1.amazonaws.com/*`

```
This is Knowt's GraphQL API endpoint on AWS AppSync, the same endpoint Knowt's own web app calls. The extension calls two mutations only: createFlashcardSetV2 to create the empty set, and batchUpdateFlashcard to populate the cards. The endpoint is hardcoded so we do not need broad host access. Source: https://github.com/ImGajeed76/quick-cards/blob/main/extension/src/lib/knowt-api.ts
```

---

## Remote code

"Are you using remote code?": **No**.

Justification:

```
The extension does not load or execute any remote code. All scripts and assets, including jsPDF, Alpine.js (CSP build), ankipack, and sql.js (with its WebAssembly file), are bundled at build time via Bun and ship as part of the extension package. The Content Security Policy in the manifest restricts script-src to 'self' and 'wasm-unsafe-eval' (for sql.js), and disallows remote sources. There is no eval, no new Function, no dynamic import(), and no fetch-then-execute code path. Source build pipeline: https://github.com/ImGajeed76/quick-cards/blob/main/extension/build.ts
```
