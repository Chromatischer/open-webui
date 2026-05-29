<script lang="ts">
	import Switch from '$lib/components/common/Switch.svelte';
	import { settings, user } from '$lib/stores';
	import { onMount, getContext, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import localizedFormat from 'dayjs/plugin/localizedFormat';

	import Spinner from '$lib/components/common/Spinner.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';

	import {
		addNewMemory,
		updateMemoryById,
		deleteMemoriesByUserId,
		deleteMemoryById,
		getMemories
	} from '$lib/apis/memories';

	import XMark from '$lib/components/icons/XMark.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import GarbageBin from '$lib/components/icons/GarbageBin.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import Note from '$lib/components/icons/Note.svelte';
	import BookOpen from '$lib/components/icons/BookOpen.svelte';

	const i18n = getContext('i18n');
	dayjs.extend(localizedFormat);

	export let saveSettings: Function;

	let enableMemory = false;
	let memories = [];
	let loading = true;
	let query = '';

	// Composer
	let draft = '';
	let adding = false;
	let composerTextarea: HTMLTextAreaElement;

	// Inline editing
	let editingId: string | null = null;
	let editDraft = '';
	let savingEdit = false;
	let editTextarea: HTMLTextAreaElement;

	// Inline per-memory delete confirm: first click arms, second click deletes.
	let deleteArmedId: string | null = null;
	let deleteTimer: ReturnType<typeof setTimeout>;
	const handleDelete = async (memory) => {
		if (deleteArmedId === memory.id) {
			clearTimeout(deleteTimer);
			deleteArmedId = null;
			const res = await deleteMemoryById(localStorage.token, memory.id).catch((error) => {
				toast.error(`${error}`);
				return null;
			});
			if (res) {
				toast.success($i18n.t('Memory deleted successfully'));
				memories = await getMemories(localStorage.token);
			}
		} else {
			deleteArmedId = memory.id;
			clearTimeout(deleteTimer);
			deleteTimer = setTimeout(() => (deleteArmedId = null), 3500);
		}
	};

	// Inline "clear all" confirm: first click arms, second click clears.
	let clearArmed = false;
	let clearTimer: ReturnType<typeof setTimeout>;
	const armClear = () => {
		clearArmed = true;
		clearTimeout(clearTimer);
		clearTimer = setTimeout(() => (clearArmed = false), 3500);
	};
	const handleClear = () => {
		if (clearArmed) {
			clearTimeout(clearTimer);
			onClearConfirmed();
		} else {
			armClear();
		}
	};

	onMount(async () => {
		enableMemory = $settings?.memory ?? false;
		memories = await getMemories(localStorage.token);
		loading = false;
	});

	$: filteredMemories = query
		? memories.filter((m) => m.content?.toLowerCase().includes(query.toLowerCase()))
		: memories;

	// Sort newest-first, then bucket into journal-style date groups.
	$: groups = (() => {
		const sorted = [...filteredMemories].sort((a, b) => b.updated_at - a.updated_at);
		const now = dayjs();
		const out: { label: string; items: any[] }[] = [];
		let current: { label: string; items: any[] } | null = null;

		const labelFor = (ts: number) => {
			const d = dayjs(ts * 1000);
			if (d.isSame(now, 'day')) return $i18n.t('Today');
			if (d.isSame(now.subtract(1, 'day'), 'day')) return $i18n.t('Yesterday');
			if (d.isAfter(now.subtract(7, 'day'))) return $i18n.t('Previous 7 days');
			if (d.isSame(now, 'year')) return d.format('MMMM');
			return d.format('MMMM YYYY');
		};

		for (const m of sorted) {
			const label = labelFor(m.updated_at);
			if (!current || current.label !== label) {
				current = { label, items: [] };
				out.push(current);
			}
			current.items.push(m);
		}
		return out;
	})();

	const submitDraft = async () => {
		const content = draft.trim();
		if (!content || adding) return;
		adding = true;
		const res = await addNewMemory(localStorage.token, content).catch((error) => {
			toast.error(`${error}`);
			return null;
		});
		if (res) {
			toast.success($i18n.t('Memory added successfully'));
			draft = '';
			memories = await getMemories(localStorage.token);
		}
		adding = false;
	};

	const startEdit = async (memory) => {
		editingId = memory.id;
		editDraft = memory.content;
		await tick();
		editTextarea?.focus();
	};

	const cancelEdit = () => {
		editingId = null;
		editDraft = '';
	};

	const saveEdit = async (memory) => {
		const content = editDraft.trim();
		if (!content || savingEdit) return;
		if (content === memory.content) {
			cancelEdit();
			return;
		}
		savingEdit = true;
		const res = await updateMemoryById(localStorage.token, memory.id, content).catch((error) => {
			toast.error(`${error}`);
			return null;
		});
		if (res) {
			toast.success($i18n.t('Memory updated successfully'));
			memories = await getMemories(localStorage.token);
			cancelEdit();
		}
		savingEdit = false;
	};

	const onClearConfirmed = async () => {
		const res = await deleteMemoriesByUserId(localStorage.token).catch((error) => {
			toast.error(`${error}`);
			return null;
		});
		if (res && memories.length > 0) {
			toast.success($i18n.t('Memory cleared successfully'));
			memories = [];
		}
		clearArmed = false;
	};
</script>

<div class="ix-section" id="tab-personalization">
	<div class="ix-group-label">{$i18n.t('Memory')}</div>

	<div class="ix-rows">
		<div class="ix-row">
			<div class="flex flex-col gap-0.5">
				<span class="ix-row-title">{$i18n.t('Memory')}</span>
				<span class="ix-row-sub">
					{$i18n.t('Let your models recall details you share, across every chat.')}
				</span>
			</div>
			<Switch
				bind:state={enableMemory}
				on:change={async () => {
					saveSettings({ memory: enableMemory });
				}}
			/>
		</div>
	</div>

	<div class="mm" class:mm-off={!enableMemory}>
		{#if loading}
			<div class="mm-state"><Spinner className="size-4" /></div>
		{:else}
			<!-- Composer: pinned at the top; only the list below scrolls -->
			<div class="mm-composer" class:mm-composer-filled={draft.trim().length > 0}>
				<div class="mm-composer-lead">
					<Note className="size-4 shrink-0 text-[var(--text-tertiary)]" strokeWidth="1.5" />
					<textarea
						class="mm-composer-input"
						bind:this={composerTextarea}
						bind:value={draft}
						rows="1"
						maxlength="1000"
						placeholder={$i18n.t('Add what your models should remember about you…')}
						disabled={!enableMemory || adding}
						on:keydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								submitDraft();
							}
						}}
					/>
				</div>
				<div class="mm-composer-footer">
					<span class="mm-composer-hint">
						{$i18n.t('Refer to yourself as “User” — e.g. “User is learning Spanish”.')}
					</span>
					<button
						class="mm-btn-accent"
						disabled={!enableMemory || adding || draft.trim().length === 0}
						on:click={submitDraft}
					>
						{#if adding}
							<Spinner className="size-3.5" />
						{/if}
						<span>{$i18n.t('Add')}</span>
					</button>
				</div>
			</div>

			{#if memories.length === 0}
				<div class="mm-empty">
					<BookOpen className="size-8 text-[var(--text-tertiary)]" strokeWidth="1.5" />
					<div class="mm-empty-title">{$i18n.t('Teach your models about you')}</div>
					<div class="mm-empty-sub">
						{$i18n.t('Add a memory above and your models will recall it in every chat. What you save builds up here over time.')}
					</div>
				</div>
			{:else}
				<!-- Search -->
				<div class="mm-search">
					<Search className="size-3.5 shrink-0 text-[var(--text-tertiary)]" strokeWidth="1.5" />
					<input
						class="mm-search-input"
						bind:value={query}
						placeholder={$i18n.t('Search {{count}} memories', { count: memories.length })}
						maxlength="500"
					/>
					{#if query}
						<button class="mm-search-clear" on:click={() => (query = '')}>
							<XMark className="size-3" strokeWidth="2" />
						</button>
					{/if}
				</div>

				<!-- Scrolling timeline (rail lives on inner track so it spans all dots) -->
				<div class="mm-scroll">
					<div class="mm-track">
						{#if filteredMemories.length === 0}
							<div class="mm-noresults">{$i18n.t('No results found')}</div>
						{:else}
						{#each groups as group (group.label)}
					<div class="mm-group-label">{group.label}</div>
					{#each group.items as memory (memory.id)}
						<div class="mm-item" class:mm-item-editing={editingId === memory.id}>
							<span class="mm-dot" />
							{#if editingId === memory.id}
								<div class="mm-edit">
									<textarea
										bind:this={editTextarea}
										class="mm-edit-input"
										bind:value={editDraft}
										rows="3"
										maxlength="1000"
										on:keydown={(e) => {
											if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
												e.preventDefault();
												saveEdit(memory);
											}
											if (e.key === 'Escape') {
												e.preventDefault();
												cancelEdit();
											}
										}}
									/>
									<div class="mm-edit-actions">
										<button class="mm-btn-ghost" on:click={cancelEdit}>
											{$i18n.t('Cancel')}
										</button>
										<button
											class="mm-btn-accent"
											disabled={savingEdit || editDraft.trim().length === 0}
											on:click={() => saveEdit(memory)}
										>
											{#if savingEdit}
												<Spinner className="size-3.5" />
											{/if}
											<span>{$i18n.t('Save')}</span>
										</button>
									</div>
								</div>
							{:else}
								<div class="mm-item-body">
									<div class="mm-item-content">
										<div class="mm-item-text">{memory.content}</div>
										<div class="mm-item-date">
											{dayjs(memory.updated_at * 1000).format('MMM D, YYYY · h:mm A')}
										</div>
									</div>
									<div class="mm-item-actions">
										<Tooltip content={$i18n.t('Edit')}>
											<button class="mm-action-btn" on:click={() => startEdit(memory)}>
												<Pencil className="size-3.5" strokeWidth="1.5" />
											</button>
										</Tooltip>
										<Tooltip
											content={deleteArmedId === memory.id
												? $i18n.t('Click again to delete')
												: $i18n.t('Delete')}
										>
											<button
												class="mm-action-btn mm-action-danger"
												class:mm-action-armed={deleteArmedId === memory.id}
												on:click={() => handleDelete(memory)}
												on:blur={() => {
													if (deleteArmedId === memory.id) deleteArmedId = null;
												}}
											>
												<GarbageBin className="size-3.5" strokeWidth="1.5" />
											</button>
										</Tooltip>
									</div>
								</div>
							{/if}
						</div>
						{/each}
						{/each}
					{/if}
				</div>
			</div>

			<div class="mm-footer">
				<button
					class="mm-clear-btn"
					class:mm-clear-armed={clearArmed}
					on:click={handleClear}
					on:blur={() => (clearArmed = false)}
				>
					{clearArmed
						? $i18n.t('Click again to permanently clear all memories')
						: $i18n.t('Clear all memories')}
				</button>
			</div>
		{/if}
		{/if}
	</div>
</div>

<style>
	.ix-section {
		margin-bottom: 22px;
		scroll-margin-top: 12px;
	}
	.ix-group-label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-tertiary);
		margin-bottom: 10px;
	}
	.ix-rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
	}
	.ix-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 11px 13px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
	}
	.ix-row-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
	}
	.ix-row-sub {
		font-size: 11.5px;
		color: var(--text-tertiary);
	}

	/* Disabled affordance: dim + lock the management area when memory is off */
	.mm {
		transition: opacity 0.2s ease;
	}
	.mm-off {
		opacity: 0.55;
	}

	/* Composer (pinned above the scrolling list) */
	.mm-composer {
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--surface);
		padding: 10px 12px;
		margin-bottom: 14px;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}
	/* Only the timeline scrolls; the rail spans the full inner track height */
	.mm-scroll {
		max-height: 22rem;
		overflow-y: auto;
		margin: 0 -4px;
		padding: 0 4px;
	}
	.mm-composer:focus-within,
	.mm-composer-filled {
		border-color: var(--border-hover);
		background: var(--bg-elevated);
	}
	.mm-composer:focus-within {
		border-color: var(--accent);
	}
	.mm-composer-lead {
		display: flex;
		align-items: flex-start;
		gap: 9px;
	}
	.mm-composer-lead :global(svg) {
		margin-top: 2px;
	}
	.mm-composer-input {
		width: 100%;
		resize: none;
		background: transparent;
		outline: none;
		border: none;
		color: var(--text);
		font-size: 13px;
		line-height: 1.5;
		padding: 0;
		max-height: 9rem;
	}
	/* Hint + button only matter once the box is engaged */
	.mm-composer-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		max-height: 0;
		opacity: 0;
		overflow: hidden;
		transition:
			max-height 0.2s ease,
			opacity 0.15s ease,
			margin-top 0.2s ease;
	}
	.mm-composer:focus-within .mm-composer-footer,
	.mm-composer-filled .mm-composer-footer {
		max-height: 3rem;
		opacity: 1;
		margin-top: 10px;
	}
	.mm-composer-hint {
		font-size: 11px;
		color: var(--text-tertiary);
		line-height: 1.3;
	}

	/* Buttons */
	.mm-btn-accent {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: 9px;
		font-size: 12.5px;
		font-weight: 600;
		color: #fff;
		background: var(--accent);
		white-space: nowrap;
		flex-shrink: 0;
		transition:
			opacity 0.15s ease,
			transform 0.1s ease;
	}
	.mm-btn-accent:hover:not(:disabled) {
		opacity: 0.9;
	}
	.mm-btn-accent:active:not(:disabled) {
		transform: scale(0.97);
	}
	.mm-btn-accent:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.mm-btn-ghost {
		padding: 6px 12px;
		border-radius: 9px;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--text-secondary);
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}
	.mm-btn-ghost:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	/* Search */
	.mm-search {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 11px;
		border-radius: 10px;
		background: var(--surface);
		border: 1px solid var(--border);
		margin-bottom: 16px;
	}
	.mm-search-input {
		width: 100%;
		font-size: 13px;
		background: transparent;
		outline: none;
		color: var(--text);
	}
	.mm-search-clear {
		display: flex;
		padding: 2px;
		border-radius: 4px;
		color: var(--text-tertiary);
		transition: color 0.15s ease;
	}
	.mm-search-clear:hover {
		color: var(--text);
	}

	/* States */
	.mm-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		text-align: center;
		font-size: 13px;
		color: var(--text-tertiary);
		padding: 32px 16px;
	}
	/* Empty state: anchored placeholder card, not floating text */
	.mm-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		text-align: center;
		padding: 34px 24px;
		margin-top: 14px;
		border: 1px dashed var(--border-hover);
		border-radius: 14px;
		background: var(--surface);
	}
	.mm-empty :global(svg) {
		color: var(--text-tertiary);
		opacity: 0.8;
	}
	.mm-empty-title {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--text-secondary);
	}
	.mm-empty-sub {
		font-size: 12px;
		color: var(--text-tertiary);
		max-width: 24rem;
		line-height: 1.45;
	}

	/* Timeline */
	.mm-track {
		position: relative;
		padding-left: 20px;
	}
	/* The connecting rail runs the full height of the track */
	.mm-track::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 6px;
		bottom: 6px;
		width: 1.5px;
		background: var(--border);
	}
	.mm-group-label {
		font-size: 10.5px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-tertiary);
		margin: 14px 0 8px;
	}
	.mm-group-label:first-child {
		margin-top: 2px;
	}
	.mm-item {
		position: relative;
	}
	.mm-item + .mm-item {
		margin-top: 6px;
	}
	.mm-noresults {
		font-size: 13px;
		color: var(--text-tertiary);
		text-align: center;
		padding: 22px 16px 6px;
	}
	.mm-dot {
		position: absolute;
		left: -20px;
		top: 15px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--bg-elevated);
		border: 1.5px solid var(--border-hover);
		transform: translateX(0.75px);
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.mm-item:hover .mm-dot {
		border-color: var(--accent);
	}
	.mm-item-editing .mm-dot {
		background: var(--accent);
		border-color: var(--accent);
	}
	.mm-item-body {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.mm-item-body:hover {
		border-color: var(--border-hover);
		background: var(--surface-hover);
	}
	.mm-item-content {
		flex: 1;
		min-width: 0;
	}
	.mm-item-text {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		line-height: 1.45;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.mm-item-date {
		font-size: 11px;
		color: var(--text-tertiary);
		margin-top: 3px;
	}
	.mm-item-actions {
		display: flex;
		gap: 4px;
		flex: none;
		opacity: 0;
		transition: opacity 0.15s ease;
	}
	.mm-item-body:hover .mm-item-actions {
		opacity: 1;
	}
	.mm-action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		border-radius: 8px;
		color: var(--text-secondary);
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}
	.mm-action-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
	.mm-action-danger:hover {
		color: #e0533d;
	}
	/* Armed: the trash button turns solid red as its own confirmation */
	.mm-action-armed,
	.mm-action-armed:hover {
		background: #e0533d;
		color: #fff;
		opacity: 1;
	}

	/* Inline editor */
	.mm-edit {
		border: 1px solid var(--accent);
		border-radius: 12px;
		background: var(--bg-elevated);
		padding: 6px 6px 8px;
	}
	.mm-edit-input {
		width: 100%;
		resize: vertical;
		min-height: 4.5rem;
		background: transparent;
		outline: none;
		border: none;
		color: var(--text);
		font-size: 13px;
		line-height: 1.5;
		padding: 8px 10px 4px;
	}
	.mm-edit-actions {
		display: flex;
		justify-content: flex-end;
		gap: 6px;
		padding: 0 4px;
	}

	/* Footer: a quiet link at the far bottom of the list */
	.mm-footer {
		display: flex;
		justify-content: center;
		margin-top: 18px;
	}
	.mm-clear-btn {
		font-size: 12px;
		font-weight: 500;
		padding: 6px 14px;
		border-radius: 999px;
		color: var(--text-tertiary);
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}
	.mm-clear-btn:hover {
		color: #e0533d;
	}
	/* Armed: the same button becomes its own confirmation */
	.mm-clear-armed {
		color: #fff;
		background: #e0533d;
	}
	.mm-clear-armed:hover {
		color: #fff;
		background: #d8442e;
	}

	.mm-off .mm-composer,
	.mm-off .mm-search,
	.mm-off .mm-track {
		pointer-events: none;
	}
</style>
