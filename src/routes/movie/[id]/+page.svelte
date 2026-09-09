<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import MovieFullDetails from '$lib/components/MovieDetails.svelte';

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { getMovieDetails, getMovieCredits, getMovieVideos } from '$lib/tmdb';

	import type { MovieDetails, MovieCredits, CastMember, CrewMember } from '$lib/tmdb';

	const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
	const TMDB_BACKDROP_BASE = `${TMDB_IMAGE_BASE}/original`;

	let movie = $state<MovieDetails | null>(null);
	let cast = $state<CastMember[]>([]);
	let directors = $state<CrewMember[]>([]);
	let trailerKey = $state<string | null>(null);

	let showTrailer = $state(false);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let requestId = 0;

	const id = $derived($page.params.id);

	/**
	 * TMDB image helper
	 */
	const imageUrl = (path: string | null, size = 'w185') => {
		if (!path) {
			return '/placeholder.jpg';
		}

		return `${TMDB_IMAGE_BASE}/${size}${path}`;
	};

	/**
	 * Backdrop image helper
	 */
	const backdropUrl = (path: string | null) => {
		if (!path) {
			return null;
		}

		return `${TMDB_BACKDROP_BASE}${path}`;
	};

	/**
	 * Format movie runtime
	 */
	const formatRuntime = (min: number) => {
		if (!min || min <= 0) {
			return '';
		}

		const h = Math.floor(min / 60);
		const m = min % 60;

		if (h === 0) {
			return `${m}m`;
		}

		if (m === 0) {
			return `${h}h`;
		}

		return `${h}h ${m}m`;
	};

	/**
	 * Load movie information
	 */
	async function loadMovie(movieId: string) {
		const currentRequestId = ++requestId;

		loading = true;
		error = null;

		movie = null;
		cast = [];
		directors = [];
		trailerKey = null;
		showTrailer = false;

		try {
			const [movieData, creditsData, videosData] = await Promise.all([
				getMovieDetails(movieId),
				getMovieCredits(movieId),
				getMovieVideos(movieId)
			]);

			/**
			 * Ignore stale requests
			 */
			if (currentRequestId !== requestId) {
				return;
			}

			movie = movieData;

			/**
			 * Credits
			 */
			const credits: MovieCredits = creditsData;

			cast = credits.cast?.slice(0, 12) ?? [];

			directors = credits.crew?.filter((person) => person.job === 'Director') ?? [];

			/**
			 * Find trailer
			 *
			 * Priority:
			 * 1. Official YouTube trailer
			 * 2. Any YouTube trailer
			 */
			const videos = videosData?.results ?? [];

			const trailer = videos.find((video) => video.type === 'Trailer' && video.site === 'YouTube');

			trailerKey = trailer?.key ?? null;
		} catch (err) {
			if (currentRequestId !== requestId) {
				return;
			}

			console.error('Failed to load movie:', err);

			error = 'Unable to load this movie right now. Please try again.';
		} finally {
			if (currentRequestId === requestId) {
				loading = false;
			}
		}
	}

	/**
	 * Load movie whenever route ID changes
	 */
	$effect(() => {
		if (!id) {
			return;
		}

		loadMovie(id);
	});

	/**
	 * Trailer modal
	 */
	function openTrailer() {
		if (!trailerKey) {
			return;
		}

		showTrailer = true;
	}

	function closeTrailer() {
		showTrailer = false;
	}

	/**
	 * Navigate home
	 */
	function goHome() {
		goto(resolve('/'));
	}
</script>

