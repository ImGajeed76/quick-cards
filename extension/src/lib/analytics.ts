// Anonymous analytics via Plausible.
// `credentials: "omit"` is critical — extension origins default to including
// credentials, which fails the preflight against Plausible's `ACAO: *` response.
// `keepalive: true` lets the request finish even if the popup closes the moment
// after the user clicks an export.

const DOMAIN = "quickcards.oseifert.ch";
const URL = "https://quickcards.oseifert.ch/extension/popup";
const ENDPOINT = "https://plausible.axonotes.ch/api/event";

type Props = Record<string, string | number | boolean>;

export function track(event: string, props?: Props): void {
  const body = JSON.stringify({
    domain: DOMAIN,
    name: event,
    url: URL,
    ...(props ? { props } : {}),
  });

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    credentials: "omit",
    keepalive: true,
  }).catch(() => {
    // Silent — analytics must never break UX.
  });
}

/** Bucket Anki deadline days so the dashboard stays readable. */
export function bucketDays(days: number): string {
  if (days <= 3) return "1-3 days";
  if (days <= 7) return "4-7 days";
  if (days <= 14) return "8-14 days";
  if (days <= 30) return "15-30 days";
  if (days <= 60) return "31-60 days";
  return "60+ days";
}

export function bucketSets(n: number): string {
  if (n <= 2) return "2";
  if (n === 3) return "3";
  return "4+";
}
