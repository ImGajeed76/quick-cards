# Privacy practices: form answers

---

## Single purpose

```
Export flashcard sets from Quizlet to common file formats (PDF, Anki .apkg, TXT, CSV, JSON) and to a Knowt account.
```

(Same as in `listing.md`)

---

## Data usage: what does the extension collect?

| Category                            | Tick? | Notes                                                                                                                                                   |
| ----------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personally identifiable information | No    | No name, email, phone, address, ID. Nothing.                                                                                                            |
| Health information                  | No    |                                                                                                                                                         |
| Financial and payment information   | No    |                                                                                                                                                         |
| Authentication information          | No    | We read Knowt's own session cookie to call Knowt's API on the user's behalf. The token never leaves to us.                                              |
| Personal communications             | No    |                                                                                                                                                         |
| Location                            | No    |                                                                                                                                                         |
| Web history                         | No    |                                                                                                                                                         |
| User activity                       | Yes   | Anonymous Plausible events: which export format, whether sets were merged and roughly how many, did Knowt import succeed, Anki deadline bucket. No PII. |
| Website content                     | Yes   | Quizlet set title, description, and flashcard contents. Stays local unless the user explicitly exports/imports.                                         |

**Why "Authentication information" is No, even though we touch a token:**
Chrome's policy defines collection as transmitting data off the user's device.
The Knowt session cookie is set by knowt.com, read locally, and sent only back
to knowt.com via Knowt's own API. We don't store, log, copy, or transmit it to
any server we control. This is direct browser-to-Knowt traffic that the user
explicitly initiated.

**Why "User activity" is Yes:**
Plausible records aggregated event counts (no PII, no IPs, no cookies) for
diagnostic purposes (which features are being used, did the Knowt import
succeed). Mention this explicitly to avoid a reviewer flagging it later.

**Why "Website content" is Yes:**
Card content is "Website content" in Chrome's taxonomy because we read it from
quizlet.com. It stays in the user's browser unless they hit Export or Import.

---

## Certifications (three checkboxes)

All three must be ticked:

- [x] **I do not sell or transfer user data to third parties, outside of the approved use cases.**
      Card content goes to Knowt only when the user clicks Import to Knowt; that is the user-initiated approved use case.

- [x] **I do not use or transfer user data for purposes that are unrelated to my item's single purpose.**
      All data flow exists to enable export or import. Plausible analytics are aggregate diagnostics for the features themselves.

- [x] **I do not use or transfer user data to determine creditworthiness or for lending purposes.**
      Trivially true.

---

## Privacy policy URL

```
https://quickcards.org/privacy
```

---

## Account / contact

- **Developer name (publicly visible):** Oliver Seifert
- **Public contact email:** quickcards@alias.oseifert.ch
- **Support / homepage URL:** https://quickcards.org
- **Issue tracker (linked in detailed description):** https://github.com/ImGajeed76/quick-cards/issues

---

## Distribution

- **Visibility:** Public.
- **Regions:** All regions.
- **Pricing:** Free.
- **In-app purchases:** None.
