// src/lib/tmdb/api.ts

import type {
	Genre,
	Movie,
	TVSeries,
	MovieDetails,
	SeriesDetails,
	TMDBResponse,
	MovieVideosResponse,
	TVVideosResponse,
	MovieCredits,
	TVCredits,
	MovieImages,
	HeroMedia,
	MultiSearchItem,
	SearchResult
} from './types';

import { tmdbFetch } from './client';

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
   SERIES DETAILS
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
   SEARCH
========================= */

export function searchMulti(
	query: string,
	page: number = 1,
	options?: { signal?: AbortSignal }
) {
	return tmdbFetch<TMDBResponse<MultiSearchItem>>(
		'/search/multi',
		{
			query,
			page,
		},
		options
	);
}

export function normalizeMultiSearch(items: MultiSearchItem[]): SearchResult[] {
	return items
		.filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
		.map((item) => ({
			id: item.id,

			type: item.media_type as 'movie' | 'tv',

			title: item.title || item.name || 'Untitled',

			date: item.release_date || item.first_air_date || '',

			poster: item.poster_path,

			backdrop: item.backdrop_path,

			rating: item.vote_average,

			overview: item.overview
		}));
}

/* =========================
   HERO MEDIA
========================= */

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
