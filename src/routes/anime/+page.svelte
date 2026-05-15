<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { onMount, onDestroy, tick } from 'svelte';

	import { getTrendingAnime } from '$lib/anilist';
	import type { AniListAnime } from '$lib/anilist';

	// =========================
	// STATE
	// =========================

	let anime = $state<AniListAnime[]>([]);
	let page = $state(1);
	let loading = $state(false);
	let hasMore = $state(true);

	let observer: IntersectionObserver | null = null;
	let sentinel: HTMLDivElement | null = null;

	let requestInFlight = false;

	const skeletons = Array.from({ length: 12 }, (_, i) => i);

	// =========================
	// LOAD ANIME
	// =========================

	async function loadAnime() {
		if (requestInFlight || !hasMore) return;

		requestInFlight = true;
		loading = true;

		try {
			// ✅ FIX: API now returns AniListPage directly (NO .Page)
			const data = await getTrendingAnime(page);

			const media = data?.media ?? [];
			const pageInfo = data?.pageInfo;

			// If nothing returned, stop only if API says so
			if (!media.length) {
				hasMore = pageInfo?.hasNextPage ?? false;
				return;
			}

			anime = [...anime, ...media];
			page += 1;

			hasMore = pageInfo?.hasNextPage ?? false;
		} catch (err) {
			console.error('AniList error:', err);
		} finally {
			loading = false;
			requestInFlight = false;
		}
	}

	// =========================
	// INFINITE SCROLL
	// =========================

	function setupObserver() {
		if (!sentinel) return;

		observer?.disconnect();

		observer = new IntersectionObserver(
			async ([entry]) => {
				if (!entry.isIntersecting) return;
				if (loading || requestInFlight || !hasMore) return;

				await loadAnime();
			},
			{
				rootMargin: '300px',
				threshold: 0
			}
		);

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
		await loadAnime();
		await tick();
		setupObserver();
	});

	onDestroy(() => {
		observer?.disconnect();
	});
</script>

<Navbar />

<div class="min-h-screen bg-black px-8 pt-24 text-white md:px-16">
	<h1 class="mb-6 text-2xl font-bold tracking-wide">Anime</h1>

	<!-- GRID -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
		{#each anime as a (a.id)}
			<div
				class="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/30 hover:bg-white/10"
			>
				<img
					src={a.coverImage.large}
					alt={a.title.romaji}
					class="aspect-2/3 w-full object-cover"
					loading="lazy"
				/>

				<div
					class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 p-4 text-center opacity-0 backdrop-blur-md transition group-hover:opacity-100"
				>
					<p class="text-xs font-semibold">
						{a.title.english ?? a.title.romaji}
					</p>

					<p class="text-xs text-white/70">
						⭐ {a.averageScore ?? 'N/A'}
					</p>

					<p class="text-xs text-white/50">
						{a.episodes ?? '?'} eps
					</p>

					<button
						class="mt-2 rounded-full bg-white/20 px-4 py-1 text-xs hover:bg-white/30"
					>
						View
					</button>
				</div>
			</div>
		{/each}

		<!-- SKELETON -->
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

	<!-- FIXED: only show when real data is loaded -->
	{#if !hasMore && anime.length > 0}
		<p class="py-6 text-center text-white/30">No more anime</p>
	{/if}
</div>