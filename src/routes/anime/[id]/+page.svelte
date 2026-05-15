<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import AnimeDetails from '$lib/components/AnimeDetails.svelte';
	import { page } from '$app/stores';

	import {
		getAnimeDetails,
		getAnimeCharacters,
		getAnimeStaff
	} from '$lib/anilist';

	import type {
		AniListAnime,
		AniListTitle
	} from '$lib/anilist';

	// =========================
	// TYPES (STRICT)
	// =========================

	type Character = {
		id: number;
		name: string;
		image: string | null;
		role: string | null;
	};

	type Staff = {
		id: number;
		name: string;
		image: string | null;
		role: string | null;
	};

	type AnimeDetailsExtended = AniListAnime & {
		description?: string;
		seasonYear?: number;
		trailer?: {
			id: string;
			site: string;
		} | null;
	};

	// =========================
	// STATE
	// =========================

	let anime = $state<AnimeDetailsExtended | null>(null);
	let characters = $state<Character[]>([]);
	let staff = $state<Staff[]>([]);
	let showTrailer = $state(false);

	const id = $derived($page.params.id);

	// =========================
	// LOAD DATA
	// =========================

	$effect(() => {
		if (!id) return;

		(async () => {
			const animeData = await getAnimeDetails(id);
			anime = animeData as AnimeDetailsExtended;

			const charData = await getAnimeCharacters(id);

			characters = (charData.characters ?? []).map((c) => ({
				id: c.id,
				name: c.name,
				image: c.image ?? null,
				role: c.role ?? null
			}));

			const staffData = await getAnimeStaff(id);

			staff = (staffData.staff ?? []).map((s) => ({
				id: s.id,
				name: s.name,
				image: s.image ?? null,
				role: s.role ?? null
			}));
		})();
	});

	// =========================
	// TRAILER
	// =========================

	function openTrailer() {
		showTrailer = true;
	}

	function closeTrailer() {
		showTrailer = false;
	}

	// =========================
	// IMAGE HELPER
	// =========================

	const imageUrl = (url: string | null) =>
		url ?? '/placeholder.jpg';
</script>

<!-- NAVBAR -->
{#if !showTrailer}
	<Navbar />
{/if}

<!-- MAIN -->
{#if anime}
	<div class="min-h-screen bg-black text-white">

		<!-- HERO -->
		<div
			class="relative bg-cover bg-center"
			style={`background-image: url(${anime.coverImage.large})`}
		>
			<div class="absolute inset-0 bg-black/80"></div>

			<div class="relative z-10 mx-auto max-w-6xl px-6 pt-24">

				<!-- TITLE -->
				<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<h1 class="text-4xl font-bold md:text-5xl">
						{anime.title.english ?? anime.title.romaji}
					</h1>

					{#if anime.trailer?.id}
						<button
							onclick={openTrailer}
							class="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm backdrop-blur-md transition hover:bg-white/20"
						>
							🎬 Watch Trailer
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
							<span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
								{genre}
							</span>
						{/each}
					</div>
				{/if}

				<!-- DESCRIPTION -->
				{#if anime.description}
					<p class="mt-4 max-w-3xl text-white/80">
						{@html anime.description}
					</p>
				{/if}
			</div>
		</div>

		<!-- DETAILS -->
		<AnimeDetails
			{anime}
			{characters}
			{staff}
			{showTrailer}
			{openTrailer}
			{closeTrailer}
			{imageUrl}
		/>
	</div>
{/if}