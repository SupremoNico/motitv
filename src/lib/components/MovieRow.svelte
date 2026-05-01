<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Movie } from '$lib/tmdb';

	let { title, movies = [] }: { title: string; movies: Movie[] } = $props();
</script>

<div class="relative z-20 px-8 pb-10 md:px-16">
	<h2 class="mb-4 text-lg font-semibold tracking-widest text-white/40 uppercase">
		{title}
	</h2>

	<div class="flex gap-5 overflow-x-auto pb-4">
		{#each movies as movie (movie.id)}
			<div class="min-w-[180px] flex-shrink-0 md:min-w-[220px] lg:min-w-[240px]">
				<div
					class="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
				>
					<img
						class="h-[320px] w-full object-cover"
						src={'https://image.tmdb.org/t/p/w500' + movie.poster_path}
						alt={movie.title}
						loading="lazy"
					/>

					<div
						class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 p-4 text-center opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100"
					>
						<button
							onclick={() => goto(resolve(`/movie/${movie.id}`))}
							class="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white/20 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-125 hover:bg-white/30 active:scale-110"
							aria-label="Play movie"
						>
							<svg class="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
								<path
									d="M6 4.75a1 1 0 0 1 1.514-.857l12 7.25a1 1 0 0 1 0 1.714l-12 7.25A1 1 0 0 1 6 19.25V4.75z"
								/>
							</svg>
						</button>

						<p class="line-clamp-2 text-sm font-semibold text-white">
							{movie.title}
						</p>

						<div class="flex items-center gap-3 text-xs text-white/70">
							<span class="font-medium text-yellow-400">
								★ {movie.vote_average?.toFixed(1)}
							</span>
							<span>•</span>
							<span>{movie.release_date?.slice(0, 4)}</span>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
