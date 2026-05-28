<script lang="ts">
	import { getContext } from 'svelte';
	import VirtualList from '@sveltejs/svelte-virtual-list';

	import { WEBUI_BASE_URL } from '$lib/constants';
	import { settings } from '$lib/stores';
	import { updateUserSettings } from '$lib/apis/users';

	import emojiGroups from '$lib/emoji-groups.json';
	import emojiShortCodes from '$lib/emoji-shortcodes.json';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';

	import Sparkles from '$lib/components/icons/Sparkles.svelte';
	import WrenchAlt from '$lib/components/icons/WrenchAlt.svelte';
	import Cube from '$lib/components/icons/Cube.svelte';
	import Code from '$lib/components/icons/Code.svelte';
	import CommandLine from '$lib/components/icons/CommandLine.svelte';
	import Bolt from '$lib/components/icons/Bolt.svelte';
	import GlobeAlt from '$lib/components/icons/GlobeAlt.svelte';
	import ChatBubbles from '$lib/components/icons/ChatBubbles.svelte';
	import LightBulb from '$lib/components/icons/LightBulb.svelte';
	import Document from '$lib/components/icons/Document.svelte';
	import Database from '$lib/components/icons/Database.svelte';
	import ChartBar from '$lib/components/icons/ChartBar.svelte';
	import Cog6 from '$lib/components/icons/Cog6.svelte';
	import Heart from '$lib/components/icons/Heart.svelte';
	import Star from '$lib/components/icons/Star.svelte';
	import Bookmark from '$lib/components/icons/Bookmark.svelte';
	import Map from '$lib/components/icons/Map.svelte';
	import Lifebuoy from '$lib/components/icons/Lifebuoy.svelte';

	const i18n = getContext('i18n');

	export let onSelect: (url: string) => void = () => {};
	export let align = 'center';

	let show = false;
	let tab: 'emojis' | 'favicons' = 'favicons';

	// ── Favicons (built-in app icons) ───────────────────────────────
	const icons = [
		Sparkles,
		WrenchAlt,
		Cube,
		Code,
		CommandLine,
		Bolt,
		GlobeAlt,
		ChatBubbles,
		LightBulb,
		Document,
		Database,
		ChartBar,
		Cog6,
		Heart,
		Star,
		Bookmark,
		Map,
		Lifebuoy
	];

	// Selectable tile background; glyph contrast adapts to it.
	const palette = ['#7b7ef6', '#e8730a', '#2d9f52', '#e84393', '#0ea5b5', '#2a2927', '#ffffff'];
	let bgColor = '#7b7ef6';

	// Remembers the last picked glyph so changing the background re-composites live.
	let selection: {
		kind: 'icon' | 'emoji';
		vb: string;
		inner: string;
		outline?: boolean;
		strokeWidth?: string;
	} | null = null;

	const contrastColor = (hex: string) => {
		const h = hex.replace('#', '');
		const r = parseInt(h.slice(0, 2), 16);
		const g = parseInt(h.slice(2, 4), 16);
		const b = parseInt(h.slice(4, 6), 16);
		const lum = 0.299 * r + 0.587 * g + 0.114 * b;
		return lum > 150 ? '#2a2927' : '#ffffff';
	};

	// UTF-8 safe base64 — the backend /model/profile/image endpoint only decodes base64 data URLs.
	const toDataUrl = (svg: string) =>
		`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

	const compose = (sel: typeof selection, bg: string) => {
		if (!sel) return '';
		let glyph: string;
		if (sel.kind === 'icon') {
			const color = contrastColor(bg);
			glyph = `<svg x='24' y='24' width='52' height='52' viewBox='${sel.vb}' fill='${
				sel.outline ? 'none' : color
			}' stroke='${sel.outline ? color : 'none'}' stroke-width='${sel.strokeWidth}' stroke-linecap='round' stroke-linejoin='round'>${sel.inner}</svg>`;
		} else {
			glyph = `<svg x='20' y='20' width='60' height='60' viewBox='${sel.vb}'>${sel.inner}</svg>`;
		}
		return toDataUrl(
			`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='${bg}'/>${glyph}</svg>`
		);
	};

	// Re-emit whenever the glyph or the background changes (live background updates).
	$: if (selection) onSelect(compose(selection, bgColor));

	const pickIcon = (e: MouseEvent) => {
		const btn = e.currentTarget as HTMLElement;
		const src = btn.querySelector('svg');
		if (!src) return;

		const rootStroke = src.getAttribute('stroke');
		selection = {
			kind: 'icon',
			vb: src.getAttribute('viewBox') || '0 0 24 24',
			strokeWidth: src.getAttribute('stroke-width') || '1.5',
			outline: !!rootStroke && rootStroke !== 'none',
			inner: src.innerHTML
		};
		show = false;
	};

	// ── Emojis ──────────────────────────────────────────────────────
	const MAX_RECENT = 30;
	const ROW_HEIGHT = 48;

	let search = '';
	let emojis = emojiShortCodes;
	let emojiRows = [];
	let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	$: recentEmojiNames = ($settings?.recentEmojis ?? [])
		.filter((name) => emojiShortCodes[name])
		.slice(0, MAX_RECENT);

	function saveRecentEmoji(emojiName: string) {
		const updated = [emojiName, ...recentEmojiNames.filter((n) => n !== emojiName)].slice(
			0,
			MAX_RECENT
		);
		settings.set({ ...$settings, recentEmojis: updated });
		if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
		saveDebounceTimer = setTimeout(async () => {
			await updateUserSettings(localStorage.token, { ui: { ...$settings, recentEmojis: updated } });
		}, 1000);
	}

	$: {
		if (search) {
			emojis = Object.keys(emojiShortCodes).reduce((acc, key) => {
				if (key.includes(search.toLowerCase())) {
					acc[key] = emojiShortCodes[key];
				} else if (Array.isArray(emojiShortCodes[key])) {
					const filtered = emojiShortCodes[key].filter((emoji) =>
						emoji.includes(search.toLowerCase())
					);
					if (filtered.length) acc[key] = filtered;
				} else if (emojiShortCodes[key].includes(search.toLowerCase())) {
					acc[key] = emojiShortCodes[key];
				}
				return acc;
			}, {});
		} else {
			emojis = emojiShortCodes;
		}
	}

	$: {
		const flattened = [];
		if (!search && recentEmojiNames.length > 0) {
			flattened.push({ type: 'group', label: $i18n.t('Recently Used') });
			flattened.push(...recentEmojiNames.map((emoji) => ({ type: 'emoji', name: emoji })));
		}
		Object.keys(emojiGroups).forEach((group) => {
			const groupEmojis = emojiGroups[group].filter((emoji) => emojis[emoji]);
			if (groupEmojis.length > 0) {
				flattened.push({ type: 'group', label: group });
				flattened.push(...groupEmojis.map((emoji) => ({ type: 'emoji', name: emoji })));
			}
		});

		emojiRows = [];
		let currentRow = [];
		flattened.forEach((item) => {
			if (item.type === 'emoji') {
				currentRow.push(item);
				if (currentRow.length === 8) {
					emojiRows.push(currentRow);
					currentRow = [];
				}
			} else {
				if (currentRow.length > 0) {
					emojiRows.push(currentRow);
					currentRow = [];
				}
				emojiRows.push([item]);
			}
		});
		if (currentRow.length > 0) emojiRows.push(currentRow);
	}

	const pickEmoji = async (emoji) => {
		saveRecentEmoji(emoji.name);
		const url = `${WEBUI_BASE_URL}/assets/emojis/${emoji.name.toLowerCase()}.svg`;

		// Inline the (same-origin) emoji SVG and scale it onto the tile, like the icons.
		try {
			const text = await fetch(url).then((r) => r.text());
			selection = {
				kind: 'emoji',
				vb: (text.match(/viewBox=['"]([^'"]+)['"]/) || [])[1] || '0 0 36 36',
				inner: text.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '')
			};
		} catch (e) {
			onSelect(url); // Fallback: full-bleed emoji image
		}
		show = false;
	};
