const API_READ_ACCESS_TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN as string;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function tmdbFetch<T>(
	path: string,
	params: Record<string, string | number> = {},
	options?: { signal?: AbortSignal }
): Promise<T> {
	const url = new URL(BASE_URL + path);

	// build query safely
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			url.searchParams.set(key, String(value));
		}
	});

	const res = await fetch(url.toString(), {
		method: 'GET',
		signal: options?.signal,
		headers: {
			Authorization: `Bearer ${API_READ_ACCESS_TOKEN}`,
			'Content-Type': 'application/json'
		}
	});

	if (!res.ok) {
		throw new Error(`TMDB error ${res.status}`);
	}

	return res.json();
}