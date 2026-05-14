<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import SeriesFullDetails from '$lib/components/SeriesDetails.svelte';
	import { page } from '$app/stores';
	import { getSeriesDetails, getSeriesCredits, getSeriesVideos, getSeasonDetails } from '$lib/tmdb';

	import type { SeriesDetails, MovieCredits, CastMember, CrewMember } from '$lib/tmdb';

	let series = $state<SeriesDetails | null>(null);
	let cast = $state<CastMember[]>([]);
	let creators = $state<CrewMember[]>([]);

	let trailerKey = $state<string | null>(null);
	let showTrailer = $state(false);

	let season = $state(1);
	let episode = $state(1);
	let episodes = $state<{ episode_number: number; name: string }[]>([]);
	let seasonOpen = $state(false);

	let currentEpisodeTitle = $state('');
	let currentSeasonName = $state('');
	let episodesOpen = $state(false);
	let	showHeader = $state(false);

	const id = $derived($page.params.id);

	function clickOutside(node: HTMLElement, callback: () => void) {
		const handleClick = (event: MouseEvent) => {
			if (!node.contains(event.target as Node)) {
				callback();
			}
		};

		// Detect normal DOM clicks
		document.addEventListener('click', handleClick, true);

		// Detect iframe interaction (best-effort)
		const handleBlur = () => {
			callback();
		};

		window.addEventListener('blur', handleBlur);

		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
				window.removeEventListener('blur', handleBlur);
			}
		};
	}

	const imageUrl = (path: string | null, size = 'w185') =>
		path ? `https://image.tmdb.org/t/p/${size}${path}` : '/placeholder.jpg';

	const backdropUrl = (path: string | null) =>
		path ? `https://image.tmdb.org/t/p/original${path}` : '';

	$effect(() => {
		if (!id) return;

		(async () => {
			series = await getSeriesDetails(id);

			const credits: MovieCredits = await getSeriesCredits(id);
			cast = credits.cast.slice(0, 12);

			creators = credits.crew.filter((c) => c.job === 'Creator' || c.job === 'Executive Producer');

			const videos = await getSeriesVideos(id);
			const trailer = videos.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube');

			trailerKey = trailer?.key ?? null;

			season = series?.seasons?.find((s) => s.season_number)?.season_number ?? 1;
		})();
	});

	$effect(() => {
		if (!id || !season) return;

		(async () => {
			const data = await getSeasonDetails(id, season);

			episodes = data.episodes.map((e) => ({
				episode_number: e.episode_number,
				name: e.name
			}));

			currentSeasonName =
				series?.seasons?.find((s) => s.season_number === season)?.name ?? `Season ${season}`;

			episode = 1;
			currentEpisodeTitle = data.episodes[0]?.name ?? '';
		})();
	});

	function openTrailer() {
		showTrailer = true;
	}

	function closeTrailer() {
		showTrailer = false;
	}
</script>

