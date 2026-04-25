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
      // SPA fallback for routes that can't be prerendered (the dynamic /build/[id] editor).
      // Vercel rewrites in vercel.json route those paths to this file.
      fallback: "spa.html",
      precompress: false,
      strict: false,
    }),
  },
};

export default config;
