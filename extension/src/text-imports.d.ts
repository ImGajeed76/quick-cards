// Bun's bundler returns a string from `import x from "./foo.html" with { type: "text" }`,
// but bun-types declares `*.html` and `*.css` modules with HTMLBundle / non-string types.
// Override those for the text import attribute path so consumers get the actual runtime
// shape (string).

declare module "*.html" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: string;
  export default content;
}
