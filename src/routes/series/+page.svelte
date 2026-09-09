<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { onMount, onDestroy, tick } from 'svelte';

	import { getAllSeries, loadSeriesGenresCached } from '$lib/tmdb';

	import type { TVSeries, Genre } from '$lib/tmdb';

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	// =========================================================================
	// CONSTANTS
	// =========================================================================

	const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

	const skeletons = Array.from({ length: 18 }, (_, i) => i);

	// =========================================================================
	// STATE
	// =========================================================================

	let series = $state<TVSeries[]>([]);

	let genres = $state<Genre[]>([]);

	let activeGenre = $state<number | null>(null);

	let loading = $state(false);

	let initialLoading = $state(true);

	let error = $state<string | null>(null);

	let page = $state(1);

	let hasMore = $state(true);

	let observer: IntersectionObserver | null = null;

	let sentinel = $state<HTMLDivElement | null>(null);

	let requestInFlight = false;

	/**
	 * Used to invalidate old requests.
	 */
	let requestId = 0;

	// =========================================================================
	// DERIVED STATE
	// =========================================================================

	const isEmpty = $derived(!loading && !initialLoading && series.length === 0);

	// =========================================================================
	// HELPERS
	// =========================================================================

	function getPosterUrl(path: string | null | undefined): string {
		if (!path) {
			return '/placeholder.jpg';
		}

		return `${TMDB_POSTER_BASE}${path}`;
	}

	function getYear(date: string | undefined): string {
		return date?.slice(0, 4) ?? '';
	}

	function getRating(rating: number | undefined): string {
		if (!rating || rating <= 0) {
			return 'N/A';
		}

		return rating.toFixed(1);
	}

	function openSeries(seriesId: number) {
		goto(resolve(`/series/${seriesId}`));
	}

	function handleImageError(event: Event) {
		const image = event.currentTarget as HTMLImageElement;

		if (image.src.endsWith('/placeholder.jpg')) {
			return;
		}

		image.src = '/placeholder.jpg';
	}

	// =========================================================================
	// GENRE FILTER
	// =========================================================================

	async function selectGenre(genreId: number | null) {
		if (activeGenre === genreId) {
			return;
		}

		activeGenre = genreId;

		await resetAndReload();
	}

	// =========================================================================
	// RESET + RELOAD
	// =========================================================================

	async function resetAndReload() {
		/**
		 * Invalidate all previous requests.
		 */
		requestId += 1;

		observer?.disconnect();

		requestInFlight = false;

		series = [];

		page = 1;

		hasMore = true;

		error = null;

		loading = false;

		initialLoading = true;

		await tick();

		await loadSeries();

		await tick();

		setupObserver();
	}

	// =========================================================================
	// LOAD SERIES
	// =========================================================================

	async function loadSeries() {
		if (requestInFlight || !hasMore) {
			return;
		}

		requestInFlight = true;

		loading = true;

		error = null;

		/**
		 * Snapshot current request state.
		 */
		const currentPage = page;

		const currentRequestId = requestId;

		try {
			const data = await getAllSeries(currentPage, activeGenre);

			/**
			 * Ignore stale responses.
			 */
			if (currentRequestId !== requestId) {
				return;
			}

			const results = data?.results ?? [];

			/**
			 * No more results.
			 */
			if (results.length === 0) {
				hasMore = false;
				return;
			}

			/**
			 * Prevent duplicate series.
			 */
			const existingIds = new Set(series.map((show) => show.id));

			const newSeries = results.filter((show) => !existingIds.has(show.id));

			if (newSeries.length > 0) {
				series = [...series, ...newSeries];
			}

			/**
			 * Advance pagination.
			 */
			page = currentPage + 1;

			/**
			 * Check if we've reached
			 * the final TMDB page.
			 */
			if (data.page >= data.total_pages || results.length === 0) {
				hasMore = false;
			}
		} catch (err) {
			/**
			 * Ignore errors from stale requests.
			 */
			if (currentRequestId !== requestId) {
				return;
			}

			console.error('Failed to load series:', err);

			error = 'Unable to load series right now. Please try again.';
		} finally {
			/**
			 * Only update loading state
			 * for the current request.
			 */
			if (currentRequestId === requestId) {
				loading = false;

				initialLoading = false;

				requestInFlight = false;
			}
		}
	}

	// =========================================================================
	// RETRY
	// =========================================================================

	async function retry() {
		error = null;

		/**
		 * If we already have series,
		 * retry the next page.
		 *
		 * Otherwise reload from page 1.
		 */
		if (series.length > 0) {
			await loadSeries();
		} else {
			await resetAndReload();
		}
	}

	// =========================================================================
	// INTERSECTION OBSERVER
	// =========================================================================

	function setupObserver() {
		if (!sentinel) {
			return;
		}

		observer?.disconnect();

		observer = new IntersectionObserver(
			async ([entry]) => {
				if (!entry?.isIntersecting) {
					return;
				}

				if (requestInFlight || !hasMore) {
					return;
				}

				await loadSeries();
			},
			{
				/**
				 * Start loading before the
				 * user actually reaches the bottom.
				 */
				root: null,
				rootMargin: '600px 0px',
				threshold: 0
			}
		);

		observer.observe(sentinel);
	}

	// =========================================================================
	// EFFECT
	// =========================================================================

	$effect(() => {
		if (!sentinel) {
			return;
		}

		tick().then(() => {
			setupObserver();
		});
	});

	// =========================================================================
	// KEYBOARD ACCESSIBILITY
	// =========================================================================

	function handleSeriesKeydown(event: KeyboardEvent, seriesId: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();

			openSeries(seriesId);
		}
	}

	// =========================================================================
	// LIFECYCLE
	// =========================================================================

	onMount(async () => {
		/**
		 * Load TV/Series genres.
		 *
		 * This uses:
		 * /genre/tv/list
		 */
		try {
			genres = await loadSeriesGenresCached();
		} catch (err) {
			console.error('Failed to load series genres:', err);
		}

		/**
		 * Load initial series.
		 */
		await loadSeries();

		await tick();

		setupObserver();
	});

	onDestroy(() => {
		observer?.disconnect();
	});
