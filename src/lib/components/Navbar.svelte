<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { Search, House, Clapperboard, Tv, ArrowRight, Menu, X } from 'lucide-svelte';

	import { searchMulti, normalizeMultiSearch, type SearchResult } from '$lib/tmdb';

	// ================================================================
	// NAVIGATION
	// ================================================================

	const isActive = (path: string) => {
		return page.url.pathname === path;
	};

	// ================================================================
	// NAVBAR
	// ================================================================

	let navbarElement = $state<HTMLElement | null>(null);

	// ================================================================
	// SEARCH STATE
	// ================================================================

	let searchQuery = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let showDropdown = $state(false);
	let loading = $state(false);

	// ================================================================
	// MOBILE MENU
	// ================================================================

	let mobileMenuOpen = $state(false);

	// ================================================================
	// SEARCH REQUEST STATE
	// ================================================================

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let controller: AbortController | null = null;
	let requestId = 0;

	// ================================================================
	// SEARCH INPUT
	// ================================================================

	function handleSearchInput(value: string) {
		searchQuery = value;

		const q = value.trim();

		// Clear previous debounce
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}

		// Empty search
		if (!q) {
			searchResults = [];
			showDropdown = false;
			loading = false;

			controller?.abort();
			controller = null;

			return;
		}

		// Show dropdown immediately
		showDropdown = true;

		// Don't search until at least 2 characters
		if (q.length < 2) {
			searchResults = [];
			loading = false;

			controller?.abort();
			controller = null;

			return;
		}

		// Debounce search
		debounceTimer = setTimeout(() => {
			runSearch(q);
		}, 300);
	}

	// ================================================================
	// SEARCH REQUEST
	// ================================================================

	async function runSearch(q: string) {
		const currentId = ++requestId;

		// Cancel previous request
		controller?.abort();

		controller = new AbortController();

		try {
			loading = true;

			const data = await searchMulti(q, 1, {
				signal: controller.signal
			});

			// Ignore stale request
			if (currentId !== requestId) {
				return;
			}

			searchResults = normalizeMultiSearch(data.results).slice(0, 6);

			showDropdown = true;
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				return;
			}

			console.error('Search error:', err);

			searchResults = [];
		} finally {
			if (currentId === requestId) {
				loading = false;
			}
		}
	}

	// ================================================================
	// SELECT SEARCH RESULT
	// ================================================================

	function handleSelect(item: SearchResult) {
		showDropdown = false;
		mobileMenuOpen = false;
		searchQuery = '';

		if (item.type === 'movie') {
			goto(resolve(`/movie/${item.id}`));
		} else {
			goto(resolve(`/series/${item.id}`));
		}
	}

	// ================================================================
	// SEARCH KEYBOARD
	// ================================================================

	function handleKeyDown(event: KeyboardEvent) {
		// Escape
		if (event.key === 'Escape') {
			showDropdown = false;
			return;
		}

		// Only handle Enter
		if (event.key !== 'Enter') {
			return;
		}

		const q = searchQuery.trim();

		if (!q) {
			return;
		}

		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}

		controller?.abort();

		showDropdown = false;
		mobileMenuOpen = false;

		goto(resolve(`/search?q=${encodeURIComponent(q)}`));
	}

	// ================================================================
	// VIEW ALL SEARCH RESULTS
	// ================================================================

	function viewAllResults() {
		const q = searchQuery.trim();

		if (!q) {
			return;
		}

		showDropdown = false;
		mobileMenuOpen = false;

		goto(resolve(`/search?q=${encodeURIComponent(q)}`));
	}

	// ================================================================
	// MOBILE MENU
	// ================================================================

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;

		// Close search dropdown when opening/closing menu
		showDropdown = false;
	}

	// ================================================================
	// MOBILE NAVIGATION
	// ================================================================

	function navigateTo(path: '/' | '/movies' | '/series') {
		mobileMenuOpen = false;
		showDropdown = false;

		goto(resolve(path));
	}

	// ================================================================
	// CLOSE EVERYTHING
	// ================================================================

	function closeMenus() {
		showDropdown = false;
		mobileMenuOpen = false;
	}

	// ================================================================
	// GLOBAL OUTSIDE CLICK
	// ================================================================

	function handleWindowClick(event: MouseEvent) {
		const target = event.target;

		if (!(target instanceof Node)) {
			return;
		}

		// Click happened inside navbar
		if (navbarElement?.contains(target)) {
			return;
		}

		// Click happened outside navbar
		closeMenus();
	}
