<script lang="ts">
	import { marked } from 'marked';
	import Fuse from 'fuse.js';

	import dayjs from '$lib/dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	import Spinner from '$lib/components/common/Spinner.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import { flyAndScale } from '$lib/utils/transitions';

	import { createEventDispatcher, onMount, getContext, tick } from 'svelte';
	import { goto } from '$app/navigation';

	import { deleteModel, getOllamaVersion, pullModel } from '$lib/apis/ollama';
	import { unloadModel } from '$lib/apis';

	import {
		user,
		MODEL_DOWNLOAD_POOL,
		models,
		mobile,
		temporaryChatEnabled,
		settings,
		config
	} from '$lib/stores';
	import { toast } from 'svelte-sonner';
	import { capitalizeFirstLetter, sanitizeResponseContent, splitStream } from '$lib/utils';
	import { getModels } from '$lib/apis';

	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import Check from '$lib/components/icons/Check.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Switch from '$lib/components/common/Switch.svelte';
	import ChatBubbleOval from '$lib/components/icons/ChatBubbleOval.svelte';

	import ModelItem from './ModelItem.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let id = '';
	export let value = '';
	export let placeholder = $i18n.t('Select a model');
	export let searchEnabled = true;
	export let searchPlaceholder = $i18n.t('Search a model');

	export let items: {
		label: string;
		value: string;
		model: Model;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: any;
	}[] = [];

	export let className = 'w-[32rem]';
	export let triggerClassName = 'text-lg';

	export let pinModelHandler: (modelId: string) => void = () => {};

	let show = false;
	let triggerElement: HTMLElement | null = null;
	let contentElement: HTMLElement | null = null;
	let panelElement: HTMLElement | null = null;
	let dropdownPosition = { top: 0, left: 0, width: 0, openUp: false };

	const portal = (node: HTMLElement) => {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	};

	const VIEWPORT_MARGIN = 8;

	const updatePosition = async () => {
		if (!show || !triggerElement) return;

		// Wait for the panel to render so we can measure its real size.
		await tick();

		const rect = triggerElement.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		const panelW = $mobile ? vw - 16 : (panelElement?.offsetWidth ?? 512);
		const panelH = panelElement?.offsetHeight ?? 0;

		// Horizontal: align to trigger, but clamp inside the viewport.
		let left = $mobile ? VIEWPORT_MARGIN : rect.left;
		if (!$mobile) {
			left = Math.min(left, vw - panelW - VIEWPORT_MARGIN);
			left = Math.max(VIEWPORT_MARGIN, left);
		}

		// Vertical: prefer below the trigger, flip above when there isn't room.
		const spaceBelow = vh - rect.bottom - VIEWPORT_MARGIN;
		const spaceAbove = rect.top - VIEWPORT_MARGIN;
		let openUp = false;
		let top: number;

		if (panelH && spaceBelow < panelH && spaceAbove > spaceBelow) {
			openUp = true;
			top = Math.max(VIEWPORT_MARGIN, rect.top - 2 - panelH);
		} else {
			top = rect.bottom + 2;
			if (panelH) {
				top = Math.min(top, vh - panelH - VIEWPORT_MARGIN);
				top = Math.max(VIEWPORT_MARGIN, top);
			}
		}

		dropdownPosition = { top, left, width: $mobile ? vw - 16 : 0, openUp };
	};

	const toggleOpen = () => {
		show = !show;
		if (show) {
			searchValue = '';
			listScrollTop = 0;
			resetView();
			updatePosition();
			window.setTimeout(() => document.getElementById('model-search-input')?.focus(), 0);
		} else {
			document.getElementById(`model-selector-${id}-button`)?.blur();
		}
	};

	const handlePointerDown = (e: PointerEvent) => {
		if (!show) return;
		const target = e.target as Node;
		if (
			(triggerElement && triggerElement.contains(target)) ||
			(contentElement && contentElement.contains(target))
		) {
			return;
		}
		show = false;
		document.getElementById(`model-selector-${id}-button`)?.blur();
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (show && e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			show = false;
			document.getElementById(`model-selector-${id}-button`)?.blur();
		}
	};

	let tags = [];

	let selectedModel = '';
	$: selectedModel = items.find((item) => item.value === value) ?? '';

	let searchValue = '';

	let selectedTag = '';
	let selectedConnectionType = '';

	let ollamaVersion = null;
	let selectedModelIdx = 0;

	const fuse = new Fuse(
		items.map((item) => {
			const _item = {
				...item,
				modelName: item.model?.name,
				tags: (item.model?.tags ?? []).map((tag) => tag.name).join(' '),
				desc: item.model?.info?.meta?.description
			};
			return _item;
		}),
		{
			keys: ['value', 'tags', 'modelName'],
			threshold: 0.4
		}
	);

	const updateFuse = () => {
		if (fuse) {
			fuse.setCollection(
				items.map((item) => {
					const _item = {
						...item,
						modelName: item.model?.name,
						tags: (item.model?.tags ?? []).map((tag) => tag.name).join(' '),
						desc: item.model?.info?.meta?.description
					};
					return _item;
				})
			);
		}
	};

	$: if (items) {
		updateFuse();
	}

	$: filteredItems = (
		searchValue
			? fuse
					.search(searchValue)
					.map((e) => {
						return e.item;
					})
					.filter((item) => {
						if (selectedTag === '') {
							return true;
						}

						return (item.model?.tags ?? [])
							.map((tag) => tag.name.toLowerCase())
							.includes(selectedTag.toLowerCase());
					})
					.filter((item) => {
						if (selectedConnectionType === '') {
							return true;
						} else if (selectedConnectionType === 'local') {
							return item.model?.connection_type === 'local';
						} else if (selectedConnectionType === 'external') {
							return item.model?.connection_type === 'external';
						} else if (selectedConnectionType === 'direct') {
							return item.model?.direct;
						}
					})
			: items
					.filter((item) => {
						if (selectedTag === '') {
							return true;
						}
						return (item.model?.tags ?? [])
							.map((tag) => tag.name.toLowerCase())
							.includes(selectedTag.toLowerCase());
					})
					.filter((item) => {
						if (selectedConnectionType === '') {
							return true;
						} else if (selectedConnectionType === 'local') {
							return item.model?.connection_type === 'local';
						} else if (selectedConnectionType === 'external') {
							return item.model?.connection_type === 'external';
						} else if (selectedConnectionType === 'direct') {
							return item.model?.direct;
						}
					})
	).filter((item) => !(item.model?.info?.meta?.hidden ?? false));

	$: if (
		selectedTag !== undefined ||
		selectedConnectionType !== undefined ||
		searchValue !== undefined
	) {
		resetView();
	}

	$: hasLocal = items.some((item) => item.model?.connection_type === 'local');
	$: hasExternal = items.some((item) => item.model?.connection_type === 'external');
	$: hasDirect = items.some((item) => item.model?.direct);
	$: hasCategories = hasLocal || hasExternal || hasDirect || tags.length > 0;

	const resetView = async () => {
		await tick();

		const selectedInFiltered = filteredItems.findIndex((item) => item.value === value);

		if (selectedInFiltered >= 0) {
			// The selected model is visible in the current filter
			selectedModelIdx = selectedInFiltered;
		} else {
			// The selected model is not visible, default to first item in filtered list
			selectedModelIdx = 0;
		}

		// Set the virtual scroll position so the selected item is rendered and centered
		const targetScrollTop = Math.max(
			0,
			selectedModelIdx * ITEM_HEIGHT - LIST_HEIGHT / 2 + ITEM_HEIGHT / 2
		);
		listScrollTop = targetScrollTop;

		await tick();

		if (listContainer) {
			listContainer.scrollTop = targetScrollTop;
		}

		await tick();
		const item = document.querySelector(`[data-arrow-selected="true"]`);
		item?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
	};

	const pullModelHandler = async () => {
		const sanitizedModelTag = searchValue.trim().replace(/^ollama\s+(run|pull)\s+/, '');

		console.log($MODEL_DOWNLOAD_POOL);
		if ($MODEL_DOWNLOAD_POOL[sanitizedModelTag]) {
			toast.error(
				$i18n.t(`Model '{{modelTag}}' is already in queue for downloading.`, {
					modelTag: sanitizedModelTag
				})
			);
			return;
		}
		if (Object.keys($MODEL_DOWNLOAD_POOL).length === 3) {
			toast.error(
				$i18n.t('Maximum of 3 models can be downloaded simultaneously. Please try again later.')
			);
			return;
		}

		const [res, controller] = await pullModel(localStorage.token, sanitizedModelTag, '0').catch(
			(error) => {
				toast.error(`${error}`);
				return null;
			}
		);

		if (res) {
			const reader = res.body
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(splitStream('\n'))
				.getReader();

			MODEL_DOWNLOAD_POOL.set({
				...$MODEL_DOWNLOAD_POOL,
				[sanitizedModelTag]: {
					...$MODEL_DOWNLOAD_POOL[sanitizedModelTag],
					abortController: controller,
					reader,
					done: false
				}
			});

			while (true) {
				try {
					const { value, done } = await reader.read();
					if (done) break;

					let lines = value.split('\n');

					for (const line of lines) {
						if (line !== '') {
							let data = JSON.parse(line);
							console.log(data);
							if (data.error) {
								throw data.error;
							}
							if (data.detail) {
								throw data.detail;
							}

							if (data.status) {
								if (data.digest) {
									let downloadProgress = 0;
									if (data.completed) {
										downloadProgress = Math.round((data.completed / data.total) * 1000) / 10;
									} else {
										downloadProgress = 100;
									}

									MODEL_DOWNLOAD_POOL.set({
										...$MODEL_DOWNLOAD_POOL,
										[sanitizedModelTag]: {
											...$MODEL_DOWNLOAD_POOL[sanitizedModelTag],
											pullProgress: downloadProgress,
											digest: data.digest
										}
									});
								} else {
									toast.success(data.status);

									MODEL_DOWNLOAD_POOL.set({
										...$MODEL_DOWNLOAD_POOL,
										[sanitizedModelTag]: {
											...$MODEL_DOWNLOAD_POOL[sanitizedModelTag],
											done: data.status === 'success'
										}
									});
								}
							}
						}
					}
				} catch (error) {
					console.log(error);
					if (typeof error !== 'string') {
						error = error.message;
					}

					toast.error(`${error}`);
					// opts.callback({ success: false, error, modelName: opts.modelName });
					break;
				}
			}

			if ($MODEL_DOWNLOAD_POOL[sanitizedModelTag].done) {
				toast.success(
					$i18n.t(`Model '{{modelName}}' has been successfully downloaded.`, {
						modelName: sanitizedModelTag
					})
				);

				models.set(
					await getModels(
						localStorage.token,
						$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
					)
				);
			} else {
				toast.error($i18n.t('Download canceled'));
			}

			delete $MODEL_DOWNLOAD_POOL[sanitizedModelTag];

			MODEL_DOWNLOAD_POOL.set({
				...$MODEL_DOWNLOAD_POOL
			});
		}
	};

	const setOllamaVersion = async () => {
		ollamaVersion = await getOllamaVersion(localStorage.token).catch((error) => false);
	};

	onMount(async () => {
		if (items) {
			tags = items
				.filter((item) => !(item.model?.info?.meta?.hidden ?? false))
				.flatMap((item) => item.model?.tags ?? [])
				.map((tag) => tag.name.toLowerCase());
			// Remove duplicates and sort
			tags = Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b));
		}
	});

	$: if (show) {
		setOllamaVersion();
	}

	const cancelModelPullHandler = async (model: string) => {
		const { reader, abortController } = $MODEL_DOWNLOAD_POOL[model];
		if (abortController) {
			abortController.abort();
		}
		if (reader) {
			await reader.cancel();
			delete $MODEL_DOWNLOAD_POOL[model];
			MODEL_DOWNLOAD_POOL.set({
				...$MODEL_DOWNLOAD_POOL
			});
			await deleteModel(localStorage.token, model);
			toast.success($i18n.t('{{model}} download has been canceled', { model: model }));
		}
	};

	const unloadModelHandler = async (model: string) => {
		const res = await unloadModel(localStorage.token, model).catch((error) => {
			toast.error($i18n.t('Error unloading model: {{error}}', { error }));
		});

		if (res) {
			toast.success($i18n.t('Model unloaded successfully'));
			models.set(
				await getModels(
					localStorage.token,
					$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
				)
			);
		}
	};

	let showDeleteConfirm = false;
	let deleteModelTarget: any = null;

	const deleteModelHandler = async (model: any) => {
		deleteModelTarget = model;
		showDeleteConfirm = true;
	};

	const confirmDeleteModel = async () => {
		const model = deleteModelTarget;
		if (!model) return;

		const res = await deleteModel(localStorage.token, model.id).catch((error) => {
			toast.error($i18n.t('Error deleting model: {{error}}', { error }));
		});

		if (res) {
			// $i18n.t('Model {{modelId}} not found')
			toast.success(
				$i18n.t('Model {{modelName}} deleted successfully', { modelName: model.name ?? model.id })
			);

			// If the deleted model was selected, clear the selection
			if (value === model.id) {
				value = '';
			}

			models.set(
				await getModels(
					localStorage.token,
					$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
				)
			);
		}

		deleteModelTarget = null;
	};

	const ITEM_HEIGHT = 42;
	const OVERSCAN = 10;
	const LIST_HEIGHT = 288; // constant list viewport so the search bar stays put

	let listScrollTop = 0;
	let listContainer;

	$: visibleStart = Math.max(0, Math.floor(listScrollTop / ITEM_HEIGHT) - OVERSCAN);
	$: visibleEnd = Math.min(
		filteredItems.length,
		Math.ceil((listScrollTop + LIST_HEIGHT) / ITEM_HEIGHT) + OVERSCAN
	);

	$: activeFilterKey = `${selectedConnectionType}|${selectedTag}`;
