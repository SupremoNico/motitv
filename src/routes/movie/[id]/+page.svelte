<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import MovieFullDetails from '$lib/components/MovieDetails.svelte';

	import { page } from '$app/stores';
	import { getMovieDetails, getMovieCredits, getMovieVideos } from '$lib/tmdb';

	import type { MovieDetails, MovieCredits, CastMember, CrewMember } from '$lib/tmdb';

	let movie = $state<MovieDetails | null>(null);
	let cast = $state<CastMember[]>([]);
	let directors = $state<CrewMember[]>([]);

	let trailerKey = $state<string | null>(null);
	let showTrailer = $state(false);

	const id = $derived($page.params.id);

	const imageUrl = (path: string | null, size = 'w185') =>
		path ? `https://image.tmdb.org/t/p/${size}${path}` : '/placeholder.jpg';

	const formatRuntime = (min: number) => {
		const h = Math.floor(min / 60);
		const m = min % 60;
		return `${h}h ${m}m`;
	};

	$effect(() => {
		if (!id) return;

		(async () => {
			movie = await getMovieDetails(id);

			const credits: MovieCredits = await getMovieCredits(id);
			cast = credits.cast.slice(0, 12);
			directors = credits.crew.filter((c) => c.job === 'Director');

			const videos = await getMovieVideos(id);
			const trailer = videos.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube');

			trailerKey = trailer?.key ?? null;
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

{#if movie}
	<!-- 🌌 BACKGROUND WRAPPER (NOW HANDLES BACKDROP) -->
	<div
		class="relative min-h-screen bg-black bg-cover bg-center bg-no-repeat text-white"
		style={`background-image: url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`}
	>
		<!-- overlay -->
		<div class="absolute inset-0 bg-black/70 backdrop-blur-xl"></div>

		<div class="relative z-10">
			<!-- 🎥 PLAYER -->
			<div class="mx-auto max-w-6xl px-6 pt-24">
				<div class="overflow-hidden rounded-xl border border-white/10 shadow-2xl">
					<div class="relative h-0 pb-[56.25%]">
						<iframe
							class="absolute inset-0 h-full w-full"
							src={`https://vidcore.net/movie/${movie.id}?autoPlay=false&theme=B9E8FC&hideServer=true&chromecast=false&title=false`}
							allow="autoplay; encrypted-media"
							title="Movie Player"
							allowfullscreen
						></iframe>
					</div>
				</div>
			</div>

			<!-- 📄 DETAILS COMPONENT -->
			<MovieFullDetails
				{movie}
				{cast}
				{directors}
				{trailerKey}
				{showTrailer}
				{openTrailer}
				{closeTrailer}
				{imageUrl}
				{formatRuntime}
			/>
		</div>
	</div>
{/if}