</script>

<Navbar />

<div class="min-h-screen bg-black pt-24 pb-16 text-white" aria-busy={initialLoading}>
	<!-- =====================================================================
         MAIN CONTAINER
    ====================================================================== -->

	<div class="mx-auto w-full max-w-450 px-4 sm:px-6 md:px-10 lg:px-16">
		<!-- =================================================================
     HEADER
================================================================== -->

		<header class="mb-7">
			<div class="flex items-end justify-between gap-4">
				<div>
					<p class="mb-1 text-xs font-medium tracking-[0.25em] text-white/40 uppercase">Discover</p>

					<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Series</h1>
				</div>

				{#if series.length > 0}
					<span class="hidden text-sm text-white/30 sm:block">
						{series.length} series
					</span>
				{/if}
			</div>
		</header>

		<!-- =================================================================
     GENRE FILTER
================================================================== -->

		<nav class="mb-8" aria-label="Series genres">
			<div class="scrollbar-none overflow-x-auto">
				<div class="flex w-max min-w-full gap-2 pb-1">
					<!-- ALL -->

					<button
						type="button"
						aria-pressed={activeGenre === null}
						aria-label="Filter series by All"
						onclick={() => selectGenre(null)}
						class={[
							'cursor-pointer rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200',
							'focus:ring-2 focus:ring-white/50 focus:outline-none',
							activeGenre === null
								? 'border-white bg-white text-black shadow-lg shadow-white/10'
								: 'border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white'
						]}
					>
						All
					</button>

					<!-- GENRES -->

					{#each genres as genre (genre.id)}
						<button
							type="button"
							aria-pressed={activeGenre === genre.id}
							aria-label={`Filter series by ${genre.name}`}
							onclick={() => selectGenre(genre.id)}
							class={[
								'cursor-pointer rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200',
								'focus:ring-2 focus:ring-white/50 focus:outline-none',
								activeGenre === genre.id
									? 'border-white bg-white text-black shadow-lg shadow-white/10'
									: 'border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white'
							]}
						>
							{genre.name}
						</button>
					{/each}
				</div>
			</div>
		</nav>
		<!-- =================================================================
             ERROR - INITIAL
        ================================================================== -->

		{#if error && series.length === 0}
			<section class="flex min-h-[45vh] items-center justify-center" aria-live="polite">
				<div class="max-w-md text-center">
					<div
						class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl"
					>
						⚠
					</div>

					<h2 class="text-xl font-semibold">Something went wrong</h2>

					<p class="mt-2 text-sm leading-6 text-white/40">
						{error}
					</p>

					<button
						type="button"
						onclick={retry}
						class="mt-6 cursor-pointer rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-105 hover:bg-white/90 active:scale-95"
					>
						Try Again
					</button>
				</div>
			</section>

			<!-- =================================================================
             INITIAL SKELETON
        ================================================================== -->
		{:else if initialLoading}
			<div
				class="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
				aria-label="Loading series"
				aria-live="polite"
			>
				{#each skeletons as skeleton (skeleton)}
					<div class="min-w-0">
						<div class="aspect-2/3 animate-pulse overflow-hidden rounded-xl bg-zinc-900">
							<div class="h-full w-full bg-linear-to-br from-white/5 to-transparent"></div>
						</div>
					</div>
				{/each}
			</div>

			<!-- =================================================================
             EMPTY STATE
        ================================================================== -->
		{:else if isEmpty}
			<section class="flex min-h-[45vh] items-center justify-center" aria-live="polite">
				<div class="max-w-md text-center">
					<div
						class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl"
					>
						📺
					</div>

					<h2 class="text-xl font-semibold">No series found</h2>

					<p class="mt-2 text-sm leading-6 text-white/40">
						{#if activeGenre !== null}
							There aren't any series available for this genre right now.
						{:else}
							There aren't any series available right now.
						{/if}
					</p>

					{#if activeGenre !== null}
						<button
							type="button"
							onclick={() => selectGenre(null)}
							class="mt-6 cursor-pointer rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
						>
							View All Series
						</button>
					{/if}
				</div>
			</section>

			<!-- =================================================================
             SERIES
        ================================================================== -->
		{:else}
			<main
				class="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 md:gap-y-10 lg:grid-cols-5 xl:grid-cols-6"
				aria-label="Series"
			>
				{#each series as show (show.id)}
					<article class="group min-w-0">
						<!-- =================================================
                             SERIES CARD
                        ================================================== -->

						<button
							type="button"
							class="relative block w-full cursor-pointer overflow-hidden rounded-xl bg-zinc-900 text-left focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
							onclick={() => openSeries(show.id)}
							onkeydown={(event) => handleSeriesKeydown(event, show.id)}
							aria-label={`View ${show.name}`}
						>
							<!-- =============================================
                                 POSTER
                            ============================================== -->

							<div class="aspect-2/3 w-full overflow-hidden">
								<img
									src={getPosterUrl(show.poster_path)}
									alt={show.name}
									class="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
									loading="lazy"
									decoding="async"
									onerror={handleImageError}
								/>
							</div>

							<!-- =============================================
                                 HOVER GRADIENT
                            ============================================== -->

							<div
								class="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							></div>

							<!-- =============================================
                                 HOVER PLAY BUTTON
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
									title={show.name}
								>
									{show.name}
								</h2>

								<!-- Metadata -->

								<div class="mt-1.5 flex items-center gap-2 text-xs text-white/70">
									{#if show.first_air_date}
										<span>
											{getYear(show.first_air_date)}
										</span>
									{/if}

									{#if show.first_air_date && show.vote_average}
										<span class="text-white/40" aria-hidden="true"> • </span>
									{/if}

									{#if show.vote_average}
										<span class="font-medium text-yellow-400">
											★
											{getRating(show.vote_average)}
										</span>
									{/if}
								</div>
							</div>
						</button>
					</article>
				{/each}

				<!-- =========================================================
                     LOAD MORE SKELETONS
                ========================================================== -->

				{#if loading && !initialLoading}
					{#each [0, 1, 2, 3, 4, 5] as skeleton (skeleton)}
						<div class="min-w-0">
							<div class="aspect-2/3 animate-pulse overflow-hidden rounded-xl bg-zinc-900"></div>
						</div>
					{/each}
				{/if}
			</main>

			<!-- =============================================================
                 PAGINATION ERROR
            ============================================================== -->

			{#if error && series.length > 0}
				<div
					class="mt-10 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/3 px-6 py-8 text-center"
					aria-live="polite"
				>
					<p class="text-sm text-white/50">
						{error}
					</p>

					<button
						type="button"
						onclick={retry}
						class="mt-4 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10"
					>
						Try Again
					</button>
				</div>
			{/if}

			<!-- =============================================================
                 INFINITE SCROLL SENTINEL
            ============================================================== -->

			<div bind:this={sentinel} class="h-10 w-full" aria-hidden="true"></div>

			<!-- =============================================================
                 LOADING INDICATOR
            ============================================================== -->

			{#if loading && series.length > 0}
				<div class="flex items-center justify-center py-8" aria-live="polite">
					<div
						class="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white"
						aria-hidden="true"
					></div>

					<span class="sr-only"> Loading more series </span>
				</div>
			{/if}

			<!-- =============================================================
                 END OF RESULTS
            ============================================================== -->

			{#if !hasMore && series.length > 0 && !loading}
				<div class="flex items-center justify-center gap-4 py-10" aria-live="polite">
					<div class="h-px w-16 bg-white/10"></div>

					<p class="text-xs font-medium tracking-[0.2em] text-white/25 uppercase">
						You've reached the end
					</p>

					<div class="h-px w-16 bg-white/10"></div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.scrollbar-none {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
</style>
