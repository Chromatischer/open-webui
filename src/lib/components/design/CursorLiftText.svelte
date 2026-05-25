<script>
	let {
		segments = [],
		enabled = true,
		radius = 92,
		lift = 5,
		falloff = 1.6,
		settle = 160
	} = $props();

	let root = $state(null);
	let selecting = $state(false);

	function setLetterLift(char, proximity) {
		const liftY = -lift * Math.pow(proximity, falloff);

		char.style.setProperty('--lift-y', `${liftY.toFixed(2)}px`);
		char.style.setProperty('--lift-alpha', proximity.toFixed(3));
	}

	function liftAroundPoint(clientX, clientY) {
		if (!enabled || !root) return;
		const chars = root.querySelectorAll('.lift-char');
		for (const char of chars) {
			const rect = char.getBoundingClientRect();
			const x = rect.left + rect.width / 2;
			const y = rect.top + rect.height / 2;
			const dist = Math.hypot(clientX - x, clientY - y);
			const proximity = Math.max(0, 1 - dist / radius);
			setLetterLift(char, proximity);
		}
	}

	function resetLetters() {
		if (!root) return;
		for (const char of root.querySelectorAll('.lift-char')) {
			char.style.setProperty('--lift-y', '0px');
			char.style.setProperty('--lift-alpha', '0');
		}
	}

	function onPointerDown(e) {
		if (!enabled) return;
		selecting = true;
		resetLetters();
	}

	function onPointerMove(e) {
		if (selecting) {
			return;
		}

		liftAroundPoint(e.clientX, e.clientY);
	}

	function onPointerUp() {
		if (!selecting) return;
		selecting = false;
		resetLetters();
	}

	function onWindowPointerDown(e) {
		if (!root?.contains(e.target)) {
			selecting = false;
			resetLetters();
		}
	}
</script>

<svelte:window onpointerdown={onWindowPointerDown} onpointerup={onPointerUp} />

<span
	bind:this={root}
	class="cursor-lift-text"
	class:disabled={!enabled}
	class:selecting
	style:--settle-ms={`${settle}ms`}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerleave={resetLetters}
>
	{#each segments as seg}
		{#if seg.marked}
			<mark
				class="text-mark"
				data-mark-id={seg.markId}
				style:--mark-angle={`${seg.markAngle ?? 0}deg`}
				style:--mark-offset={seg.markOffset ?? 0}
				style:--mark-height={seg.markHeight ?? 0.62}
			>
				{#each [...seg.text] as char}
					{#if char === '\n'}
						<br />
					{:else}
						<span class="lift-char">{char === ' ' ? '\u00A0' : char}</span>
					{/if}
				{/each}
			</mark>
		{:else}
			{#each [...seg.text] as char}
				{#if char === '\n'}
					<br />
				{:else}
					<span class="lift-char">{char === ' ' ? '\u00A0' : char}</span>
				{/if}
			{/each}
		{/if}
	{/each}
</span>

<style>
	.cursor-lift-text {
		white-space: pre-wrap;
		cursor: text;
	}

	.lift-char {
		--lift-y: 0px;
		--lift-alpha: 0;
		display: inline-block;
		transform: translateY(var(--lift-y));
		transition:
			transform var(--settle-ms) cubic-bezier(0.16, 1, 0.3, 1),
			text-shadow var(--settle-ms) ease;
		will-change: transform;
		text-shadow: 0 calc(var(--lift-alpha) * 5px) calc(var(--lift-alpha) * 12px)
			color-mix(in srgb, currentColor 16%, transparent);
	}

	.disabled .lift-char {
		transform: translateY(0);
		text-shadow: none;
	}

	.selecting .lift-char {
		transform: translateY(0) !important;
		transition: none;
		text-shadow: none;
		will-change: auto;
	}

	@media (prefers-reduced-motion: reduce) {
		.lift-char {
			transform: none !important;
			transition: none;
			text-shadow: none;
		}
	}
</style>
