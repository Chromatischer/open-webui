<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { shortcuts } from '$lib/shortcuts';
	import { settings } from '$lib/stores';
	import ShortcutItem from '../ShortcutItem.svelte';

	const i18n = getContext('i18n');

	let categorizedShortcuts: Record<string, any[]> = {};
	let isMac = false;

	onMount(() => {
		isMac = /Mac/i.test(navigator.userAgent);
	});

	$: {
		const allShortcuts = Object.values(shortcuts).filter((shortcut) => {
			if (!shortcut.setting) {
				return true;
			}
			return $settings[shortcut.setting.id] === shortcut.setting.value;
		});

		categorizedShortcuts = allShortcuts.reduce((acc, shortcut) => {
			const category = shortcut.category;
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(shortcut);
			return acc;
		}, {});
	}
</script>

<div class="text-[var(--text)]">
	<div class="ks-pane-title">{$i18n.t('Keyboard Shortcuts')}</div>
	<div class="ks-pane-sub">{$i18n.t('Speed up your workflow with these keyboard shortcuts.')}</div>

	{#each Object.entries(categorizedShortcuts) as [category, items]}
		<div class="ks-group-label">{$i18n.t(category)}</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 gap-x-4 w-full mb-5">
			{#each items as shortcut}
				<div class="col-span-1 flex items-start">
					<ShortcutItem {shortcut} {isMac} />
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.ks-pane-title {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 2px;
	}
	.ks-pane-sub {
		font-size: 13px;
		color: var(--text-secondary);
		margin-bottom: 18px;
	}
	.ks-group-label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-tertiary);
		margin-bottom: 10px;
	}
</style>
