<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';

	let searchQuery = $state('');

	const pathname = $derived($page.url.pathname);
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
		<nav class="hidden items-center gap-7 text-sm text-white/60 md:flex">
			<!-- HOME -->
			<a
				href={resolve('/')}
				class={`group flex items-center gap-2 rounded-full px-3 py-1.5 transition
				${
					pathname === '/'
						? 'border border-white/20 bg-white/10 text-white backdrop-blur-md'
						: 'text-white/60 hover:bg-white/5 hover:text-white'
				}`}
			>
				<svg
					class={`h-4 w-4 transition ${pathname === '/' ? 'scale-110 opacity-100' : 'opacity-70'}`}
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					viewBox="0 0 24 24"
				>
					<path d="M4 10.5L12 3l8 7.5V21a1 1 0 0 1-1 1h-5v-7H10v7H5a1 1 0 0 1-1-1v-10.5z" />
				</svg>
				Home
			</a>

			<!-- MOVIES -->
			<a
				href={resolve('/movies')}
				class={`group flex items-center gap-2 rounded-full px-3 py-1.5 transition
				${
					pathname.startsWith('/movies')
						? 'border border-white/20 bg-white/10 text-white backdrop-blur-md'
						: 'text-white/60 hover:bg-white/5 hover:text-white'
				}`}
			>
				<svg
					class={`h-4 w-4 transition ${
						pathname.startsWith('/movies')
							? 'scale-110 opacity-100'
							: 'opacity-70 group-hover:opacity-100'
					}`}
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					viewBox="0 0 24 24"
				>
					<rect x="3" y="5" width="18" height="14" rx="2" />
					<path d="M10 9l5 3-5 3V9z" />
				</svg>
				Movies
			</a>

			<!-- SERIES -->
			<a
				href={resolve('/series')}
				class={`group flex items-center gap-2 rounded-full px-3 py-1.5 transition
				${
					pathname.startsWith('/series')
						? 'border border-white/20 bg-white/10 text-white backdrop-blur-md'
						: 'text-white/60 hover:bg-white/5 hover:text-white'
				}`}
			>
				<svg
					class={`h-4 w-4 transition ${
						pathname.startsWith('/series')
							? 'scale-110 opacity-100'
							: 'opacity-70 group-hover:opacity-100'
					}`}
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					viewBox="0 0 24 24"
				>
					<path d="M7 4h10a2 2 0 0 1 2 2v12H5V6a2 2 0 0 1 2-2z" />
					<path d="M9 8h6" />
				</svg>
				Series
			</a>
		</nav>

		<!-- SEARCH -->
		<div class="flex items-center">
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

				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search for movies, series..."
					class="w-56 rounded-full border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white placeholder-white/40 backdrop-blur-md transition outline-none focus:border-white/30 focus:bg-white/10 md:w-64"
				/>
			</div>
		</div>
	</div>
</header>
