<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		chats,
		chatId,
		currentChatPage,
		user,
		showSidebar,
		showSettings,
		mobile
	} from '$lib/stores';
	import { getChatList } from '$lib/apis/chats';
	import UserMenu from './Sidebar/UserMenu.svelte';

	/*
	 * THE ARCHIVE — older folios, peeled open from the left.
	 * The bare /design archive (folio list · new folio · the binder's hand),
	 * wired to the real chat list. Folders / search / pinned intentionally omitted.
	 */

	let revealed = $state(false);
	let showUserMenu = $state(false);

	onMount(async () => {
		if (!$chats || $chats.length === 0) {
			try {
				await chats.set(await getChatList(localStorage.token, 1));
				currentChatPage.set(1);
			} catch (e) {
				// ignore — list stays empty until the app populates it
			}
		}
		requestAnimationFrame(() => (revealed = true));
	});

	const relTime = (ts: number) => {
		if (!ts) return '';
		const d = new Date(ts < 1e12 ? ts * 1000 : ts);
		const diff = (Date.now() - d.getTime()) / 1000;
		if (diff < 86400) return 'today';
		if (diff < 172800) return 'yesterday';
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	};
	const folioNo = (idx: number) =>
		String(Math.max(1, ($chats?.length ?? 0) - idx)).padStart(2, '0');

	const newFolio = async () => {
		if ($mobile) showSidebar.set(false);
		await goto('/');
	};
	const selectFolio = async (id: string) => {
		if ($mobile) showSidebar.set(false);
		await goto(`/c/${id}`);
	};
</script>

