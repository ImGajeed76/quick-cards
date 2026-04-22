// Thin wrapper around Plausible's tagged-events API. The script is loaded from
// app.html and exposes `window.plausible` — this helper just narrows the types
// and no-ops when the script isn't available (e.g. an ad-blocker dropped it).

type PlausibleProps = Record<string, string | number | boolean>;

declare global {
	interface Window {
		plausible?: (event: string, options?: { props?: PlausibleProps }) => void;
	}
}

export function track(event: string, props?: PlausibleProps): void {
	if (typeof window === 'undefined') return;
	window.plausible?.(event, props ? { props } : undefined);
}

/** Bucket Anki deadline days so the analytics dashboard stays readable. */
export function bucketDays(days: number): string {
	if (days <= 3) return '1-3 days';
	if (days <= 7) return '4-7 days';
	if (days <= 14) return '8-14 days';
	if (days <= 30) return '15-30 days';
	if (days <= 60) return '31-60 days';
	return '60+ days';
}
