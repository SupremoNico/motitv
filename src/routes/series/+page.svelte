<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { getAllSeries } from '$lib/tmdb';
	import type { TVSeries } from '$lib/tmdb';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let series = $state<TVSeries[]>([]);
	let loading = $state(false);
	let page = $state(1);
	let hasMore = $state(true);

	let observer: IntersectionObserver;
	let sentinel: HTMLDivElement;

	async function loadSeries() {
		if (loading || !hasMore) return;

		loading = true;

		try {
			const currentPage = page;
			const data = await getAllSeries(currentPage);

			series = [...series, ...data.results];

			page = currentPage + 1;

			if (data.page >= data.total_pages || data.results.length === 0) {
				hasMore = false;
			}
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}

	function openSeries(id: number) {
		goto(resolve(`/series/${id}`));
	}

	onMount(async () => {
		await loadSeries();

		observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) loadSeries();
			},
			{
				rootMargin: '400px',
				threshold: 0
			}
		);

		if (sentinel) observer.observe(sentinel);
	});

	onDestroy(() => {
		observer?.disconnect();
	});
</script>

<Navbar />

<div class="min-h-screen bg-black px-8 pt-24 text-white md:px-16">
	<h1 class="mb-6 text-2xl font-bold tracking-wide">Series</h1>

	<div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
		{#each series as show (show.id)}
			<div
				class="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/30 hover:bg-white/10"
			>
				<img
					src={show.poster_path
						? 'https://image.tmdb.org/t/p/w300' + show.poster_path
						: '/placeholder.jpg'}
					alt={show.name}
					class="w-full object-cover"
					loading="lazy"
					onerror={(e) => {
						(e.target as HTMLImageElement).src = '/placeholder.jpg';
					}}
				/>

				<!-- HOVER OVERLAY -->
				<div
					class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 p-4 text-center opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100"
				>
					<button
						onclick={() => openSeries(show.id)}
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
						{show.name}
					</p>

					<div class="flex items-center gap-3 text-[10px] text-white/70">
						<span class="font-medium text-yellow-400">
							★ {show.vote_average?.toFixed(1)}
						</span>
						<span>•</span>
						<span>{show.first_air_date?.slice(0, 4)}</span>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div bind:this={sentinel} class="h-10 w-full"></div>

	{#if loading && hasMore}
		<p class="py-6 text-center text-white/50">Loading more...</p>
	{:else if !hasMore}
		<p class="py-6 text-center text-white/30">No more series</p>
	{/if}
</div>