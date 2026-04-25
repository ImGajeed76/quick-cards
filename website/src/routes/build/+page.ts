// IndexedDB only exists in the browser, so the builder runs purely client-side.
// We still let SvelteKit prerender an empty shell for fast first paint.
export const prerender = true;
export const ssr = false;
