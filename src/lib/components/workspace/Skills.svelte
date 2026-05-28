<script lang="ts">
	import { toast } from 'svelte-sonner';
	import fileSaver from 'file-saver';
	const { saveAs } = fileSaver;

	import { onMount, getContext, tick, onDestroy } from 'svelte';
	const i18n = getContext('i18n');

	import { WEBUI_NAME, user, skills as _skills } from '$lib/stores';
	import { goto } from '$app/navigation';
	import {
		getSkills,
		getSkillById,
		getSkillItems,
		exportSkills,
		createNewSkill,
		deleteSkillById,
		toggleSkillById
	} from '$lib/apis/skills';
	import { capitalizeFirstLetter, parseFrontmatter, formatSkillName } from '$lib/utils';
	import TagInput from '$lib/components/common/Tags/TagInput.svelte';

	import Tooltip from '../common/Tooltip.svelte';
	import ConfirmDialog from '../common/ConfirmDialog.svelte';
	import DeleteConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import EllipsisHorizontal from '../icons/EllipsisHorizontal.svelte';
	import GarbageBin from '../icons/GarbageBin.svelte';
	import Search from '../icons/Search.svelte';
	import Plus from '../icons/Plus.svelte';
	import XMark from '../icons/XMark.svelte';
	import Spinner from '../common/Spinner.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Switch from '../common/Switch.svelte';
	import SkillMenu from './Skills/SkillMenu.svelte';
	import Pagination from '../common/Pagination.svelte';
	import Sparkles from '../icons/Sparkles.svelte';
	import WorkspaceActionCard from './common/WorkspaceActionCard.svelte';
	import WorkspaceCard from './common/WorkspaceCard.svelte';

	let shiftKey = false;
	let loaded = false;

	let importFiles;
	let importInputElement: HTMLInputElement;

	let query = '';
	let searchDebounceTimer: ReturnType<typeof setTimeout>;

	let selectedSkill = null;
	let showDeleteConfirm = false;

	let filteredItems = null;
	let total = null;
	let loading = false;

	let tagsContainerElement: HTMLDivElement;
	let viewOption = '';
	let page = 1;

	const selectView = (value) => {
		viewOption = value;
		localStorage.workspaceViewOption = value;
		page = 1;
	};

	const loadSkillItems = async () => {
		if (!loaded) return;

		loading = true;
		try {
			const res = await getSkillItems(localStorage.token, query, viewOption, page).catch(
				(error) => {
					toast.error(`${error}`);
					return null;
				}
			);

			if (res) {
				filteredItems = res.items;
				total = res.total;
			}
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	};

	// Debounce only query changes
	$: if (query !== undefined) {
		loading = true;
		clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			page = 1;
			loadSkillItems();
		}, 300);
	}

	// Immediate response to page/filter changes
	$: if (page && viewOption !== undefined) {
		loadSkillItems();
	}

	const cloneHandler = async (skill) => {
		const _skill = await getSkillById(localStorage.token, skill.id).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (_skill) {
			sessionStorage.skill = JSON.stringify({
				..._skill,
				id: `${_skill.id}_clone`,
				name: `${_skill.name} (Clone)`
			});
			goto('/workspace/skills/create');
		}
	};

	const exportHandler = async (skill) => {
		const _skill = await getSkillById(localStorage.token, skill.id).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (_skill) {
			let blob = new Blob([JSON.stringify([_skill])], {
				type: 'application/json'
			});
			saveAs(blob, `skill-${_skill.id}-export-${Date.now()}.json`);
		}
	};

	const deleteHandler = async (skill) => {
		const res = await deleteSkillById(localStorage.token, skill.id).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			toast.success($i18n.t('Skill deleted successfully'));
		}

		page = 1;
		loadSkillItems();
		await _skills.set(await getSkills(localStorage.token));
	};

	onMount(async () => {
		viewOption = localStorage?.workspaceViewOption || '';
		loaded = true;

		const onKeyDown = (event) => {
			if (event.key === 'Shift') {
				shiftKey = true;
			}
		};

		const onKeyUp = (event) => {
			if (event.key === 'Shift') {
				shiftKey = false;
			}
		};

		const onBlur = () => {
			shiftKey = false;
		};

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur-sm', onBlur);

		return () => {
			clearTimeout(searchDebounceTimer);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur-sm', onBlur);
		};
	});

	onDestroy(() => {
		clearTimeout(searchDebounceTimer);
	});
</script>

<svelte:head>
	<title>
		{$i18n.t('Skills')} • {$WEBUI_NAME}
	</title>
</svelte:head>

