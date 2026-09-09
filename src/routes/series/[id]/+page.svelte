<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import SeriesFullDetails from '$lib/components/SeriesDetails.svelte';

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { getSeriesDetails, getSeriesCredits, getSeriesVideos, getSeasonDetails } from '$lib/tmdb';

	import type { SeriesDetails, CastMember, CrewMember } from '$lib/tmdb';

	import {
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		Play,
		Check,
		AlertCircle,
		LoaderCircle,
		Home
	} from 'lucide-svelte';

	// =========================================================
	// STATE
	// =========================================================

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

	// One selector for both mobile + desktop
	let episodeMenuOpen = $state(false);

	const id = $derived($page.params.id);

	// Prevent stale requests from updating the page
	let requestId = 0;
	let seasonRequestId = 0;

	// =========================================================
	// IMAGE HELPERS
	// =========================================================

	const imageUrl = (path: string | null, size = 'w185') =>
		path ? `https://image.tmdb.org/t/p/${size}${path}` : '/placeholder.jpg';

	const backdropUrl = (path: string | null) =>
		path ? `https://image.tmdb.org/t/p/original${path}` : '';

	// =========================================================
	// CURRENT EPISODE
	// =========================================================

	const currentEpisode = $derived(episodes.find((item) => item.episode_number === episode) ?? null);

	// =========================================================
	// LOAD SERIES
	// =========================================================

	async function loadSeries(seriesId: string) {
		const currentRequest = ++requestId;

		loading = true;
		error = null;
		episodeMenuOpen = false;

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

			const trailer = videos.results?.find(
				(video) => video.site === 'YouTube' && video.type === 'Trailer'
			);

			trailerKey = trailer?.key ?? null;

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

			error = err instanceof Error ? err.message : 'Failed to load series.';

			loading = false;
		}
	}

	// =========================================================
	// LOAD SEASON
	// =========================================================

	async function loadSeason(seriesId: string, seasonNumber: number) {
		const currentRequest = ++seasonRequestId;

		seasonLoading = true;
		episodeMenuOpen = false;

		try {
			const data = await getSeasonDetails(seriesId, seasonNumber);

			// Ignore stale request
			if (currentRequest !== seasonRequestId) {
				return;
			}

			episodes = data.episodes ?? [];

			if (episodes.length > 0) {
				episode = episodes[0].episode_number;
			} else {
				episode = 1;
			}
		} catch (err) {
			if (currentRequest !== seasonRequestId) {
				return;
			}

			console.error('Failed to load season:', err);

			episodes = [];
			episode = 1;
		} finally {
			if (currentRequest === seasonRequestId) {
				seasonLoading = false;
			}
		}
	}

	// =========================================================
	// EFFECTS
	// =========================================================

	$effect(() => {
		if (!id) return;

		loadSeries(id);
	});

	$effect(() => {
		if (!id || !season || !series) return;

		loadSeason(id, season);
	});

	// =========================================================
	// SEASON / EPISODE MENU
	// =========================================================

	function toggleEpisodeMenu() {
		if (seasonLoading || episodes.length === 0) {
			return;
		}

		episodeMenuOpen = !episodeMenuOpen;
	}

	function selectSeason(value: number) {
		if (value === season) {
			return;
		}

		season = value;

		// Start from episode 1 while new season loads
		episode = 1;

		// Keep menu open so the user can see the new episodes
		episodeMenuOpen = true;
	}

	function selectEpisode(value: number) {
		episode = value;
		episodeMenuOpen = false;
	}

	function closeEpisodeMenu() {
		episodeMenuOpen = false;
	}

	// =========================================================
	// EPISODE NAVIGATION
	// =========================================================

	function firstEpisode() {
		if (episodes.length === 0) return;

		episode = episodes[0].episode_number;
	}

	function previousEpisode() {
		if (episodes.length === 0) return;

		const currentIndex = episodes.findIndex((item) => item.episode_number === episode);

		if (currentIndex > 0) {
			episode = episodes[currentIndex - 1].episode_number;
		}
	}

	function nextEpisode() {
		if (episodes.length === 0) return;

		const currentIndex = episodes.findIndex((item) => item.episode_number === episode);

		if (currentIndex === -1 || currentIndex >= episodes.length - 1) {
			return;
		}

		episode = episodes[currentIndex + 1].episode_number;
	}

	function lastEpisode() {
		if (episodes.length === 0) return;

		episode = episodes[episodes.length - 1].episode_number;
	}

	// =========================================================
	// TRAILER
	// =========================================================

	function openTrailer() {
		showTrailer = true;
	}

	function closeTrailer() {
		showTrailer = false;
	}

	// =========================================================
	// RETRY
	// =========================================================

	function retry() {
		if (!id) return;

		loadSeries(id);
	}

	// =========================================================
	// HOME
	// =========================================================

	function goHome() {
		goto(resolve('/'));
	}
