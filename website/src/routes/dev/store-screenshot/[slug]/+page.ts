import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";

export const prerender = true;

export const entries = (): { slug: string }[] => [
  { slug: "banner" },
  { slug: "export" },
  { slug: "anki" },
  { slug: "knowt" },
  { slug: "merge" },
];

export function load({ params }: { params: { slug: string } }): { slug: string } {
  if (!dev) error(404);
  const valid = entries().map((e) => e.slug);
  if (!valid.includes(params.slug)) error(404);
  return { slug: params.slug };
}
