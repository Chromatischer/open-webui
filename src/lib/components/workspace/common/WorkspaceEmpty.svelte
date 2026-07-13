<script lang="ts">
	/*
	 * The empty catalogue page — a blank folio, not an apology.
	 * A pale printer's mark watermarks the paper, the headline rises
	 * word by word, and a single inviting line waits to be set.
	 */
	export let mark = '⁂'; // a large typographic watermark, one glyph
	export let kicker = '';
	export let line = '';
	export let sub = '';
	export let beginLabel = '';
	export let importLabel = '';
	export let onBegin: () => void = () => {};
	export let onImport: (() => void) | null = null;
</script>

<div class="wse">
	<span class="wse-mark" aria-hidden="true">{mark}</span>

	{#if kicker}
		<span class="wse-kicker reveal" style:--d="0s">{kicker}</span>
	{/if}

	<h2 class="wse-line" aria-label={line}>
		{#each line.split(' ') as w, i}
			<span class="w" style:animation-delay="{0.12 + i * 0.085}s">{w}&nbsp;</span>
		{/each}
	</h2>

	{#if sub}
		<p class="wse-sub reveal" style:--d="0.55s">{sub}</p>
	{/if}

	<div class="wse-rule reveal" style:--d="0.7s" aria-hidden="true"></div>

	<div class="wse-actions reveal" style:--d="0.85s">
		<button class="wse-begin" on:click={onBegin}>
			<svg
				width="13"
				height="13"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" /></svg
			>
			{beginLabel}
		</button>
		{#if onImport && importLabel}
			<button class="wse-import" on:click={onImport}>{importLabel}</button>
		{/if}
	</div>
</div>

<style>
	.wse {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 11vh 20px 13vh;
		overflow: hidden;
	}

	/* the watermark: pressed into the paper, not printed on it */
	.wse-mark {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -54%) rotate(-6deg);
		font-family: var(--serif);
		font-size: clamp(220px, 38vw, 360px);
		line-height: 1;
		color: var(--ink);
		opacity: 0.04;
		pointer-events: none;
		user-select: none;
		animation: markSettle 1.6s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	@keyframes markSettle {
		from {
			opacity: 0;
			transform: translate(-50%, -54%) rotate(-6deg) scale(1.06);
		}
		to {
			opacity: 0.04;
			transform: translate(-50%, -54%) rotate(-6deg) scale(1);
		}
	}

	.wse-kicker {
		font-size: 12px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--vermilion);
		margin-bottom: 18px;
	}

	.wse-line {
		font-family: var(--serif);
		font-size: clamp(30px, 5vw, 46px);
		font-weight: 400;
		line-height: 1.16;
		margin: 0;
		max-width: 640px;
	}
	.wse-line .w {
		display: inline-block;
		opacity: 0;
		transform: translateY(14px) rotate(0.4deg);
		animation: wseWordUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
	@keyframes wseWordUp {
		to {
			opacity: 1;
			transform: translateY(0) rotate(0);
		}
	}

	.wse-sub {
		font-family: var(--serif);
		font-style: italic;
		font-size: 16px;
		line-height: 1.6;
		color: var(--ink-2);
		max-width: 480px;
		margin: 16px 0 0;
	}

	/* a blank writing line, the ink shimmer inviting a first stroke */
	.wse-rule {
		position: relative;
		width: min(300px, 60vw);
		height: 1.5px;
		margin-top: 40px;
		background: var(--rule);
		border-radius: 999px;
		overflow: hidden;
	}
	.wse-rule::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 38%;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--vermilion) 50%, transparent),
			transparent
		);
		transform: translateX(-110%);
		animation: wseInkSweep 4.6s ease-in-out infinite;
	}
	@keyframes wseInkSweep {
		0% {
			transform: translateX(-110%);
		}
		60%,
		100% {
			transform: translateX(380%);
		}
	}

	.wse-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		margin-top: 34px;
	}
	.wse-begin {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 11px 22px;
		border-radius: 999px;
		border: 1px dashed var(--rule);
		background: transparent;
		color: var(--ink-2);
		font-family: var(--serif);
		font-style: italic;
		font-size: 16px;
		cursor: pointer;
		transition:
			border-color 0.25s,
			color 0.25s,
			background 0.25s,
			transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.3s;
	}
	.wse-begin:hover {
		border-color: var(--vermilion);
		color: var(--vermilion);
		background: var(--vermilion-soft);
		transform: translateY(-2px);
		box-shadow: 0 10px 28px -16px color-mix(in srgb, var(--vermilion) 55%, transparent);
	}
	.wse-begin:active {
		transform: scale(0.96);
	}
	.wse-begin svg {
		transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.wse-begin:hover svg {
		transform: rotate(90deg);
	}

	.wse-import {
		border: none;
		background: none;
		padding: 0;
		font-family: var(--mono);
		font-size: 13px;
		color: var(--ink-3);
		cursor: pointer;
		border-bottom: 1px dotted var(--rule);
		transition: color 0.2s;
	}
	.wse-import:hover {
		color: var(--vermilion);
	}

	.reveal {
		opacity: 0;
		transform: translateY(10px);
		animation: wseRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		animation-delay: var(--d, 0s);
	}
	@keyframes wseRise {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.wse *,
		.wse *::before {
			animation-duration: 0.01ms !important;
			animation-delay: 0s !important;
		}
	}
</style>
