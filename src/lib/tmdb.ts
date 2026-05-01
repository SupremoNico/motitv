const API_READ_ACCESS_TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN as string;

const BASE_URL = 'https://api.themoviedb.org/3';

/* =========================
   FETCH WRAPPER
========================= */

async function tmdbFetch<T>(url: string, params?: Record<string, string | number>): Promise<T> {
	const query = params
		? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
		: '';

	const res = await fetch(`${BASE_URL}${url}${query}`, {
		headers: {
			Authorization: `Bearer ${API_READ_ACCESS_TOKEN}`,
			accept: 'application/json'
		}
	});

	if (!res.ok) {
		throw new Error(`TMDB request failed: ${res.status} ${res.statusText}`);
	}

	return (await res.json()) as T;
}

/* =========================
   TYPES
========================= */

export type Movie = {
	id: number;
	title: string;
	overview: string;
	poster_path: string;
	backdrop_path: string;
	vote_average: number;
	release_date: string;
	genre_ids: number[];
};

export type TVSeries = {
	id: number;
	name: string;
	overview: string;
	poster_path: string;
	backdrop_path: string;
	vote_average: number;
	first_air_date: string;
	genre_ids: number[];
};

/* =========================
   GENERIC RESPONSE
========================= */

export type TMDBResponse<T> = {
	page: number;
	results: T[];
	total_pages: number;
	total_results: number;
};

export type Genre = {
	id: number;
	name: string;
};

/* =========================
   MOVIE DETAILS
========================= */

export type MovieDetails = {
	id: number;
	title: string;
	overview: string;
	backdrop_path: string;
	release_date: string;
	vote_average: number;
	vote_count: number;
	runtime: number;
	genres?: Genre[];
};

/* =========================
   SERIES DETAILS (NEW)
========================= */

export type SeriesDetails = {
	id: number;
	name: string;
	overview: string;
	backdrop_path: string;
	poster_path: string;
	first_air_date: string;
	vote_average: number;
	vote_count: number;

	number_of_seasons: number;
	number_of_episodes: number;

	episode_run_time: number[];

	genres?: Genre[];

	seasons: {
		id: number;
		name: string;
		season_number: number;
		episode_count: number;
		poster_path: string | null;
	}[];
};

/* =========================
   VIDEOS
========================= */

export type Video = {
	id: string;
	key: string;
	site: 'YouTube' | 'Vimeo';
	type: string;
	name: string;
};

export type MovieVideosResponse = {
	results: Video[];
};

export type TVVideosResponse = {
	results: Video[];
};

/* =========================
   CREDITS
========================= */

export type CastMember = {
	id: number;
	name: string;
	character: string;
	profile_path: string | null;
};

export type CrewMember = {
	id: number;
	name: string;
	job: string;
	department: string;
	profile_path: string | null;
};

export type MovieCredits = {
	cast: CastMember[];
	crew: CrewMember[];
};

export type TVCredits = MovieCredits;

/* =========================
   GENRES CACHE
========================= */

let genresCache: Genre[] | null = null;
let genresPromise: Promise<Genre[]> | null = null;

export async function getGenres(): Promise<Genre[]> {
	if (genresCache) return genresCache;

	const data = await tmdbFetch<{ genres: Genre[] }>('/genre/movie/list');
	genresCache = data.genres;

	return genresCache;
}

export async function loadGenresCached(): Promise<Genre[]> {
	if (genresCache) return genresCache;

	if (!genresPromise) {
		genresPromise = getGenres().then((data) => {
			genresCache = data;
			return data;
		});
	}

	return genresPromise;
}

export function clearGenresCache() {
	genresCache = null;
	genresPromise = null;
}

/* =========================
   MOVIES
========================= */

export function getAllMovies(page = 1) {
	return tmdbFetch<TMDBResponse<Movie>>('/discover/movie', { page });
}

export function getPopularMovies(page = 1) {
	return tmdbFetch<TMDBResponse<Movie>>('/movie/popular', { page });
}

export function getTopRatedMovies(page = 1) {
	return tmdbFetch<TMDBResponse<Movie>>('/movie/top_rated', { page });
}

export function getUpcomingMovies(page = 1) {
	return tmdbFetch<TMDBResponse<Movie>>('/movie/upcoming', { page });
}

export function getNowPlayingMovies(page = 1) {
	return tmdbFetch<TMDBResponse<Movie>>('/movie/now_playing', { page });
}

export function getTrendingMovies(timeWindow: 'day' | 'week' = 'day') {
	return tmdbFetch<TMDBResponse<Movie>>(`/trending/movie/${timeWindow}`);
}

/* =========================
   TV SERIES
========================= */

export function getAllSeries(page = 1) {
	return tmdbFetch<TMDBResponse<TVSeries>>('/discover/tv', { page });
}

export function getTrendingTV(timeWindow: 'day' | 'week' = 'day') {
	return tmdbFetch<TMDBResponse<TVSeries>>(`/trending/tv/${timeWindow}`);
}

export function getPopularTV(page = 1) {
	return tmdbFetch<TMDBResponse<TVSeries>>('/tv/popular', { page });
}

export async function getSeasonDetails(tvId: string, seasonNumber: number) {
	return tmdbFetch<{
		id: string;
		name: string;
		episodes: {
			id: number;
			episode_number: number;
			name: string;
			overview: string;
		}[];
	}>(`/tv/${tvId}/season/${seasonNumber}`);
}

/* =========================
   MOVIE DETAILS
========================= */

export function getMovieDetails(id: string) {
	return tmdbFetch<MovieDetails>(`/movie/${id}`);
}

export function getMovieVideos(id: string) {
	return tmdbFetch<MovieVideosResponse>(`/movie/${id}/videos`);
}

export function getMovieCredits(id: string) {
	return tmdbFetch<MovieCredits>(`/movie/${id}/credits`);
}

/* =========================
   SERIES DETAILS (NEW)
========================= */

export function getSeriesDetails(id: string) {
	return tmdbFetch<SeriesDetails>(`/tv/${id}`);
}

export function getSeriesCredits(id: string) {
	return tmdbFetch<TVCredits>(`/tv/${id}/credits`);
}

export function getSeriesVideos(id: string) {
	return tmdbFetch<TVVideosResponse>(`/tv/${id}/videos`);
}

/* =========================
   HERO MEDIA
========================= */

export type MovieLogo = {
	file_path: string;
	iso_639_1: string | null;
};

export type MovieImages = {
	logos: MovieLogo[];
	backdrops: { file_path: string }[];
};

export type HeroMedia = {
	logo: string | null;
	backdrop: string | null;
};

export async function getHeroMedia(movieId: number): Promise<HeroMedia> {
	try {
		const images = await tmdbFetch<MovieImages>(`/movie/${movieId}/images`);

		const logos = images.logos ?? [];

		const selectedLogo =
			logos.find((l) => l.iso_639_1 === 'en') ||
			logos.find((l) => l.iso_639_1 === null) ||
			logos[0];

		return {
			logo: selectedLogo?.file_path
				? `https://image.tmdb.org/t/p/w500${selectedLogo.file_path}`
				: null,
			backdrop: images.backdrops?.[0]?.file_path
				? `https://image.tmdb.org/t/p/original${images.backdrops[0].file_path}`
				: null
		};
	} catch {
		return {
			logo: null,
			backdrop: null
		};
	}
}

/* =========================
   FEATURED HERO
========================= */

export async function getFeaturedMovies(): Promise<Movie[]> {
	const trending = await getTrendingMovies('week');

	return trending.results.filter((m) => m.backdrop_path && m.overview).slice(0, 8);
}
