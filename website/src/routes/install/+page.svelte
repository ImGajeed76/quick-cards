<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, ArrowUpRight, Download, LoaderCircle } from '@lucide/svelte';
	import { SITE_NAME } from '$lib/site';

	const title = `Install ${SITE_NAME} — one-minute setup`;
	const description = `Install the ${SITE_NAME} browser extension in five steps. Free, open-source, works in Chrome, Edge, Brave, and Opera.`;

	const RELEASES_URL = 'https://github.com/ImGajeed76/quick-cards/releases/latest';
	const FETCH_TIMEOUT_MS = 2500;

	let status = $state<'loading' | 'direct' | 'fallback'>('loading');
	let download = $state<string | null>(null);
	let version = $state<string | null>(null);

	onMount(async () => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			const res = await fetch(
				'https://api.github.com/repos/ImGajeed76/quick-cards/releases/latest',
				{ signal: controller.signal }
			);
			if (!res.ok) {
				status = 'fallback';
				return;
			}
			const data = (await res.json()) as {
				tag_name?: string;
				assets?: { name: string; browser_download_url: string }[];
			};
			const zip = data.assets?.find((a) => a.name.endsWith('.zip'));
			if (zip) {
				download = zip.browser_download_url;
				version = data.tag_name ?? null;
				status = 'direct';
			} else {
				status = 'fallback';
			}
		} catch {
			status = 'fallback';
		} finally {
			clearTimeout(timer);
		}
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
</svelte:head>

<div class="mx-auto max-w-[640px] px-6 py-16 sm:py-20">
	<Button variant="ghost" size="sm" href="/" class="-ml-2.5">
		<ArrowLeft />
		Back
	</Button>

	<h1 class="mt-12 text-3xl font-semibold tracking-tight">Install the extension</h1>
	<p class="mt-3 text-muted-foreground">A one-time setup. Takes about a minute.</p>

	<ol class="mt-16 space-y-12">
		<li class="grid grid-cols-[2rem_1fr] gap-x-5">
			<div class="pt-0.5 text-xl font-semibold text-muted-foreground tabular-nums">1</div>
			<div>
				<h2 class="text-xl font-semibold">Download the extension</h2>
				<p class="mt-2 text-[15px] leading-7 text-muted-foreground">
					A small zip file, around 200 KB. Downloads straight from GitHub.
				</p>
				{#if status === 'loading'}
					<Button disabled class="mt-5 min-w-[15rem]">
						<LoaderCircle class="animate-spin" />
						Preparing download…
					</Button>
				{:else if status === 'direct' && download}
					<Button href={download} download class="mt-5 min-w-[15rem]">
						<Download />
						Download{version ? ` ${version}` : ''}
					</Button>
				{:else}
					<Button href={RELEASES_URL} class="mt-5 min-w-[15rem]">
						<ArrowUpRight />
						Latest release on GitHub
					</Button>
				{/if}
			</div>
		</li>

		<li class="grid grid-cols-[2rem_1fr] gap-x-5">
			<div class="pt-0.5 text-xl font-semibold text-muted-foreground tabular-nums">2</div>
			<div>
				<h2 class="text-xl font-semibold">Unzip it</h2>
				<p class="mt-2 text-[15px] leading-7 text-muted-foreground">
					Extract the folder and keep it somewhere permanent. Chrome reads from that folder
					while the extension is installed — if you delete it, the extension stops working.
				</p>
			</div>
		</li>

		<li class="grid grid-cols-[2rem_1fr] gap-x-5">
			<div class="pt-0.5 text-xl font-semibold text-muted-foreground tabular-nums">3</div>
			<div>
				<h2 class="text-xl font-semibold">Open Chrome's extensions page</h2>
				<p class="mt-2 text-[15px] leading-7 text-muted-foreground">
					Paste <code
						class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
						>chrome://extensions</code
					>
					into the address bar and press Enter. The same page works in Edge and Brave.
				</p>
			</div>
		</li>

		<li class="grid grid-cols-[2rem_1fr] gap-x-5">
			<div class="pt-0.5 text-xl font-semibold text-muted-foreground tabular-nums">4</div>
			<div>
				<h2 class="text-xl font-semibold">Turn on Developer mode</h2>
				<p class="mt-2 text-[15px] leading-7 text-muted-foreground">
					Flip the toggle in the top-right corner of that page.
				</p>
			</div>
		</li>

		<li class="grid grid-cols-[2rem_1fr] gap-x-5">
			<div class="pt-0.5 text-xl font-semibold text-muted-foreground tabular-nums">5</div>
			<div>
				<h2 class="text-xl font-semibold">Load the extension</h2>
				<p class="mt-2 text-[15px] leading-7 text-muted-foreground">
					Click <span class="font-medium text-foreground">Load unpacked</span> and pick the
					folder from step 2. That's it — QuickCards is installed.
				</p>
			</div>
		</li>
	</ol>

	<p class="mt-20 text-sm text-muted-foreground">
		Stuck?
		<a
			href="https://github.com/ImGajeed76/quick-cards/issues"
			class="inline-flex items-center gap-1 text-primary hover:underline"
		>
			Open an issue on GitHub
			<ArrowUpRight class="size-3.5" />
		</a>
		and we'll help.
	</p>
</div>
