<script lang="ts">
	import { decode } from 'html-entities';
	import { v4 as uuidv4 } from 'uuid';

	import { getContext } from 'svelte';
	const i18n = getContext('i18n');

	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	import Spinner from './Spinner.svelte';
	import Image from './Image.svelte';
	import FullHeightIframe from './FullHeightIframe.svelte';
	import { settings } from '$lib/stores';
	import { VERB_ICONS, dotIcon, resolveTool, toolObject } from '$lib/utils/ledger';

	export let id: string = '';
	export let attributes: {
		type?: string;
		id?: string;
		name?: string;
		arguments?: string;
		result?: string;
		files?: string;
		embeds?: string;
		done?: string;
	} = {};

	export let open = false;
	export let grouped = false;
	export let className = '';

	const RESULT_PREVIEW_LIMIT = 10000;
	let expandedResult = false;

	$: if (!open) expandedResult = false;
	export let buttonClassName = 'w-fit tool-call-trigger transition';

	const componentId = id || uuidv4();

	function parseJSONString(str: string) {
		// Iteratively unwrap nested JSON-encoded strings. Same result as the previous
		// recursive form, but without the stack-overflow-and-recover path it hit on
		// scalar values (e.g. JSON.parse('5') -> 5 -> infinite self-recursion).
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let value: any = str;
		while (typeof value === 'string') {
			try {
				value = JSON.parse(value);
			} catch {
				break;
			}
		}
		return value;
	}

	function formatJSONString(str: string) {
		try {
			const parsed = parseJSONString(str);
			if (typeof parsed === 'object') {
				return JSON.stringify(parsed, null, 2);
			} else {
				return String(parsed);
			}
		} catch (e) {
			return str;
		}
	}

	function parseArguments(str: string): Record<string, unknown> | null {
		try {
			const parsed = parseJSONString(str);
			if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>;
			}
			return null;
		} catch {
			return null;
		}
	}

	export let resultContent: string = '';

	$: result = resultContent || decode(attributes?.result ?? '');
	$: files = parseJSONString(decode(attributes?.files ?? ''));
	$: embeds = parseJSONString(decode(attributes?.embeds ?? ''));
	$: args =
		open || (Array.isArray(embeds) && embeds.length > 0) ? decode(attributes?.arguments ?? '') : '';
	$: isDone = attributes?.done === 'true';
	$: isExecuting = attributes?.done && attributes?.done !== 'true';

	$: parsedArgs = parseArguments(args);
	$: parsedResult = parseJSONString(result);

	// Single-line preview of the result — the ledger "note" (design page style)
	$: resultPreview = (() => {
		if (!isDone || !result) return '';
		const str =
			typeof parsedResult === 'object' && parsedResult !== null
				? JSON.stringify(parsedResult)
				: String(parsedResult);
		const cleaned = str.replace(/\s+/g, ' ').trim();
		return cleaned.length > 80 ? cleaned.slice(0, 80) + '…' : cleaned;
	})();

	// The ledger "verb" and its mark — `write_scratchboard` reads as "write ✎"
	$: entry = resolveTool(attributes?.name ?? '');
	$: icon = VERB_ICONS[entry.icon] ?? dotIcon;

	// Compact arguments summary — the ledger "object" (the target of the verb)
	$: argsSummary = (() => {
		if (parsedArgs) return toolObject(attributes?.name ?? '', parsedArgs);
		const raw = (args ?? '').replace(/\s+/g, ' ').trim();
		return raw.length > 64 ? raw.slice(0, 64) + '…' : raw;
	})();
</script>

