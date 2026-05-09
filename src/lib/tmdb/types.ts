// src/lib/types/tmdb.ts
export type Genre = {
	id: number;
	name: string;
};

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

export type Video = {
	id: string;
	key: string;
	site: 'YouTube' | 'Vimeo';
	type: string;
	name: string;
};

export type TMDBResponse<T> = {
	page: number;
	results: T[];
	total_pages: number;
	total_results: number;
};

export type MultiSearchItem = {
	id: number;
	media_type: 'movie' | 'tv' | 'person';

	overview: string;
	poster_path: string | null;
	backdrop_path: string | null;
	vote_average: number;

	title?: string;
	name?: string;
	release_date?: string;
	first_air_date?: string;
};

export type SearchResult = {
	id: number;
	type: 'movie' | 'tv';
	title: string;
	date: string;
	poster: string | null;
	backdrop: string | null;
	rating: number;
	overview: string;
};

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

export type MovieVideosResponse = {
	results: Video[];
};

export type TVVideosResponse = {
	results: Video[];
};

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