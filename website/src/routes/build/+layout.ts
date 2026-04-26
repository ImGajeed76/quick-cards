// Builder routes are CSR-only (they hit IndexedDB on mount). Inheriting the
// root layout's ssr=true would force the toaster + confirm dialog mount path
// through the prerender, which can't run client-only code.
export const ssr = false;