</script>

<Dropdown
	bind:show
	{align}
	onOpenChange={(state) => {
		if (state === false) search = '';
	}}
>
	<slot />

	<div slot="content">
		<div
			class="w-80 max-w-full p-2 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 shadow-lg z-9999 dark:text-white"
		>
			<!-- Tabs -->
			<div class="ip-tabs">
				<button
					type="button"
					class="ip-tab {tab === 'favicons' ? 'on' : ''}"
					on:click={() => (tab = 'favicons')}
				>
					{$i18n.t('Favicons')}
				</button>
				<button
					type="button"
					class="ip-tab {tab === 'emojis' ? 'on' : ''}"
					on:click={() => (tab = 'emojis')}
				>
					{$i18n.t('Emojis')}
				</button>
			</div>

			<!-- Background color -->
			<div class="ip-swatches">
				{#each palette as color}
					<button
						type="button"
						class="ip-swatch {bgColor === color ? 'on' : ''}"
						style="--sw:{color}"
						aria-label={$i18n.t('Background color')}
						on:click={() => (bgColor = color)}
					></button>
				{/each}
				<span class="ip-swatch-divider"></span>
				<Tooltip content={$i18n.t('Custom color')}>
					<label
						class="ip-swatch ip-swatch-custom {palette.includes(bgColor) ? '' : 'on'}"
						style="--sw:{palette.includes(bgColor) ? 'transparent' : bgColor}"
					>
						<input type="color" bind:value={bgColor} />
					</label>
				</Tooltip>
			</div>

			{#if tab === 'favicons'}
				<div class="grid grid-cols-6 gap-1 p-1">
					{#each icons as Icon}
						<button
							type="button"
							class="ip-cell"
							on:click={pickIcon}
							aria-label={$i18n.t('Select icon')}
						>
							<svelte:component this={Icon} className="size-5" />
						</button>
					{/each}
				</div>
			{:else}
				<div class="px-2 pt-1 pb-2">
					<input
						type="text"
						class="w-full text-sm bg-transparent outline-hidden"
						placeholder={$i18n.t('Search all emojis')}
						bind:value={search}
					/>
				</div>
				<div class="w-full flex justify-start h-80 overflow-y-auto px-1 pb-1 text-sm">
					{#if emojiRows.length === 0}
						<div class="text-center text-xs text-gray-500 dark:text-gray-400 w-full py-6">
							{$i18n.t('No results')}
						</div>
					{:else}
						<div class="w-full flex ml-0.5">
							<VirtualList rowHeight={ROW_HEIGHT} items={emojiRows} height={320} let:item>
								<div class="w-full mb-2.5">
									{#if item.length === 1 && item[0].type === 'group'}
										<div class="text-xs font-medium -mb-1 text-gray-500 dark:text-gray-400">
											{item[0].label}
										</div>
									{:else}
										<div class="flex items-center gap-1.5 w-full">
											{#each item as emojiItem}
												<Tooltip content={`:${emojiItem.name}:`} placement="top">
													<button
														type="button"
														class="p-1.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
														on:click={() => pickEmoji(emojiItem)}
													>
														<img
															src="{WEBUI_BASE_URL}/assets/emojis/{emojiItem.name.toLowerCase()}.svg"
															alt={emojiItem.name}
															class="size-5"
															loading="lazy"
														/>
													</button>
												</Tooltip>
											{/each}
										</div>
									{/if}
								</div>
							</VirtualList>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</Dropdown>

<style>
	.ip-tabs {
		display: flex;
		gap: 4px;
		padding: 2px;
		margin-bottom: 6px;
		background: var(--surface);
		border-radius: 12px;
	}
	.ip-tab {
		flex: 1;
		font-size: 12px;
		font-weight: 600;
		padding: 6px 10px;
		border-radius: 10px;
		color: var(--text-secondary);
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}
	.ip-tab:hover {
		color: var(--text);
	}
	.ip-tab.on {
		background: var(--bg-elevated);
		color: var(--text);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}
	.ip-swatches {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 4px 4px 10px;
	}
	.ip-swatch {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		padding: 0;
		cursor: pointer;
		background: var(--sw);
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
		transition:
			transform 0.12s ease,
			box-shadow 0.12s ease;
	}
	.ip-swatch:hover {
		transform: scale(1.18);
	}
	.ip-swatch.on {
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.12),
			0 0 0 2px var(--bg-elevated),
			0 0 0 4px var(--accent);
	}
	.ip-swatch-divider {
		width: 1px;
		height: 16px;
		background: var(--border);
		margin: 0 1px;
	}
	.ip-swatch-custom {
		position: relative;
		overflow: hidden;
		display: inline-flex;
	}
	.ip-swatch-custom:not(.on) {
		background: conic-gradient(
			from 0deg,
			#ff4d4d,
			#ffd24d,
			#4dff88,
			#4dd2ff,
			#4d4dff,
			#ff4dff,
			#ff4d4d
		);
	}
	.ip-swatch-custom input {
		position: absolute;
		inset: -6px;
		width: 34px;
		height: 34px;
		border: none;
		padding: 0;
		cursor: pointer;
		opacity: 0;
	}
	.ip-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		border-radius: 10px;
		color: var(--text-secondary);
		transition:
			background 0.12s ease,
			color 0.12s ease,
			transform 0.1s ease;
	}
	.ip-cell:hover {
		background: var(--accent-glow);
		color: var(--accent);
	}
	.ip-cell:active {
		transform: scale(0.88);
	}
</style>
