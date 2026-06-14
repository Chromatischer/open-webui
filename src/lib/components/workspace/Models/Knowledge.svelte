<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { config, knowledge, settings, user } from '$lib/stores';

	import KnowledgeSelector from './Knowledge/KnowledgeSelector.svelte';
	import FileItem from '$lib/components/common/FileItem.svelte';

	import { getKnowledgeBases } from '$lib/apis/knowledge';
	import { uploadFile } from '$lib/apis/files';

	import { toast } from 'svelte-sonner';
	import { v4 as uuidv4 } from 'uuid';
	import { WEBUI_API_BASE_URL } from '$lib/constants';

	export let selectedItems = [];
	const i18n = getContext('i18n');

	let loaded = false;

	let filesInputElement = null;
	let inputFiles = null;

	$: if (selectedItems === null) {
		selectedItems = [];
	}

	const uploadFileHandler = async (file, fullContext: boolean = false) => {
		if ($user?.role !== 'admin' && !($user?.permissions?.chat?.file_upload ?? true)) {
			toast.error($i18n.t('You do not have permission to upload files.'));
			return null;
		}

		const tempItemId = uuidv4();
		const fileItem = {
			type: 'file',
			file: '',
			id: null,
			url: '',
			name: file.name,
			collection_name: '',
			status: 'uploading',
			size: file.size,
			error: '',
			itemId: tempItemId,
			...(fullContext ? { context: 'full' } : {})
		};

		if (fileItem.size == 0) {
			toast.error($i18n.t('You cannot upload an empty file.'));
			return null;
		}

		selectedItems = [...selectedItems, fileItem];

		try {
			// If the file is an audio file, provide the language for STT.
			let metadata = null;
			if (
				(file.type.startsWith('audio/') || file.type.startsWith('video/')) &&
				$settings?.audio?.stt?.language
			) {
				metadata = {
					language: $settings?.audio?.stt?.language
				};
			}

			// During the file upload, file content is automatically extracted.
			const uploadedFile = await uploadFile(localStorage.token, file, metadata);

			if (uploadedFile) {
				console.log('File upload completed:', {
					id: uploadedFile.id,
					name: fileItem.name,
					collection: uploadedFile?.meta?.collection_name
				});

				if (uploadedFile.error) {
					console.warn('File upload warning:', uploadedFile.error);
					toast.warning(uploadedFile.error);
				}

				fileItem.status = 'uploaded';
				fileItem.file = uploadedFile;
				fileItem.id = uploadedFile.id;
				fileItem.collection_name =
					uploadedFile?.meta?.collection_name || uploadedFile?.collection_name;
				fileItem.url = `${uploadedFile.id}`;

				selectedItems = selectedItems;
			} else {
				selectedItems = selectedItems.filter((item) => item?.itemId !== tempItemId);
			}
		} catch (e) {
			toast.error(`${e}`);
			selectedItems = selectedItems.filter((item) => item?.itemId !== tempItemId);
		}
	};

	const inputFilesHandler = async (inputFiles) => {
		console.log('Input files handler called with:', inputFiles);

		inputFiles.forEach(async (file) => {
			console.log('Processing file:', {
				name: file.name,
				type: file.type,
				size: file.size,
				extension: file.name.split('.').at(-1)
			});

			if (
				($config?.file?.max_size ?? null) !== null &&
				file.size > ($config?.file?.max_size ?? 0) * 1024 * 1024
			) {
				console.log('File exceeds max size limit:', {
					fileSize: file.size,
					maxSize: ($config?.file?.max_size ?? 0) * 1024 * 1024
				});
				toast.error(
					$i18n.t(`File size should not exceed {{maxSize}} MB.`, {
						maxSize: $config?.file?.max_size
					})
				);
				return;
			}

			if (!file['type'].startsWith('image/')) {
				uploadFileHandler(file);
			} else {
				toast.error($i18n.t(`Unsupported file type.`));
			}
		});
	};

	onMount(async () => {
		loaded = true;
	});
</script>

<input
	bind:this={filesInputElement}
	bind:files={inputFiles}
	type="file"
	hidden
	multiple
	on:change={async () => {
		if (inputFiles && inputFiles.length > 0) {
			const _inputFiles = Array.from(inputFiles);
			inputFilesHandler(_inputFiles);
		} else {
			toast.error($i18n.t(`File not found.`));
		}

		filesInputElement.value = '';
	}}
/>

<div>
	<slot name="label">
		<div class="kn-kicker">
			{$i18n.t('Knowledge')}
		</div>
	</slot>

	<div class="flex flex-col mb-1">
		{#if selectedItems?.length > 0}
			<div class=" flex flex-wrap items-center gap-2 mb-2.5">
				{#each selectedItems as file, fileIdx}
					<FileItem
						{file}
						small={true}
						item={file}
						name={file.name}
						modal={true}
						edit={true}
						loading={file.status === 'uploading'}
						type={file?.legacy
							? `Legacy${file.type ? ` ${file.type}` : ''}`
							: (file?.type ?? 'collection')}
						dismissible
						on:dismiss={(e) => {
							selectedItems = selectedItems.filter((_, idx) => idx !== fileIdx);
						}}
					/>
				{/each}
			</div>
		{/if}

		{#if loaded}
			<div class="flex flex-wrap flex-row gap-2">
				<KnowledgeSelector
					on:select={(e) => {
						const item = e.detail;

						if (!selectedItems.find((k) => k.id === item.id)) {
							selectedItems = [
								...selectedItems,
								{
									...item
								}
							];
						}
					}}
				>
					<div class="kn-btn">
						<svg
							width="12"
							height="12"
							viewBox="0 0 14 14"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" /></svg
						>
						{$i18n.t('Select Knowledge')}
					</div>
				</KnowledgeSelector>

				{#if $user?.role === 'admin' || $user?.permissions?.chat?.file_upload}
					<button
						class="kn-btn"
						type="button"
						on:click={() => {
							filesInputElement.click();
						}}
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg
						>
						{$i18n.t('Upload Files')}
					</button>
				{/if}
			</div>
		{/if}
		<!-- {knowledge} -->
	</div>

	<div class="kn-note">
		{$i18n.t('To attach knowledge base here, add them to the "Knowledge" workspace first.')}
	</div>
</div>

<style>
	.kn-kicker {
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 9px;
	}
	:global(.kn-btn) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 16px;
		border-radius: 999px;
		border: 1px dashed var(--border-hover, rgba(0, 0, 0, 0.14));
		background: transparent;
		color: var(--text-secondary);
		font-family: var(--serif, serif);
		font-style: italic;
		font-size: 14px;
		cursor: pointer;
		transition:
			border-color 0.25s,
			color 0.25s,
			background 0.25s;
	}
	:global(.kn-btn:hover) {
		border-color: var(--vermilion, var(--accent));
		color: var(--vermilion, var(--accent));
		background: var(--vermilion-soft, var(--accent-glow));
	}
	.kn-note {
		font-family: var(--serif, serif);
		font-style: italic;
		font-size: 12.5px;
		color: var(--text-tertiary);
		margin-top: 8px;
	}
</style>
