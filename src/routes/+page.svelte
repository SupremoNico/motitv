<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import Navbar from '$lib/components/Navbar.svelte';
	import MovieRow from '$lib/components/MovieRow.svelte';

	import {
		getFeaturedMovies,
		getHeroMedia,
		getNowPlayingMovies,
		getPopularMovies,
		getTopRatedMovies,
		getUpcomingMovies,
		loadMovieGenresCached
	} from '$lib/tmdb';

	import type { Genre, Movie } from '$lib/tmdb';

	// -------------------------------------------------------------------------
	// Types
	// -------------------------------------------------------------------------

	type HeroData = {
		logo: string | null;
		backdropUrl: string;
	};

	// -------------------------------------------------------------------------
	// Constants
	// -------------------------------------------------------------------------

	const AUTOPLAY_INTERVAL = 6000;
	const TRANSITION_DURATION = 600;

	// -------------------------------------------------------------------------
	// State
	// -------------------------------------------------------------------------

	let loading = $state(true);
	let isTransitioning = $state(false);

	let popularMovies = $state<Movie[]>([]);
	let nowPlayingMovies = $state<Movie[]>([]);
	let topRatedMovies = $state<Movie[]>([]);
	let upcomingMovies = $state<Movie[]>([]);

	let genres = $state<Genre[]>([]);
	let featuredMovies = $state<Movie[]>([]);
	let heroData = $state<HeroData[]>([]);

	let currentIndex = $state(0);

	// -------------------------------------------------------------------------
	// Derived state
	// -------------------------------------------------------------------------

	let currentMovie = $derived(featuredMovies[currentIndex] ?? null);

	let currentHero = $derived(
		heroData[currentIndex] ?? {
			logo: null,
			backdropUrl: ''
		}
	);

	// -------------------------------------------------------------------------
	// Timers
	// -------------------------------------------------------------------------

	let autoplayTimer: ReturnType<typeof setInterval> | undefined;

	let transitionTimer: ReturnType<typeof setTimeout> | undefined;

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	function getGenreNames(ids: number[]): string[] {
		return ids
			.slice(0, 3)
			.map((id) => genres.find((genre) => genre.id === id)?.name)
			.filter((name): name is string => Boolean(name));
	}

	// -------------------------------------------------------------------------
	// Autoplay
	// -------------------------------------------------------------------------

	function stopAutoplay() {
		if (autoplayTimer) {
			clearInterval(autoplayTimer);
			autoplayTimer = undefined;
		}
	}

	function startAutoplay() {
		stopAutoplay();

		if (featuredMovies.length <= 1) {
			return;
		}

		autoplayTimer = setInterval(() => {
			currentIndex = (currentIndex + 1) % featuredMovies.length;
		}, AUTOPLAY_INTERVAL);
	}

	function restartAutoplay() {
		startAutoplay();
	}

	// -------------------------------------------------------------------------
	// Hero navigation
	// -------------------------------------------------------------------------

	function goToSlide(index: number) {
		if (isTransitioning || index === currentIndex || index < 0 || index >= featuredMovies.length) {
			return;
		}

		isTransitioning = true;
		currentIndex = index;

		restartAutoplay();

		if (transitionTimer) {
			clearTimeout(transitionTimer);
		}

		transitionTimer = setTimeout(() => {
			isTransitioning = false;
			transitionTimer = undefined;
		}, TRANSITION_DURATION);
	}

	// -------------------------------------------------------------------------
	// Navigation
	// -------------------------------------------------------------------------

	function openMovie(movieId: number) {
		goto(resolve(`/movie/${movieId}`));
	}

	// -------------------------------------------------------------------------
	// Data loading
	// -------------------------------------------------------------------------

	async function loadHomepage() {
		try {
			const [popularData, nowPlayingData, topRatedData, upcomingData, genreList, featured] =
				await Promise.all([
					getPopularMovies(),
					getNowPlayingMovies(),
					getTopRatedMovies(),
					getUpcomingMovies(),
					loadMovieGenresCached(),
					getFeaturedMovies()
				]);

			popularMovies = popularData.results;
			nowPlayingMovies = nowPlayingData.results;
			topRatedMovies = topRatedData.results;
			upcomingMovies = upcomingData.results;

			genres = genreList;
			featuredMovies = featured;

			await loadHeroMedia(featured);
		} catch (error) {
			console.error('Failed to load homepage:', error);
		} finally {
			loading = false;
		}
	}

	async function loadHeroMedia(movies: Movie[]) {
		heroData = await Promise.all(
			movies.map(async (movie) => {
				const backdropUrl = movie.backdrop_path
					? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
					: '';

				try {
					const hero = await getHeroMedia(movie.id);

					return {
						logo: hero.logo,
						backdropUrl
					};
				} catch (error) {
					console.error(`Failed to load hero media for movie ${movie.id}:`, error);

					return {
						logo: null,
						backdropUrl
					};
				}
			})
		);

		startAutoplay();
	}

	// -------------------------------------------------------------------------
	// Lifecycle
	// -------------------------------------------------------------------------

	onMount(() => {
		loadHomepage();

		return () => {
			stopAutoplay();

			if (transitionTimer) {
				clearTimeout(transitionTimer);
			}
		};
	});
