<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import SeriesFullDetails from '$lib/components/SeriesDetails.svelte';

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { getSeriesDetails, getSeriesCredits, getSeriesVideos, getSeasonDetails } from '$lib/tmdb';

	import type { SeriesDetails, CastMember, CrewMember } from '$lib/tmdb';

	// ============================================================
	// STATE
	// ============================================================

	let series = $state<SeriesDetails | null>(null);

	let cast = $state<CastMember[]>([]);
	let creators = $state<CrewMember[]>([]);

	let trailerKey = $state<string | null>(null);
	let showTrailer = $state(false);

	let season = $state(1);
	let episode = $state(1);

	let loading = $state(true);
	let error = $state<string | null>(null);

	let seasonLoading = $state(false);

	const id = $derived($page.params.id);

	// Prevent stale requests from overwriting newer data.
	let requestId = 0;
	let seasonRequestId = 0;

	// ============================================================
	// IMAGE HELPERS
	// ============================================================

	const imageUrl = (path: string | null, size = 'w185') =>
		path ? `https://image.tmdb.org/t/p/${size}${path}` : '/placeholder.jpg';

	const backdropUrl = (path: string | null) =>
		path ? `https://image.tmdb.org/t/p/original${path}` : '';

	// ============================================================
	// LOAD SERIES
	// ============================================================

	async function loadSeries(seriesId: string) {
		const currentRequest = ++requestId;

		loading = true;
		error = null;

		try {
			const [seriesData, credits, videos] = await Promise.all([
				getSeriesDetails(seriesId),
				getSeriesCredits(seriesId),
				getSeriesVideos(seriesId)
			]);

			// Ignore stale request.
			if (currentRequest !== requestId) return;

			if (!seriesData) {
				throw new Error('Series not found.');
			}

			series = seriesData;

			cast = credits.cast.slice(0, 12);

			creators = credits.crew.filter(
				(crew: CrewMember) => crew.job === 'Creator' || crew.job === 'Executive Producer'
			);

			const trailer = videos.results.find(
				(video) => video.type === 'Trailer' && video.site === 'YouTube'
			);

			trailerKey = trailer?.key ?? null;

			// Use the first regular season.
			// Season 0 is TMDB "Specials", so exclude it.
			const firstSeason =
				seriesData.seasons?.find((item) => item.season_number > 0)?.season_number ?? 1;

			season = firstSeason;
			episode = 1;

			loading = false;
		} catch (err) {
			if (currentRequest !== requestId) return;

			console.error('Failed to load series:', err);

			series = null;
			loading = false;
			error = err instanceof Error ? err.message : 'Failed to load series.';
		}
	}

	// ============================================================
	// LOAD SEASON
	// ============================================================

	async function loadSeason(seriesId: string, seasonNumber: number) {
		const currentRequest = ++seasonRequestId;

		seasonLoading = true;

		try {
			const data = await getSeasonDetails(seriesId, seasonNumber);

			// Ignore stale request.
			if (currentRequest !== seasonRequestId) return;

			// We don't need to store episodes anymore because
			// the player header/dropdowns have been removed.

			episode = data.episodes?.[0]?.episode_number ?? 1;

			seasonLoading = false;
		} catch (err) {
			if (currentRequest !== seasonRequestId) return;

			console.error('Failed to load season:', err);

			episode = 1;
			seasonLoading = false;
		}
	}

	// ============================================================
	// LOAD DATA WHEN ROUTE CHANGES
	// ============================================================

	$effect(() => {
		if (!id) return;

		loadSeries(id);
	});

	$effect(() => {
		if (!id || !season || !series) return;

		loadSeason(id, season);
	});

	// ============================================================
	// TRAILER
	// ============================================================

	function openTrailer() {
		showTrailer = true;
	}

	function closeTrailer() {
		showTrailer = false;
	}

	// ============================================================
	// RETRY
	// ============================================================

	function retry() {
		if (!id) return;

		loadSeries(id);
	}

	// ============================================================
	// HOME
	// ============================================================

	function goHome() {
		goto(resolve('/'));
	}
</script>

{#if !showTrailer}
	<Navbar />
{/if}

{#if loading}
	<div class="min-h-screen bg-black text-white">
		<div class="relative min-h-screen">
			<!-- Background skeleton -->
			<div class="absolute inset-0 bg-zinc-950"></div>

			<div class="relative z-10 mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
				<!-- Player skeleton -->
				<div class="overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
					<div class="aspect-video w-full animate-pulse bg-zinc-800"></div>
				</div>

				<!-- Details skeleton -->
				<div class="mt-10 space-y-5">
					<div class="h-10 w-2/3 animate-pulse rounded-lg bg-zinc-800"></div>

					<div class="flex gap-3">
						<div class="h-5 w-20 animate-pulse rounded bg-zinc-800"></div>
						<div class="h-5 w-24 animate-pulse rounded bg-zinc-800"></div>
						<div class="h-5 w-16 animate-pulse rounded bg-zinc-800"></div>
					</div>

					<div class="space-y-2">
						<div class="h-4 w-full animate-pulse rounded bg-zinc-800"></div>
						<div class="h-4 w-5/6 animate-pulse rounded bg-zinc-800"></div>
						<div class="h-4 w-4/6 animate-pulse rounded bg-zinc-800"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else if error || !series}
	<div class="min-h-screen bg-black text-white">
		<div class="flex min-h-screen items-center justify-center px-6">
			<div class="max-w-md text-center">
				<div
					class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5"
				>
					<svg
						class="h-8 w-8 text-white/60"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12V12z"
						/>
					</svg>
				</div>

				<h1 class="text-2xl font-semibold">Unable to load series</h1>

				<p class="mt-2 text-sm text-white/50">
					{error ?? 'The series could not be found.'}
				</p>

				<div class="mt-6 flex items-center justify-center gap-3">
					<button
						type="button"
						onclick={retry}
						class="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
					>
						Try again
					</button>

					<button
						type="button"
						onclick={goHome}
						class="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
					>
						Go home
					</button>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div
		class="relative min-h-screen bg-black bg-cover bg-center bg-no-repeat text-white"
		style={`background-image: url(${backdropUrl(series.backdrop_path)})`}
	>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/75"></div>

		<!-- Blur -->
		<div class="absolute inset-0 bg-black/40 backdrop-blur-2xl"></div>

		<!-- Bottom gradient -->
		<div
			class="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent"
		></div>

		<div class="relative z-10">
			<!-- ====================================================
                 PLAYER
                 ==================================================== -->

			<section class="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8" aria-label="Series player">
				<div class="overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
					{#if seasonLoading}
						<div class="relative aspect-video w-full bg-black">
							<div class="absolute inset-0 flex items-center justify-center">
								<div
									class="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"
								></div>
							</div>
						</div>
					{:else}
						<div class="aspect-video w-full bg-black">
							<iframe
								class="h-full w-full"
								src={`https://embed.filmu.in/tv/${series.id}/${season}/${episode}`}
								title={`${series.name} - Season ${season}, Episode ${episode}`}
								allow="encrypted-media; picture-in-picture; fullscreen"
								allowfullscreen
								loading="lazy"
							></iframe>
						</div>
					{/if}
				</div>
			</section>

			<!-- ====================================================
                 SERIES DETAILS
                 ==================================================== -->

			<SeriesFullDetails
				{series}
				{cast}
				{creators}
				{trailerKey}
				{showTrailer}
				{openTrailer}
				{closeTrailer}
				{imageUrl}
			/>
		</div>
	</div>
{/if}
