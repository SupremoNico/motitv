<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import SeriesFullDetails from '$lib/components/SeriesDetails.svelte';

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { getSeriesDetails, getSeriesCredits, getSeriesVideos, getSeasonDetails } from '$lib/tmdb';

	import type { SeriesDetails, CastMember, CrewMember } from '$lib/tmdb';

	import { ChevronDown, ChevronLeft, ChevronRight, Play, Check } from 'lucide-svelte';

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

	let episodes = $state<
		{
			episode_number: number;
			name?: string;
			overview?: string;
			still_path?: string | null;
			air_date?: string;
		}[]
	>([]);

	let loading = $state(true);

	let error = $state<string | null>(null);

	let seasonLoading = $state(false);

	// ============================================================
	// DROPDOWN STATE
	// ============================================================

	let openDropdown = $state<'season' | 'episode' | null>(null);

	// ============================================================
	// ROUTE ID
	// ============================================================

	const id = $derived($page.params.id);

	// ============================================================
	// REQUEST TRACKING
	// ============================================================

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
	// CURRENT EPISODE
	// ============================================================

	const currentEpisode = $derived(episodes.find((item) => item.episode_number === episode) ?? null);

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

			if (currentRequest !== requestId) {
				return;
			}

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

			// ========================================================
			// FIRST REGULAR SEASON
			// ========================================================

			const firstSeason =
				seriesData.seasons?.find((item) => item.season_number > 0)?.season_number ?? 1;

			season = firstSeason;

			episode = 1;

			loading = false;
		} catch (err) {
			if (currentRequest !== requestId) {
				return;
			}

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

		// Close dropdowns while changing season.
		openDropdown = null;

		try {
			const data = await getSeasonDetails(seriesId, seasonNumber);

			if (currentRequest !== seasonRequestId) {
				return;
			}

			episodes = data.episodes ?? [];

			if (episodes.length > 0) {
				episode = episodes[0].episode_number;
			} else {
				episode = 1;
			}

			seasonLoading = false;
		} catch (err) {
			if (currentRequest !== seasonRequestId) {
				return;
			}

			console.error('Failed to load season:', err);

			episodes = [];

			episode = 1;

			seasonLoading = false;
		}
	}

	// ============================================================
	// LOAD DATA WHEN ROUTE CHANGES
	// ============================================================

	$effect(() => {
		if (!id) {
			return;
		}

		loadSeries(id);
	});

	$effect(() => {
		if (!id || !season || !series) {
			return;
		}

		loadSeason(id, season);
	});

	// ============================================================
	// DROPDOWN
	// ============================================================

	function toggleDropdown(type: 'season' | 'episode') {
		if (type === 'episode' && (seasonLoading || episodes.length === 0)) {
			return;
		}

		openDropdown = openDropdown === type ? null : type;
	}

	function selectSeason(value: number) {
		if (value === season) {
			openDropdown = null;
			return;
		}

		season = value;

		episode = 1;

		openDropdown = null;
	}

	function selectEpisode(value: number) {
		episode = value;

		openDropdown = null;
	}

	function closeDropdowns() {
		openDropdown = null;
	}

	// ============================================================
	// PREVIOUS EPISODE
	// ============================================================

	function previousEpisode() {
		if (episodes.length === 0) {
			return;
		}

		const currentIndex = episodes.findIndex((item) => item.episode_number === episode);

		if (currentIndex > 0) {
			episode = episodes[currentIndex - 1].episode_number;
		}
	}

	// ============================================================
	// NEXT EPISODE
	// ============================================================

	function nextEpisode() {
		if (episodes.length === 0) {
			return;
		}

		const currentIndex = episodes.findIndex((item) => item.episode_number === episode);

		if (currentIndex === -1 || currentIndex >= episodes.length - 1) {
			return;
		}

		episode = episodes[currentIndex + 1].episode_number;
	}

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
		if (!id) {
			return;
		}

		loadSeries(id);
	}

	// ============================================================
	// HOME
	// ============================================================

	function goHome() {
		goto(resolve('/'));
	}
</script>

<!-- ============================================================
     CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
============================================================= -->

<svelte:window onclick={closeDropdowns} />

<!-- ============================================================
     NAVBAR
============================================================= -->