<div {id} class={className}>
	{#if !grouped && embeds && Array.isArray(embeds) && embeds.length > 0}
		<!-- Embed Mode: Show iframes without collapsible behavior -->
		<div class="py-1 w-full cursor-pointer">
			<div class="w-full text-xs text-[var(--text-tertiary)]">
				{attributes.name}
			</div>
			{#each embeds as embed, idx}
				<div class="my-2" id={`${componentId}-tool-call-embed-${idx}`}>
					<FullHeightIframe
						src={embed}
						{args}
						allowScripts={true}
						allowForms={$settings?.iframeSandboxAllowForms ?? false}
						allowSameOrigin={$settings?.iframeSandboxAllowSameOrigin ?? false}
						allowPopups={true}
					/>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Tool call display — FOLIO manuscript ledger entry (matches /design) -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="ledger-entry {isExecuting ? 'shimmer' : ''}"
			class:open
			on:pointerup={() => {
				open = !open;
			}}
		>
			<!-- Stamp -->
			<span class="stamp" class:done={isDone} aria-hidden="true">
				{#if isExecuting}
					<Spinner className="size-2.5" />
				{:else if isDone}
					<svg
						width="9"
						height="9"
						viewBox="0 0 10 10"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="M1.5 5.5 4 8l4.5-6" /></svg
					>
				{/if}
			</span>

			<!-- Verb icon -->
			<svg
				class="vicon"
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d={icon} />
			</svg>

			<span class="verb">{entry.verb}</span>
			{#if argsSummary}
				<span class="object">{argsSummary}</span>
			{/if}
			<span class="dotfill" aria-hidden="true"></span>
			<span class="note">{isDone ? resultPreview : '…'}</span>
		</div>

		{#if open}
			<div transition:slide={{ duration: 300, easing: quintOut, axis: 'y' }}>
				<div class="border border-[var(--border)] rounded-xl my-1.5 p-3 space-y-3">
					<!-- Input -->
					{#if args}
						<div>
							<div
								class="text-[10px] uppercase tracking-wider font-medium text-[var(--text-tertiary)] mb-1.5 px-1"
							>
								{$i18n.t('Input')}
							</div>

							{#if parsedArgs}
								<div class="px-1 space-y-0.5">
									{#each Object.entries(parsedArgs) as [key, value]}
										<div class="flex gap-2 text-xs py-0.5">
											<span class="font-medium text-[var(--text-secondary)] shrink-0">{key}</span>
											<span class="text-[var(--text)] break-all"
												>{typeof value === 'object' ? JSON.stringify(value) : value}</span
											>
										</div>
									{/each}
								</div>
							{:else}
								<div class="tool-call-body w-full max-w-none!">
									<pre
										class="text-xs text-[var(--text-secondary)] whitespace-pre font-mono bg-[var(--code-bg)] rounded-lg p-2.5 overflow-x-auto">{formatJSONString(
											args
										)}</pre>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Output -->
					{#if isDone && result}
						<div>
							<div
								class="text-[10px] uppercase tracking-wider font-medium text-[var(--text-tertiary)] mb-1.5 px-1"
							>
								{$i18n.t('Output')}
							</div>
							<div class="w-full max-w-none!">
								{#if typeof parsedResult === 'object' && parsedResult !== null}
									<pre
										class="text-xs text-[var(--text-secondary)] whitespace-pre font-mono bg-[var(--code-bg)] rounded-lg p-2.5 overflow-x-auto">{JSON.stringify(
											parsedResult,
											null,
											2
										)}</pre>
								{:else}
									{@const resultStr = String(parsedResult)}
									{@const isTruncated = resultStr.length > RESULT_PREVIEW_LIMIT && !expandedResult}
									<pre
										class="text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-words font-mono">{isTruncated
											? resultStr.slice(0, RESULT_PREVIEW_LIMIT)
											: resultStr}</pre>
									{#if isTruncated}
										<button
											class="mt-1 text-xs tool-call-trigger transition"
											on:click|stopPropagation={() => {
												expandedResult = true;
											}}
										>
											{$i18n.t('Show all ({{COUNT}} characters)', {
												COUNT: resultStr.length.toLocaleString()
											})}
										</button>
									{/if}
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Files display (images etc.) when done -->
	{#if isDone}
		{#if typeof files === 'object'}
			{#each files ?? [] as file, idx}
				{#if typeof file === 'string'}
					{#if file.startsWith('data:image/')}
						<Image id={`${componentId}-tool-call-result-${idx}`} src={file} alt="Image" />
					{/if}
				{:else if typeof file === 'object'}
					{#if (file.type === 'image' || (file?.content_type ?? '').startsWith('image/')) && file.url}
						<Image id={`${componentId}-tool-call-result-${idx}`} src={file.url} alt="Image" />
					{/if}
				{/if}
			{/each}
		{/if}
	{/if}
</div>

<style>
	:global(.tool-call-trigger) {
		color: var(--text-secondary);
	}
	:global(.tool-call-trigger:hover) {
		color: var(--text);
	}

	/* ─── Tool Calls — manuscript ledger entry (matches /design) ─── */
	.ledger-entry {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-family: var(--mono);
		font-size: 12px;
		line-height: 2.1;
		color: var(--ink-2);
		cursor: pointer;
		word-break: normal;
		overflow-wrap: normal;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
	}

	.stamp {
		flex: none;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		border: 1.5px solid var(--ink-3);
		display: grid;
		place-items: center;
		align-self: center;
		color: transparent;
		transition: border-color 0.2s;
	}
	.stamp.done {
		border-color: var(--ok);
		color: var(--ok);
		animation: stampIn 0.35s var(--spring);
	}
	@keyframes stampIn {
		from {
			transform: scale(1.6);
		}
		to {
			transform: scale(1);
		}
	}

	.vicon {
		flex: none;
		align-self: center;
		color: var(--ultramarine);
		transition: transform 0.3s var(--spring);
	}
	.ledger-entry:hover .vicon {
		transform: rotate(-10deg) scale(1.15);
	}

	.verb {
		flex: none;
		color: var(--ultramarine);
		font-weight: 500;
		white-space: nowrap;
	}
	.object {
		flex: 0 1 auto;
		min-width: 0;
		color: var(--ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dotfill {
		flex: 1 0 14px;
		border-bottom: 1px dotted var(--rule);
		transform: translateY(-3px);
	}
	.note {
		flex: 0 1 auto;
		min-width: 0;
		max-width: 45%;
		color: var(--ink-3);
		font-size: 11px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