</script>

<!-- Close selector when clicking outside -->
<svelte:window onclick={closeEpisodeMenu} />

{#if !showTrailer}
	<Navbar />
{/if}

<!-- =========================================================
     LOADING
========================================================= -->

{#if loading}
	<div class="min-h-screen bg-black text-white">
		<div class="mx-auto w-full max-w-7xl px-3 pt-24 sm:px-5 lg:px-8">
			<!-- Controls skeleton -->
			<div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div class="h-11 w-full animate-pulse rounded-xl bg-white/5 sm:w-[360px]"></div>

				<div class="grid grid-cols-5 gap-1.5 sm:flex">
					{#each Array.from({ length: 5 }, (_, index) => index) as index (index)}
						<div class="h-10 animate-pulse rounded-lg bg-white/5 sm:w-10"></div>
					{/each}
				</div>
			</div>

			<!-- Player skeleton -->
			<div
				class="aspect-video w-full animate-pulse rounded-lg border border-white/10 bg-zinc-950 sm:rounded-xl"
			></div>

			<!-- Details skeleton -->
			<div class="mt-8 space-y-4">
				<div class="h-8 w-64 animate-pulse rounded bg-white/5"></div>
				<div class="h-4 w-full max-w-2xl animate-pulse rounded bg-white/5"></div>
				<div class="h-4 w-3/4 max-w-2xl animate-pulse rounded bg-white/5"></div>
			</div>
		</div>
	</div>

	<!-- =========================================================
     ERROR
========================================================= -->
{:else if error || !series}
	<div class="flex min-h-screen items-center justify-center bg-black px-5 text-white">
		<div class="flex w-full max-w-md flex-col items-center text-center">
			<div
				class="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10"
			>
				<AlertCircle size={28} class="text-red-400" />
			</div>

			<h1 class="text-xl font-semibold">Unable to load series</h1>

			<p class="mt-2 text-sm leading-relaxed text-zinc-500">
				{error || 'Something went wrong while loading this series.'}
			</p>

			<div class="mt-6 flex items-center gap-2">
				<button
					type="button"
					onclick={retry}
					class="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
				>
					<LoaderCircle size={15} />
					Retry
				</button>

				<button
					type="button"
					onclick={goHome}
					class="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
				>
					<Home size={15} />
					Home
				</button>
			</div>
		</div>
	</div>

	<!-- =========================================================
     SERIES
========================================================= -->
{:else}
	<div
		class="relative min-h-screen bg-black bg-cover bg-center bg-no-repeat text-white"
		style={`background-image: url(${backdropUrl(series.backdrop_path)})`}
	>
		<!-- Background overlays -->
		<div class="absolute inset-0 bg-black/75"></div>

		<div class="absolute inset-0 bg-black/40 backdrop-blur-2xl"></div>

		<div
			class="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent"
		></div>

		<div class="relative z-10">
			<!-- =================================================
                 PLAYER SECTION
            ================================================= -->

			<section
				class="relative z-10 mx-auto w-full max-w-7xl px-3 pt-24 sm:px-5 sm:pt-24 lg:px-8"
				aria-label="Series player"
			>
				<!-- =================================================
         TOP CONTROLS
    ================================================= -->

				<div
					class="mb-3 flex w-full flex-col gap-3 sm:mb-4 lg:flex-row lg:items-center lg:justify-between"
				>
					<!-- =================================================
             COMBINED SEASON + EPISODE SELECTOR
             Mobile + Tablet + Desktop
        ================================================= -->

					<div class="relative z-50 w-full lg:w-auto">
						<div class="relative w-full lg:w-auto" onclick={(event) => event.stopPropagation()}>
							<!-- Main selector button -->
							<button
								type="button"
								onclick={toggleEpisodeMenu}
								disabled={seasonLoading || episodes.length === 0}
								class="flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/80 px-4 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[320px] lg:min-w-[400px]"
								aria-haspopup="menu"
								aria-expanded={episodeMenuOpen}
							>
								<div class="flex min-w-0 items-center gap-2">
									<Play
										size={14}
										strokeWidth={2}
										fill="currentColor"
										class="shrink-0 text-white/60"
									/>

									<span class="min-w-0 truncate">
										{#if seasonLoading}
											Loading episodes...
										{:else if episodes.length === 0}
											No episodes
										{:else if currentEpisode}
											S{season}
											· EP
											{currentEpisode.episode_number}

											<span class="text-white/50">
												· {currentEpisode.name || `Episode ${currentEpisode.episode_number}`}
											</span>
										{:else}
											Season {season}
											· Episode {episode}
										{/if}
									</span>
								</div>

								<ChevronDown
									size={16}
									strokeWidth={2}
									class={`shrink-0 text-white/50 transition-transform duration-200 ${
										episodeMenuOpen ? 'rotate-180' : ''
									}`}
								/>
							</button>

							<!-- =================================================
                     COMBINED SEASON + EPISODE MENU
                ================================================= -->

							{#if episodeMenuOpen && episodes.length > 0}
								<div
									class="absolute top-[calc(100%+8px)] left-0 z-[999] w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/98 shadow-[0_20px_60px_rgba(0,0,0,0.75)] backdrop-blur-2xl sm:w-[420px] lg:w-[480px]"
									role="menu"
									onclick={(event) => event.stopPropagation()}
								>
									<!-- =================================================
                             SEASON SELECTOR
                        ================================================= -->

									<div class="border-b border-white/10 p-3">
										<div
											class="mb-2 text-[10px] font-semibold tracking-widest text-white/40 uppercase"
										>
											Season
										</div>

										<div class="flex gap-2 overflow-x-auto pb-1">
											{#each series.seasons?.filter((item) => item.season_number > 0) ?? [] as item (item.season_number)}
												<button
													type="button"
													onclick={() => selectSeason(item.season_number)}
													class={item.season_number === season
														? 'shrink-0 cursor-pointer rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition-colors'
														: 'shrink-0 cursor-pointer rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-white'}
												>
													S{item.season_number}
												</button>
											{/each}
										</div>
									</div>

									<!-- =================================================
                             EPISODE HEADER
                        ================================================= -->

									<div class="border-b border-white/10 px-3 py-2.5">
										<div class="flex items-center justify-between">
											<div
												class="text-[10px] font-semibold tracking-widest text-white/40 uppercase"
											>
												Episodes
											</div>

											<div class="text-[10px] text-white/30">
												{episodes.length}
												{episodes.length === 1 ? 'episode' : 'episodes'}
											</div>
										</div>
									</div>

									<!-- =================================================
                             EPISODE LIST
                        ================================================= -->

									<div class="max-h-[55vh] overflow-y-auto p-2 sm:max-h-[500px]">
										{#each episodes as item (item.episode_number)}
											<button
												type="button"
												role="menuitem"
												onclick={() => selectEpisode(item.episode_number)}
												class={item.episode_number === episode
													? 'flex w-full min-w-0 cursor-pointer gap-3 rounded-xl bg-white/10 p-2 text-left transition-colors'
													: 'flex w-full min-w-0 cursor-pointer gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5'}
											>
												<!-- Episode thumbnail -->
												<div
													class="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:h-20 sm:w-32"
												>
													{#if item.still_path}
														<img
															src={imageUrl(item.still_path, 'w300')}
															alt={item.name || `Episode ${item.episode_number}`}
															class="h-full w-full object-cover"
															loading="lazy"
														/>
													{:else}
														<div
															class="flex h-full w-full items-center justify-center text-zinc-600"
														>
															<Play size={18} />
														</div>
													{/if}

													<div
														class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
													></div>

													<div
														class="absolute bottom-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-semibold text-white"
													>
														EP
														{item.episode_number}
													</div>

													{#if item.episode_number === episode}
														<div
															class="absolute inset-0 flex items-center justify-center bg-black/40"
														>
															<div
																class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg"
															>
																<Play size={11} fill="currentColor" strokeWidth={0} />
															</div>
														</div>
													{/if}
												</div>

												<!-- Episode information -->
												<div class="min-w-0 flex-1 py-0.5">
													<div
														class={item.episode_number === episode
															? 'truncate text-xs font-semibold text-white'
															: 'truncate text-xs font-medium text-zinc-200'}
													>
														{item.name || `Episode ${item.episode_number}`}
													</div>

													<div class="mt-1 text-[10px] text-zinc-600">
														Episode
														{item.episode_number}
													</div>

													{#if item.air_date}
														<div class="mt-1 text-[10px] text-zinc-500">
															{item.air_date}
														</div>
													{/if}

													{#if item.overview}
														<p class="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
															{item.overview}
														</p>
													{/if}
												</div>

												<!-- Current indicator -->
												{#if item.episode_number === episode}
													<Check size={15} strokeWidth={2.5} class="mt-1 shrink-0 text-white" />
												{/if}
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- =================================================
             EPISODE NAVIGATION
        ================================================= -->

					<div class="grid w-full grid-cols-5 gap-1.5 sm:flex sm:w-auto sm:items-center sm:gap-2">
						<!-- FIRST EPISODE -->
						<button
							type="button"
							onclick={firstEpisode}
							disabled={episodes.length === 0 || episode === episodes[0]?.episode_number}
							class="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 sm:px-3"
							title="First episode"
						>
							<ChevronLeft size={16} />
							<ChevronLeft size={16} class="-ml-3" />
						</button>

						<!-- PREVIOUS EPISODE -->
						<button
							type="button"
							onclick={previousEpisode}
							disabled={episodes.length === 0 || episode === episodes[0]?.episode_number}
							class="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 sm:px-3"
							title="Previous episode"
						>
							<ChevronLeft size={17} />
						</button>

						<!-- CURRENT EPISODE -->
						<div
							class="flex h-10 min-w-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-semibold text-white sm:min-w-[70px] sm:px-3"
						>
							S{season} · E{episode}
						</div>

						<!-- NEXT EPISODE -->
						<button
							type="button"
							onclick={nextEpisode}
							disabled={episodes.length === 0 ||
								episode === episodes[episodes.length - 1]?.episode_number}
							class="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 sm:px-3"
							title="Next episode"
						>
							<ChevronRight size={17} />
						</button>

						<!-- LAST EPISODE -->
						<button
							type="button"
							onclick={lastEpisode}
							disabled={episodes.length === 0 ||
								episode === episodes[episodes.length - 1]?.episode_number}
							class="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 sm:px-3"
							title="Last episode"
						>
							<ChevronRight size={16} />
							<ChevronRight size={16} class="-ml-3" />
						</button>
					</div>
				</div>

				<!-- =================================================
         VIDEO PLAYER
    ================================================= -->

				<div
					class="relative z-0 w-full overflow-hidden rounded-lg border border-white/10 bg-black shadow-2xl sm:rounded-xl"
				>
					{#if seasonLoading}
						<div class="relative aspect-video w-full bg-black">
							<div class="absolute inset-0 flex flex-col items-center justify-center">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5"
								>
									<LoaderCircle size={22} class="animate-spin text-white/60" />
								</div>

								<p class="mt-4 text-sm font-medium text-white/70">
									Loading Season {season}
								</p>

								<p class="mt-1 text-xs text-white/30">Preparing episodes...</p>
							</div>
						</div>
					{:else}
						<div class="aspect-video w-full bg-black">
							<iframe
								class="h-full w-full border-0"
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

			<!-- =====================================================
                 SERIES DETAILS
            ===================================================== -->

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
