<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';

	import { onMount, onDestroy } from 'svelte';

	import { searchMulti, normalizeMultiSearch } from '$lib/tmdb';

	import type { SearchResult } from '$lib/tmdb';

	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { Search, LoaderCircle } from 'lucide-svelte';

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
	// QUERY
	// =========================

	let query = $derived(page.url.searchParams.get('q')?.trim() ?? '');

	// =========================
	// GROUP RESULTS
	// =========================

	const movies = $derived(results.filter((item) => item.type === 'movie'));

	const series = $derived(results.filter((item) => item.type === 'tv'));

	// =========================
	// RESET SEARCH
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
	// FETCH RESULTS
	// =========================

	async function fetchResults() {
		if (!activeQuery || loading || !hasMore) {
			return;
		}

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

			// Prevent duplicate results
			const existingIds = new Set(results.map((item) => `${item.type}-${item.id}`));

			const newResults = normalized.filter((item) => !existingIds.has(`${item.type}-${item.id}`));

			results = [...results, ...newResults];

			pageNum += 1;

			if (data.page >= data.total_pages) {
				hasMore = false;
			}
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				return;
			}

			console.error('Search error:', err);
		} finally {
			loading = false;
		}
	}

	// =========================
	// INITIAL SEARCH
	// =========================

	$effect(() => {
		const q = query;

		if (!q) {
			return;
		}

		if (q === activeQuery && initialized) {
			return;
		}

		initialized = true;

		resetSearch(q);

		fetchResults();
	});

	// =========================
	// INFINITE SCROLL
	// =========================

	function setupObserver() {
		if (!sentinel) {
			return;
		}

		observer?.disconnect();

		observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !loading && hasMore) {
					fetchResults();
				}
			},
			{
				rootMargin: '500px'
			}
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

	// =========================
	// OPEN RESULT
	// =========================

	function openResult(item: SearchResult) {
		goto(resolve(item.type === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`));
	}
</script>

<svelte:head>
	<title>
		{query ? `"${query}" Search Results | MOTITV` : 'Search | MOTITV'}
	</title>

	<meta name="description" content="Search movies and TV series on MOTITV." />
</svelte:head>

<Navbar />

<main class="min-h-screen bg-black px-4 pt-28 pb-24 text-white sm:px-6 lg:px-10">
	<div class="mx-auto max-w-7xl">
		<!-- ========================= -->
		<!-- HEADER -->
		<!-- ========================= -->

		<section class="mb-10">
			<div
				class="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/2.5 px-6 py-8 sm:px-8 sm:py-10"
			>
				<div
					class="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full bg-white/[0.035] blur-3xl"
				></div>

				<div
					class="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-white/2.5 blur-3xl"
				></div>

				<div class="relative">
					<div
						class="mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-white/35 uppercase"
					>
						<Search size={14} />

						<span>Search results</span>
					</div>

					{#if query}
						<h1 class="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
							Results for
							<span class="text-white/40">
								"{query}"
							</span>
						</h1>

						<p class="mt-3 text-sm text-white/35">
							{#if loading && results.length === 0}
								Searching our library...
							{:else}
								{results.length}
								{results.length === 1 ? 'result' : 'results'}
							{/if}
						</p>
					{/if}
				</div>
			</div>
		</section>

		<!-- ========================= -->
		<!-- NO QUERY -->
		<!-- ========================= -->

		{#if !query}
			<section
				class="flex min-h-100 flex-col items-center justify-center rounded-3xl border border-white/6 bg-white/2 px-6 text-center"
			>
				<div
					class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/4"
				>
					<Search size={26} class="text-white/25" />
				</div>

				<h2 class="text-lg font-semibold text-white/75">Search for something to watch</h2>

				<p class="mt-2 max-w-md text-sm leading-6 text-white/35">
					Use the search bar in the navigation to find movies and TV series.
				</p>
			</section>
		{:else}
			<!-- ========================= -->
			<!-- INITIAL LOADING -->
			<!-- ========================= -->

			{#if loading && results.length === 0}
				<div
					class="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
				>
					{#each skeletons as skeleton (skeleton)}
						<div class="animate-pulse">
							<div
								class="aspect-2/3 rounded-2xl border border-white/6 bg-white/4"
							></div>

							<div class="mt-3 h-4 w-4/5 rounded bg-white/6"></div>

							<div class="mt-2 h-3 w-2/5 rounded bg-white/4"></div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- ========================= -->
			<!-- MOVIES -->
			<!-- ========================= -->

			{#if movies.length > 0}
				<section class="mb-14">
					<div class="mb-5">
						<div class="flex items-center gap-2">
							<div class="h-5 w-1 rounded-full bg-white"></div>

							<h2 class="text-xl font-semibold tracking-tight">Movies</h2>
						</div>

						<p class="mt-1 text-sm text-white/30">
							{movies.length}
							{movies.length === 1 ? 'movie' : 'movies'}
						</p>
					</div>

					<div
						class="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
					>
						{#each movies as movie (movie.id)}
							<article class="group min-w-0">
								<!-- =================================================
		     MOVIE CARD
		================================================== -->
								<button
									type="button"
									class="relative block w-full cursor-pointer overflow-hidden rounded-xl bg-zinc-900 text-left focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
									onclick={() => openResult(movie)}
									aria-label={`View ${movie.title}`}
								>
									<!-- =============================================
			     POSTER
			============================================== -->
									<div class="aspect-2/3 w-full overflow-hidden">
										<img
											src={movie.poster
												? `https://image.tmdb.org/t/p/w500${movie.poster}`
												: '/placeholder.jpg'}
											alt={movie.title}
											class="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
											loading="lazy"
											decoding="async"
										/>
									</div>

									<!-- =============================================
			     HOVER GRADIENT
			============================================== -->
									<div
										class="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
									></div>

									<!-- =============================================
			     HOVER OVERLAY
			============================================== -->
									<div
										class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover:opacity-100"
									>
										<span
											class="flex h-14 w-14 scale-75 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-2xl backdrop-blur-xl transition-transform duration-300 group-hover:scale-100"
											aria-hidden="true"
										>
											<svg class="ml-0.5 h-6 w-6 fill-current" viewBox="0 0 24 24">
												<path
													d="M6 4.75a1 1 0 0 1 1.514-.857l12 7.25a1 1 0 0 1 0 1.714l-12 7.25A1 1 0 0 1 6 19.25V4.75z"
												/>
											</svg>
										</span>
									</div>

									<!-- =============================================
     MOVIE INFO
     ONLY VISIBLE ON HOVER
============================================== -->
									<div
										class="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
									>
										<!-- Title -->
										<h2
											class="truncate text-sm font-semibold text-white sm:text-[15px]"
											title={movie.title}
										>
											{movie.title}
										</h2>

										<!-- Metadata -->
										<div class="mt-1.5 flex items-center gap-2 text-xs text-white/70">
											{#if movie.date}
												<span>
													{movie.date.slice(0, 4)}
												</span>
											{/if}

											{#if movie.date && movie.rating}
												<span class="text-white/40" aria-hidden="true">•</span>
											{/if}

											{#if movie.rating}
												<span class="font-medium text-yellow-400">
													★
													{movie.rating.toFixed(1)}
												</span>
											{/if}
										</div>
									</div>
								</button>
							</article>
						{/each}
					</div>
				</section>
			{/if}

			<!-- ========================= -->
			<!-- SERIES -->
			<!-- ========================= -->

			{#if series.length > 0}
				<section class="mb-14">
					<div class="mb-5">
						<div class="flex items-center gap-2">
							<div class="h-5 w-1 rounded-full bg-white"></div>

							<h2 class="text-xl font-semibold tracking-tight">Series</h2>
						</div>

						<p class="mt-1 text-sm text-white/30">
							{series.length}
							{series.length === 1 ? 'series' : 'series'}
						</p>
					</div>

					<div
						class="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
					>
						{#each series as item (`tv-${item.id}`)}
							<article class="group min-w-0">
								<!-- =================================================
					     SERIES CARD
					================================================== -->
								<button
									type="button"
									class="relative block w-full cursor-pointer overflow-hidden rounded-xl bg-zinc-900 text-left focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
									onclick={() => openResult(item)}
									aria-label={`View ${item.title}`}
								>
									<!-- =============================================
						     POSTER
						============================================== -->
									<div class="aspect-2/3 w-full overflow-hidden">
										<img
											src={item.poster
												? `https://image.tmdb.org/t/p/w500${item.poster}`
												: '/placeholder.jpg'}
											alt={item.title}
											class="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
											loading="lazy"
											decoding="async"
										/>
									</div>

									<!-- =============================================
						     HOVER GRADIENT
						============================================== -->
									<div
										class="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
									></div>

									<!-- =============================================
						     HOVER OVERLAY
						============================================== -->
									<div
										class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover:opacity-100"
									>
										<span
											class="flex h-14 w-14 scale-75 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-2xl backdrop-blur-xl transition-transform duration-300 group-hover:scale-100"
											aria-hidden="true"
										>
											<svg class="ml-0.5 h-6 w-6 fill-current" viewBox="0 0 24 24">
												<path
													d="M6 4.75a1 1 0 0 1 1.514-.857l12 7.25a1 1 0 0 1 0 1.714l-12 7.25A1 1 0 0 1 6 19.25V4.75z"
												/>
											</svg>
										</span>
									</div>

									<!-- =============================================
						     SERIES INFO
						     ONLY VISIBLE ON HOVER
						============================================== -->
									<div
										class="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
									>
										<!-- Title -->
										<h2
											class="truncate text-sm font-semibold text-white sm:text-[15px]"
											title={item.title}
										>
											{item.title}
										</h2>

										<!-- Metadata -->
										<div class="mt-1.5 flex items-center gap-2 text-xs text-white/70">
											{#if item.date}
												<span>
													{item.date.slice(0, 4)}
												</span>
											{/if}

											{#if item.date && item.rating}
												<span class="text-white/40" aria-hidden="true"> • </span>
											{/if}

											{#if item.rating}
												<span class="font-medium text-yellow-400">
													★
													{item.rating.toFixed(1)}
												</span>
											{/if}
										</div>
									</div>
								</button>
							</article>
						{/each}
					</div>
				</section>
			{/if}

			<!-- ========================= -->
			<!-- NO RESULTS -->
			<!-- ========================= -->

			{#if !loading && results.length === 0}
				<section
					class="flex min-h-100 flex-col items-center justify-center rounded-3xl border border-white/6 bg-white/2 px-6 text-center"
				>
					<div
						class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/4"
					>
						<Search size={26} class="text-white/25" />
					</div>

					<h2 class="text-lg font-semibold text-white/75">No results found</h2>

					<p class="mt-2 max-w-md text-sm leading-6 text-white/35">
						Nothing matched "{query}". Try searching for another movie or series.
					</p>
				</section>
			{/if}

			<!-- ========================= -->
			<!-- LOAD MORE -->
			<!-- ========================= -->

			{#if loading && results.length > 0}
				<div class="flex items-center justify-center gap-2 py-8 text-sm text-white/30">
					<LoaderCircle size={17} class="animate-spin" />

					<span> Loading more results... </span>
				</div>
			{/if}

			<!-- ========================= -->
			<!-- SENTINEL -->
			<!-- ========================= -->

			<div bind:this={sentinel} class="h-20 w-full"></div>

			<!-- ========================= -->
			<!-- END -->
			<!-- ========================= -->

			{#if !hasMore && results.length > 0}
				<div class="flex items-center justify-center gap-3 py-8">
					<div class="h-px w-12 bg-white/10"></div>

					<span class="text-[10px] tracking-[0.2em] text-white/20 uppercase"> End of results </span>

					<div class="h-px w-12 bg-white/10"></div>
				</div>
			{/if}
		{/if}
	</div>
</main>
