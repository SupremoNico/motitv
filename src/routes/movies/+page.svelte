<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { getAllMovies, loadGenresCached } from '$lib/tmdb';
	import type { Movie, Genre } from '$lib/tmdb';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let movies = $state<Movie[]>([]);
	let genres = $state<Genre[]>([]);

	let loading = $state(false);
	let page = $state(1);
	let hasMore = $state(true);

	let activeCategory = $state<number>(0);

	// ✅ FIX: separate strict fetch lock
	let isFetching = $state(false);

	let observer: IntersectionObserver | null = null;
	let sentinel: HTMLDivElement | null = null;

	const skeletons = Array.from({ length: 12 }, (_, i) => i);

	// =========================
	// GENRES
	// =========================
	async function loadGenres() {
		try {
			genres = await loadGenresCached();
		} catch (err) {
			console.error('Failed to load genres', err);
		}
	}

	const categories = $derived([{ id: 0, name: 'All' }, ...genres]);

	// =========================
	// FILTERED MOVIES
	// =========================
	const filteredMovies = $derived(
		activeCategory === 0
			? movies
			: movies.filter((m) => m.genre_ids?.includes(activeCategory))
	);

	// =========================
	// LOAD MOVIES (FIXED)
	// =========================
	async function loadMovies() {
		if (loading || isFetching || !hasMore) return;

		isFetching = true;
		loading = true;

		try {
			const data = await getAllMovies(page);

			if (!data?.results?.length) {
				hasMore = false;
				return;
			}

			movies = [...movies, ...data.results];
			page += 1;

			if (data.page >= data.total_pages) {
				hasMore = false;
			}
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
			isFetching = false;
		}
	}

	// =========================
	// OBSERVER (FIXED)
	// =========================
	function setupObserver() {
		if (!sentinel) return;

		observer?.disconnect();

		observer = new IntersectionObserver(
			async ([entry]) => {
				if (!entry.isIntersecting) return;
				if (isFetching || loading || !hasMore) return;

				// prevent repeated triggers
				observer?.unobserve(entry.target);

				await loadMovies();

				// re-attach safely after update
				queueMicrotask(() => {
					if (sentinel && hasMore) {
						observer?.observe(sentinel);
					}
				});
			},
			{
				rootMargin: '300px',
				threshold: 0
			}
		);

		observer.observe(sentinel);
	}

	// =========================
	// LIFECYCLE
	// =========================
	onMount(async () => {
		await loadGenres();
		await loadMovies();

		setupObserver();
	});

	onDestroy(() => {
		observer?.disconnect();
	});
</script>

<Navbar />

<div class="min-h-screen bg-black px-8 pt-24 text-white md:px-16">
	<h1 class="mb-6 text-2xl font-bold tracking-wide">Movies</h1>

	<!-- CATEGORY CAROUSEL -->
	<div class="mb-6 overflow-x-auto">
		<div class="flex w-max gap-2">
			{#each categories as cat (cat.id)}
				<button
					type="button"
					onclick={() => (activeCategory = cat.id)}
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

	<!-- MOVIE GRID -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
		{#each filteredMovies as movie (movie.id)}
			<div
				class="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/30 hover:bg-white/10"
			>
				<img
					src={movie.poster_path
						? 'https://image.tmdb.org/t/p/w300' + movie.poster_path
						: '/placeholder.jpg'}
					alt={movie.title}
					class="w-full object-cover"
					loading="lazy"
					onerror={(e: Event) => {
						const img = e.currentTarget as HTMLImageElement;
						img.src = '/placeholder.jpg';
					}}
				/>

				<!-- HOVER OVERLAY -->
				<div
					class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 p-4 text-center opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100"
				>
					<button
						onclick={() => goto(resolve(`/movie/${movie.id}`))}
						class="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white/20 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-125 hover:bg-white/30 active:scale-110"
						aria-label="Play movie"
					>
						<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M6 4.75a1 1 0 0 1 1.514-.857l12 7.25a1 1 0 0 1 0 1.714l-12 7.25A1 1 0 0 1 6 19.25V4.75z"
							/>
						</svg>
					</button>

					<p class="line-clamp-2 text-xs font-semibold text-white">
						{movie.title}
					</p>

					<div class="flex items-center gap-3 text-[10px] text-white/70">
						<span class="font-medium text-yellow-400">
							★ {movie.vote_average?.toFixed(1)}
						</span>
						<span>•</span>
						<span>{movie.release_date?.slice(0, 4)}</span>
					</div>
				</div>
			</div>
		{/each}

		{#if loading}
			{#each skeletons as i (i)}
				<div class="animate-pulse overflow-hidden rounded-xl border border-white/10 bg-white/5">
					<div class="aspect-[2/3] w-full bg-white/10"></div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- SENTINEL -->
	<div bind:this={sentinel} class="h-10 w-full"></div>

	{#if !hasMore}
		<p class="py-6 text-center text-white/30">No more movies</p>
	{/if}
</div>