</script>

<!-- ================================================================
     GLOBAL OUTSIDE CLICK
================================================================ -->

<svelte:window onclick={handleWindowClick} />

<!-- ================================================================
     NAVBAR
================================================================ -->

<header bind:this={navbarElement} class="fixed top-4 left-1/2 z-9999 w-[92%] -translate-x-1/2">
	<div
		class="relative flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-xl sm:px-6"
	>
		<!-- ============================================================
             LOGO
        ============================================================= -->

		<a
			href={resolve('/')}
			aria-label="MOTITV Home"
			onclick={() => {
				mobileMenuOpen = false;
				showDropdown = false;
			}}
			class="flex h-0 cursor-pointer items-center"
		>
			<img
				src="/logo.png"
				alt="MOTITV logo"
				class="pointer-events-none h-45 w-45 -translate-y-1.5 object-contain"
			/>
		</a>

		<!-- ============================================================
             DESKTOP NAVIGATION
        ============================================================= -->

		<nav class="hidden items-center gap-10 text-sm md:flex" aria-label="Main navigation">
			<!-- HOME -->

			<a
				href={resolve('/')}
				class={`group relative flex items-center gap-2 py-2 text-white/60 transition-colors duration-200
                    after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full
                    after:origin-left after:scale-x-0 after:bg-white
                    after:transition-transform after:duration-300
                    after:content-['']
                    hover:text-white hover:after:scale-x-100
                    ${isActive('/') ? 'text-white after:scale-x-100' : ''}`}
			>
				<House
					size={16}
					strokeWidth={1.8}
					class="transition-transform duration-200 group-hover:scale-110"
				/>

				<span>Home</span>
			</a>

			<!-- MOVIES -->

			<a
				href={resolve('/movies')}
				class={`group relative flex items-center gap-2 py-2 text-white/60 transition-colors duration-200
                    after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full
                    after:origin-left after:scale-x-0 after:bg-white
                    after:transition-transform after:duration-300
                    after:content-['']
                    hover:text-white hover:after:scale-x-100
                    ${isActive('/movies') ? 'text-white after:scale-x-100' : ''}`}
			>
				<Clapperboard
					size={16}
					strokeWidth={1.8}
					class="transition-transform duration-200 group-hover:scale-110"
				/>

				<span>Movies</span>
			</a>

			<!-- SERIES -->

			<a
				href={resolve('/series')}
				class={`group relative flex items-center gap-2 py-2 text-white/60 transition-colors duration-200
                    after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full
                    after:origin-left after:scale-x-0 after:bg-white
                    after:transition-transform after:duration-300
                    after:content-['']
                    hover:text-white hover:after:scale-x-100
                    ${isActive('/series') ? 'text-white after:scale-x-100' : ''}`}
			>
				<Tv
					size={16}
					strokeWidth={1.8}
					class="transition-transform duration-200 group-hover:scale-110"
				/>

				<span>Series</span>
			</a>
		</nav>

		<!-- ============================================================
             RIGHT SIDE
        ============================================================= -->

		<div class="flex items-center gap-2">
			<!-- ========================================================
                 DESKTOP SEARCH
            ========================================================= -->

			<div class="relative hidden md:block">
				<div class="relative">
					<Search
						size={16}
						strokeWidth={1.8}
						class="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-white/50"
					/>

					<input
						type="text"
						value={searchQuery}
						oninput={(event) => handleSearchInput((event.target as HTMLInputElement).value)}
						onkeydown={handleKeyDown}
						onfocus={() => {
							if (searchResults.length > 0) {
								showDropdown = true;
							}
						}}
						placeholder="Search movies, series..."
						autocomplete="off"
						class="h-10 w-56 rounded-full border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-xs text-white placeholder-white/40 backdrop-blur-md transition-all duration-200 outline-none focus:border-white/30 focus:bg-white/10 md:w-64 md:text-sm"
					/>

					<!-- ====================================================
                         DESKTOP SEARCH DROPDOWN
                    ===================================================== -->

					{#if showDropdown}
						<div
							class="absolute top-full right-0 z-100 mt-2 w-80 overflow-hidden rounded-3xl border border-white/10 bg-black/95 shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
						>
							{#if loading}
								<div class="flex items-center gap-2 px-4 py-4 text-sm text-white/60">
									<Search size={15} class="animate-pulse" />

									<span>Searching...</span>
								</div>
							{:else if searchResults.length === 0}
								<div class="px-4 py-4 text-sm text-white/60">No results found</div>
							{:else}
								{#each searchResults as item (`${item.type}-${item.id}`)}
									<button
										type="button"
										onclick={() => handleSelect(item)}
										class="group flex w-full cursor-pointer items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors hover:bg-white/5"
									>
										<img
											src={item.poster
												? `https://image.tmdb.org/t/p/w92${item.poster}`
												: '/placeholder.jpg'}
											alt={item.title}
											class="h-14 w-10 shrink-0 rounded-lg border border-white/10 object-cover"
										/>

										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-semibold text-white/90">
												{item.title}
											</p>

											<div class="mt-1 flex items-center gap-2 text-xs text-white/40">
												<span class="uppercase">
													{item.type}
												</span>

												<span>•</span>

												<span>
													{item.date?.slice(0, 4) || 'N/A'}
												</span>
											</div>
										</div>

										<ArrowRight
											size={15}
											strokeWidth={1.8}
											class="shrink-0 text-white/20 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/60 group-hover:opacity-100"
										/>
									</button>
								{/each}

								<!-- VIEW ALL -->

								<button
									type="button"
									onclick={viewAllResults}
									class="group flex w-full cursor-pointer items-center justify-center gap-2 bg-white/5 px-4 py-3 text-center text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
								>
									<span>View all results</span>

									<ArrowRight
										size={15}
										strokeWidth={1.8}
										class="transition-transform duration-200 group-hover:translate-x-1"
									/>
								</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- ========================================================
                 MOBILE MENU BUTTON
            ========================================================= -->

			<button
				type="button"
				aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
				aria-expanded={mobileMenuOpen}
				onclick={(event) => {
					event.stopPropagation();
					toggleMobileMenu();
				}}
				class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95 md:hidden"
			>
				{#if mobileMenuOpen}
					<X size={20} strokeWidth={1.8} />
				{:else}
					<Menu size={20} strokeWidth={1.8} />
				{/if}
			</button>
		</div>

		<!-- ============================================================
             MOBILE MENU
        ============================================================= -->

		{#if mobileMenuOpen}
			<div
				class="absolute top-[calc(100%+8px)] right-0 left-0 z-90 rounded-2xl border border-white/10 bg-black/95 p-3 shadow-[0_25px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl md:hidden"
			>
				<!-- ====================================================
                     MOBILE SEARCH
                ===================================================== -->

				<div class="relative mb-3">
					<Search
						size={16}
						strokeWidth={1.8}
						class="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-white/50"
					/>

					<input
						type="text"
						value={searchQuery}
						oninput={(event) => handleSearchInput((event.target as HTMLInputElement).value)}
						onkeydown={handleKeyDown}
						onfocus={() => {
							if (searchResults.length > 0) {
								showDropdown = true;
							}
						}}
						placeholder="Search movies, series..."
						autocomplete="off"
						class="h-11 w-full rounded-full border border-white/10 bg-white/5 py-2 pr-4 pl-9 text-sm text-white placeholder-white/40 transition-all duration-200 outline-none focus:border-white/30 focus:bg-white/10"
					/>

					<!-- ====================================================
                         MOBILE SEARCH DROPDOWN
                    ===================================================== -->

					{#if showDropdown}
						<div
							class="absolute top-full right-0 left-0 z-100 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/95 shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
						>
							{#if loading}
								<div class="flex items-center gap-2 px-4 py-4 text-sm text-white/60">
									<Search size={15} class="animate-pulse" />

									<span>Searching...</span>
								</div>
							{:else if searchResults.length === 0}
								<div class="px-4 py-4 text-sm text-white/60">No results found</div>
							{:else}
								{#each searchResults as item (`${item.type}-${item.id}`)}
									<button
										type="button"
										onclick={() => handleSelect(item)}
										class="group flex w-full cursor-pointer items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors hover:bg-white/5"
									>
										<img
											src={item.poster
												? `https://image.tmdb.org/t/p/w92${item.poster}`
												: '/placeholder.jpg'}
											alt={item.title}
											class="h-14 w-10 shrink-0 rounded-lg border border-white/10 object-cover"
										/>

										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-semibold text-white/90">
												{item.title}
											</p>

											<div class="mt-1 flex items-center gap-2 text-xs text-white/40">
												<span class="uppercase">
													{item.type}
												</span>

												<span>•</span>

												<span>
													{item.date?.slice(0, 4) || 'N/A'}
												</span>
											</div>
										</div>

										<ArrowRight
											size={15}
											strokeWidth={1.8}
											class="shrink-0 text-white/20 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/60 group-hover:opacity-100"
										/>
									</button>
								{/each}

								<!-- VIEW ALL -->

								<button
									type="button"
									onclick={viewAllResults}
									class="group flex w-full cursor-pointer items-center justify-center gap-2 bg-white/5 px-4 py-3 text-center text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
								>
									<span>View all results</span>

									<ArrowRight
										size={15}
										strokeWidth={1.8}
										class="transition-transform duration-200 group-hover:translate-x-1"
									/>
								</button>
							{/if}
						</div>
					{/if}
				</div>

				<!-- ====================================================
                     MOBILE NAVIGATION
                ===================================================== -->

				<nav class="flex flex-col gap-1" aria-label="Mobile navigation">
					<!-- HOME -->

					<button
						type="button"
						onclick={() => navigateTo('/')}
						class={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition-all duration-200 ${
							isActive('/')
								? 'bg-white/10 text-white'
								: 'text-white/65 hover:bg-white/5 hover:text-white'
						}`}
					>
						<House size={18} strokeWidth={1.8} />

						<span class="flex-1">Home</span>

						{#if isActive('/')}
							<span class="h-1.5 w-1.5 rounded-full bg-white"></span>
						{/if}
					</button>

					<!-- MOVIES -->

					<button
						type="button"
						onclick={() => navigateTo('/movies')}
						class={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition-all duration-200 ${
							isActive('/movies')
								? 'bg-white/10 text-white'
								: 'text-white/65 hover:bg-white/5 hover:text-white'
						}`}
					>
						<Clapperboard size={18} strokeWidth={1.8} />

						<span class="flex-1">Movies</span>

						{#if isActive('/movies')}
							<span class="h-1.5 w-1.5 rounded-full bg-white"></span>
						{/if}
					</button>

					<!-- SERIES -->

					<button
						type="button"
						onclick={() => navigateTo('/series')}
						class={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition-all duration-200 ${
							isActive('/series')
								? 'bg-white/10 text-white'
								: 'text-white/65 hover:bg-white/5 hover:text-white'
						}`}
					>
						<Tv size={18} strokeWidth={1.8} />

						<span class="flex-1">Series</span>

						{#if isActive('/series')}
							<span class="h-1.5 w-1.5 rounded-full bg-white"></span>
						{/if}
					</button>
				</nav>
			</div>
		{/if}
	</div>
</header>
