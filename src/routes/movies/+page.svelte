<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';

	import { onMount, onDestroy, tick } from 'svelte';

	import { getAllMovies, getMoviesByGenres, loadMovieGenresCached } from '$lib/tmdb';

	import type { Movie, Genre } from '$lib/tmdb';

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

	let movies = $state<Movie[]>([]);

	let genres = $state<Genre[]>([]);

	let loading = $state(false);

	let initialLoading = $state(true);

	let error = $state<string | null>(null);

	let page = $state(1);

	let hasMore = $state(true);

	let activeCategory = $state<number>(0);

	let observer: IntersectionObserver | null = null;

	let sentinel = $state<HTMLDivElement | null>(null);

	let requestInFlight = false;

	/**
	 * Used to invalidate old requests when the user
	 * changes categories quickly.
	 */
	let requestId = 0;

	// =========================================================================
	// DERIVED STATE
	// =========================================================================

	const categories = $derived([
		{
			id: 0,
			name: 'All'
		},
		...genres
	]);

	const isEmpty = $derived(!loading && !initialLoading && movies.length === 0);

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

	function openMovie(movieId: number) {
		goto(resolve(`/movie/${movieId}`));
	}

	function handleImageError(event: Event) {
		const image = event.currentTarget as HTMLImageElement;

		if (image.src.endsWith('/placeholder.jpg')) {
			return;
		}

		image.src = '/placeholder.jpg';
	}

	// =========================================================================
	// MOVIE GENRES
	// =========================================================================

	async function loadMovieGenres() {
		try {
			genres = await loadMovieGenresCached();
		} catch (err) {
			console.error('Failed to load movie genres:', err);
		}
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

		movies = [];

		page = 1;

		hasMore = true;

		error = null;

		loading = false;

		initialLoading = true;

		await tick();

		await loadMovies();

		await tick();

		setupObserver();
	}

	// =========================================================================
	// LOAD MOVIES
	// =========================================================================

	async function loadMovies() {
		if (requestInFlight || !hasMore) {
			return;
		}

		requestInFlight = true;

		loading = true;

		error = null;

		/**
		 * Snapshot current request state.
		 */
		const category = activeCategory;

		const currentPage = page;

		const currentRequestId = requestId;

		try {
			const data =
				category === 0
					? await getAllMovies(currentPage)
					: await getMoviesByGenres([category], currentPage);

			/**
			 * Ignore stale responses.
			 *
			 * Example:
			 *
			 * Action request starts
			 * Comedy request starts
			 * Drama request starts
			 *
			 * If Action finishes later,
			 * it will be ignored.
			 */
			if (currentRequestId !== requestId || category !== activeCategory) {
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
			 * Prevent duplicate movies.
			 */
			const existingIds = new Set(movies.map((movie) => movie.id));

			const newMovies = results.filter((movie) => !existingIds.has(movie.id));

			if (newMovies.length > 0) {
				movies = [...movies, ...newMovies];
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
			if (currentRequestId !== requestId || category !== activeCategory) {
				return;
			}

			console.error('Failed to load movies:', err);

			error = 'Unable to load movies right now. Please try again.';
		} finally {
			/**
			 * Only update loading state
			 * for the currently active request.
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
		 * If we already have movies,
		 * retry the next page.
		 *
		 * Otherwise reload the current category.
		 */
		if (movies.length > 0) {
			await loadMovies();
		} else {
			await resetAndReload();
		}
	}

	// =========================================================================
	// CATEGORY
	// =========================================================================

	async function selectCategory(categoryId: number) {
		if (activeCategory === categoryId) {
			return;
		}

		activeCategory = categoryId;

		await resetAndReload();
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

				await loadMovies();
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

	function handleMovieKeydown(event: KeyboardEvent, movieId: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();

			openMovie(movieId);
		}
	}

	// =========================================================================
	// LIFECYCLE
	// =========================================================================

	onMount(async () => {
		await loadMovieGenres();

		await loadMovies();

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

					<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Movies</h1>
				</div>

				{#if movies.length > 0}
					<span class="hidden text-sm text-white/30 sm:block">
						{movies.length} movies
					</span>
				{/if}
			</div>
		</header>

		<!-- =================================================================
             CATEGORY FILTER
        ================================================================== -->

		<nav class="mb-8" aria-label="Movie genres">
			<div class="scrollbar-none overflow-x-auto">
				<div class="flex w-max min-w-full gap-2 pb-1">
					{#each categories as category (category.id)}
						<button
							type="button"
							aria-pressed={activeCategory === category.id}
							aria-label={`Filter movies by ${category.name}`}
							onclick={() => selectCategory(category.id)}
							class={[
								'cursor-pointer rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200',
								'focus:ring-2 focus:ring-white/50 focus:outline-none',
								activeCategory === category.id
									? 'border-white bg-white text-black shadow-lg shadow-white/10'
									: 'border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white'
							]}
						>
							{category.name}
						</button>
					{/each}
				</div>
			</div>
		</nav>

		<!-- =================================================================
             ERROR - INITIAL
        ================================================================== -->

		{#if error && movies.length === 0}
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
				aria-label="Loading movies"
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
						🎬
					</div>

					<h2 class="text-xl font-semibold">No movies found</h2>

					<p class="mt-2 text-sm leading-6 text-white/40">
						There aren't any movies available for this category.
					</p>

					{#if activeCategory !== 0}
						<button
							type="button"
							onclick={() => selectCategory(0)}
							class="mt-6 cursor-pointer rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium transition hover:bg-white/10"
						>
							Browse all movies
						</button>
					{/if}
				</div>
			</section>

			<!-- =================================================================
             MOVIES
        ================================================================== -->
		{:else}
			<main
				class="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 md:gap-y-10 lg:grid-cols-5 xl:grid-cols-6"
				aria-label="Movies"
			>
				{#each movies as movie (movie.id)}
					<article class="group min-w-0">
						<!-- =================================================
                             MOVIE CARD
                        ================================================== -->

						<button
							type="button"
							class="relative block w-full cursor-pointer overflow-hidden rounded-xl bg-zinc-900 text-left focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
							onclick={() => openMovie(movie.id)}
							onkeydown={(event) => handleMovieKeydown(event, movie.id)}
							aria-label={`View ${movie.title}`}
						>
							<!-- =============================================
                                 POSTER
                            ============================================== -->

							<div class="aspect-2/3 w-full overflow-hidden">
								<img
									src={getPosterUrl(movie.poster_path)}
									alt={movie.title}
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
									{#if movie.release_date}
										<span>
											{getYear(movie.release_date)}
										</span>
									{/if}

									{#if movie.release_date && movie.vote_average}
										<span class="text-white/40" aria-hidden="true"> • </span>
									{/if}

									{#if movie.vote_average}
										<span class="font-medium text-yellow-400">
											★
											{getRating(movie.vote_average)}
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

			{#if error && movies.length > 0}
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

			{#if loading && movies.length > 0}
				<div class="flex items-center justify-center py-8" aria-live="polite">
					<div
						class="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white"
						aria-hidden="true"
					></div>

					<span class="sr-only"> Loading more movies </span>
				</div>
			{/if}

			<!-- =============================================================
                 END OF RESULTS
            ============================================================== -->

			{#if !hasMore && movies.length > 0 && !loading}
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