</script>

<Navbar />

<div class="min-h-screen overflow-hidden bg-black text-white">
	{#if loading}
		<!-- ================================================================
             HERO SKELETON
        ================================================================= -->

		<section
			class="relative h-[85vh] min-h-150 overflow-hidden sm:h-screen"
			aria-label="Loading homepage"
		>
			<div class="absolute inset-0 animate-pulse bg-zinc-900"></div>

			<div class="absolute inset-0 bg-linear-to-r from-black/80 via-black/30 to-transparent"></div>

			<div
				class="absolute inset-x-0 bottom-0 h-72 bg-linear-to-t from-black via-black/60 to-transparent"
			></div>

			<div class="absolute inset-0 z-10 flex items-end px-5 pb-28 sm:px-8 sm:pb-36 md:px-16">
				<div class="w-full max-w-2xl">
					<div class="h-12 w-56 animate-pulse rounded-xl bg-zinc-800 sm:h-16 sm:w-72"></div>

					<div class="mt-4 flex gap-2">
						<div class="h-6 w-16 animate-pulse rounded-full bg-zinc-800 sm:w-20"></div>

						<div class="h-6 w-20 animate-pulse rounded-full bg-zinc-800 sm:w-24"></div>

						<div class="h-6 w-14 animate-pulse rounded-full bg-zinc-800 sm:w-16"></div>
					</div>

					<div class="mt-4 h-4 w-32 animate-pulse rounded bg-zinc-800 sm:w-40"></div>

					<div class="mt-4 space-y-2">
						<div class="h-3 w-full animate-pulse rounded bg-zinc-800 sm:h-4"></div>

						<div class="h-3 w-10/12 animate-pulse rounded bg-zinc-800 sm:h-4"></div>

						<div class="h-3 w-7/12 animate-pulse rounded bg-zinc-800 sm:h-4"></div>
					</div>

					<div
						class="mt-6 h-12 w-36 animate-pulse rounded-xl bg-zinc-800 sm:mt-8 sm:h-14 sm:w-44"
					></div>
				</div>
			</div>
		</section>

		<!-- ================================================================
             ROW SKELETONS
        ================================================================= -->

		<div class="space-y-10 px-4 pb-12 sm:space-y-12 sm:px-6">
			{#each [0, 1, 2, 3] as row (row)}
				<div>
					<div class="mb-4 h-7 w-44 animate-pulse rounded bg-zinc-800 sm:mb-5 sm:h-8 sm:w-52"></div>

					<div class="flex gap-3 overflow-hidden sm:gap-4">
						{#each [0, 1, 2, 3, 4, 5] as i (i)}
							<div
								class="aspect-2/3 w-28 shrink-0 animate-pulse rounded-xl bg-zinc-900 sm:w-40 sm:rounded-2xl"
							></div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- ================================================================
             HERO
        ================================================================= -->

		{#if currentMovie}
			<section
				class="relative z-10 h-[85vh] min-h-150 overflow-hidden sm:h-screen"
				aria-label="Featured movies"
			>
				<!-- ========================================================
                     BACKGROUNDS
                ========================================================= -->

				{#each featuredMovies as movie, index (movie.id)}
					<div
						class="absolute inset-0 transition-opacity duration-700 ease-in-out"
						style:opacity={index === currentIndex ? 1 : 0}
						aria-hidden={index !== currentIndex}
					>
						<div
							class="absolute inset-0 scale-105 bg-cover bg-center"
							style:background-image={`url("${heroData[index]?.backdropUrl ?? ''}")`}
							style:transform={`scale(${index === currentIndex ? 1.03 : 1.08})`}
							style:transition="transform 6s ease-out"
						></div>

						<!-- Desktop / Mobile gradient -->
						<div
							class="absolute inset-0 bg-linear-to-r from-black/85 via-black/35 to-transparent"
						></div>

						<!-- Bottom gradient -->
						<div
							class="absolute inset-x-0 bottom-0 h-80 bg-linear-to-t from-black via-black/70 to-transparent sm:h-96"
						></div>

						<!-- Top gradient -->
						<div
							class="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/60 to-transparent sm:h-40"
						></div>
					</div>
				{/each}

				<!-- ========================================================
                     HERO CONTENT
                ========================================================= -->

				<div
					class="pointer-events-none absolute inset-0 z-10 flex items-end px-5 pb-28 sm:px-8 sm:pb-36 md:px-16"
				>
					<div class="pointer-events-auto w-full max-w-2xl">
						<!-- Movie Logo -->

						{#if currentHero.logo}
							<img
								src={currentHero.logo}
								alt={`${currentMovie.title} logo`}
								class="mb-3 max-h-20 w-auto max-w-[75%] object-contain object-left drop-shadow-2xl sm:mb-4 sm:max-h-28 sm:max-w-[80%] md:max-h-none md:w-80"
							/>
						{:else}
							<h1
								class="max-w-[90%] text-3xl leading-tight font-bold drop-shadow-lg sm:text-4xl md:text-6xl"
							>
								{currentMovie.title}
							</h1>
						{/if}

						<!-- Genres -->

						{#if currentMovie.genre_ids?.length}
							<div class="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
								{#each getGenreNames(currentMovie.genre_ids) as genre (genre)}
									<span
										class="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] backdrop-blur-sm sm:px-3 sm:text-xs"
									>
										{genre}
									</span>
								{/each}
							</div>
						{/if}

						<!-- Rating / Year -->

						<div class="mt-2 flex items-center gap-2 text-xs text-white/60 sm:gap-3 sm:text-sm">
							<span class="text-yellow-400">
								★ {currentMovie.vote_average?.toFixed(1)}
							</span>

							<span aria-hidden="true"> · </span>

							<span>
								{currentMovie.release_date?.slice(0, 4)}
							</span>
						</div>

						<!-- Overview -->

						<p
							class="mt-3 line-clamp-2 max-w-xl text-xs leading-relaxed text-gray-300 sm:line-clamp-3 sm:text-sm md:text-base"
						>
							{currentMovie.overview}
						</p>

						<!-- Play Button -->

						<div class="mt-5 flex gap-3 sm:mt-7 sm:gap-4">
							<button
								type="button"
								onclick={() => openMovie(currentMovie.id)}
								class="flex cursor-pointer items-center gap-2 rounded-xl border border-white/40 bg-white/20 px-6 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:border-white/60 hover:bg-white/30 active:scale-95 sm:gap-3 sm:px-10 sm:py-4 sm:text-lg"
							>
								<span class="text-sm sm:text-base"> ▶ </span>

								Play Now
							</button>
						</div>
					</div>
				</div>

				<!-- ========================================================
                     SLIDE CONTROLS
                ========================================================= -->

				{#if featuredMovies.length > 1}
					<div
						class="absolute bottom-10 left-1/2 z-20 flex max-w-[80%] -translate-x-1/2 gap-1.5 overflow-hidden sm:bottom-16 sm:gap-2"
						role="tablist"
						aria-label="Featured movies"
					>
						{#each featuredMovies as movie, index (movie.id)}
							<button
								type="button"
								role="tab"
								aria-selected={index === currentIndex}
								aria-label={`Go to ${movie.title}`}
								onclick={() => goToSlide(index)}
								class={[
									'h-2.5 cursor-pointer rounded-full transition-all duration-300 sm:h-3',
									index === currentIndex ? 'w-7 bg-white sm:w-10' : 'w-2.5 bg-white/35 sm:w-3'
								]}
							></button>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- ================================================================
             MOVIE ROWS
        ================================================================= -->

		<main class="space-y-10 pb-10 sm:space-y-12 sm:pb-12">
			<MovieRow title="Popular Now" movies={popularMovies} />

			<MovieRow title="Now Playing" movies={nowPlayingMovies} />

			<MovieRow title="Top Rated" movies={topRatedMovies} />

			<MovieRow title="Upcoming" movies={upcomingMovies} />
		</main>
	{/if}
</div>
