<script lang="ts">
	export let name = '';
	export let description = '';
	export let author = '';
	export let href: string | null = null;
	export let writeAccess = true;
	export let readOnlyLabel = 'read only';
	export let onClick: (() => void) | null = null;

	const handleClick = () => {
		if (onClick) onClick();
	};
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	href={href ?? undefined}
	class="card {writeAccess ? '' : 'read-only'}"
	role={href ? undefined : 'button'}
	tabindex={href ? undefined : 0}
	on:click={handleClick}
	on:keydown={(e: KeyboardEvent) => {
		if (!href && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			handleClick();
		}
	}}
>
	<div class="top">
		<div class="avatar-wrap" class:dim={!writeAccess}>
			<slot name="avatar" />
		</div>
		<div class="min-w-0 flex-1">
			<div class="name" title={name}>{name}</div>
			<div class="byline">
				{author}{#if !writeAccess}<span class="ro"> · {readOnlyLabel}</span>{/if}
			</div>
		</div>
		<svg
			class="entry-arrow"
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg
		>
	</div>

	<div class="cdesc">{description}</div>

	<div class="foot">
		<slot name="footer" />
	</div>
</svelte:element>

<style>
	.card {
		display: flex;
		flex-direction: column;
		padding: 16px 16px 13px;
		border: 1px solid var(--rule-faint);
		background: color-mix(in srgb, var(--paper-deep) 22%, transparent);
		border-radius: 14px;
		cursor: pointer;
		text-decoration: none;
		color: var(--text);
		transition:
			transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.25s ease,
			border-color 0.25s ease,
			background 0.25s ease;
	}
	.card:hover {
		border-color: color-mix(in srgb, var(--vermilion) 38%, var(--rule-faint));
		background: color-mix(in srgb, var(--paper-deep) 38%, transparent);
		box-shadow: 0 16px 34px -22px rgba(0, 0, 0, 0.3);
		transform: translateY(-2px);
	}
	.card:hover .avatar-wrap :global(.ws-avatar) {
		filter: none;
	}
	.card:active {
		transform: scale(0.985);
	}
	.card.read-only {
		cursor: default;
		border-style: dashed;
	}
	.card.read-only:hover {
		transform: none;
		box-shadow: none;
		background: color-mix(in srgb, var(--paper-deep) 22%, transparent);
		border-color: var(--rule-faint);
	}

	.top {
		display: flex;
		align-items: center;
		gap: 11px;
		margin-bottom: 10px;
	}
	.avatar-wrap {
		flex: none;
		transition: opacity 0.2s ease;
	}
	.avatar-wrap.dim {
		opacity: 0.55;
	}

	.name {
		font-family: var(--serif);
		font-size: 18.5px;
		font-weight: 400;
		line-height: 1.18;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.byline {
		font-family: var(--mono);
		font-size: 12px;
		color: var(--ink-3);
		margin-top: 3px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ro {
		color: var(--ink-3);
	}

	.entry-arrow {
		flex: none;
		color: var(--vermilion);
		opacity: 0;
		transform: translateX(-4px);
		transition:
			opacity 0.18s ease,
			transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.card:hover .entry-arrow {
		opacity: 1;
		transform: translateX(0);
	}
	.card.read-only .entry-arrow {
		display: none;
	}

	.cdesc {
		font-size: 13px;
		color: var(--ink-2);
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 39px;
	}

	.foot {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 7px;
		margin-top: 12px;
		min-height: 22px;
		border-top: 1px solid var(--rule-faint);
		padding-top: 9px;
	}
</style>