{#if loaded}
	<div class="ws-page flex flex-col gap-1 px-1 mb-3">
		<input
			bind:this={importInputElement}
			bind:files={importFiles}
			type="file"
			accept=".md,.json"
			hidden
			on:change={() => {
				if (importFiles && importFiles.length > 0) {
					const file = importFiles[0];
					const ext = file.name.split('.').pop()?.toLowerCase();

					if (ext === 'json') {
						// JSON import: create skills via API
						const reader = new FileReader();
						reader.onload = async (event) => {
							try {
								const content = event.target?.result;
								if (typeof content !== 'string') return;

								const parsedSkills = JSON.parse(content);
								const items = Array.isArray(parsedSkills) ? parsedSkills : [parsedSkills];

								for (const skill of items) {
									await createNewSkill(localStorage.token, skill).catch((error) => {
										toast.error(`${error}`);
									});
								}

								toast.success($i18n.t('Skill imported successfully'));
								page = 1;
								loadSkillItems();
								_skills.set(await getSkills(localStorage.token));
							} catch (e) {
								toast.error($i18n.t('Invalid JSON file'));
							}
						};
						reader.readAsText(file);
					} else {
						// Markdown import: parse frontmatter and open in editor
						const reader = new FileReader();
						reader.onload = (event) => {
							const mdContent = event.target?.result;
							if (typeof mdContent === 'string') {
								const fm = parseFrontmatter(mdContent);
								const fileName = file.name.replace(/\.md$/, '');
								const rawName = fm.name || fileName;
								const displayName = formatSkillName(rawName);
								sessionStorage.skill = JSON.stringify({
									name: displayName,
									id: fm.name || '',
									description: fm.description || '',
									content: mdContent,
									is_active: true,
									access_grants: []
								});
								goto('/workspace/skills/create');
							}
						};
						reader.readAsText(file);
					}

					importInputElement.value = '';
				}
			}}
		/>

		<div class="ws-head">
			<div class="ws-title">{$i18n.t('Skills')}</div>
			<div class="ws-lede">
				{$i18n.t(
					'Reusable instruction packs that teach your models a procedure or domain — import a markdown skill or write your own, then enable it where you need it.'
				)}
			</div>
		</div>

		<div class="ws-toolbar">
			<div class="ws-search">
				<Search className="size-3.5" />
				<input
					bind:value={query}
					aria-label={$i18n.t('Search Skills')}
					placeholder={$i18n.t('Search Skills')}
				/>
				{#if query}
					<button
						class="btn-clear p-0.5"
						aria-label={$i18n.t('Clear search')}
						on:click={() => {
							query = '';
						}}
					>
						<XMark className="size-3" strokeWidth="2" />
					</button>
				{/if}
			</div>

			<div class="ws-chips">
				<button class="ws-chip {viewOption === '' ? 'on' : ''}" on:click={() => selectView('')}>
					{$i18n.t('All')}{#if total !== null}<span class="cnt">{total}</span>{/if}
				</button>
				<button
					class="ws-chip {viewOption === 'created' ? 'on' : ''}"
					on:click={() => selectView('created')}
				>
					{$i18n.t('Created by you')}
				</button>
				<button
					class="ws-chip {viewOption === 'shared' ? 'on' : ''}"
					on:click={() => selectView('shared')}
				>
					{$i18n.t('Shared with you')}
				</button>
			</div>
		</div>

		{#if filteredItems === null || loading}
			<div class="w-full h-full flex justify-center items-center my-16 mb-24">
				<Spinner className="size-5" />
			</div>
		{:else}
			<div class="ws-grid">
				{#if $user?.role === 'admin' || $user?.permissions?.workspace?.skills}
					<WorkspaceActionCard
						newLabel={$i18n.t('New Skill')}
						newSub={$i18n.t('Start from scratch')}
						importLabel={$i18n.t('Import')}
						importSub={$i18n.t('From .md or .json')}
						onNew={() => goto('/workspace/skills/create')}
						onImport={() => importInputElement.click()}
					/>
				{/if}

				{#each filteredItems as skill}
					<WorkspaceCard
						name={skill.name}
						description={skill?.description ?? skill.id}
						author={$i18n.t('By {{name}}', {
							name: capitalizeFirstLetter(
								skill?.user?.name ?? skill?.user?.email ?? $i18n.t('Deleted User')
							)
						})}
						href={skill.write_access
							? `/workspace/skills/edit?id=${encodeURIComponent(skill.id)}`
							: null}
						writeAccess={skill.write_access}
						readOnlyLabel={$i18n.t('read only')}
					>
						<div slot="avatar" class="ws-icon-avatar"><Sparkles className="size-5" /></div>

						<svelte:fragment slot="footer">
							<span class="ws-base"><Sparkles className="size-3" />{$i18n.t('Skill')}</span>
							{#if !skill.is_active}
								<span class="ws-tag">{$i18n.t('Inactive')}</span>
							{/if}
						</svelte:fragment>
					</WorkspaceCard>
				{/each}
			</div>

			{#if (filteredItems ?? []).length === 0 && (query || viewOption)}
				<div class="ws-empty">{$i18n.t('No skills match your search.')}</div>
			{/if}

			{#if total > 30}
				<div class="flex justify-center mt-4 mb-2">
					<Pagination bind:page count={total} perPage={30} />
				</div>
			{/if}
		{/if}
	</div>

	<DeleteConfirmDialog
		bind:show={showDeleteConfirm}
		title={$i18n.t('Delete skill?')}
		on:confirm={() => {
			deleteHandler(selectedSkill);
		}}
	>
		<div class=" text-sm text-gray-500 truncate">
			{$i18n.t('This will delete')} <span class="  font-medium">{selectedSkill.name}</span>.
		</div>
	</DeleteConfirmDialog>
{:else}
	<div class="w-full h-full flex justify-center items-center">
		<Spinner className="size-5" />
	</div>
{/if}

<style>
	.btn-clear {
		background: transparent;
		border-radius: 50%;
		color: var(--text-tertiary);
		transition:
			background 0.2s,
			color 0.2s;
	}
	.btn-clear:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
</style>
