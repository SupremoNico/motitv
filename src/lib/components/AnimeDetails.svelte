<script lang="ts">
	import type { AniListAnime, Character, Staff } from '$lib/anilist';

	type Props = {
		anime: AniListAnime & {
			description?: string;
			seasonYear?: number;
			trailer?: {
				id: string;
				site: string;
			} | null;
		};
		characters: Character[];
		staff: Staff[];
		showTrailer: boolean;
		openTrailer: () => void;
		closeTrailer: () => void;
		imageUrl: (url: string | null | undefined) => string;
	};

	let {
		anime,
		characters,
		staff,
		showTrailer,
		openTrailer,
		closeTrailer,
		imageUrl
	}: Props = $props();
</script>

<!-- 🌌 DETAILS LAYOUT -->
<div class="relative text-white">
	<div class="mx-auto max-w-6xl px-6 py-10">

		<!-- 🎞 TRAILER MODAL -->
		{#if showTrailer && anime.trailer?.id}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
				<button onclick={closeTrailer} class="absolute top-6 right-6 text-2xl">✕</button>

				<div class="w-full max-w-5xl px-4">
					<div class="relative h-0 pb-[56.25%]">
						<iframe
							class="absolute inset-0 h-full w-full"
							src={`https://www.youtube.com/embed/${anime.trailer.id}?autoplay=1`}
							allow="autoplay; encrypted-media"
							title="Anime Trailer"
							allowfullscreen
						></iframe>
					</div>
				</div>
			</div>
		{/if}

		<!-- TITLE -->
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<h1 class="text-4xl font-bold md:text-5xl">
				{anime.title.english ?? anime.title.romaji}
			</h1>

			{#if anime.trailer?.id}
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
			<span>{anime.seasonYear ?? 'N/A'}</span>
			<span>{anime.episodes ?? '?'} Episodes</span>
			<span>⭐ {anime.averageScore ?? 'N/A'}</span>
		</div>

		<!-- GENRES -->
		{#if anime.genres?.length}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each anime.genres as genre (genre)}
					<span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur-md">
						{genre}
					</span>
				{/each}
			</div>
		{/if}

		<!-- DESCRIPTION -->
		{#if anime.description}
			<p class="mt-4 max-w-3xl text-white/80">
				{anime.description}
			</p>
		{/if}

		<!-- 🎭 CHARACTERS -->
		{#if characters.length}
			<div class="mt-12">
				<h2 class="mb-4 text-xl font-semibold">Characters</h2>

				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
					{#each characters as char (char.id)}
						<div class="rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-lg hover:bg-white/10">
							<img
								alt={char.name}
								src={imageUrl(char.image)}
								class="mx-auto h-20 w-20 rounded-full object-cover"
							/>
							<p class="mt-3 text-sm font-semibold">{char.name}</p>
							<p class="text-xs text-white/50">{char.role}</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- 🎬 STAFF -->
		{#if staff.length}
			<div class="mt-12">
				<h2 class="mb-4 text-xl font-semibold">Staff</h2>

				<div class="flex flex-wrap gap-4">
					{#each staff as person (person.id)}
						<div class="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-lg hover:bg-white/10">
							<img
								alt={person.name}
								src={imageUrl(person.image)}
								class="h-12 w-12 rounded-full object-cover"
							/>
							<div>
								<p class="text-sm font-semibold">{person.name}</p>
								<p class="text-xs text-white/50">{person.role}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

	</div>
</div>