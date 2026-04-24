<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Check, Puzzle, X } from '@lucide/svelte';
	import { SITE_NAME, SITE_URL } from '$lib/site';
	import { track } from '$lib/analytics';
	import { reveal } from '$lib/actions/reveal';

	const title = `Knowt Only Imports 100 Quizlet Cards? Here's the Fix`;
	const description = `Knowt's Quizlet importer caps at 100 cards per set. If your set is larger, the rest don't come across. QuickCards has no such cap. Free, open-source, one click into Knowt.`;

	// FAQ content is rendered twice: once as visible <details> entries, once as
	// FAQPage JSON-LD so Google can surface rich snippets. Both must match.
	const faqs: { q: string; a: string }[] = [
		{
			q: 'Why does Knowt only import 100 Quizlet cards?',
			a: "It's a limitation of Knowt's current Quizlet importer, not of your set. The full card data is still in Quizlet. QuickCards gets it a different way, which is why there's no cap."
		},
		{
			q: 'How can I import more than 100 cards from Quizlet to Knowt?',
			a: 'Install the QuickCards extension, open the Quizlet set, and use the widget that appears on the page to send it to Knowt. The full set lands in your Knowt account, any size.'
		},
		{
			q: 'Can I merge multiple Quizlet sets into one Knowt set?',
			a: "Yes. Open each set in its own tab and QuickCards will offer to merge them into a single deck before export. Useful when a teacher splits a semester's vocab across weekly sets."
		},
		{
			q: 'Is QuickCards free?',
			a: 'Free. Open-source (MIT licensed) on GitHub. No account needed.'
		},
		{
			q: 'Does QuickCards work with Anki too?',
			a: 'Yes. QuickCards exports .apkg files with FSRS retention and learning steps tuned to a deadline you pick. It also exports CSV, JSON, TXT, a print-ready flashcards PDF, and a vocab-list PDF.'
		},
		{
			q: 'Do I need a Quizlet login?',
			a: "Only if the set itself is private. For public sets, QuickCards fetches the same data you'd see while signed out. It doesn't automate logins or touch anything behind your Quizlet account."
		},
		{
			q: 'Is Knowt still worth using?',
			a: 'Yes. QuickCards is a better import path, not a replacement. Install it, get your full Quizlet sets into Knowt, then study inside Knowt as usual.'
		},
		{
			q: "What's the catch?",
			a: 'None. QuickCards runs in your browser, so your cards never touch a server we control. Source is on GitHub if you want to inspect it or fork it.'
		}
	];

	// Slug for stable #anchors on each FAQ, so Google can surface "jump to"
	// sitelinks and users can deep-link to a specific question.
	function slug(s: string): string {
		return s
			.toLowerCase()
			.replace(/['"?]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	const faqJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map((f) => ({
			'@type': 'Question',
			name: f.q,
			acceptedAnswer: {
				'@type': 'Answer',
				text: f.a
			}
		}))
	};

	const breadcrumbJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
			{
				'@type': 'ListItem',
				position: 2,
				name: 'Knowt alternative',
				item: `${SITE_URL}/knowt-alternative`
			}
		]
	};

	const appJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: SITE_NAME,
		applicationCategory: 'BrowserApplication',
		operatingSystem: 'Chrome, Edge, Brave, Opera',
		url: SITE_URL,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
	};

	function trackInstallClick() {
		track('Install CTA', { from: 'knowt-alternative' });
	}
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(appJsonLd)}</script>`}
</svelte:head>

<div class="mx-auto max-w-[720px] px-6 py-16 sm:py-20">
	<Button variant="ghost" size="sm" href="/" class="-ml-2.5">
		<ArrowLeft />
		Back
	</Button>

	<!-- Hero -->
	<header class="mt-12">
		<h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
			Knowt only imports 100 Quizlet cards.
			<span class="text-primary">Here's why, and what to do about it.</span>
		</h1>
		<p class="mt-6 text-[17px] leading-7 text-muted-foreground">
			Knowt's Quizlet importer caps at 100 cards per set. If your set is larger, the rest
			don't come across. {SITE_NAME} has no such cap. Install it, open your Quizlet set, and
			send the whole thing into Knowt, or into Anki, PDF, CSV, or a plain file.
		</p>
	</header>

	<!-- What the limit looks like, from the user's side -->
	<section use:reveal class="mt-20">
		<h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
			Does this sound familiar?
		</h2>
		<div class="mt-5 space-y-4 text-[15px] leading-7 text-muted-foreground">
			<p>
				You import a 300-card Quizlet set into Knowt. 100 cards come across. No error, no
				warning, no "partial import" flag. You find out the rest are missing when a word
				you expected never shows up in review.
			</p>
			<p>
				{SITE_NAME} doesn't have that cap. It's a browser extension that runs in your own
				Quizlet tab, so it has access the same way Quizlet's own app does. Full set,
				regardless of size.
			</p>
		</div>
		<figure class="mt-8">
			<img
				src="/screenshots/quickcards-widget.png"
				alt="QuickCards widget on a Quizlet set page"
				class="w-full rounded-md border border-border shadow-xl shadow-black/30"
				width="795"
				height="286"
				loading="lazy"
				decoding="async"
			/>
			<figcaption class="mt-3 text-xs text-muted-foreground">
				The {SITE_NAME} widget appears on any Quizlet set.
			</figcaption>
		</figure>
	</section>

	<!-- Comparison table -->
	<section use:reveal class="mt-20">
		<h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
			What's different
		</h2>
		<p class="mt-3 text-[15px] leading-7 text-muted-foreground">
			Where the two paths actually diverge. Both are free, and both need a Knowt account if
			you want cards to end up in Knowt.
		</p>

		<div class="mt-6 overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b border-border">
						<th class="w-[40%] py-3 pr-4 text-left font-medium text-muted-foreground"></th>
						<th class="py-3 pr-4 text-left font-semibold text-primary">
							{SITE_NAME}
						</th>
						<th class="py-3 text-left font-semibold text-foreground">
							Knowt's Quizlet import
						</th>
					</tr>
				</thead>
				<tbody class="[&_td]:py-3 [&_td]:pr-4 [&_tr]:border-b [&_tr]:border-border/60">
					<tr>
						<td class="text-muted-foreground">Cards per Quizlet set</td>
						<td class="font-medium">No limit</td>
						<td class="text-muted-foreground">Up to 100</td>
					</tr>
					<tr>
						<td class="text-muted-foreground">Merge multiple Quizlet sets</td>
						<td><Check class="size-4 text-primary" aria-label="Yes" /></td>
						<td><X class="size-4 text-muted-foreground" aria-label="No" /></td>
					</tr>
					<tr>
						<td class="text-muted-foreground">Export targets</td>
						<td>Knowt, Anki, PDF, CSV, JSON, TXT</td>
						<td class="text-muted-foreground">Knowt only</td>
					</tr>
					<tr>
						<td class="text-muted-foreground">Open source</td>
						<td><Check class="size-4 text-primary" aria-label="Yes" /></td>
						<td><X class="size-4 text-muted-foreground" aria-label="No" /></td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- FAQ -->
	<section use:reveal class="mt-20">
		<h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
			Frequently asked questions
		</h2>
		<div class="mt-6 divide-y divide-border rounded-lg border border-border">
			{#each faqs as faq (faq.q)}
				<details id={slug(faq.q)} class="group">
					<summary
						class="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-foreground hover:text-primary"
					>
						<h3 class="m-0 text-[15px] font-medium">{faq.q}</h3>
						<span
							class="text-muted-foreground transition-transform group-open:rotate-45"
							aria-hidden="true"
						>
							+
						</span>
					</summary>
					<div class="px-5 pb-5 pt-0 text-[15px] leading-7 text-muted-foreground">
						{faq.a}
					</div>
				</details>
			{/each}
		</div>
	</section>

	<!-- Closing -->
	<section use:reveal class="mt-20">
		<p class="text-[15px] leading-7 text-muted-foreground">
			Install takes about a minute. Source is on
			<a
				href="https://github.com/ImGajeed76/quick-cards"
				class="text-foreground underline-offset-4 hover:text-primary hover:underline"
			>
				GitHub
			</a>.
		</p>
		<Button href="/install" onclick={trackInstallClick} class="mt-5">
			<Puzzle />
			Install {SITE_NAME}
		</Button>
	</section>

	<p class="mt-16 text-xs text-muted-foreground">
		QuickCards is an independent open-source project. Not affiliated with Knowt or Quizlet.
		Knowt and Quizlet are trademarks of their respective owners.
	</p>
</div>
