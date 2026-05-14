<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { onMount, onDestroy, tick } from 'svelte';

	import { getAllMovies, getMoviesByGenres, loadGenresCached } from '$lib/tmdb';

	import type { Movie, Genre } from '$lib/tmdb';

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	// =========================
	// STATE
	// =========================

	let movies = $state<Movie[]>([]);
	let genres = $state<Genre[]>([]);

	let loading = $state(false);

	let page = $state(1);

	let hasMore = $state(true);

	let activeCategory = $state<number>(0);

	let observer: IntersectionObserver | null = null;

	let sentinel: HTMLDivElement | null = null;

	let requestInFlight = false;

	const skeletons = Array.from({ length: 12 }, (_, i) => i);

	// =========================
	// GENRES
	// =========================

	async function loadGenres() {
		try {
			genres = await loadGenresCached();
		} catch (err) {
			console.error(err);
		}
	}

	const categories = $derived([{ id: 0, name: 'All' }, ...genres]);

	// =========================
	// RESET + RELOAD
	// =========================

	async function resetAndReload() {
		observer?.disconnect();

		requestInFlight = false;

		loading = false;

		movies = [];

		page = 1;

		hasMore = true;

		await tick(); // allow DOM/state flush

		await loadMovies();

		setupObserver();
	}

	// =========================
	// LOAD MOVIES
	// =========================

	async function loadMovies() {
		if (requestInFlight || !hasMore) return;

		requestInFlight = true;
		loading = true;

		const category = activeCategory; // snapshot

		try {
			const data =
				category === 0 ? await getAllMovies(page) : await getMoviesByGenres([category], page);

			// 🚨 ignore stale responses
			if (category !== activeCategory) return;

			if (!data?.results?.length) {
				hasMore = false;
				return;
			}

			const existingIds = new Set(movies.map((m) => m.id));

			const newItems = data.results.filter((m) => !existingIds.has(m.id));

			movies = [...movies, ...newItems];

			page += 1;

			if (data.page >= data.total_pages) {
				hasMore = false;
			}
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
			requestInFlight = false;
		}
	}

	// =========================
	// OBSERVER
	// =========================

	function setupObserver() {
		if (!sentinel) return;

		observer?.disconnect();

		observer = new IntersectionObserver(async ([entry]) => {
			if (!entry.isIntersecting) return;
			if (requestInFlight || !hasMore) return;

			await loadMovies();
		});

		observer.observe(sentinel);
	}

	$effect(() => {
		if (!sentinel) return;

		tick().then(setupObserver);
	});

	// =========================
	// INIT
	// =========================

	onMount(async () => {
		await loadGenres();

		await loadMovies();

		await tick();

		setupObserver();
	});

	onDestroy(() => {
		observer?.disconnect();
	});
</script>

<Navbar />

<div class="min-h-screen bg-black px-8 pt-24 text-white md:px-16">
	<h1 class="mb-6 text-2xl font-bold tracking-wide">Movies</h1>

	<!-- CATEGORY -->
	<div class="mb-6 overflow-x-auto">
		<div class="flex w-max gap-2">
			{#each categories as cat (cat.id)}
				<button
					type="button"
					onclick={async () => {
						if (activeCategory === cat.id) return;

						activeCategory = cat.id;

						await resetAndReload();
					}}
					class="rounded-full border px-4 py-1 text-sm whitespace-nowrap transition
						{activeCategory === cat.id
						? 'border-white bg-white text-black'
						: 'border-white/20 bg-white/5 text-white hover:bg-white/10'}"
				>
					{cat.name}
				</button>
			{/each}
		</div>
	</div>

	<!-- GRID -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
		{#each movies as movie (movie.id)}
			<div
				class="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/30 hover:bg-white/10"
			>
				<img
					src={movie.poster_path
						? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
						: '/placeholder.jpg'}
					alt={movie.title}
					class="aspect-2/3 w-full object-cover"
					loading="lazy"
				/>

				<div
					class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 p-4 text-center opacity-0 backdrop-blur-md transition group-hover:opacity-100"
				>
					<button
						onclick={() => goto(resolve(`/movie/${movie.id}`))}
						aria-label={`View details for ${movie.title}`}
						class="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition hover:scale-125 hover:bg-white/30"
					>
						<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M6 4.75a1 1 0 0 1 1.514-.857l12 7.25a1 1 0 0 1 0 1.714l-12 7.25A1 1 0 0 1 6 19.25V4.75z"
							/>
						</svg>
					</button>

					<p class="text-xs font-semibold">
						{movie.title}
					</p>
				</div>
			</div>
		{/each}

		<!-- SKELETONS -->
		{#if loading}
			{#each skeletons as i (i)}
				<div class="animate-pulse overflow-hidden rounded-xl border border-white/10 bg-white/5">
					<div class="aspect-2/3 w-full bg-white/10"></div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- SENTINEL -->
	<div bind:this={sentinel} class="h-10 w-full"></div>

	<!-- END -->
	{#if !hasMore}
		<p class="py-6 text-center text-white/30">No more movies</p>
	{/if}
</div>