{#if !showTrailer}
	<Navbar />
{/if}

{#if series}
	<div
		class="relative min-h-screen bg-black bg-cover bg-center bg-no-repeat text-white"
		style={`background-image: url(${backdropUrl(series.backdrop_path)})`}
	>
		<div class="absolute inset-0 bg-black/70 backdrop-blur-xl"></div>

		<div class="relative z-10">
			<!-- PLAYER -->
			<div class="relative isolate mx-auto max-w-6xl px-6 pt-24">
				<div class="overflow-hidden rounded-xl border border-white/10 shadow-2xl">
					<!-- HEADER (RESTORED UI) -->
					{#if showHeader}
						<div
							class="flex flex-col gap-3 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
						>
							<!-- 🎬 SEASON DROPDOWN (RESTORED GLASS UI) -->
							<div class="relative min-w-200px" use:clickOutside={() => (seasonOpen = false)}>
								<button
									onclick={() => (seasonOpen = !seasonOpen)}
									class="
									relative w-full rounded-xl
									border border-white/20
									bg-white/10
									px-3 py-2 text-left text-sm text-white
									shadow-md shadow-black/10
									backdrop-blur-xl
									transition-all duration-200
									hover:border-white/30 hover:bg-white/15
								"
									class:rounded-b-none={seasonOpen}
								>
									<!-- <p class="text-xs text-white/60">Season</p> -->

									<div class="flex items-center justify-between">
										<span class="font-semibold">
											{series.seasons.find((s) => s.season_number === season)?.name ??
												`Season ${season}`}
										</span>

										<span class="text-white/70">
											{#if seasonOpen}
												<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path
														fill-rule="evenodd"
														d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832l-3.71 3.94a.75.75 0 11-1.08-1.04l4.24-4.5a.75.75 0 011.08 0l4.24 4.5a.75.75 0 01-.02 1.06z"
														clip-rule="evenodd"
													/>
												</svg>
											{:else}
												<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path
														fill-rule="evenodd"
														d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
														clip-rule="evenodd"
													/>
												</svg>
											{/if}
										</span>
									</div>
								</button>

								{#if seasonOpen}
									<div
										class="
			absolute top-full left-0 z-50
			max-h-64 w-full overflow-y-auto

			rounded-b-xl
			border border-white/20

			bg-black/60
			shadow-2xl

			shadow-black/70 backdrop-blur-xl
		"
									>
										{#each series.seasons as s (s.season_number)}
											{#if s.season_number}
												<button
													onclick={() => {
														season = s.season_number;
														episode = 1;
														seasonOpen = false;
													}}
													class="
						w-full px-3 py-2 text-left text-sm
						text-white
						transition
						hover:bg-white/10
					"
												>
													<div class="flex items-center justify-between">
														<span>{s.name}</span>
														<span class="text-xs text-white/70">
															{s.episode_count} eps
														</span>
													</div>
												</button>
											{/if}
										{/each}
									</div>
								{/if}
							</div>

							<!-- CENTER TITLE -->
							<div class="text-center">
								<p class="text-xs text-white/60">{currentSeasonName}</p>
								<p class="text-base font-semibold">
									Episode {episode}: {currentEpisodeTitle}
								</p>
							</div>

							<!-- 🎞 EPISODES DROPDOWN (MATCH SEASON STYLE) -->
							<div class="relative min-w-200px" use:clickOutside={() => (episodesOpen = false)}>
								<!-- Trigger -->
								<button
									onclick={() => (episodesOpen = !episodesOpen)}
									class="
			relative w-full rounded-xl
			border border-white/20
			bg-white/10
			px-3 py-2 text-left text-sm text-white
			shadow-md shadow-black/10
			backdrop-blur-xl
			transition-all duration-200
			hover:border-white/30 hover:bg-white/15
		"
									class:rounded-b-none={episodesOpen}
								>
									<div class="flex items-center justify-between">
										<span class="font-semibold">
											Episode {episode}
										</span>

										<span class="text-white/70">
											{#if episodesOpen}
												<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path
														fill-rule="evenodd"
														d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832l-3.71 3.94a.75.75 0 11-1.08-1.04l4.24-4.5a.75.75 0 011.08 0l4.24 4.5a.75.75 0 01-.02 1.06z"
														clip-rule="evenodd"
													/>
												</svg>
											{:else}
												<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path
														fill-rule="evenodd"
														d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
														clip-rule="evenodd"
													/>
												</svg>
											{/if}
										</span>
									</div>
								</button>

								<!-- Dropdown -->
								{#if episodesOpen}
									<div
										class="
				absolute top-full left-0 z-50
				max-h-64 w-full overflow-y-auto

				rounded-b-xl
				border border-white/20
				bg-black/60
				shadow-2xl
				shadow-black/70
				backdrop-blur-xl
			"
									>
										{#each episodes as ep (ep.episode_number)}
											<button
												onclick={() => {
													episode = ep.episode_number;
													currentEpisodeTitle = ep.name;
													episodesOpen = false;
												}}
												class="
						w-full px-3 py-2 text-left text-sm text-white
						transition hover:bg-white/10
						{episode === ep.episode_number ? 'bg-white/10' : ''}
					"
											>
												<div class="flex items-center justify-between">
													<span>Episode {ep.episode_number}</span>
												</div>
											</button>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- PLAYER -->
					<div class="relative h-0 pb-[56.25%]">
						<iframe
							class="absolute inset-0 h-full w-full"
							title="Episode Player"
							src={`https://embed.filmu.in/tv/${series.id}/${season}/${episode}`}
							allowfullscreen
						></iframe>
					</div>
				</div>
			</div>

			<!-- DETAILS -->
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
