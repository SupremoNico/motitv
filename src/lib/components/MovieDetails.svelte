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

	const profileUrl = (path: string | null) => {
		return imageUrl(path, 'w185');
	};

	const year = $derived(movie.release_date ? movie.release_date.slice(0, 4) : 'N/A');

	const rating = $derived(Number(movie.vote_average ?? 0).toFixed(1));

	const runtime = $derived(movie.runtime ? formatRuntime(movie.runtime) : 'N/A');
</script>

<!-- ========================= -->
<!-- DETAILS -->
<!-- ========================= -->

<div class="relative text-white">
	<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
		<!-- ========================= -->
		<!-- TRAILER MODAL -->
		<!-- ========================= -->

		{#if showTrailer && trailerKey}
			<div
				class="fixed inset-0 z-100 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md sm:p-6"
				role="dialog"
				aria-modal="true"
				aria-label={`${movie.title} trailer`}
			>
				<!-- Close button -->
				<button
					type="button"
					onclick={closeTrailer}
					class="absolute top-4 right-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl text-white transition hover:bg-white hover:text-black focus:ring-2 focus:ring-white/50 focus:outline-none sm:top-6 sm:right-6"
					aria-label="Close trailer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="h-5 w-5"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>

				<!-- Trailer container -->
				<div class="w-full max-w-6xl">
					<div
						class="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl"
					>
						<iframe
							class="absolute inset-0 h-full w-full"
							src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
							title={`${movie.title} trailer`}
							allow="autoplay; encrypted-media; picture-in-picture"
							allowfullscreen
						></iframe>
					</div>
				</div>
			</div>
		{/if}

		<!-- ========================= -->
		<!-- MAIN MOVIE INFO -->
		<!-- ========================= -->

		<section>
			<!-- Header -->
			<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
				<div class="max-w-4xl">
					<!-- Small label -->
					<div
						class="mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-white/40 uppercase"
					>
						<span class="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true"></span>

						<span>Movie</span>
					</div>

					<!-- Title -->
					<h1 class="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
						{movie.title}
					</h1>
				</div>

				<!-- Trailer button -->
				{#if trailerKey}
					<button
						type="button"
						onclick={openTrailer}
						class="group inline-flex shrink-0 cursor-pointer items-center justify-center gap-3 self-start rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition duration-200 hover:scale-[1.02] hover:bg-white hover:text-black focus:ring-2 focus:ring-white/50 focus:outline-none lg:self-auto"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							class="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
						>
							<path
								d="M8 5.14v13.72a1 1 0 0 0 1.5.86l10.5-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z"
							/>
						</svg>

						<span> Watch Trailer </span>
					</button>
				{/if}
			</div>

			<!-- ========================= -->
			<!-- METADATA -->
			<!-- ========================= -->

			<div class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-white/60">
				<!-- Year -->
				<div class="flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						class="h-4 w-4 text-white/40"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
						/>
					</svg>

					<span>{year}</span>
				</div>

				<!-- Runtime -->
				<div class="flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						class="h-4 w-4 text-white/40"
					>
						<circle cx="12" cy="12" r="9" />

						<path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2" />
					</svg>

					<span>{runtime}</span>
				</div>

				<!-- Rating -->
				<div class="flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="h-4 w-4 text-white/70"
					>
						<path
							d="m12 3 2.78 5.63 6.22.9-4.5 4.38 1.06 6.19L12 17.18 6.44 20.1l1.06-6.19L3 9.53l6.22-.9L12 3z"
						/>
					</svg>

					<span class="font-medium text-white">
						{rating}
					</span>

					<span> / 10 </span>
				</div>

				<!-- Vote count -->
				{#if movie.vote_count}
					<div class="text-white/40">
						{movie.vote_count.toLocaleString()} ratings
					</div>
				{/if}
			</div>

			<!-- ========================= -->
			<!-- GENRES -->
			<!-- ========================= -->

			{#if movie.genres?.length}
				<div class="mt-6 flex flex-wrap gap-2">
					{#each movie.genres as genre (genre.id)}
						<span
							class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
						>
							{genre.name}
						</span>
					{/each}
				</div>
			{/if}

			<!-- ========================= -->
			<!-- OVERVIEW -->
			<!-- ========================= -->

			{#if movie.overview}
				<div class="mt-8 max-w-4xl">
					<h2 class="mb-3 text-sm font-semibold tracking-[0.15em] text-white/40 uppercase">
						Overview
					</h2>

					<p class="text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
						{movie.overview}
					</p>
				</div>
			{/if}
		</section>

		<!-- ========================= -->
		<!-- DIVIDER -->
		<!-- ========================= -->

		<div class="my-12 h-px bg-white/10"></div>

		<!-- ========================= -->
		<!-- DIRECTORS -->
		<!-- ========================= -->

		{#if directors.length}
			<section>
				<div class="mb-5 flex items-end justify-between">
					<div>
						<p class="text-xs font-medium tracking-[0.2em] text-white/40 uppercase">
							Behind the camera
						</p>

						<h2 class="mt-1 text-xl font-semibold sm:text-2xl">
							Director{directors.length > 1 ? 's' : ''}
						</h2>
					</div>
				</div>

				<div class="flex flex-wrap gap-3 sm:gap-4">
					{#each directors as director (director.id)}
						<div
							class="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/4 px-3 py-3 transition duration-200 hover:border-white/20 hover:bg-white/8 sm:px-4"
						>
							<!-- Profile -->
							<img
								alt={director.name}
								src={profileUrl(director.profile_path)}
								class="h-11 w-11 rounded-full object-cover ring-1 ring-white/10 sm:h-12 sm:w-12"
								loading="lazy"
							/>

							<!-- Info -->
							<div class="min-w-0">
								<p class="max-w-45 truncate text-sm font-semibold text-white">
									{director.name}
								</p>

								<p class="mt-0.5 text-xs text-white/40">Director</p>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- ========================= -->
		<!-- CAST -->
		<!-- ========================= -->

		{#if cast.length}
			<section class="mt-12">
				<div class="mb-5">
					<p class="text-xs font-medium tracking-[0.2em] text-white/40 uppercase">Featuring</p>

					<h2 class="mt-1 text-xl font-semibold sm:text-2xl">Cast</h2>
				</div>

				<div
					class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6"
				>
					{#each cast as actor (actor.id)}
						<div
							class="group overflow-hidden rounded-xl border border-white/10 bg-white/4 transition duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/8"
						>
							<!-- Profile -->
							<div class="relative aspect-square overflow-hidden bg-zinc-900">
								<img
									alt={actor.name}
									src={profileUrl(actor.profile_path)}
									class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
									loading="lazy"
								/>

								<!-- Image gradient -->
								<div
									class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-80"
								></div>
							</div>

							<!-- Actor info -->
							<div class="p-3">
								<p class="truncate text-sm font-semibold text-white">
									{actor.name}
								</p>

								{#if actor.character}
									<p class="mt-1 truncate text-xs text-white/40" title={actor.character}>
										{actor.character}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- ========================= -->
		<!-- BOTTOM SPACING -->
		<!-- ========================= -->

		<div class="h-8"></div>
	</div>
</div>
