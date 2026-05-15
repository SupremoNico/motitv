export async function anilistFetch<T>(
	query: string,
	variables: Record<string, unknown> = {}
): Promise<T> {
	const res = await fetch('https://graphql.anilist.co', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify({
			query,
			variables
		})
	});

	if (!res.ok) {
		throw new Error(`AniList request failed: ${res.status}`);
	}

	const json: unknown = await res.json();

	// safe runtime extraction (no any)
	if (
		typeof json === 'object' &&
		json !== null &&
		'data' in json &&
		(json as { data?: unknown }).data
	) {
		return (json as { data: T }).data;
	}

	throw new Error('Invalid AniList response');
}