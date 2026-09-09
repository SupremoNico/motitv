<script lang="ts">
	import './layout.css';
	import icon from '$lib/assets/moti-icon.png';

	let { children } = $props();
</script>

<svelte:head>
	<title>MOTITV</title>

	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

	<meta name="theme-color" content="#000000" />

	<link rel="icon" href={icon} />
	<link rel="apple-touch-icon" href={icon} />
</svelte:head>

<div class="min-h-screen w-full overflow-x-hidden bg-black text-white">
	{@render children()}
</div>