</script>

<ConfirmDialog
	bind:show={showDeleteConfirm}
	title={$i18n.t('Delete Model')}
	message={$i18n.t('Are you sure you want to delete **{{modelName}}**?', {
		modelName: deleteModelTarget?.name ?? deleteModelTarget?.id ?? ''
	})}
	on:confirm={() => {
		confirmDeleteModel();
	}}
/>

<svelte:window
	on:pointerdown={handlePointerDown}
	on:keydown={handleKeydown}
	on:resize={updatePosition}
/>

<div class="relative w-full">
	<button
		bind:this={triggerElement}
		class="relative w-full {($settings?.highContrastMode ?? false)
			? ''
			: 'outline-hidden focus:outline-hidden'}"
		aria-label={selectedModel
			? $i18n.t('Selected model: {{modelName}}', { modelName: selectedModel.label })
			: placeholder}
		aria-haspopup="listbox"
		aria-expanded={show}
		id="model-selector-{id}-button"
		type="button"
		on:click={toggleOpen}
	>
		<div
			class="flex w-full text-left px-0.5 bg-transparent truncate {triggerClassName} justify-between {($settings?.highContrastMode ??
			false)
				? 'dark:placeholder-gray-100 placeholder-gray-800'
				: 'placeholder-gray-400'}"
			on:mouseenter={async () => {
				models.set(
					await getModels(
						localStorage.token,
						$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
					)
				);
			}}
		>
			{#if selectedModel}
				{selectedModel.label}
			{:else}
				{placeholder}
			{/if}
			<ChevronDown className=" self-center ml-2 size-3" strokeWidth="2.5" />
		</div>
	</button>

	{#if show}
		<div
			use:portal
			bind:this={contentElement}
			style="position: fixed; z-index: 9999; top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;{$mobile
				? ` width: ${dropdownPosition.width}px;`
				: ''}"
		>
			<div
				bind:this={panelElement}
				class="z-40 {$mobile
					? `w-full`
					: `${className}`} max-w-[calc(100vw-1rem)] justify-start rounded-2xl bg-[var(--bg-elevated)] text-[var(--text)] border border-[var(--border)] shadow-lg outline-hidden overflow-hidden"
				style="transform-origin: {dropdownPosition.openUp ? 'bottom' : 'top'} left;"
				transition:flyAndScale={{ y: dropdownPosition.openUp ? 8 : -8, start: 0.96, duration: 200 }}
			>
				<slot>
					<div class="flex flex-col">
						<!-- Body: category rail (left) + model list (right) -->
						<div class="flex items-stretch h-72">
							{#if hasCategories}
								<div
									class="shrink-0 w-[9.5rem] h-full overflow-y-auto scrollbar-none border-r border-[var(--border)] flex flex-col gap-0.5 p-1.5"
								>
									<div
										class="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
									>
										{$i18n.t('Filter')}
									</div>

									<button
										class="cat-item {selectedTag === '' && selectedConnectionType === ''
											? 'cat-item-active'
											: ''}"
										aria-pressed={selectedTag === '' && selectedConnectionType === ''}
										on:click={() => {
											selectedConnectionType = '';
											selectedTag = '';
										}}
									>
										{$i18n.t('All')}
									</button>

									{#if hasLocal}
										<button
											class="cat-item {selectedConnectionType === 'local' ? 'cat-item-active' : ''}"
											aria-pressed={selectedConnectionType === 'local'}
											on:click={() => {
												selectedTag = '';
												selectedConnectionType = 'local';
											}}
										>
											{$i18n.t('Local')}
										</button>
									{/if}

									{#if hasExternal}
										<button
											class="cat-item {selectedConnectionType === 'external' ? 'cat-item-active' : ''}"
											aria-pressed={selectedConnectionType === 'external'}
											on:click={() => {
												selectedTag = '';
												selectedConnectionType = 'external';
											}}
										>
											{$i18n.t('External')}
										</button>
									{/if}

									{#if hasDirect}
										<button
											class="cat-item {selectedConnectionType === 'direct' ? 'cat-item-active' : ''}"
											aria-pressed={selectedConnectionType === 'direct'}
											on:click={() => {
												selectedTag = '';
												selectedConnectionType = 'direct';
											}}
										>
											{$i18n.t('Direct')}
										</button>
									{/if}

									{#if tags.length > 0}
										<div
											class="px-2 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
										>
											{$i18n.t('Tags')}
										</div>

										{#each tags as tag}
											<button
												class="cat-item {selectedTag === tag ? 'cat-item-active' : ''}"
												aria-pressed={selectedTag === tag}
												title={tag}
												on:click={() => {
													selectedConnectionType = '';
													selectedTag = tag;
												}}
											>
												<span class="truncate">{tag}</span>
											</button>
										{/each}
									{/if}
								</div>
							{/if}

							<!-- svelte-ignore a11y-no-static-element-interactions -->
							<div
								class="flex-1 min-w-0 h-full overflow-y-auto px-2.5 py-2 group relative"
								bind:this={listContainer}
								on:scroll={() => {
									listScrollTop = listContainer.scrollTop;
								}}
							>
								{#if filteredItems.length === 0}
									{#if items.length === 0 && $user?.role === 'admin'}
										<div class="flex flex-col items-start justify-center py-6 px-4 text-start">
											<div class="text-sm font-medium text-[var(--text)] mb-1">
												{$i18n.t('No models available')}
											</div>
											<div class="text-xs text-[var(--text-secondary)] mb-4">
												{$i18n.t('Connect to an AI provider to start chatting')}
											</div>
											<a
												href="/admin/settings/connections"
												class="px-4 py-1.5 rounded-xl text-xs font-medium bg-[var(--accent)] text-white hover:brightness-110 transition"
												on:click={() => {
													show = false;
												}}
											>
												{$i18n.t('Manage Connections')}
											</a>
										</div>
									{:else}
										<div class="">
											<div class="block px-3 py-2 text-sm text-[var(--text-secondary)]">
												{$i18n.t('No results found')}
											</div>
										</div>
									{/if}
								{:else}
									{#key activeFilterKey}
										<div class="list-anim" role="listbox" aria-label={$i18n.t('Available models')}>
											<div style="height: {visibleStart * ITEM_HEIGHT}px;" />
											{#each filteredItems.slice(visibleStart, visibleEnd) as item, i (item.value)}
												{@const index = visibleStart + i}
												<ModelItem
													{selectedModelIdx}
													{item}
													{index}
													{value}
													{pinModelHandler}
													{unloadModelHandler}
													{deleteModelHandler}
													onClick={() => {
														value = item.value;
														selectedModelIdx = index;

														show = false;
													}}
												/>
											{/each}
											<div style="height: {(filteredItems.length - visibleEnd) * ITEM_HEIGHT}px;" />
										</div>
									{/key}
								{/if}

								{#if !(searchValue.trim() in $MODEL_DOWNLOAD_POOL) && searchValue && ollamaVersion && $user?.role === 'admin'}
									<Tooltip
										content={$i18n.t(`Pull "{{searchValue}}" from Ollama.com`, {
											searchValue: searchValue
										})}
										placement="top-start"
									>
										<button
											class="flex w-full font-medium line-clamp-1 select-none items-center py-2 pl-3 pr-1.5 text-sm text-[var(--text)] outline-hidden transition-all duration-75 hover:bg-[var(--surface-hover)] rounded-xl cursor-pointer"
											on:click={() => {
												pullModelHandler();
											}}
										>
											<div class=" truncate">
												{$i18n.t(`Pull "{{searchValue}}" from Ollama.com`, {
													searchValue: searchValue
												})}
											</div>
										</button>
									</Tooltip>
								{/if}

								{#each Object.keys($MODEL_DOWNLOAD_POOL) as model}
									<div
										class="flex w-full justify-between font-medium select-none py-2 pl-3 pr-1.5 text-sm text-[var(--text)] outline-hidden transition-all duration-75 rounded-xl"
									>
										<div class="flex">
											<div class="mr-2.5 translate-y-0.5">
												<Spinner />
											</div>

											<div class="flex flex-col self-start">
												<div class="flex gap-1">
													<div class="line-clamp-1">
														Downloading "{model}"
													</div>

													<div class="shrink-0">
														{'pullProgress' in $MODEL_DOWNLOAD_POOL[model]
															? `(${$MODEL_DOWNLOAD_POOL[model].pullProgress}%)`
															: ''}
													</div>
												</div>

												{#if 'digest' in $MODEL_DOWNLOAD_POOL[model] && $MODEL_DOWNLOAD_POOL[model].digest}
													<div class="-mt-1 h-fit text-[0.7rem] text-[var(--text-tertiary)] line-clamp-1">
														{$MODEL_DOWNLOAD_POOL[model].digest}
													</div>
												{/if}
											</div>
										</div>

										<div class="mr-2 ml-1 translate-y-0.5">
											<Tooltip content={$i18n.t('Cancel')}>
												<button
													class="text-[var(--text)]"
													aria-label={$i18n.t('Cancel download of {{model}}', { model: model })}
													on:click={() => {
														cancelModelPullHandler(model);
													}}
												>
													<svg
														class="w-4 h-4"
														aria-hidden="true"
														xmlns="http://www.w3.org/2000/svg"
														width="24"
														height="24"
														fill="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke="currentColor"
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18 17.94 6M18 18 6.06 6"
														/>
													</svg>
												</button>
											</Tooltip>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Search (bottom) -->
						{#if searchEnabled}
							<div
								class="flex items-center gap-2.5 px-4 py-3 border-t border-[var(--border)]"
							>
								<Search className="size-4 text-[var(--text-tertiary)]" strokeWidth="2.5" />

								<input
									id="model-search-input"
									bind:value={searchValue}
									class="w-full text-sm bg-transparent outline-hidden placeholder:text-[var(--text-tertiary)]"
									placeholder={searchPlaceholder}
									autocomplete="off"
									aria-label={$i18n.t('Search In Models')}
									on:keydown={(e) => {
										if (e.code === 'Enter' && filteredItems.length > 0) {
											value = filteredItems[selectedModelIdx].value;
											show = false;
											return; // dont need to scroll on selection
										} else if (e.code === 'ArrowDown') {
											e.stopPropagation();
											selectedModelIdx = Math.min(selectedModelIdx + 1, filteredItems.length - 1);
										} else if (e.code === 'ArrowUp') {
											e.stopPropagation();
											selectedModelIdx = Math.max(selectedModelIdx - 1, 0);
										} else {
											// if the user types something, reset to the top selection.
											selectedModelIdx = 0;
										}

										const item = document.querySelector(`[data-arrow-selected="true"]`);
										item?.scrollIntoView({
											block: 'center',
											inline: 'nearest',
											behavior: 'instant'
										});
									}}
								/>
							</div>
						{/if}
					</div>

					<div class="hidden w-[42rem]" />
					<div class="hidden w-[32rem]" />
				</slot>
			</div>
		</div>
	{/if}
</div>

<style>
	.cat-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 30px;
		padding: 5px 10px;
		border-radius: 8px;
		background: transparent;
		border: none;
		font-size: 13px;
		font-weight: 500;
		text-align: left;
		text-transform: capitalize;
		color: var(--text-secondary);
		cursor: pointer;
		outline: none;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.cat-item:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: translateX(2px);
	}
	.cat-item:active {
		transform: translateX(2px) scale(0.98);
	}
	.cat-item-active {
		background: var(--accent-glow);
		color: var(--accent);
		transform: translateX(2px);
	}

	.list-anim {
		animation: listIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes listIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cat-item,
		.cat-item:hover,
		.cat-item:active,
		.cat-item-active {
			transform: none;
		}
		.list-anim {
			animation: none;
		}
	}
</style>
