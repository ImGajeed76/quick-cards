import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";

export const prerender = true;

export function load(): void {
  if (!dev) error(404);
}
