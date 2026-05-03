import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) => (filename.split(/[/\\]/).includes("node_modules") ? undefined : true),
  },
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: undefined,
      precompress: false,
      strict: true,
    }),
    prerender: {
      // Routes under /dev/ are local-only authoring tools (e.g. promo-tile preview)
      // and intentionally throw 404 in production. Ignore those, fail loudly on anything else.
      handleHttpError: ({ status, path }) => {
        if (status === 404 && path.startsWith("/dev/")) return;
        throw new Error(`${status} ${path}`);
      },
    },
  },
};

export default config;
