import { SITE_URL } from "$lib/site";

export const prerender = true;

const pages = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/install", changefreq: "monthly", priority: "0.8" },
  { path: "/knowt-alternative", changefreq: "monthly", priority: "0.7" },
];

export function GET(): Response {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `	<url>
		<loc>${SITE_URL}${p.path}</loc>
		<changefreq>${p.changefreq}</changefreq>
		<priority>${p.priority}</priority>
	</url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}