{#if !showTrailer}
	<Navbar />
{/if}

{#if loading}
	<!-- ========================= -->
	<!-- LOADING STATE -->
	<!-- ========================= -->

	<div class="min-h-screen bg-black text-white">
		<div class="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
			<!-- Player skeleton -->
			<div class="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
				<div class="aspect-video w-full animate-pulse bg-zinc-900"></div>
			</div>

			<!-- Details skeleton -->
			<div class="mt-10 space-y-6">
				<div class="h-8 w-2/3 animate-pulse rounded bg-zinc-900"></div>

				<div class="h-4 w-1/3 animate-pulse rounded bg-zinc-900"></div>

				<div class="space-y-3">
					<div class="h-4 w-full animate-pulse rounded bg-zinc-900"></div>
					<div class="h-4 w-5/6 animate-pulse rounded bg-zinc-900"></div>
					<div class="h-4 w-2/3 animate-pulse rounded bg-zinc-900"></div>
				</div>
			</div>
		</div>
	</div>
{:else if error}
	<!-- ========================= -->
	<!-- ERROR STATE -->
	<!-- ========================= -->

	<div class="flex min-h-screen items-center justify-center bg-black px-6 text-white">
		<div class="mx-auto max-w-md text-center">
			<div
				class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					class="h-8 w-8 text-white/70"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v3.75m0 3h.008v.008H12V15.75z"
					/>

					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
					/>
				</svg>
			</div>

			<h1 class="text-2xl font-semibold tracking-tight">Something went wrong</h1>

			<p class="mt-3 text-sm leading-6 text-white/50">
				{error}
			</p>

			<div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
				<button
					type="button"
					onclick={() => id && loadMovie(id)}
					class="cursor-pointer rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
				>
					Try again
				</button>

				<button
					type="button"
					onclick={goHome}
					class="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
				>
					Go home
				</button>
			</div>
		</div>
	</div>
{:else if movie}
	<!-- ========================= -->
	<!-- MOVIE PAGE -->
	<!-- ========================= -->

	<div class="relative min-h-screen overflow-hidden bg-black text-white">
		<!-- ========================= -->
		<!-- BACKDROP -->
		<!-- ========================= -->

		{#if backdropUrl(movie.backdrop_path)}
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<!-- Main backdrop -->
				<div
					class="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
					style={`background-image: url(${backdropUrl(movie.backdrop_path)})`}
				></div>

				<!-- Overall dark overlay -->
				<div class="absolute inset-0 bg-linear-to-b from-black/60 via-black/70 to-black"></div>

				<!-- Bottom fade -->
				<div
					class="absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t from-black via-black/80 to-transparent"
				></div>

				<!-- Side fade -->
				<div
					class="absolute inset-0 bg-linear-to-r from-black/70 via-transparent to-black/40"
				></div>

				<!-- Slight blur -->
				<div class="absolute inset-0 backdrop-blur-[2px]"></div>
			</div>
		{/if}

		<!-- ========================= -->
		<!-- CONTENT -->
		<!-- ========================= -->

		<div class="relative z-10">
			<!-- ========================= -->
			<!-- PLAYER -->
			<!-- ========================= -->

			<section class="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8" aria-label="Movie player">
				<div
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/60"
				>
					<!-- Player top gradient -->
					<div
						class="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-linear-to-b from-black/60 to-transparent"
					></div>

					<!-- Video player -->
					<div class="relative aspect-video w-full bg-zinc-950">
						<!-- https://framextv.tech/embed/${movie.id}?autoplay=1&muted=0 -->
						<iframe
							class="absolute inset-0 h-full w-full"
							src={`https://framextv.tech/embed/${movie.id}?autoplay=1&muted=0`}
							title={`${movie.title} movie player`}
							allow="encrypted-media; picture-in-picture; fullscreen"
							allowfullscreen
							loading="lazy"
						></iframe>
					</div>
				</div>
			</section>

			<!-- ========================= -->
			<!-- MOVIE DETAILS -->
			<!-- ========================= -->

			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<MovieFullDetails
					{movie}
					{cast}
					{directors}
					{trailerKey}
					{showTrailer}
					{openTrailer}
					{closeTrailer}
					{imageUrl}
					{formatRuntime}
				/>
			</div>
		</div>
	</div>
{/if}
