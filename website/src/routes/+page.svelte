<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		today,
		getLocalTimeZone,
		type DateValue,
		type CalendarDate
	} from '@internationalized/date';
	import {
		ArrowRight,
		CalendarClock,
		ChevronDown,
		ChevronRight,
		Code2,
		Download,
		Link2,
		Puzzle,
		ShieldCheck
	} from '@lucide/svelte';
	import Github from '$lib/components/icons/Github.svelte';
	import { parseInput } from '$lib/parse';
	import { encodePayload, type SharePayload } from '$lib/share';
	import { track } from '$lib/analytics';
	import { reveal } from '$lib/actions/reveal';
	import { nextExample, FORMAT_LABELS, type Example } from '$lib/demo';
	import { formatCards, toCsv } from '$lib/export/formatting';

	let { data } = $props();

	let value = $state('');
	let error = $state<string | null>(null);
	// svelte-ignore state_referenced_locally
	let displayStars = $state<number | null>(data.stars);

	const canContinue = $derived(value.trim().length > 0);

	// Stars count-up — only animate when the number is large enough that
	// counting is actually visible. Otherwise just show the final value.
	onMount(() => {
		const initial = data.stars;
		if (initial === null || initial < 4) return;
		const target: number = initial;

		displayStars = 0;
		const duration = 800;
		const start = performance.now();
		let raf = 0;
		const tick = (now: number) => {
			const t = Math.min((now - start) / duration, 1);
			const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
			displayStars = Math.round(target * eased);
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

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

	const SHARE_URL_MAX = 8000;

	async function handleContinue() {
		if (!canContinue) return;
		error = null;
		const result = parseInput(value);

		track('Continue', { kind: result.kind });

		let payload: SharePayload;
		if (result.kind === 'vocab') {
			payload = {
				kind: 'vocab',
				set: { title: '', description: '', cards: result.pairs }
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

	function scrollToAbout() {
		document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
	}

	// Linear-style bordered hover: update per-card CSS vars on every mouse move
	// in the grid so each card's ::after gradient tracks the cursor. The border
	// glow is shown for every card while the cursor is anywhere in the grid —
	// no flicker when moving through the gap between cards.
	function handleCardMove(event: MouseEvent) {
		const container = event.currentTarget as HTMLElement;
		for (const card of container.querySelectorAll<HTMLElement>('.feature-card')) {
			const rect = card.getBoundingClientRect();
			card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
			card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
		}
	}

	// ── Demo cycle ───────────────────────────────────────────────────────
	let currentExample = $state<Example>(nextExample());
	let demoVisible = $state(true);
	let demoHover = $state(false);
	let previewOpen = $state(false);
	let previewFormat = $state<
		'txt' | 'csv' | 'json' | 'pdf-list' | 'pdf-cards' | 'anki' | null
	>(null);

	// Tokens for the word-by-word blur animation — splits on whitespace,
	// keeping the whitespace as separators so layout (spaces, newlines) is
	// preserved. Only the non-whitespace tokens animate.
	const tokenized = $derived(
		(() => {
			const parts = currentExample.text.split(/(\s+)/);
			let wordIdx = 0;
			return parts.map((part) => {
				const isWord = part.length > 0 && !/^\s+$/.test(part);
				return { text: part, isWord, idx: isWord ? wordIdx++ : -1 };
			});
		})()
	);

	const cyclePaused = $derived(demoHover || previewOpen);

	onMount(() => {
		const DISPLAY_MS = 4500;
		const FADE_MS = 320;
		let timer: ReturnType<typeof setTimeout> | null = null;

		function schedule() {
			timer = setTimeout(() => {
				if (cyclePaused || document.visibilityState === 'hidden') {
					schedule();
					return;
				}
				demoVisible = false;
				timer = setTimeout(() => {
					currentExample = nextExample(currentExample);
					demoVisible = true;
					schedule();
				}, FADE_MS);
			}, DISPLAY_MS);
		}

		schedule();
		return () => {
			if (timer) clearTimeout(timer);
		};
	});

	// Preview content generation — reuses the same formatters that produce
	// real downloads on /process, so visitors see exactly what they'd get.
	const previewSet = $derived({
		title: 'Example set',
		description: '',
		cards: currentExample.pairs
	});

	const previewText = $derived.by(() => {
		if (previewFormat === 'txt') return formatCards(previewSet, '\t', '\n');
		if (previewFormat === 'csv') return toCsv(previewSet);
		if (previewFormat === 'json') return JSON.stringify(previewSet, null, 2);
		return '';
	});

	function openPreview(format: typeof previewFormat) {
		previewFormat = format;
		previewOpen = true;
	}

	// Interactive Anki preview — mirrors the /process dialog so visitors can
	// see the real picker, not a screenshot. Independent state from anything
	// else on the page.
	const ankiPreviewTz = getLocalTimeZone();
	const ankiPreviewToday = today(ankiPreviewTz);
	let ankiPreviewSelected = $state<DateValue>(ankiPreviewToday.add({ days: 14 }));

	const ankiPreviewDays = $derived(
		Math.round(
			(ankiPreviewSelected.toDate(ankiPreviewTz).getTime() -
				ankiPreviewToday.toDate(ankiPreviewTz).getTime()) /
				86_400_000
		)
	);

	function setAnkiPreviewDays(days: number) {
		if (!Number.isFinite(days) || days < 1) return;
		ankiPreviewSelected = ankiPreviewToday.add({ days });
	}

</script>

<div class="flex flex-col">
	<!-- ══════════════ Hero ══════════════ -->
	<section class="relative flex min-h-screen flex-col">
		<!-- Ambient violet glow -->
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
				{#if displayStars !== null}
					<span class="tabular-nums">{formatStars(displayStars)}</span>
				{/if}
			</Button>
			<Button variant="outline" size="sm" href="/install" class="rounded-full">
				Get the extension
			</Button>
		</header>

		<!-- Main hero -->
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

		<!-- Scroll-down hint -->
		<button
			type="button"
			onclick={scrollToAbout}
			aria-label="Learn more"
			class="animate-hint-down absolute bottom-8 left-1/2 inline-flex size-10 -translate-x-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
		>
			<ChevronDown class="size-5" />
		</button>
	</section>

	<!-- ══════════════ Section 1 — Paste → Export demo ══════════════ -->
	<section id="about" class="scroll-mt-8 px-6 py-24 sm:py-32">
		<div class="mx-auto max-w-5xl">
			<div use:reveal class="text-center">
				<h2
					class="inline-flex items-center justify-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl"
				>
					Paste
					<ArrowRight
						class="size-7 shrink-0 text-muted-foreground sm:size-8"
						aria-hidden="true"
					/>
					<span class="text-primary">Export</span>
				</h2>
				<p class="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
					QuickCards figures out what you gave it and hands back exactly what you need.
				</p>
				<p class="mx-auto mt-2 text-xs text-muted-foreground/70">
					Recognizes vocab lists, JSON, CSV, TSV, Markdown, TOML, Quizlet URLs, and more.
				</p>
			</div>

			<div
				use:reveal={{ delay: 120 }}
				class="demo-wrap mt-14"
				onmouseenter={() => (demoHover = true)}
				onmouseleave={() => (demoHover = false)}
				role="region"
				aria-label="Paste to export demo"
			>
				<div class="demo-grid">
					<!-- Left: cycling input -->
					<div class="demo-panel">
						<div class="demo-panel-label">
							Paste
							<span class="demo-format-pill">{FORMAT_LABELS[currentExample.format]}</span>
						</div>
						<div class="demo-input" class:fading={!demoVisible}>
							{#key currentExample.text}
								<pre class="demo-code">{#each tokenized as t, i (i)}{#if t.isWord}<span
												class="token"
												style="animation-delay: {t.idx * 55}ms">{t.text}</span
											>{:else}<span class="ws">{t.text}</span>{/if}{/each}</pre>
							{/key}
						</div>
					</div>

					<!-- Right: canonical output -->
					<div class="demo-panel">
						<div class="demo-panel-label">Gets you</div>
						<div class="demo-output" class:fading={!demoVisible}>
							<div class="demo-card-list">
								{#each currentExample.pairs as p, i (i)}
									<div class="demo-card-row">
										<span class="demo-term">{p.term}</span>
										<span class="demo-def">{p.definition}</span>
									</div>
								{/each}
							</div>
							<div class="demo-exports">
								<button
									type="button"
									class="demo-export-btn"
									onclick={() => openPreview('txt')}
								>
									<Download class="size-3.5" /> TXT
								</button>
								<button
									type="button"
									class="demo-export-btn"
									onclick={() => openPreview('csv')}
								>
									<Download class="size-3.5" /> CSV
								</button>
								<button
									type="button"
									class="demo-export-btn"
									onclick={() => openPreview('json')}
								>
									<Download class="size-3.5" /> JSON
								</button>
								<button
									type="button"
									class="demo-export-btn"
									onclick={() => openPreview('pdf-list')}
								>
									<Download class="size-3.5" /> PDF — Vocab list
								</button>
								<button
									type="button"
									class="demo-export-btn"
									onclick={() => openPreview('pdf-cards')}
								>
									<Download class="size-3.5" /> PDF — Flashcards
								</button>
								<button
									type="button"
									class="demo-export-btn"
									onclick={() => openPreview('anki')}
								>
									<Download class="size-3.5" /> Anki .apkg
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Demo preview dialog — shows what each format actually looks like. -->
	<Dialog.Root bind:open={previewOpen}>
		<Dialog.Content class="sm:max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>
					{#if previewFormat === 'txt'}TXT preview{/if}
					{#if previewFormat === 'csv'}CSV preview{/if}
					{#if previewFormat === 'json'}JSON preview{/if}
					{#if previewFormat === 'pdf-list'}PDF — Vocab list{/if}
					{#if previewFormat === 'pdf-cards'}PDF — Flashcards{/if}
					{#if previewFormat === 'anki'}Anki .apkg export{/if}
				</Dialog.Title>
				<Dialog.Description>
					{#if previewFormat === 'txt' || previewFormat === 'csv' || previewFormat === 'json'}
						Exactly what would land in your file — your separators, your cards, nothing else.
					{:else if previewFormat === 'pdf-list'}
						Violet-themed table with auto-wrapping and page breaks. Prints beautifully.
					{:else if previewFormat === 'pdf-cards'}
						2×4 A4 grid, double-sided with mirrored backs. Print, fold, study.
					{:else if previewFormat === 'anki'}
						Pick your deadline, get three decks with FSRS settings tuned to it.
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			<div class="preview-body">
				{#if previewFormat === 'txt' || previewFormat === 'csv' || previewFormat === 'json'}
					<pre class="preview-code">{previewText}</pre>
				{:else if previewFormat === 'pdf-list'}
					<img
						src="/screenshots/pdf_list.png"
						alt="PDF vocab list preview"
						class="preview-image"
					/>
				{:else if previewFormat === 'pdf-cards'}
					<img
						src="/screenshots/pdf_cards.png"
						alt="PDF flashcards preview"
						class="preview-image"
					/>
				{:else if previewFormat === 'anki'}
					<div class="preview-anki">
						<div class="preview-anki-picker">
							<div class="space-y-1.5">
								<Label class="text-xs text-muted-foreground" for="anki-preview-days"
									>Days</Label
								>
								<Input
									id="anki-preview-days"
									type="number"
									min="1"
									value={ankiPreviewDays}
									oninput={(e) =>
										setAnkiPreviewDays(Number((e.target as HTMLInputElement).value))}
									class="tabular-nums [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								/>
							</div>
							<div class="flex justify-center rounded-md border border-border">
								<Calendar
									type="single"
									bind:value={ankiPreviewSelected as CalendarDate}
									minValue={ankiPreviewToday.add({ days: 1 })}
									class="bg-transparent"
								/>
							</div>
						</div>
						<div class="preview-anki-info">
							<div class="preview-anki-stat">
								<span class="preview-anki-label">Three decks:</span>
							</div>
							<ul class="preview-anki-list">
								<li>Flashcards (both directions) — {currentExample.pairs.length} cards</li>
								<li>Type term → definition — {currentExample.pairs.length} cards</li>
								<li>Type definition → term — {currentExample.pairs.length} cards</li>
							</ul>
							<div class="preview-anki-meta">
								FSRS retention and learning steps auto-tuned to <strong class="text-foreground">{ankiPreviewDays}</strong>
								{ankiPreviewDays === 1 ? 'day' : 'days'}.
							</div>
						</div>
					</div>
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Root>

	<!-- ══════════════ Section 2 — Four things ══════════════ -->
	<!-- svelte-ignore a11y_no_static_element_interactions — mousemove is decorative (hover glow) -->
	<section
		id="features"
		onmousemove={handleCardMove}
		class="feature-section scroll-mt-8 px-6 py-24 sm:py-32"
	>
		<div class="mx-auto max-w-4xl">
			<div use:reveal class="text-center">
				<h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
					Four things worth knowing
				</h2>
				<p class="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
					The parts we'd otherwise bury in the README.
				</p>
			</div>

			<div class="feature-grid">
				<div use:reveal={{ delay: 80 }} class="feature-card">
					<div class="feature-card-inner">
						<ShieldCheck class="size-5 shrink-0 text-primary" />
						<div>
							<h3 class="text-base font-semibold">Runs in your browser</h3>
							<p class="mt-1.5 text-[15px] leading-7 text-muted-foreground">
								No server, no account. Your cards never leave your device. The URL in
								your address bar holds the whole set, compressed with lz-string.
							</p>
						</div>
					</div>
				</div>

				<div use:reveal={{ delay: 160 }} class="feature-card">
					<div class="feature-card-inner">
						<Link2 class="size-5 shrink-0 text-primary" />
						<div>
							<h3 class="text-base font-semibold">Share a URL, share the cards</h3>
							<p class="mt-1.5 text-[15px] leading-7 text-muted-foreground">
								Finish an export, copy the share link, send it to anyone. Opens the
								same page with the same cards pre-loaded.
							</p>
						</div>
					</div>
				</div>

				<div use:reveal={{ delay: 240 }} class="feature-card">
					<div class="feature-card-inner">
						<CalendarClock class="size-5 shrink-0 text-primary" />
						<div>
							<h3 class="text-base font-semibold">Anki with a deadline</h3>
							<p class="mt-1.5 text-[15px] leading-7 text-muted-foreground">
								Pick when you need to know the set by. QuickCards tunes FSRS
								retention and learning steps to your timeline. Three decks per export.
							</p>
						</div>
					</div>
				</div>

				<div use:reveal={{ delay: 320 }} class="feature-card">
					<div class="feature-card-inner">
						<Code2 class="size-5 shrink-0 text-primary" />
						<div>
							<h3 class="text-base font-semibold">Open source</h3>
							<p class="mt-1.5 text-[15px] leading-7 text-muted-foreground">
								Every line on
								<a
									href="https://github.com/ImGajeed76/quick-cards"
									class="text-foreground underline-offset-4 hover:text-primary hover:underline"
									>GitHub</a
								>. MIT licensed. Inspect it, fork it, contribute.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ══════════════ Section 3 — Extension ══════════════ -->
	<section id="extension" class="scroll-mt-8 px-6 py-24 sm:py-32">
		<div class="mx-auto max-w-4xl">
			<div
				use:reveal
				class="rounded-lg border border-border bg-card/40 p-8 sm:p-12"
			>
				<div class="grid items-center gap-10 sm:grid-cols-[1fr_auto]">
					<div>
						<h2 class="text-3xl font-semibold tracking-tight">
							Quizlet in, Knowt out
						</h2>
						<p class="mt-4 text-[15px] leading-7 text-muted-foreground">
							The browser extension runs inside your own sessions, so it does two things
							web apps can't: fetch any Quizlet set page directly (Cloudflare blocks
							cross-origin fetches), and send your cards straight into your Knowt account
							with one click. No copy-paste between tabs.
						</p>
						<div class="mt-6 flex flex-wrap gap-3">
							<Button href="/install">
								<Puzzle />
								Install the extension
							</Button>
							<Button
								variant="outline"
								href="https://github.com/ImGajeed76/quick-cards/releases/latest"
							>
								Latest release
							</Button>
						</div>
					</div>
					<img
						src="/screenshots/floating_banner.png"
						alt="QuickCards floating banner on a Quizlet set page"
						class="mx-auto w-full max-w-sm rounded-md border border-border shadow-xl shadow-black/30"
						loading="lazy"
					/>
				</div>
			</div>
		</div>
	</section>

	<!-- ══════════════ Footer ══════════════ -->
	<footer class="border-t border-border/50">
		<div
			class="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row"
		>
			<div>
				Made by
				<a
					href="https://oseifert.ch"
					class="text-foreground transition-colors hover:text-primary"
				>
					Oliver Seifert
				</a>
				· MIT licensed.
			</div>
			<div class="flex items-center gap-5">
				<a
					href="https://github.com/ImGajeed76/quick-cards"
					class="transition-colors hover:text-foreground"
				>
					GitHub
				</a>
				<a
					href="https://github.com/ImGajeed76/quick-cards/issues"
					class="transition-colors hover:text-foreground"
				>
					Report a bug
				</a>
			</div>
		</div>
	</footer>
</div>

<style>
	/* ── Paste → Export demo ───────────────────────────────────────────
	 * Two-column layout on sm+, stacked on mobile. Left is the cycling
	 * input (word-by-word blur reveal), right is the canonical cards +
	 * export buttons. Both fade together between cycles; word stagger
	 * fires on re-mount via {#key}.
	 */

	.demo-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
	}

	@media (min-width: 640px) {
		.demo-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.demo-panel {
		position: relative;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border);
		background: color-mix(in oklch, var(--card) 60%, transparent);
		padding: 1rem 1.25rem 1.25rem;
		height: 420px; /* fixed — no resize as content cycles */
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.demo-panel-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
		margin-bottom: 0.75rem;
	}

	.demo-format-pill {
		display: inline-flex;
		align-items: center;
		height: 1.25rem;
		padding: 0 0.5rem;
		border-radius: 9999px;
		background: color-mix(in oklch, var(--primary) 18%, transparent);
		color: var(--primary);
		font-size: 0.675rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: none;
	}

	.demo-input,
	.demo-output {
		flex: 1;
		min-height: 0; /* lets children's overflow work inside a flex parent */
		transition: opacity 320ms ease-out, filter 320ms ease-out;
	}

	.demo-input {
		overflow: hidden;
	}

	.demo-output {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.demo-input.fading,
	.demo-output.fading {
		opacity: 0;
		filter: blur(6px);
	}

	.demo-code {
		margin: 0;
		font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--foreground);
		white-space: pre-wrap;
		word-break: break-word;
		overflow: hidden;
	}

	.demo-code .token {
		display: inline-block;
		animation: blur-word-in 380ms ease-out both;
	}

	.demo-code .ws {
		white-space: pre;
	}

	@keyframes blur-word-in {
		from {
			filter: blur(8px);
			opacity: 0;
			transform: translateY(2px);
		}
		to {
			filter: blur(0);
			opacity: 1;
			transform: translateY(0);
		}
	}

	.demo-card-list {
		flex: 1;
		min-height: 0; /* allow the list to shrink so exports stay pinned */
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
		overflow-y: auto;
	}

	.demo-card-row {
		display: grid;
		grid-template-columns: 40% 1fr;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		border-bottom: 1px solid var(--border);
	}

	.demo-card-row:last-child {
		border-bottom: none;
	}

	.demo-card-row:nth-child(even) {
		background: color-mix(in oklch, var(--muted) 40%, transparent);
	}

	.demo-term {
		color: var(--foreground);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.demo-def {
		color: var(--muted-foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.demo-exports {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.375rem;
	}

	.demo-export-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		height: 2rem;
		padding: 0 0.625rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--foreground);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 150ms, border-color 150ms, color 150ms;
	}

	.demo-export-btn:hover {
		background: var(--muted);
		border-color: var(--input);
	}

	/* ── Preview dialog body ──────────────────────────────────────────── */

	.preview-body {
		max-height: 60vh;
		overflow: auto;
	}

	.preview-code {
		margin: 0;
		padding: 1rem;
		font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
		font-size: 0.8125rem;
		line-height: 1.6;
		color: var(--foreground);
		background: var(--muted);
		border-radius: var(--radius-md);
		white-space: pre;
		overflow-x: auto;
	}

	.preview-image {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
		background: white;
	}

	.preview-anki {
		display: grid;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.preview-anki {
			grid-template-columns: 1fr 1fr;
			align-items: start;
		}
	}

	.preview-anki-picker {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.preview-anki-info {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.preview-anki-label {
		font-weight: 600;
		color: var(--foreground);
	}

	.preview-anki-list {
		margin: 0;
		padding-left: 1.25rem;
		color: var(--muted-foreground);
		line-height: 1.7;
	}

	.preview-anki-meta {
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
		color: var(--muted-foreground);
		font-size: 0.8125rem;
	}

	/* Linear-style bordered hover effect for the feature cards.
	 *
	 * The card has a light background (= visible "border" color). A content box
	 * inside with `margin: 1px` covers everything except a 1px ring, showing the
	 * parent's background through that gap. A pseudo-element sits behind the
	 * content with a mouse-tracking radial gradient — only visible through the
	 * ring, so the effect is purely on the border.
	 *
	 * The `:hover` trigger is on the grid, not on each card, so the glow doesn't
	 * flicker as the cursor crosses the gap between cards. */

	.feature-grid {
		margin-top: 4rem;
		display: grid;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.feature-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.feature-card {
		position: relative;
		border-radius: var(--radius-lg);
		background: var(--border);
		isolation: isolate;
		overflow: hidden;
	}

	.feature-card::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(
			320px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
			color-mix(in oklch, var(--primary) 75%, transparent),
			transparent 45%
		);
		opacity: 0;
		transition: opacity 500ms ease-out;
		pointer-events: none;
		z-index: 1;
	}

	/* Hover zone extends to the entire section, not just the grid, so the
	   glow stays active when the cursor is above/below or beside the cards. */
	.feature-section:hover .feature-card::after {
		opacity: 1;
	}

	.feature-card-inner {
		position: relative;
		z-index: 2;
		margin: 1px;
		min-height: calc(100% - 2px);
		background: var(--card);
		border-radius: calc(var(--radius-lg) - 1px);
		padding: 1.5rem;
		display: flex;
		gap: 1rem;
		box-sizing: border-box;
	}
</style>
