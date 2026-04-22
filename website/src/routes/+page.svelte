<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ChevronRight } from '@lucide/svelte';
	import Github from '$lib/components/icons/Github.svelte';
	import { parseInput } from '$lib/parse';
	import { encodePayload, type SharePayload } from '$lib/share';
	import {
		SITE_URL,
		SITE_NAME,
		SITE_DESCRIPTION,
		SITE_AUTHOR,
		SITE_AUTHOR_URL
	} from '$lib/site';

	const title = `${SITE_NAME} — Export Quizlet & vocab lists, quick`;

	const structuredData = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: SITE_NAME,
		description: SITE_DESCRIPTION,
		url: SITE_URL,
		applicationCategory: 'EducationApplication',
		operatingSystem: 'Any',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		creator: { '@type': 'Person', name: SITE_AUTHOR, url: SITE_AUTHOR_URL }
	});

	let { data } = $props();

	let value = $state('');
	let error = $state<string | null>(null);

	const canContinue = $derived(value.trim().length > 0);

	function formatStars(n: number): string {
		if (n < 1000) return n.toString();
		const k = n / 1000;
		return (Math.round(k * 10) / 10).toString().replace(/\.0$/, '') + 'k';
	}

	function onKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canContinue) {
			e.preventDefault();
			handleContinue();
		}
	}

	// Above this, the URL gets too long for reliable sharing via messaging apps.
	// We still hand the data through — just via sessionStorage instead of ?d=…
	const SHARE_URL_MAX = 8000;

	async function handleContinue() {
		if (!canContinue) return;
		error = null;
		const result = parseInput(value);

		let payload: SharePayload;
		if (result.kind === 'vocab') {
			payload = {
				kind: 'vocab',
				set: {
					title: '',
					description: '',
					cards: result.pairs
				}
			};
		} else if (result.kind === 'quizlet') {
			payload = { kind: 'quizlet', sets: result.sets };
		} else if (result.kind === 'unknown') {
			error = result.reason;
			return;
		} else {
			error = 'Paste something first.';
			return;
		}

		const encoded = encodePayload(payload);
		if (encoded.length > SHARE_URL_MAX) {
			sessionStorage.setItem('quickcards:payload', JSON.stringify(payload));
			await goto('/process?d=local');
		} else {
			await goto(`/process?d=${encoded}`);
		}
	}
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={SITE_DESCRIPTION} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={SITE_DESCRIPTION} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={SITE_DESCRIPTION} />
	{@html `<script type="application/ld+json">${structuredData}</script>`}
</svelte:head>

<div class="relative flex min-h-screen flex-col">
	<!-- Ambient glow -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh]"
		style="background: radial-gradient(ellipse 60% 70% at 50% 0%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 70%);"
	></div>

	<!-- Header -->
	<header class="flex items-center justify-end gap-2 px-6 py-5">
		<Button
			variant="outline"
			size="sm"
			href="https://github.com/ImGajeed76/quick-cards"
			class="rounded-full"
			aria-label="GitHub repository"
		>
			<Github />
			{#if data.stars !== null}
				<span class="tabular-nums">{formatStars(data.stars)}</span>
			{/if}
		</Button>
		<Button variant="outline" size="sm" href="/install" class="rounded-full">
			Get the extension
		</Button>
	</header>

	<!-- Hero -->
	<main class="flex flex-1 flex-col items-center justify-center px-4 pb-24">
		<div class="w-full max-w-2xl">
			<h1 class="mb-10 text-center text-5xl font-bold tracking-tight sm:text-6xl">
				Export Cards, <span class="text-primary">quick.</span>
			</h1>

			<div
				class="flex items-start gap-2 rounded-lg border border-input bg-card p-2 shadow-lg shadow-black/20 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
			>
				<Textarea
					bind:value
					onkeydown={onKeydown}
					rows={1}
					placeholder="Paste a Quizlet URL or a vocab list…"
					spellcheck="false"
					autocapitalize="off"
					autocomplete="off"
					data-gramm="false"
					data-gramm_editor="false"
					data-enable-grammarly="false"
					class="min-h-9 max-h-[40vh] flex-1 resize-none rounded-none border-0 bg-transparent px-2 py-1.5 text-base leading-6 shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base"
				/>
				<Button onclick={handleContinue} disabled={!canContinue}>
					Continue
					<ChevronRight />
				</Button>
			</div>

			{#if error}
				<p class="mt-4 text-center text-sm text-muted-foreground">{error}</p>
			{/if}
		</div>
	</main>
</div>
