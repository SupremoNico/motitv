export interface AniListTitle {
	romaji: string;
	english: string | null;
	native: string | null;
}

export interface AniListCoverImage {
	large: string;
	medium: string;
}

export interface AniListAnime {
	id: number;
	title: AniListTitle;
	coverImage: AniListCoverImage;
	averageScore: number | null;
	episodes: number | null;
	genres: string[];
}

export interface AniListPageInfo {
	hasNextPage: boolean;
	currentPage: number;
}

export interface AniListPage {
	pageInfo: AniListPageInfo;
	media: AniListAnime[];
}

export interface AniListPageResponse {
	Page: AniListPage;
}

export type Character = {
	id: number;
	name: string;
	image?: string;
	role?: string;
};

export type Staff = {
	id: number;
	name: string;
	image?: string;
	role?: string;
};
