import { anilistFetch } from './client';
import type { AniListPage, AniListPageResponse } from './types';

export async function getTrendingAnime(page = 1): Promise<AniListPage> {
	const query = `
	query ($page: Int) {
	  Page(page: $page, perPage: 20) {
	    pageInfo {
	      hasNextPage
	      currentPage
	    }
	    media(type: ANIME, sort: TRENDING_DESC) {
	      id
	      title {
	        romaji
	        english
	        native
	      }
	      coverImage {
	        large
	        medium
	      }
	      averageScore
	      episodes
	      genres
	    }
	  }
	}
	`;

	const res = await anilistFetch<AniListPageResponse>(query, { page });

	// ✅ safely return ONLY the Page (matches AniListPage type)
	return res.Page;
}