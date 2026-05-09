<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { onMount, onDestroy } from 'svelte';
	import {
		getHeroMedia,
		getGenres,
		getFeaturedMovies,
		getPopularMovies,
		getTopRatedMovies,
		getUpcomingMovies,
		getNowPlayingMovies
	} from '$lib/tmdb';

	import type { Movie, Genre } from '$lib/tmdb';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MovieRow from '$lib/components/MovieRow.svelte';

	let popularMovies = $state<Movie[]>([]);
	let nowPlayingMovies = $state<Movie[]>([]);
	let topRatedMovies = $state<Movie[]>([]);
	let upcomingMovies = $state<Movie[]>([]);

	let genres = $state<Genre[]>([]);
	let featuredMovies = $state<Movie[]>([]);
	let heroData = $state<{ logo: string | null; backdropUrl: string }[]>([]);

	let currentIndex = $state(0);
	let isTransitioning = $state(false);
	let autoplayTimer: ReturnType<typeof setInterval>;

	function getGenreNames(ids: number[]): string[] {
		return ids
			.slice(0, 3)
			.map((id) => genres.find((g) => g.id === id)?.name ?? '')
			.filter(Boolean);
	}

	let current = $derived(featuredMovies[currentIndex] ?? null);
	let currentHero = $derived(heroData[currentIndex] ?? { logo: null, backdropUrl: '' });

	function startAutoplay() {
		autoplayTimer = setInterval(() => {
			currentIndex = (currentIndex + 1) % featuredMovies.length;
		}, 6000);
	}

	function restartAutoplay() {
		clearInterval(autoplayTimer);
		startAutoplay();
	}

	function goTo(index: number) {
		if (isTransitioning || index === currentIndex) return;

		isTransitioning = true;
		currentIndex = index;

		restartAutoplay();

		setTimeout(() => (isTransitioning = false), 600);
	}

	onMount(async () => {
		const [popularData, nowPlayingData, topRatedData, upcomingData, genreList, featured] =
			await Promise.all([
				getPopularMovies(),
				getNowPlayingMovies(),
				getTopRatedMovies(),
				getUpcomingMovies(),
				getGenres(),
				getFeaturedMovies()
			]);

		genres = genreList;

		popularMovies = popularData.results;
		nowPlayingMovies = nowPlayingData.results;
		topRatedMovies = topRatedData.results;
		upcomingMovies = upcomingData.results;

		featuredMovies = featured;

		heroData = await Promise.all(
			featuredMovies.map(async (movie) => {
				const hero = await getHeroMedia(movie.id);

				return {
					logo: hero.logo,
					backdropUrl: `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
				};
			})
		);

		startAutoplay();
	});

	onDestroy(() => clearInterval(autoplayTimer));
</script>

<Navbar />

<div class="relative min-h-screen overflow-hidden bg-black text-white">
	<!-- HERO -->
	{#if current}
		<section class="relative z-10 h-screen overflow-hidden">
			{#each featuredMovies as movie, i (movie.id)}
				<div
					class="absolute inset-0 transition-opacity duration-700 ease-in-out"
					style:opacity={i === currentIndex ? '1' : '0'}
					aria-hidden={i !== currentIndex}
				>
					<div
						class="absolute inset-0 scale-105 bg-cover bg-center"
						style:background-image="url('{heroData[i]?.backdropUrl ?? ''}')"
						style:transform={i === currentIndex ? 'scale(1.03)' : 'scale(1.08)'}
						style:transition="transform 6s ease-out"
					></div>

					<div
						class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent"
					></div>
					<div
						class="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black via-black/60 to-transparent"
					></div>
					<div
						class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent"
					></div>
				</div>
			{/each}

			<!-- HERO CONTENT -->
			<div class="pointer-events-none absolute inset-0 z-10 flex items-end px-8 pb-36 md:px-16">
				<div class="pointer-events-auto max-w-2xl">
					{#if currentHero.logo}
						<img
							src={currentHero.logo}
							alt={current?.title}
							class="mb-4 w-56 drop-shadow-2xl md:w-80"
						/>
					{:else}
						<h1 class="text-4xl font-bold md:text-6xl">{current?.title}</h1>
					{/if}

					{#if current?.genre_ids?.length}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each getGenreNames(current.genre_ids) as genre (genre)}
								<span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
									{genre}
								</span>
							{/each}
						</div>
					{/if}

					<div class="mt-2 flex items-center gap-3 text-sm text-white/60">
						<span class="text-yellow-400">★ {current?.vote_average?.toFixed(1)}</span>
						<span>·</span>
						<span>{current?.release_date?.slice(0, 4)}</span>
					</div>

					<p class="mt-3 line-clamp-3 text-sm text-gray-300 md:text-base">
						{current?.overview}
					</p>

					<div class="mt-7 flex gap-4">
						<button
							onclick={() => goto(resolve(`/movie/${current?.id}`))}
							class="flex cursor-pointer items-center gap-3 rounded-xl border border-white/40 bg-white/20 px-10 py-4 text-lg font-semibold text-white shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:border-white/60 hover:bg-white/30 active:scale-95"
						>
							▶ Play Now
						</button>
					</div>
				</div>
			</div>

			<!-- DOTS -->
			<div class="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 gap-2">
				{#each Array.from({ length: featuredMovies.length }, (_, i) => i) as i (i)}
					<button
						onclick={() => goTo(i)}
						aria-label={`Go to slide ${i + 1}`}
						class="h-3 cursor-pointer rounded-full transition-all duration-300"
						style:width={i === currentIndex ? '2.5rem' : '0.75rem'}
						style:background={i === currentIndex ? 'white' : 'rgba(255,255,255,0.35)'}
					></button>
				{/each}
			</div>
		</section>
	{/if}

	<MovieRow title="Popular Now" movies={popularMovies} />
	<MovieRow title="Now Playing" movies={nowPlayingMovies} />
	<MovieRow title="Top Rated" movies={topRatedMovies} />
	<MovieRow title="Upcoming" movies={upcomingMovies} />
</div>
