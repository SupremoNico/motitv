<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Movie } from '$lib/tmdb';

	let { title, movies = [] }: { title: string; movies: Movie[] } = $props();

	function openMovie(movieId: number) {
		goto(resolve(`/movie/${movieId}`));
	}
</script>

{#if movies.length > 0}
	<section class="relative z-20 px-8 pb-10 md:px-16" aria-label={title}>
		<!-- ================================================================
		     ROW HEADER
		================================================================ -->

		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold tracking-widest text-white/40 uppercase">
				{title}
			</h2>
		</div>

		<!-- ================================================================
		     MOVIES
		================================================================ -->

		<div class="scrollbar-none flex gap-5 overflow-x-auto pb-4">
			{#each movies as movie (movie.id)}
				<article class="group w-[180px] shrink-0 md:w-[220px] lg:w-[240px]">
					<button
						type="button"
						onclick={() => openMovie(movie.id)}
						class="relative block w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl focus:ring-2 focus:ring-white/50 focus:outline-none"
						aria-label={`Open ${movie.title}`}
					>
						<!-- POSTER -->

						<div class="relative aspect-2/3 overflow-hidden">
							<img
								class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
								src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
								alt={movie.title}
								loading="lazy"
							/>

							<!-- DARK GRADIENT -->

							<div
								class="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							></div>

							<!-- PLAY BUTTON -->

							<div
								class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							>
								<span
									class="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/20 text-white shadow-xl backdrop-blur-md transition-transform duration-300 group-hover:scale-110"
								>
									<svg
										class="ml-0.5 h-7 w-7"
										fill="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											d="M6 4.75a1 1 0 0 1 1.514-.857l12 7.25a1 1 0 0 1 0 1.714l-12 7.25A1 1 0 0 1 6 19.25V4.75z"
										/>
									</svg>
								</span>
							</div>

							<!-- MOVIE INFO -->

							<div
								class="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
							>
								<p class="line-clamp-2 text-sm font-semibold text-white">
									{movie.title}
								</p>

								<div class="mt-2 flex items-center gap-2 text-xs text-white/70">
									<span class="font-medium text-yellow-400">
										★ {movie.vote_average?.toFixed(1)}
									</span>

									<span aria-hidden="true">•</span>

									<span>
										{movie.release_date?.slice(0, 4)}
									</span>
								</div>
							</div>
						</div>
					</button>
				</article>
			{/each}
		</div>
	</section>
{/if}

<style>
	.scrollbar-none {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
</style>
