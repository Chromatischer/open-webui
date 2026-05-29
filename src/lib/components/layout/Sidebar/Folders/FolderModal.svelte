<script lang="ts">
	import { getContext, tick } from 'svelte';

	import Spinner from '$lib/components/common/Spinner.svelte';
	import Modal from '$lib/components/common/Modal.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';

	import { toast } from 'svelte-sonner';
	import { models } from '$lib/stores';
	import { getFolderById } from '$lib/apis/folders';
	const i18n = getContext('i18n');

	export let show = false;
	export let onSubmit: Function = (e) => {};

	export let folderId = null;
	export let parentId = null;
	export let edit = false;

	let folder = null;
	let name = '';
	let defaultModelId = '';

	let loading = false;

	const submitHandler = async () => {
		loading = true;

		await onSubmit({
			name,
			meta: undefined,
			data: defaultModelId ? { default_model: defaultModelId } : undefined,
			parent_id: edit ? undefined : parentId
		});
		show = false;
		loading = false;
	};

	const init = async () => {
		if (folderId) {
			folder = await getFolderById(localStorage.token, folderId).catch((error) => {
				toast.error(`${error}`);
				return null;
			});

			name = folder.name;
			defaultModelId = folder.data?.default_model ?? '';
		}

		focusInput();
	};

	const focusInput = async () => {
		await tick();
		const input = document.getElementById('folder-name') as HTMLInputElement;
		if (input) {
			input.focus();
			input.select();
		}
	};

	$: if (show) {
		init();
	}

	$: if (!show && !edit) {
		name = '';
		defaultModelId = '';
	}
</script>

<Modal size="sm" bind:show>
	<div>
		<div class="flex justify-between dark:text-gray-300 px-5 pt-4 pb-1">
			<div class="text-lg font-medium self-center">
				{#if edit}
					{$i18n.t('Edit Folder')}
				{:else}
					{$i18n.t('Create Folder')}
				{/if}
			</div>
			<button
				class="self-center"
				on:click={() => {
					show = false;
				}}
			>
				<XMark className={'size-5'} />
			</button>
		</div>

		<div class="flex flex-col w-full px-5 pb-4 dark:text-gray-200">
			<form
				class="flex flex-col w-full"
				on:submit|preventDefault={() => {
					submitHandler();
				}}
			>
				<div class="flex flex-col w-full mt-1">
					<div class="mb-1 text-xs text-gray-500">{$i18n.t('Folder Name')}</div>

					<div class="flex-1">
						<input
							id="folder-name"
							class="w-full text-sm bg-transparent placeholder:text-gray-300 dark:placeholder:text-gray-700 outline-hidden"
							type="text"
							bind:value={name}
							placeholder={$i18n.t('Enter folder name')}
							autocomplete="off"
						/>
					</div>
				</div>

				<hr class="border-gray-50 dark:border-gray-850/30 my-2.5 w-full" />

				<div class="flex flex-col w-full">
					<div class="mb-1 text-xs text-gray-500">{$i18n.t('Default Model')}</div>
					<select class="w-full text-sm bg-transparent outline-hidden" bind:value={defaultModelId}>
						<option value="">{$i18n.t('None')}</option>
						{#each $models as model}
							<option value={model.id}>{model.name}</option>
						{/each}
					</select>
				</div>

				<div class="flex justify-end pt-3 text-sm font-medium gap-1.5">
					<button
						class="px-3.5 py-1.5 text-sm font-medium bg-black hover:bg-gray-950 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition rounded-full flex flex-row space-x-1 items-center {loading
							? ' cursor-not-allowed'
							: ''}"
						type="submit"
						disabled={loading}
					>
						{$i18n.t('Save')}

						{#if loading}
							<div class="ml-2 self-center">
								<Spinner />
							</div>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</Modal>
