<script lang="ts">
	import type { MovieDetails, CastMember, CrewMember } from '$lib/tmdb';

	type Props = {
		movie: MovieDetails;
		cast: CastMember[];
		directors: CrewMember[];
		trailerKey: string | null;
		showTrailer: boolean;
		openTrailer: () => void;
		closeTrailer: () => void;
		imageUrl: (path: string | null, size?: string) => string;
		formatRuntime: (min: number) => string;
	};

	let {
		movie,
		cast,
		directors,
		trailerKey,
		showTrailer,
		openTrailer,
		closeTrailer,
		imageUrl,
		formatRuntime
	}: Props = $props();
</script>

<!-- 🌌 DETAILS ONLY (NO BACKDROP) -->
<div class="relative text-white">
	<div class="mx-auto max-w-6xl px-6 py-10">

		<!-- 🎞 TRAILER -->
		{#if showTrailer}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
				<button onclick={closeTrailer} class="absolute top-6 right-6 text-2xl">✕</button>

				<div class="w-full max-w-5xl px-4">
					<div class="relative h-0 pb-[56.25%]">
						<iframe
							class="absolute inset-0 h-full w-full"
							src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
							allow="autoplay; encrypted-media"
							title="Trailer"
							allowfullscreen
						/>
					</div>
				</div>
			</div>
		{/if}

		<!-- TITLE -->
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<h1 class="text-4xl font-bold md:text-5xl">{movie.title}</h1>

			{#if trailerKey}
				<button
					onclick={openTrailer}
					class="group flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm backdrop-blur-md transition hover:scale-[1.03] hover:bg-white/20"
				>
					<span class="text-lg transition group-hover:rotate-12">🎬</span>
					<span class="font-medium">Watch Trailer</span>
				</button>
			{/if}
		</div>

		<!-- INFO -->
		<div class="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
			<span>{movie.release_date?.slice(0, 4)}</span>
			<span>{movie.runtime ? formatRuntime(movie.runtime) : 'N/A'}</span>
			<span>{movie.vote_average.toFixed(1)}</span>
			<span>{movie.vote_count}</span>
		</div>

		<!-- GENRES -->
		{#if movie.genres?.length}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each movie.genres as genre (genre.id)}
					<span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur-md">
						{genre.name}
					</span>
				{/each}
			</div>
		{/if}

		<p class="mt-4 max-w-3xl text-white/80">{movie.overview}</p>

		<!-- DIRECTORS -->
		{#if directors.length}
			<div class="mt-12">
				<h2 class="mb-4 text-xl font-semibold">Director</h2>

				<div class="flex flex-wrap gap-4">
					{#each directors as director (director.id)}
						<div class="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-lg hover:bg-white/10">
							<img src={imageUrl(director.profile_path)} class="h-12 w-12 rounded-full object-cover" />
							<div>
								<p class="text-sm font-semibold">{director.name}</p>
								<p class="text-xs text-white/50">Director</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- CAST -->
		{#if cast.length}
			<div class="mt-12">
				<h2 class="mb-4 text-xl font-semibold">Cast</h2>

				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
					{#each cast as actor (actor.id)}
						<div class="rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-lg hover:bg-white/10">
							<img src={imageUrl(actor.profile_path)} class="mx-auto h-20 w-20 rounded-full object-cover" />
							<p class="mt-3 text-sm font-semibold">{actor.name}</p>
							<p class="text-xs text-white/50">{actor.character}</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}

	</div>
</div>