<aside class="archive" class:revealed aria-label="The archive">
	<div class="arch-head">
		<span class="arch-kicker">The Archive</span>
		<span class="arch-count">{$chats?.length ?? 0} folios</span>
	</div>

	<button class="arch-new" onclick={newFolio}>
		<svg
			width="13"
			height="13"
			viewBox="0 0 14 14"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9" /></svg
		>
		Begin a new folio
	</button>

	<div class="arch-list">
		{#each $chats ?? [] as f, i (f.id ?? i)}
			<button
				class="arch-item"
				class:current={f.id === $chatId}
				style:--i={i}
				onclick={() => selectFolio(f.id)}
			>
				<span class="arch-no">№{folioNo(i)}</span>
				<span class="arch-body">
					<span class="arch-title">{f.title || 'Untitled folio'}</span>
					<span class="arch-meta">{relTime(f.updated_at)}</span>
				</span>
				<svg
					class="arch-arrow"
					width="11"
					height="11"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg
				>
			</button>
		{/each}
	</div>

	<div class="arch-foot">
		<UserMenu
			bind:show={showUserMenu}
			role={$user?.role}
			className="w-[240px]"
			align="start"
			profile={true}
			help={true}
		>
			<button
				class="arch-userbtn"
				onclick={() => (showUserMenu = !showUserMenu)}
				aria-label="Open user menu"
			>
				<span class="arch-avatar" aria-hidden="true"
					>{($user?.name ?? '?').slice(0, 1).toUpperCase()}</span
				>
				<span class="arch-user">
					<span class="arch-name">{$user?.name ?? ''}</span>
					<span class="arch-mail">{$user?.email ?? ''}</span>
				</span>
			</button>
		</UserMenu>
		<button
			class="ghost"
			onclick={() => showSettings.set(true)}
			aria-label="Settings"
			title="Settings"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="3" />
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
				/>
			</svg>
		</button>
	</div>
</aside>

<style>
	.archive {
		position: relative;
		width: 100%;
		height: 100%;
		z-index: 0;
		display: flex;
		flex-direction: column;
		padding: 26px 18px 18px;
		color: var(--ink);
		box-sizing: border-box;
	}
	.archive.revealed {
		visibility: visible;
		transition-delay: 0s;
	}
	.arch-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 0 8px 14px;
	}
	.arch-kicker {
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.arch-count {
		font-family: var(--mono);
		font-size: 10px;
		color: var(--ink-3);
	}

	.arch-new {
		display: flex;
		align-items: center;
		gap: 9px;
		margin: 0 0 10px;
		padding: 9px 12px;
		border-radius: 10px;
		border: 1px dashed var(--rule);
		background: transparent;
		color: var(--ink-2);
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		cursor: pointer;
		transition:
			border-color 0.2s,
			color 0.2s,
			background 0.2s,
			transform 0.2s var(--spring);
	}
	.arch-new:hover {
		border-color: var(--vermilion);
		color: var(--vermilion);
		background: var(--vermilion-soft);
		transform: translateX(2px);
	}
	.arch-new svg {
		transition: transform 0.35s var(--spring);
	}
	.arch-new:hover svg {
		transform: rotate(90deg);
	}

	.arch-list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--ink-3) 60%, transparent) transparent;
	}
	.arch-item {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 9px 10px;
		border: none;
		border-radius: 10px;
		background: transparent;
		text-align: left;
		cursor: pointer;
		color: var(--ink-2);
		opacity: 0;
		transform: translateX(-12px);
		transition:
			background 0.18s,
			color 0.18s,
			transform 0.3s var(--out),
			opacity 0.3s var(--out);
	}
	.archive.revealed .arch-item {
		opacity: 1;
		transform: translateX(0);
		transition-delay: calc(60ms + var(--i) * 45ms);
	}
	.arch-item:hover {
		background: rgba(0, 0, 0, 0.04);
		color: var(--ink);
		transform: translateX(3px) !important;
		transition-delay: 0ms;
	}
	:global(.dark) .folio .arch-item:hover {
		background: rgba(255, 255, 255, 0.04);
	}
	.arch-no {
		font-family: var(--serif);
		font-size: 15px;
		color: var(--ink-3);
		flex: none;
		transition: color 0.18s;
	}
	.arch-item:hover .arch-no,
	.arch-item.current .arch-no {
		color: var(--vermilion);
	}
	.arch-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.arch-title {
		font-size: 13px;
		font-weight: 560;
		color: inherit;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.arch-item.current .arch-title {
		color: var(--ink);
	}
	.arch-meta {
		font-size: 10.5px;
		color: var(--ink-3);
	}
	.arch-arrow {
		flex: none;
		opacity: 0;
		transform: translateX(-4px);
		color: var(--vermilion);
		transition:
			opacity 0.18s,
			transform 0.25s var(--spring);
	}
	.arch-item:hover .arch-arrow {
		opacity: 1;
		transform: translateX(0);
	}
	.arch-item.current .arch-arrow {
		opacity: 0.55;
		transform: none;
	}
	.arch-foot {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 12px;
		padding: 14px 8px 4px;
		border-top: 1px solid var(--rule-faint);
	}
	/* The user section is a trigger for the user context menu */
	.arch-foot > :first-child {
		flex: 1;
		min-width: 0;
	}
	.arch-userbtn {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-width: 0;
		padding: 4px 6px;
		margin: -4px -6px;
		border: none;
		background: transparent;
		border-radius: 10px;
		text-align: left;
		cursor: pointer;
		color: inherit;
		transition: background 0.15s;
	}
	.arch-userbtn:hover {
		background: rgba(0, 0, 0, 0.04);
	}
	:global(.dark) .arch-userbtn:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	.arch-avatar {
		flex: none;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-family: var(--serif);
		font-size: 16px;
		color: var(--vermilion);
		background: var(--vermilion-soft);
		border: 1px solid color-mix(in srgb, var(--vermilion) 25%, transparent);
	}
	.arch-user {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.arch-name {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--ink);
	}
	.arch-mail {
		font-size: 10.5px;
		color: var(--ink-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ghost {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: var(--ink-3);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.15s;
	}
	.ghost:hover {
		background: var(--rule-faint);
		color: var(--ink);
	}
	.ghost:active {
		transform: scale(0.92);
	}
</style>
