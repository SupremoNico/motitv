<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { searchMulti, normalizeMultiSearch } from '$lib/tmdb';
	import type { SearchResult } from '$lib/tmdb';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	// =========================
	// STATE
	// =========================
	let results = $state<SearchResult[]>([]);
	let loading = $state(false);
	let pageNum = $state(1);
	let hasMore = $state(true);

	let controller: AbortController | null = null;
	let observer: IntersectionObserver | null = null;
	let sentinel = $state<HTMLDivElement | null>(null);

	let activeQuery = '';
	let initialized = false;

	const skeletons = Array.from({ length: 12 }, (_, i) => i);

	// =========================
	// DERIVED QUERY (URL)
	// =========================
	let query = $derived(page.url.searchParams.get('q') ?? '');

	// =========================
	// GROUPED RESULTS
	// =========================
	const movies = $derived(results.filter((i) => i.type === 'movie'));
	const series = $derived(results.filter((i) => i.type === 'tv'));

	// =========================
	// RESET STATE
	// =========================
	function resetSearch(q: string) {
		activeQuery = q;

		controller?.abort();
		controller = new AbortController();

		results = [];
		pageNum = 1;
		hasMore = true;
	}

	// =========================
	// FETCH
	// =========================
	async function fetchResults() {
		if (!activeQuery || loading || !hasMore) return;

		loading = true;

		try {
			const data = await searchMulti(activeQuery, pageNum, {
				signal: controller?.signal
			});

			const normalized = normalizeMultiSearch(data.results);

			if (!normalized.length) {
				hasMore = false;
				return;
			}

			results = [...results, ...normalized];
			pageNum += 1;

			if (data.page >= data.total_pages) {
				hasMore = false;
			}
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			console.error(err);
		} finally {
			loading = false;
		}
	}

	// =========================
	// INIT SEARCH (ONLY WHEN QUERY CHANGES)
	// =========================
	$effect(() => {
		if (!query?.trim()) return;

		// prevent duplicate initial run
		if (query === activeQuery && initialized) return;

		initialized = true;

		resetSearch(query);
		fetchResults();
	});

	// =========================
	// INFINITE SCROLL
	// =========================
	function setupObserver() {
		if (!sentinel) return;

		observer?.disconnect();

		observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !loading && hasMore) {
					fetchResults();
				}
			},
			{ rootMargin: '250px' }
		);

		observer.observe(sentinel);
	}

	onMount(() => {
		setupObserver();
	});

	onDestroy(() => {
		controller?.abort();
		observer?.disconnect();
	});
</script>

<Navbar />

<div class="min-h-screen bg-black px-8 pt-24 text-white md:px-16">
	<h1 class="mb-6 text-2xl font-bold tracking-wide">
		Search results for "{query}"
	</h1>

	{#if !query}
		<p class="text-white/40">Start typing to search...</p>
	{:else}
		<!-- MOVIES -->
		{#if movies.length > 0}
			<section class="mb-10">
				<h2 class="mb-3 text-lg font-semibold text-white/90">Movies</h2>

				<div class="flex gap-4 overflow-x-auto pb-2">
					{#each movies as item (item.id)}
						<div class="w-40 flex-shrink-0">
							<div
								class="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/30 hover:bg-white/10"
							>
								<img
									src={item.poster
										? `https://image.tmdb.org/t/p/w300${item.poster}`
										: '/placeholder.jpg'}
									alt={item.title}
									class="h-60 w-full object-cover"
									loading="lazy"
								/>

								<div
									class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 backdrop-blur-md transition group-hover:opacity-100"
								>
									<button
										onclick={() => goto(resolve(`/movie/${item.id}`))}
										class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 transition hover:scale-110"
									>
										▶
									</button>

									<p class="line-clamp-2 px-2 text-center text-xs font-semibold">
										{item.title}
									</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- SERIES -->
		{#if series.length > 0}
			<section>
				<h2 class="mb-3 text-lg font-semibold text-white/90">Series</h2>

				<div class="flex gap-4 overflow-x-auto pb-2">
					{#each series as item (item.id)}
						<div class="w-40 flex-shrink-0">
							<div
								class="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/30 hover:bg-white/10"
							>
								<img
									src={item.poster
										? `https://image.tmdb.org/t/p/w300${item.poster}`
										: '/placeholder.jpg'}
									alt={item.title}
									class="h-60 w-full object-cover"
									loading="lazy"
								/>

								<div
									class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 backdrop-blur-md transition group-hover:opacity-100"
								>
									<button
										onclick={() => goto(resolve(`/series/${item.id}`))}
										class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 transition hover:scale-110"
									>
										▶
									</button>

									<p class="line-clamp-2 px-2 text-center text-xs font-semibold">
										{item.title}
									</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- LOADING -->
		{#if loading}
			<div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
				{#each skeletons as i (i)}
					<div class="animate-pulse rounded-xl border border-white/10 bg-white/5">
						<div class="aspect-[2/3] w-full bg-white/10"></div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- SENTINEL -->
		<div bind:this={sentinel} class="h-10 w-full"></div>

		{#if !hasMore && results.length > 0}
			<p class="py-6 text-center text-white/30">No more results</p>
		{/if}
	{/if}
</div>
