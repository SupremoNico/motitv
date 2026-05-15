<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { searchMulti, normalizeMultiSearch, type SearchResult } from '$lib/tmdb';

	const isActive = (path: string) => page.url.pathname === path;

	// =========================
	// STATE
	// =========================
	let searchQuery = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let showDropdown = $state(false);
	let loading = $state(false);

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let controller: AbortController | null = null;

	let requestId = 0;
	let ignoreBlur = false;

	// =========================
	// SEARCH INPUT
	// =========================
	function handleSearchInput(value: string) {
		searchQuery = value;

		const q = value.trim();

		if (debounceTimer) clearTimeout(debounceTimer);

		if (!q) {
			searchResults = [];
			showDropdown = false;
			loading = false;
			controller?.abort();
			return;
		}

		showDropdown = true;

		if (q.length < 2) {
			searchResults = [];
			return;
		}

		debounceTimer = setTimeout(() => runSearch(q), 300);
	}

	// =========================
	// SEARCH CORE
	// =========================
	async function runSearch(q: string) {
		const currentId = ++requestId;

		controller?.abort();
		controller = new AbortController();

		try {
			loading = true;

			const data = await searchMulti(q, 1, {
				signal: controller.signal
			});

			if (currentId !== requestId) return;

			searchResults = normalizeMultiSearch(data.results).slice(0, 6);
			showDropdown = true;
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			console.error(err);
		} finally {
			if (currentId === requestId) {
				loading = false;
			}
		}
	}

	// =========================
	// NAVIGATION
	// =========================
	function handleSelect(item: SearchResult) {
		showDropdown = false;
		searchQuery = '';

		goto(resolve(item.type === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`));
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key !== 'Enter') return;

		const q = searchQuery.trim();
		if (!q) return;

		if (debounceTimer) clearTimeout(debounceTimer);
		if (controller) controller.abort();

		showDropdown = false;

		goto(resolve(`/search?q=${encodeURIComponent(q)}`));
	}

	// =========================
	// OUTSIDE / BLUR FIXED
	// =========================
	function closeDropdown() {
		// prevents instant close when clicking inside dropdown
		ignoreBlur = true;

		setTimeout(() => {
			if (!ignoreBlur) {
				showDropdown = false;
			}
			ignoreBlur = false;
		}, 150);
	}
</script>

<header class="fixed top-4 left-1/2 z-50 w-[92%] -translate-x-1/2">
	<div
		class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-6 py-3 shadow-lg backdrop-blur-xl"
	>
		<!-- BRAND -->
		<a href={resolve('/')} class="flex h-0 items-center text-white/90">
			<img
				src="/logo.png"
				alt="MOTITV logo"
				class="h-45 w-45 -translate-y-1.5 cursor-pointer object-contain"
			/>
		</a>

		<!-- NAV -->
		<nav class="hidden items-center gap-7 text-sm md:flex">
			<a
				href={resolve('/')}
				class={`relative text-white/60 transition-colors duration-200 after:absolute
	after:-bottom-1 after:left-0 after:h-0.5 after:w-full
	after:origin-left after:scale-x-0 after:bg-white
	after:transition-transform after:duration-300
	after:content-[''] hover:text-white
	hover:after:scale-x-100
	${isActive('/') ? 'text-white after:scale-x-100' : ''}
`}
			>
				Home
			</a>

			<a
				href={resolve('/movies')}
				class={`relative text-white/60 transition-colors duration-200 after:absolute
	after:-bottom-1 after:left-0 after:h-0.5 after:w-full
	after:origin-left after:scale-x-0 after:bg-white
	after:transition-transform after:duration-300
	after:content-[''] hover:text-white
	hover:after:scale-x-100
	${isActive('/movies') ? 'text-white after:scale-x-100' : ''}
`}
			>
				Movies
			</a>

			<a
				href={resolve('/series')}
				class={`relative text-white/60 transition-colors duration-200 after:absolute
	after:-bottom-1 after:left-0 after:h-0.5 after:w-full
	after:origin-left after:scale-x-0 after:bg-white
	after:transition-transform after:duration-300
	after:content-[''] hover:text-white
	hover:after:scale-x-100
	${isActive('/series') ? 'text-white after:scale-x-100' : ''}
`}
			>
				Series
			</a>

			<!-- ADDED: ANIME -->
			<a
				href={resolve('/anime')}
				class={`relative text-white/60 transition-colors duration-200 after:absolute
	after:-bottom-1 after:left-0 after:h-0.5 after:w-full
	after:origin-left after:scale-x-0 after:bg-white
	after:transition-transform after:duration-300
	after:content-[''] hover:text-white
	hover:after:scale-x-100
	${isActive('/anime') ? 'text-white after:scale-x-100' : ''}
`}
			>
				Anime
			</a>
		</nav>

		<!-- SEARCH -->
		<div class="relative flex items-center">
			<div class="relative">
				<svg
					class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/50"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					viewBox="0 0 24 24"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="M20 20l-3-3" />
				</svg>

				<!-- INPUT -->
				<input
					type="text"
					value={searchQuery}
					oninput={(e) => handleSearchInput((e.target as HTMLInputElement).value)}
					onkeydown={handleKeyDown}
					onfocus={() => searchResults.length && (showDropdown = true)}
					onblur={closeDropdown}
					placeholder="Search movies, series..."
					class="w-56 rounded-full border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white placeholder-white/40 backdrop-blur-md outline-none focus:border-white/30 focus:bg-white/10 md:w-64"
				/>

				<!-- DROPDOWN -->
				{#if showDropdown}
					<div
						class="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-3xl border border-white/5 bg-black/70 shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
					>
						{#if loading}
							<div class="px-4 py-4 text-sm text-white/60">Searching...</div>
						{:else if searchResults.length === 0}
							<div class="px-4 py-4 text-sm text-white/60">No results found</div>
						{:else}
							{#each searchResults as item (item.id)}
								<button
									type="button"
									onclick={() => handleSelect(item)}
									class="flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left hover:bg-white/5"
								>
									<img
										src={item.poster
											? `https://image.tmdb.org/t/p/w92${item.poster}`
											: '/placeholder.jpg'}
										alt={item.title}
										class="h-14 w-10 rounded-lg border border-white/10 object-cover"
									/>

									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-semibold text-white/90">
											{item.title}
										</p>

										<div class="mt-1 flex items-center gap-2 text-xs text-white/40">
											<span class="uppercase">{item.type}</span>
											<span>•</span>
											<span>{item.date?.slice(0, 4) || 'N/A'}</span>
										</div>
									</div>
								</button>
							{/each}

							<button
								type="button"
								onclick={() => goto(resolve(`/search?q=${encodeURIComponent(searchQuery.trim())}`))}
								class="w-full bg-white/5 px-4 py-3 text-center text-sm text-white/70 hover:bg-white/10 hover:text-white"
							>
								View all results
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>
