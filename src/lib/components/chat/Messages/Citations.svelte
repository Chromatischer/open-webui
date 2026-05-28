<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import { embed, showControls, showEmbeds } from '$lib/stores';

	import CitationModal from './Citations/CitationModal.svelte';

	const i18n = getContext<Writable<i18nType>>('i18n');

	export let id = '';
	export let chatId = '';

	export let sources: any[] = [];
	export let readOnly = false;

	let citations: any[] = [];
	let showPercentage = false;
	let showRelevance = true;

	let citationModal = null;

	let showCitations = false;
	let showCitationModal = false;

	let selectedCitation: any = null;

	export const showSourceModal = (sourceId: string | number) => {
		let index;
		let suffix = null;

		if (typeof sourceId === 'string') {
			const output = sourceId.split('#');
			index = parseInt(output[0]) - 1;

			if (output.length > 1) {
				suffix = output[1];
			}
		} else {
			index = sourceId - 1;
		}

		if (citations[index]) {
			console.log('Showing citation modal for:', citations[index]);

			if (citations[index]?.source?.embed_url) {
				const embedUrl = citations[index].source.embed_url;
				if (embedUrl) {
					if (readOnly) {
						// Open in new tab if readOnly
						window.open(embedUrl, '_blank');
						return;
					} else {
						showControls.set(true);
						showEmbeds.set(true);
						embed.set({
							url: embedUrl,
							title: citations[index]?.source?.name || 'Embedded Content',
							source: citations[index],
							chatId: chatId,
							messageId: id,
							sourceId: sourceId
						});
					}
				} else {
					selectedCitation = citations[index];
					showCitationModal = true;
				}
			} else {
				selectedCitation = citations[index];
				showCitationModal = true;
			}
		}
	};

	function calculateShowRelevance(sources: any[]) {
		const distances = sources.flatMap((citation) => citation.distances ?? []);
		const inRange = distances.filter((d) => d !== undefined && d >= -1 && d <= 1).length;
		const outOfRange = distances.filter((d) => d !== undefined && (d < -1 || d > 1)).length;

		if (distances.length === 0) {
			return false;
		}

		if (
			(inRange === distances.length - 1 && outOfRange === 1) ||
			(outOfRange === distances.length - 1 && inRange === 1)
		) {
			return false;
		}

		return true;
	}

	function shouldShowPercentage(sources: any[]) {
		const distances = sources.flatMap((citation) => citation.distances ?? []);
		return distances.every((d) => d !== undefined && d >= -1 && d <= 1);
	}

	$: {
		citations = sources.reduce((acc, source) => {
			if (Object.keys(source).length === 0) {
				return acc;
			}

			source?.document?.forEach((document: any, index: number) => {
				const metadata = source?.metadata?.[index];
				const distance = source?.distances?.[index];

				// Within the same citation there could be multiple documents
				const id = metadata?.source ?? source?.source?.id ?? 'N/A';
				let _source = source?.source;

				if (metadata?.name) {
					_source = { ..._source, name: metadata.name };
				}

				if (id.startsWith('http://') || id.startsWith('https://')) {
					_source = { ..._source, name: id, url: id };
				}

				const existingSource = acc.find((item: any) => item.id === id);

				if (existingSource) {
					existingSource.document.push(document);
					existingSource.metadata.push(metadata);
					if (distance !== undefined) existingSource.distances.push(distance);
				} else {
					acc.push({
						id: id,
						source: _source,
						document: [document],
						metadata: metadata ? [metadata] : [],
						distances: distance !== undefined ? [distance] : []
					});
				}
			});

			return acc;
		}, []);
		console.log('citations', citations);

		showRelevance = calculateShowRelevance(citations);
		showPercentage = shouldShowPercentage(citations);
	}

	const decodeString = (str: string) => {
		try {
			return decodeURIComponent(str);
		} catch (e) {
			return str;
		}
	};
</script>

<CitationModal
	bind:show={showCitationModal}
	citation={selectedCitation}
	{showPercentage}
	{showRelevance}
/>

{#if citations.length > 0}
	<div class="source-feed" aria-label={$i18n.t('Sources used')}>
		{#each citations as citation, idx}
			{@const sourceName = decodeString(citation.source.name)}
			{@const isUrl = citation?.source?.name?.startsWith('http')}
			<button
				id={`source-${id}-${idx + 1}`}
				aria-label={$i18n.t('View source: {{name}}', { name: sourceName })}
				class="source-item no-toggle outline-hidden"
				on:click={() => {
					showCitationModal = true;
					selectedCitation = citation;
				}}
			>
				<span class="source-index">{idx + 1}</span>
				{#if isUrl}
					<img
						src="https://www.google.com/s2/favicons?sz=32&domain={citation.source.name}"
						alt=""
						class="favicon"
						on:error={(e) => {
							(e.currentTarget as HTMLImageElement).src = '/favicon.png';
						}}
					/>
				{:else}
					<span class="source-glyph" aria-hidden="true">
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<path d="M14 2v6h6" />
						</svg>
					</span>
				{/if}
				<span class="source-name">{sourceName}</span>
			</button>
		{/each}
	</div>
{/if}

<style>
	.source-feed {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		margin: 0.15rem 0 0.55rem;
	}

	.source-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 1.9rem;
		max-width: 100%;
		padding: 0 0.7rem 0 0.55rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--surface) 88%, transparent), transparent),
			color-mix(in srgb, var(--bg-elevated) 92%, transparent);
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 650;
		line-height: 1;
		transition:
			background 0.16s ease,
			border-color 0.16s ease,
			color 0.16s ease,
			transform 0.16s ease;
	}

	.source-item:hover {
		border-color: color-mix(in srgb, var(--text-tertiary) 45%, var(--border));
		background: color-mix(in srgb, var(--surface-hover) 72%, var(--bg-elevated));
		color: var(--text);
		transform: translateY(-1px);
	}

	.source-index {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.12rem;
		height: 1.12rem;
		border-radius: 999px;
		background: var(--surface);
		color: var(--text-tertiary);
		font-size: 0.62rem;
		font-weight: 800;
	}

	.source-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		color: var(--text-tertiary);
	}

	.favicon {
		width: 1rem;
		height: 1rem;
		flex: none;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.source-name {
		min-width: 0;
		max-width: min(24rem, 58vw);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
