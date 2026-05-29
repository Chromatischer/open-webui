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
		padding: 14px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		border-radius: 16px;
		cursor: pointer;
		text-decoration: none;
		color: var(--text);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease;
	}
	.card:hover {
		border-color: var(--border-hover);
		box-shadow: 0 4px 14px var(--shadow-color);
		transform: translateY(-2px);
	}
	.card:active {
		transform: scale(0.98);
	}
	.card.read-only {
		cursor: default;
	}
	.card.read-only:hover {
		transform: none;
		box-shadow: none;
		border-color: var(--border);
	}

	.top {
		display: flex;
		align-items: center;
		gap: 10px;
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
		font-weight: 600;
		font-size: 14px;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.byline {
		font-size: 11px;
		color: var(--text-tertiary);
		margin-top: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cdesc {
		font-size: 12px;
		color: var(--text-secondary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 32px;
	}

	.foot {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 12px;
		min-height: 22px;
	}
</style>
