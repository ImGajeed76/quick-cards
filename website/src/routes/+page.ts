export const load = async ({
  fetch,
}: {
  fetch: typeof globalThis.fetch;
}): Promise<{ stars: number | null }> => {
  try {
    const res = await fetch("https://api.github.com/repos/ImGajeed76/quick-cards");
    if (!res.ok) return { stars: null };
    const data = (await res.json()) as { stargazers_count: number };
    return { stars: data.stargazers_count };
  } catch {
    return { stars: null };
  }
};