{#if !showTrailer}
	<Navbar />
{/if}

<!-- ============================================================
     LOADING
============================================================= -->

{#if loading}
	<div class="min-h-screen bg-black text-white">
		<div class="relative min-h-screen">
			<div class="absolute inset-0 bg-zinc-950"></div>

			<div class="relative z-10 mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
				<div class="overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
					<div class="aspect-video w-full animate-pulse bg-zinc-800"></div>
				</div>

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

	<!-- ============================================================
     ERROR
============================================================= -->
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
						class="cursor-pointer rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
					>
						Try again
					</button>

					<button
						type="button"
						onclick={goHome}
						class="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
					>
						Go home
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- ============================================================
     MAIN SERIES PAGE
============================================================= -->
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
            ===================================================== -->

			<section class="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8" aria-label="Series player">
				<!-- ====================================================
                     SEASON / EPISODE SELECTOR
                ===================================================== -->

				<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<!-- ==================================================
                         LEFT SIDE
                    =================================================== -->

					<div class="flex flex-wrap items-center gap-2">
						<!-- ==================================================
                             SEASON DROPDOWN
                        =================================================== -->

						<div class="relative" onclick={(event) => event.stopPropagation()}>
							<button
								type="button"
								onclick={() => toggleDropdown('season')}
								class="flex h-10 min-w-[130px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/80 px-4 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-white/25 hover:bg-white/10 focus:border-white/30 focus:outline-none"
								aria-haspopup="listbox"
								aria-expanded={openDropdown === 'season'}
							>
								<span>
									Season {season}
								</span>

								<ChevronDown
									size={15}
									strokeWidth={2}
									class={`text-white/50 transition-transform duration-200 ${
										openDropdown === 'season' ? 'rotate-180' : ''
									}`}
								/>
							</button>

							<!-- ==================================================
                                 SEASON MENU
                            =================================================== -->

							{#if openDropdown === 'season'}
								<div
									class="absolute top-[calc(100%+8px)] left-0 z-[100] min-w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
									role="listbox"
								>
									{#each series.seasons?.filter((item) => item.season_number > 0) ?? [] as item (item.season_number)}
										<button
											type="button"
											role="option"
											aria-selected={item.season_number === season}
											onclick={() => selectSeason(item.season_number)}
											class={item.season_number === season
												? 'flex w-full cursor-pointer items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-left text-sm text-white transition-colors duration-150 hover:bg-white/15'
												: 'flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-zinc-400 transition-colors duration-150 hover:bg-white/10 hover:text-white'}
										>
											<span>
												Season {item.season_number}
											</span>

											{#if item.season_number === season}
												<Check size={15} strokeWidth={2.5} class="shrink-0 text-white" />
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						</div>

						<!-- ==================================================
                             EPISODE DROPDOWN
                        =================================================== -->

						<div class="relative" onclick={(event) => event.stopPropagation()}>
							<button
								type="button"
								disabled={seasonLoading || episodes.length === 0}
								onclick={() => toggleDropdown('episode')}
								class="flex h-10 w-[190px] max-w-[calc(100vw-2rem)] cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/80 px-4 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-white/25 hover:bg-white/10 focus:border-white/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
								aria-haspopup="listbox"
								aria-expanded={openDropdown === 'episode'}
							>
								<span class="min-w-0 truncate">
									{#if seasonLoading}
										Loading episodes...
									{:else if episodes.length === 0}
										No episodes
									{:else if currentEpisode}
										<span class="text-zinc-400">
											EP
											{currentEpisode.episode_number}
										</span>

										<span class="ml-1 text-white">
											{currentEpisode.name || `Episode ${currentEpisode.episode_number}`}
										</span>
									{:else}
										Episode {episode}
									{/if}
								</span>

								<ChevronDown
									size={15}
									strokeWidth={2}
									class={`shrink-0 text-white/50 transition-transform duration-200 ${
										openDropdown === 'episode' ? 'rotate-180' : ''
									}`}
								/>
							</button>

							<!-- ==================================================
                                 EPISODE MENU
                            =================================================== -->

							{#if openDropdown === 'episode' && episodes.length > 0}
								<div
									class="absolute top-[calc(100%+8px)] left-0 z-[100] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
									role="listbox"
								>
									<!-- Episode list -->

									<div class="max-h-[480px] overflow-y-auto p-1.5">
										{#each episodes as item (item.episode_number)}
											<button
												type="button"
												role="option"
												aria-selected={item.episode_number === episode}
												onclick={() => selectEpisode(item.episode_number)}
												class={item.episode_number === episode
													? 'flex w-full cursor-pointer gap-3 rounded-xl bg-white/10 p-2 text-left transition-colors duration-150 hover:bg-white/15'
													: 'flex w-full cursor-pointer gap-3 rounded-xl p-2 text-left transition-colors duration-150 hover:bg-white/10'}
											>
												<!-- ==================================
             THUMBNAIL
        =================================== -->

												<div
													class="relative h-[76px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:h-[82px] sm:w-[130px]"
												>
													{#if item.still_path}
														<img
															src={imageUrl(item.still_path, 'w300')}
															alt={item.name || `Episode ${item.episode_number}`}
															class="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
															loading="lazy"
														/>
													{:else}
														<div
															class="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600"
														>
															<Play size={22} />
														</div>
													{/if}

													<!-- Dark image gradient -->
													<div
														class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
													></div>

													<!-- Episode number -->
													<div
														class="absolute bottom-1.5 left-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
													>
														EP {item.episode_number}
													</div>

													<!-- Playing overlay -->
													{#if item.episode_number === episode}
														<div
															class="absolute inset-0 flex items-center justify-center bg-black/40"
														>
															<div
																class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg"
															>
																<Play size={14} fill="currentColor" strokeWidth={0} />
															</div>
														</div>
													{/if}
												</div>

												<!-- ==================================
             EPISODE INFORMATION
        =================================== -->

												<div class="min-w-0 flex-1 py-0.5">
													<!-- Title -->
													<div class="flex items-start gap-2">
														<div
															class={item.episode_number === episode
																? 'min-w-0 flex-1 truncate text-sm font-semibold text-white'
																: 'min-w-0 flex-1 truncate text-sm font-medium text-zinc-200'}
														>
															{item.name || `Episode ${item.episode_number}`}
														</div>

														{#if item.episode_number === episode}
															<div
																class="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white uppercase"
															>
																Playing
															</div>
														{/if}
													</div>

													<!-- Episode number -->
													<div class="mt-0.5 text-[10px] text-zinc-600">
														Episode {item.episode_number}
													</div>

													<!-- Air date -->
													{#if item.air_date}
														<div class="mt-1 text-[11px] text-zinc-500">
															{item.air_date}
														</div>
													{/if}

													<!-- Overview -->
													{#if item.overview}
														<p
															class="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500"
														>
															{item.overview}
														</p>
													{:else}
														<p class="mt-1.5 text-[11px] text-zinc-600">
															No description available.
														</p>
													{/if}
												</div>
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- ==================================================
                         RIGHT SIDE
                    =================================================== -->

					<div class="flex items-center gap-2">
						<!-- PREVIOUS -->

						<button
							type="button"
							onclick={previousEpisode}
							disabled={episodes.length === 0 ||
								episode === episodes[0]?.episode_number ||
								seasonLoading}
							class="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-black/80 px-3 text-sm text-white/70 backdrop-blur-xl transition-all duration-200 hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30"
							title="Previous episode"
						>
							<ChevronLeft size={17} strokeWidth={2} />

							<span class="hidden sm:inline"> Previous </span>
						</button>

						<!-- CURRENT -->

						<div
							class="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/70 backdrop-blur-xl"
						>
							<Play size={14} strokeWidth={2} fill="currentColor" class="text-white/60" />

							<span class="whitespace-nowrap">
								S{season} E{episode}
							</span>
						</div>

						<!-- NEXT -->

						<button
							type="button"
							onclick={nextEpisode}
							disabled={seasonLoading ||
								episodes.length === 0 ||
								episode === episodes[episodes.length - 1]?.episode_number}
							class="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-black/80 px-3 text-sm text-white/70 backdrop-blur-xl transition-all duration-200 hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30"
							title="Next episode"
						>
							<span class="hidden sm:inline"> Next </span>

							<ChevronRight size={17} strokeWidth={2} />
						</button>
					</div>
				</div>

				<!-- ====================================================
                     PLAYER
                ===================================================== -->

				<div class="overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
					{#if seasonLoading}
						<div class="relative aspect-video w-full bg-black">
							<div class="absolute inset-0 flex items-center justify-center">
								<div class="text-center">
									<div
										class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"
									></div>

									<p class="mt-3 text-sm text-white/50">Loading episode...</p>
								</div>
							</div>
						</div>
					{:else}
						<div class="aspect-video w-full bg-black">
							<iframe
								class="h-full w-full"
								src={`https://framextv.tech/embed/${series.id}/${season}/${episode}`}
								title={`${series.name} - Season ${season}, Episode ${episode}`}
								allow="encrypted-media; picture-in-picture; fullscreen"
								allowfullscreen
								loading="lazy"
							></iframe>
						</div>
					{/if}
				</div>
			</section>

			<!-- ========================================================
                 SERIES DETAILS
            ========================================================= -->

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
