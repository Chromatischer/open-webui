<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import { toast } from 'svelte-sonner';

	import { getContext, onDestroy, onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	const i18n: Writable<i18nType> = getContext('i18n');

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import { get, type Unsubscriber, type Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import { WEBUI_BASE_URL } from '$lib/constants';
	import equal from 'fast-deep-equal';

	import {
		chatId,
		chats,
		config,
		type Model,
		models,
		tags as allTags,
		settings,
		showSidebar,
		WEBUI_NAME,
		banners,
		user,
		socket,
		showControls,
		currentChatPage,
		temporaryChatEnabled,
		mobile,
		chatTitle,
		showArtifacts,
		artifactContents,
		tools,
		toolServers,
		terminalServers,
		functions,
		selectedFolder,
		pinnedChats,
		showEmbeds,
		selectedTerminalId,
		showFileNavPath,
		showFileNavDir,
		chatRequestQueues,
		desktopEvent,
		scratchboardContent as scratchboardContentStore,
		scratchboardAgentWriting,
		showScratchboard
	} from '$lib/stores';

	import { WEBUI_API_BASE_URL } from '$lib/constants';

	import {
		convertMessagesToHistory,
		convertHeicToJpeg,
		compressImage,
		copyToClipboard,
		createMessagesList,
		extractContentFromFile,
		getPromptVariables,
		processDetails,
		getCodeBlockContents,
		isYoutubeUrl,
		displayFileHandler
	} from '$lib/utils';

	import {
		archiveChatById,
		createNewChat,
		deleteChatById,
		getAllTags,
		getChatById,
		getChatList,
		getPinnedChatList,
		getTagsById,
		updateChatById,
		updateChatFolderIdById
	} from '$lib/apis/chats';
	import { generateOpenAIChatCompletion } from '$lib/apis/openai';
	import { processWeb, processWebSearch, processYoutubeVideo } from '$lib/apis/retrieval';
	import { getAndUpdateUserLocation, getUserSettings } from '$lib/apis/users';
	import {
		generateQueries,
		chatAction,
		generateMoACompletion,
		stopTask,
		stopTasksByChatId,
		getTaskIdsByChatId
	} from '$lib/apis';
	import { getTools } from '$lib/apis/tools';
	import { uploadFile } from '$lib/apis/files';
	import { createOpenAITextStream } from '$lib/apis/streaming';
	import { getFunctions } from '$lib/apis/functions';
	import { updateFolderById } from '$lib/apis/folders';

	import Folio from '$lib/components/chat/Folio.svelte';
	import EventConfirmDialog from '../common/ConfirmDialog.svelte';
	import DeleteConfirmDialog from '../common/ConfirmDialog.svelte';
	import FilesOverlay from './MessageInput/FilesOverlay.svelte';
	import NotificationToast from '../NotificationToast.svelte';
	import Spinner from '../common/Spinner.svelte';
	import { getBanners } from '$lib/apis/configs';

	export let chatIdProp = '';

	let loading = true;

	const eventTarget = new EventTarget();
	let processing = '';

	let showEventConfirmation = false;
	let eventConfirmationTitle = '';
	let eventConfirmationMessage = '';
	let eventConfirmationInput = false;
	let eventConfirmationInputPlaceholder = '';
	let eventConfirmationInputValue = '';
	let eventConfirmationInputType = '';
	let eventCallback = null;

	// The agent's ask_user tool: a structured question that replaces the composer
	// (the Folio edge) until the user answers, then returns the answer to the tool.
	let pendingQuestion = null;

	let selectedModels = [''];
	let atSelectedModel: Model | undefined;
	let selectedModelIds = [];
	$: if (atSelectedModel !== undefined) {
		selectedModelIds = [atSelectedModel.id];
	} else {
		selectedModelIds = selectedModels;
	}

	let selectedToolIds = [];
	let selectedFilterIds = [];
	let pendingOAuthTools = [];

	let imageGenerationEnabled = false;
	let webSearchEnabled = false;
	let codeInterpreterEnabled = false;

	let showCommands = false;

	let generating = false;
	let dragged = false;
	let generationController = null;

	let chat = null;
	let tags = [];

	let chatTasks = [];

	let history = {
		messages: {},
		currentId: null
	};

	let taskIds = null;

	// Chat Input
	let prompt = '';
	let chatFiles = [];
	let files = [];
	let params = {};

	$: if (chatIdProp) {
		navigateHandler();
	}

	let saveControlsTimer;
	$: if (!loading && !$temporaryChatEnabled && $chatId && params && chatFiles) {
		clearTimeout(saveControlsTimer);
		saveControlsTimer = setTimeout(saveControls, 400);
	}

	const navigateHandler = async () => {
		// Mark the outgoing chat as read before loading the new one.
		// $chatId still holds the previous chat here — loadChat() updates it.
		if ($chatId && $chatId !== chatIdProp && !$temporaryChatEnabled) {
			updateLastReadAt($chatId);
		}

		clearTimeout(saveControlsTimer);
		await saveControls();
		loading = true;

		prompt = '';

		files = [];
		selectedToolIds = [];
		selectedFilterIds = [];
		webSearchEnabled = false;
		imageGenerationEnabled = false;

		const storageChatInput = sessionStorage.getItem(
			`chat-input${chatIdProp ? `-${chatIdProp}` : ''}`
		);

		if (chatIdProp && (await loadChat())) {
			await tick();
			loading = false;
			await tick();

			// Mark chat read when initially loading it
			if (chatIdProp && !$temporaryChatEnabled) {
				updateLastReadAt(chatIdProp);
			}

			// Process any queued requests if the chat is idle
			const lastMessage = history.currentId ? history.messages[history.currentId] : null;
			const isIdle = !lastMessage || lastMessage.role !== 'assistant' || lastMessage.done;
			if (isIdle) {
				await processNextInQueue(chatIdProp);
			}

			if (storageChatInput) {
				try {
					const input = JSON.parse(storageChatInput);

					if (!$temporaryChatEnabled) {
						files = input.files;
						selectedToolIds = input.selectedToolIds;
						selectedFilterIds = input.selectedFilterIds;
						webSearchEnabled = input.webSearchEnabled;
						imageGenerationEnabled = input.imageGenerationEnabled;
						codeInterpreterEnabled = input.codeInterpreterEnabled;
					}
				} catch (e) {}
			} else {
				await setDefaults();
			}

			const chatInput = document.getElementById('chat-input');
			chatInput?.focus();
		} else {
			await goto('/');
		}
	};

	$: if (selectedModels && chatIdProp !== '') {
		saveSessionSelectedModels();
	}

	const saveSessionSelectedModels = () => {
		const selectedModelsString = JSON.stringify(selectedModels);
		if (
			selectedModels.length === 0 ||
			(selectedModels.length === 1 && selectedModels[0] === '') ||
			sessionStorage.selectedModels === selectedModelsString
		) {
			return;
		}
		sessionStorage.selectedModels = selectedModelsString;
		console.log('saveSessionSelectedModels', selectedModels, sessionStorage.selectedModels);
	};

	let oldSelectedModelIds = [''];
	$: if (!equal(selectedModelIds, oldSelectedModelIds)) {
		onSelectedModelIdsChange();
	}

	const onSelectedModelIdsChange = () => {
		resetInput();
		oldSelectedModelIds = structuredClone(selectedModelIds);
	};

	const resetInput = async () => {
		selectedToolIds = [];
		selectedFilterIds = [];
		pendingOAuthTools = [];
		webSearchEnabled = false;
		imageGenerationEnabled = false;
		codeInterpreterEnabled = false;

		if (selectedModelIds.filter((id) => id).length > 0) {
			await setDefaults();
		}
	};

	/** Check whether a terminal ID references an available system or direct terminal. */
	const isTerminalAvailable = (tid: string): boolean => {
		return (
			($terminalServers ?? []).some((t) => t.id && t.id === tid) ||
			($settings?.terminalServers ?? []).some((s) => s.url === tid)
		);
	};

	const setDefaults = async () => {
		if (!$tools) {
			tools.set(await getTools(localStorage.token));
		}
		if (!$functions) {
			functions.set(await getFunctions(localStorage.token));
		}
		if (selectedModels.length !== 1 && !atSelectedModel) {
			return;
		}

		const model = atSelectedModel ?? $models.find((m) => m.id === selectedModels[0]);
		if (model) {
			// Set Default Tools
			if (model?.info?.meta?.toolIds) {
				const defaultIds = [
					...new Set(
						[...(model?.info?.meta?.toolIds ?? [])].filter((id) => $tools.find((t) => t.id === id))
					)
				];

				// Separate unauthenticated OAuth tools
				const unauthed = [];
				const authed = [];
				for (const id of defaultIds) {
					const tool = $tools.find((t) => t.id === id);
					if (tool && tool.authenticated === false) {
						const parts = id.split(':');
						const serverId = parts.at(-1) ?? id;
						const authType =
							parts.length > 1 ? (parts[0] === 'server' ? parts[1] : parts[0]) : null;
						unauthed.push({ id, name: tool.name ?? id, serverId, authType });
					} else {
						authed.push(id);
					}
				}
				selectedToolIds = authed;
				pendingOAuthTools = unauthed;
			} else if ($settings?.tools) {
				selectedToolIds = $settings.tools;
			} else {
				selectedToolIds = selectedToolIds.filter((id) => !id.startsWith('direct_server:'));
			}

			// Set Default Filters (Toggleable only)
			if (model?.info?.meta?.defaultFilterIds) {
				selectedFilterIds = model.info.meta.defaultFilterIds.filter((id) =>
					model?.filters?.find((f) => f.id === id)
				);
			}

			// Set Default Features
			if (model?.info?.meta?.defaultFeatureIds) {
				if (
					model.info?.meta?.capabilities?.['image_generation'] &&
					$config?.features?.enable_image_generation &&
					($user?.role === 'admin' || $user?.permissions?.features?.image_generation)
				) {
					imageGenerationEnabled = model.info.meta.defaultFeatureIds.includes('image_generation');
				}

				if (
					model.info?.meta?.capabilities?.['web_search'] &&
					$config?.features?.enable_web_search &&
					($user?.role === 'admin' || $user?.permissions?.features?.web_search)
				) {
					webSearchEnabled = model.info.meta.defaultFeatureIds.includes('web_search');
				}

				if (
					model.info?.meta?.capabilities?.['code_interpreter'] &&
					$config?.features?.enable_code_interpreter &&
					($user?.role === 'admin' || $user?.permissions?.features?.code_interpreter)
				) {
					codeInterpreterEnabled = model.info.meta.defaultFeatureIds.includes('code_interpreter');
				}
			}

			// Set Default Terminal — only if the referenced terminal actually exists
			if (model?.info?.meta?.terminalId) {
				const tid = model.info.meta.terminalId;
				if (isTerminalAvailable(tid)) {
					selectedTerminalId.set(tid);
				}
			}
		}
	};

	const showMessage = async (message, scroll = true) => {
		const _chatId = JSON.parse(JSON.stringify($chatId));
		let _messageId = JSON.parse(JSON.stringify(message.id));

		let messageChildrenIds = [];
		if (_messageId === null) {
			messageChildrenIds = Object.keys(history.messages).filter(
				(id) => history.messages[id].parentId === null
			);
		} else {
			messageChildrenIds = history.messages[_messageId].childrenIds;
		}

		while (messageChildrenIds.length !== 0) {
			_messageId = messageChildrenIds.at(-1);
			messageChildrenIds = history.messages[_messageId].childrenIds;
		}

		history.currentId = _messageId;

		await tick();

		if (($settings?.scrollOnBranchChange ?? true) && scroll) {
			const messageElement = document.getElementById(`message-${message.id}`);
			if (messageElement) {
				messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}

		await tick();
		await tick();
		await tick();

		saveChatHandler(_chatId, history);
	};

	const updateLastReadAt = (id) => {
		$socket?.emit('events:chat', {
			chat_id: id,
			data: { type: 'last_read_at' }
		});
	};

	const terminalEventHandler = (type: string, data: any) => {
		if (type === 'terminal:display_file') {
			if (!data?.path) return;
			displayFileHandler(data.path, { showControls, showFileNavPath });
		} else if (type === 'terminal:write_file' || type === 'terminal:replace_file_content') {
			if (!data?.path) return;
			showFileNavDir.set(data.path);
		} else if (type === 'terminal:run_command') {
			showFileNavDir.set('/');
		}
	};

	const chatEventHandler = async (event, cb) => {
		console.log(event);

		if (event.chat_id === $chatId) {
			await tick();
			let message = history.messages[event.message_id];

			if (message) {
				const type = event?.data?.type ?? null;
				const data = event?.data?.data ?? null;

				if (type === 'status') {
					if (message?.statusHistory) {
						message.statusHistory.push(data);
					} else {
						message.statusHistory = [data];
					}
				} else if (type === 'chat:completion') {
					chatCompletionEventHandler(data, message, event.chat_id);
				} else if (type === 'chat:tasks:cancel') {
					if (event.message_id === history.currentId) {
						taskIds = null;
						// Set all response messages to done
						for (const messageId of history.messages[message.parentId].childrenIds) {
							history.messages[messageId].done = true;
						}
						await processNextInQueue($chatId);
					} else {
						message.done = true;
					}
				} else if (type === 'chat:message:delta' || type === 'message') {
					message.content += data.content;
				} else if (type === 'chat:message' || type === 'replace') {
					message.content = data.content;
				} else if (type === 'chat:message:files' || type === 'files') {
					message.files = data.files;
				} else if (type === 'chat:message:tasks') {
					chatTasks = data.tasks;
				} else if (type === 'chat:message:scratchboard') {
					scratchboardContentStore.set(data?.content ?? '');
					if (chat?.chat) {
						chat.chat = { ...chat.chat, scratchboard: data?.content ?? '' };
					}
				} else if (type === 'chat:message:embeds' || type === 'embeds') {
					message.embeds = data.embeds;

					// Auto-scroll to the embed once it's rendered in the DOM
					await tick();
					setTimeout(() => {
						const embedEl = document.getElementById(`${event.message_id}-embeds-container`);
						if (embedEl) {
							embedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
						}
					}, 100);
				} else if (type === 'chat:message:error') {
					message.error = data.error;
					const errorContent = data.error?.content ?? data.error;
					toast.error(
						typeof errorContent === 'string'
							? errorContent
							: JSON.stringify(errorContent ?? $i18n.t('The provider rejected the request.'))
					);
				} else if (type === 'chat:message:follow_ups') {
					message.followUps = data.follow_ups;
				} else if (type === 'chat:outlet') {
					// Outlet filter ran on backend — sync in-memory state
					const outletMessages = data.messages ?? [];
					for (const msg of outletMessages) {
						if (msg?.id && history.messages[msg.id]) {
							const existing = history.messages[msg.id];
							if (existing.content !== msg.content) {
								history.messages[msg.id] = {
									...existing,
									originalContent: existing.content,
									...msg
								};
							}
						}
					}
					history = history;
					return; // Patches history.messages directly; skip the trailing write-back.
				} else if (type === 'chat:message:favorite') {
					// Update message favorite status
					message.favorite = data.favorite;
				} else if (type === 'chat:title') {
					chatTitle.set(data);
					currentChatPage.set(1);
					await chats.set(await getChatList(localStorage.token, $currentChatPage));
				} else if (type === 'chat:tags') {
					chat = await getChatById(localStorage.token, $chatId);
					allTags.set(await getAllTags(localStorage.token));
				} else if (type === 'source' || type === 'citation') {
					if (data?.type === 'code_execution') {
						// Code execution; update existing code execution by ID, or add new one.
						if (!message?.code_executions) {
							message.code_executions = [];
						}

						const existingCodeExecutionIndex = message.code_executions.findIndex(
							(execution) => execution.id === data.id
						);

						if (existingCodeExecutionIndex !== -1) {
							message.code_executions[existingCodeExecutionIndex] = data;
						} else {
							message.code_executions.push(data);
						}

						message.code_executions = message.code_executions;
					} else {
						// Regular source.
						if (message?.sources) {
							message.sources.push(data);
						} else {
							message.sources = [data];
						}
					}
				} else if (type === 'notification') {
					const toastType = data?.type ?? 'info';
					const toastContent = data?.content ?? '';

					if (toastType === 'success') {
						toast.success(toastContent);
					} else if (toastType === 'error') {
						toast.error(toastContent);
					} else if (toastType === 'warning') {
						toast.warning(toastContent);
					} else {
						toast.info(toastContent);
					}
				} else if (type === 'confirmation') {
					eventCallback = cb;

					eventConfirmationInput = false;
					showEventConfirmation = true;

					eventConfirmationTitle = data.title;
					eventConfirmationMessage = data.message;
				} else if (type === 'execute') {
					eventCallback = cb;

					try {
						// Use Function constructor to evaluate code in a safer way
						const asyncFunction = new Function(`return (async () => { ${data.code} })()`);
						const result = await asyncFunction(); // Await the result of the async function

						if (cb) {
							cb(result);
						}
					} catch (error) {
						console.error('Error executing code:', error);
					}
				} else if (type === 'input') {
					eventCallback = cb;

					eventConfirmationInput = true;
					showEventConfirmation = true;

					eventConfirmationTitle = data.title;
					eventConfirmationMessage = data.message;
					eventConfirmationInputPlaceholder = data.placeholder;
					eventConfirmationInputValue = data?.value ?? '';
					eventConfirmationInputType = data?.type ?? '';
				} else if (type === 'question') {
					// ask_user tool: surface the structured question inline (replaces
					// the composer) and return the user's answer as the tool result
					eventCallback = cb;
					pendingQuestion = data;
				} else if (type.startsWith('terminal:')) {
					terminalEventHandler(type, data);
				} else {
					console.log('Unknown message type', data);
				}

				history.messages[event.message_id] = message;
				// Replace the top-level reference so runes children ($derived over the
				// bound history prop) re-run on every streamed delta — in-place
				// mutation keeps the same object identity and is filtered out there.
				history = { ...history };
			}
		} else {
			// Non-active chat completion: queue stays in the global store.
			// navigateHandler will process it when the user returns to that chat.
		}
	};

	const onMessageHandler = async (event: {
		origin: string;
		data: { type: string; text: string };
	}) => {
		const isSameOrigin = event.origin === window.origin;
		const type = event.data?.type;

		// Prompt-related message types only submit text to the chat input —
		// functionally equivalent to the user typing.  When same-origin is
		// enabled they go through immediately.  When it is disabled (opaque
		// origin) we show a confirmation dialog so the user stays in control.
		const iframePromptTypes = ['input:prompt', 'input:prompt:submit', 'action:submit'];

		if (!isSameOrigin && !iframePromptTypes.includes(type)) {
			return;
		}

		if (type === 'action:submit') {
			console.debug(event.data.text);

			if (prompt !== '') {
				await tick();
				submitHandler(prompt);
			}
		}

		if (type === 'input:prompt') {
			console.debug(event.data.text);

			const inputElement = document.getElementById('chat-input');

			if (inputElement) {
				inputElement.focus();
			}
		}

		if (type === 'input:prompt:submit') {
			console.debug(event.data.text);

			if (event.data.text !== '') {
				if (isSameOrigin) {
					await tick();
					submitHandler(event.data.text);
				} else {
					// Cross-origin: ask user to confirm before submitting
					eventConfirmationInput = false;
					eventConfirmationTitle = $i18n.t('Confirm Prompt from Embed');
					eventConfirmationMessage = event.data.text;
					eventCallback = async (confirmed: boolean) => {
						if (confirmed) {
							await tick();
							submitHandler(event.data.text);
						}
					};
					showEventConfirmation = true;
				}
			}
		}
	};

	const savedModelIds = async () => {
		if (
			$selectedFolder &&
			selectedModels.filter((modelId) => modelId !== '').length > 0 &&
			!equal($selectedFolder?.data?.model_ids, selectedModels)
		) {
			const res = await updateFolderById(localStorage.token, $selectedFolder.id, {
				data: {
					model_ids: selectedModels
				}
			});
		}
	};

	$: if (selectedModels !== null) {
		savedModelIds();
	}

	onMount(() => {
		loading = true;
		console.log('mounted');
		window.addEventListener('message', onMessageHandler);
		$socket?.on('events', chatEventHandler);

		// Restore direct terminal enabled states based on persisted selectedTerminalId
		if ($settings?.terminalServers?.length) {
			settings.set({
				...$settings,
				terminalServers: ($settings.terminalServers ?? []).map((s) => ({
					...s,
					enabled: $selectedTerminalId !== null && s.url === $selectedTerminalId
				}))
			});
		}

		// Clear stale selectedTerminalId if the referenced terminal no longer exists
		if ($selectedTerminalId && !isTerminalAvailable($selectedTerminalId)) {
			selectedTerminalId.set(null);
		}

		const pageSubscribe = page.subscribe(async (p) => {
			if (p.url.pathname === '/') {
				await tick();
				initNewChat();

				// Re-fetch banners on navigation to homepage so newly configured banners appear
				try {
					banners.set(await getBanners(localStorage.token).catch(() => []));
				} catch (e) {
					console.error('Failed to refresh banners:', e);
				}
			}
		});

		const showControlsSubscribe = showControls.subscribe(async (value) => {
			await tick();
			if (!value) {
				showArtifacts.set(false);
				showEmbeds.set(false);
			}
		});

		const selectedFolderSubscribe = selectedFolder.subscribe(async (folder) => {
			await tick();
			if (folder?.data?.model_ids && !equal(selectedModels, folder.data.model_ids)) {
				selectedModels = folder.data.model_ids;

				console.log('Set selectedModels from folder data:', selectedModels);
			}
		});

		const storageChatInput = sessionStorage.getItem(
			`chat-input${chatIdProp ? `-${chatIdProp}` : ''}`
		);

		const init = async () => {
			if (!chatIdProp) {
				loading = false;
				await tick();
			}

			if (storageChatInput) {
				prompt = '';

				files = [];
				selectedToolIds = [];
				selectedFilterIds = [];
				webSearchEnabled = false;
				imageGenerationEnabled = false;
				codeInterpreterEnabled = false;

				try {
					const input = JSON.parse(storageChatInput);

					if (!$temporaryChatEnabled) {
						files = input.files;
						selectedToolIds = input.selectedToolIds;
						selectedFilterIds = input.selectedFilterIds;
						webSearchEnabled = input.webSearchEnabled;
						imageGenerationEnabled = input.imageGenerationEnabled;
						codeInterpreterEnabled = input.codeInterpreterEnabled;
					}
				} catch (e) {}
			}

			const chatInput = document.getElementById('chat-input');
			chatInput?.focus();
		};
		init();

		return () => {
			try {
				clearTimeout(saveControlsTimer);
				saveControls();
				if (chatIdProp && !$temporaryChatEnabled) {
					updateLastReadAt(chatIdProp);
				}
				pageSubscribe();
				showControlsSubscribe();
				selectedFolderSubscribe();
				window.removeEventListener('message', onMessageHandler);
				$socket?.off('events', chatEventHandler);
			} catch (e) {
				console.error(e);
			}
		};
	});

	// File upload functions

	const uploadGoogleDriveFile = async (fileData) => {
		console.log('Starting uploadGoogleDriveFile with:', {
			id: fileData.id,
			name: fileData.name,
			url: fileData.url,
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		// Validate input
		if (!fileData?.id || !fileData?.name || !fileData?.url || !fileData?.headers?.Authorization) {
			throw new Error('Invalid file data provided');
		}

		const tempItemId = uuidv4();
		const fileItem = {
			type: 'file',
			file: '',
			id: null,
			url: fileData.url,
			name: fileData.name,
			collection_name: '',
			status: 'uploading',
			error: '',
			itemId: tempItemId,
			size: 0
		};

		try {
			files = [...files, fileItem];
			console.log('Processing web file with URL:', fileData.url);

			// Configure fetch options with proper headers
			const fetchOptions = {
				headers: {
					Authorization: fileData.headers.Authorization,
					Accept: '*/*'
				},
				method: 'GET'
			};

			// Attempt to fetch the file
			console.log('Fetching file content from Google Drive...');
			const fileResponse = await fetch(fileData.url, fetchOptions);

			if (!fileResponse.ok) {
				const errorText = await fileResponse.text();
				throw new Error(`Failed to fetch file (${fileResponse.status}): ${errorText}`);
			}

			// Get content type from response
			const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
			console.log('Response received with content-type:', contentType);

			// Convert response to blob
			console.log('Converting response to blob...');
			const fileBlob = await fileResponse.blob();

			if (fileBlob.size === 0) {
				throw new Error('Retrieved file is empty');
			}

			console.log('Blob created:', {
				size: fileBlob.size,
				type: fileBlob.type || contentType
			});

			// Create File object with proper MIME type
			const file = new File([fileBlob], fileData.name, {
				type: fileBlob.type || contentType
			});

			console.log('File object created:', {
				name: file.name,
				size: file.size,
				type: file.type
			});

			if (file.size === 0) {
				throw new Error('Created file is empty');
			}

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

			// Upload file to server
			console.log('Uploading file to server...');
			const uploadedFile = await uploadFile(localStorage.token, file, metadata);

			if (!uploadedFile) {
				throw new Error('Server returned null response for file upload');
			}

			console.log('File uploaded successfully:', uploadedFile);

			// Update file item with upload results
			fileItem.status = 'uploaded';
			fileItem.file = uploadedFile;
			fileItem.id = uploadedFile.id;
			fileItem.size = file.size;
			fileItem.collection_name = uploadedFile?.meta?.collection_name;
			fileItem.url = `${uploadedFile.id}`;

			files = files;
		} catch (e) {
			console.error('Error uploading file:', e);
			files = files.filter((f) => f.itemId !== tempItemId);
			toast.error(
				$i18n.t('Error uploading file: {{error}}', {
					error: e.message || 'Unknown error'
				})
			);
		}
	};

	const uploadWeb = async (urls) => {
		if ($user?.role !== 'admin' && !($user?.permissions?.chat?.web_upload ?? true)) {
			toast.error($i18n.t('You do not have permission to upload web content.'));
			return;
		}

		if (!Array.isArray(urls)) {
			urls = [urls];
		}

		// Create file items first
		const fileItems = urls.map((url) => ({
			type: 'text',
			name: url,
			collection_name: '',
			status: 'uploading',
			context: 'full',
			url,
			error: ''
		}));

		// Display all items at once
		files = [...files, ...fileItems];

		for (const fileItem of fileItems) {
			try {
				const res = isYoutubeUrl(fileItem.url)
					? await processYoutubeVideo(localStorage.token, fileItem.url)
					: await processWeb(localStorage.token, '', fileItem.url);

				if (res) {
					fileItem.status = 'uploaded';
					fileItem.collection_name = res.collection_name;
					fileItem.file = {
						...res.file,
						...fileItem.file
					};
				}

				files = [...files];
			} catch (e) {
				files = files.filter((f) => f.name !== url);
				toast.error(`${e}`);
			}
		}
	};

	const onUpload = async (event) => {
		const { type, data } = event;

		if (type === 'google-drive') {
			await uploadGoogleDriveFile(data);
		} else if (type === 'web') {
			await uploadWeb(data);
		}
	};

	const uploadFileHandler = async (file, process = true, itemData = {}) => {
		if ($user?.role !== 'admin' && !($user?.permissions?.chat?.file_upload ?? true)) {
			toast.error($i18n.t('You do not have permission to upload files.'));
			return null;
		}

		const fileUploadCapableModels = selectedModels.filter(
			(modelId) =>
				$models.find((m) => m.id === modelId)?.info?.meta?.capabilities?.file_upload ?? true
		);
		if (fileUploadCapableModels.length !== selectedModels.length) {
			toast.error($i18n.t('Model(s) do not support file upload'));
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
			...itemData
		};

		if (fileItem.size == 0) {
			toast.error($i18n.t('You cannot upload an empty file.'));
			return null;
		}

		files = [...files, fileItem];

		if (!$temporaryChatEnabled) {
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
				const uploadedFile = await uploadFile(localStorage.token, file, metadata, process);

				if (uploadedFile) {
					if (uploadedFile.error) {
						toast.warning(uploadedFile.error);
					}

					fileItem.status = 'uploaded';
					fileItem.file = uploadedFile;
					fileItem.id = uploadedFile.id;
					fileItem.collection_name =
						uploadedFile?.meta?.collection_name || uploadedFile?.collection_name;
					fileItem.content_type = uploadedFile.meta?.content_type || uploadedFile.content_type;
					fileItem.url = `${uploadedFile.id}`;

					files = files;
				} else {
					files = files.filter((item) => item?.itemId !== tempItemId);
				}
			} catch (e) {
				toast.error(`${e}`);
				files = files.filter((item) => item?.itemId !== tempItemId);
			}
		} else {
			// Temporary chat: extract the content locally instead of uploading.
			const content = await extractContentFromFile(file).catch((error) => {
				toast.error(
					$i18n.t('Failed to extract content from the file: {{error}}', { error: error })
				);
				return null;
			});

			if (content === null) {
				toast.error($i18n.t('Failed to extract content from the file.'));
				files = files.filter((item) => item?.itemId !== tempItemId);
				return null;
			}

			fileItem.status = 'uploaded';
			fileItem.type = 'text';
			fileItem.content = content;
			fileItem.id = uuidv4();
			files = files;
		}
	};

	const inputFilesHandler = async (inputFiles) => {
		if (
			($config?.file?.max_count ?? null) !== null &&
			files.length + inputFiles.length > $config?.file?.max_count
		) {
			toast.error(
				$i18n.t(`You can only chat with a maximum of {{maxCount}} file(s) at a time.`, {
					maxCount: $config?.file?.max_count
				})
			);
			return;
		}

		inputFiles.forEach(async (file) => {
			if (
				($config?.file?.max_size ?? null) !== null &&
				file.size > ($config?.file?.max_size ?? 0) * 1024 * 1024
			) {
				toast.error(
					$i18n.t(`File size should not exceed {{maxSize}} MB.`, {
						maxSize: $config?.file?.max_size
					})
				);
				return;
			}

			if (file['type'].startsWith('image/')) {
				const visionCapableModels = selectedModels.filter(
					(modelId) =>
						$models.find((m) => m.id === modelId)?.info?.meta?.capabilities?.vision ?? true
				);
				if (visionCapableModels.length === 0) {
					toast.error($i18n.t('Selected model(s) do not support image inputs'));
					return;
				}

				const compressImageHandler = async (imageUrl, settings = {}, config = {}) => {
					const settingsCompression = settings?.imageCompression ?? false;
					const configWidth = config?.file?.image_compression?.width ?? null;
					const configHeight = config?.file?.image_compression?.height ?? null;

					if (!settingsCompression && !configWidth && !configHeight) {
						return imageUrl;
					}

					let width = null;
					let height = null;

					if (settingsCompression) {
						width = settings?.imageCompressionSize?.width ?? null;
						height = settings?.imageCompressionSize?.height ?? null;
					}

					// Apply config limits as an upper bound if any
					if (configWidth && (width === null || width > configWidth)) {
						width = configWidth;
					}
					if (configHeight && (height === null || height > configHeight)) {
						height = configHeight;
					}

					if (width || height) {
						return await compressImage(imageUrl, width, height);
					}
					return imageUrl;
				};

				let reader = new FileReader();
				reader.onload = async (event) => {
					let imageUrl = event.target.result;
					imageUrl = await compressImageHandler(imageUrl, $settings, $config);

					if ($temporaryChatEnabled) {
						files = [
							...files,
							{
								type: 'image',
								url: imageUrl
							}
						];
					} else {
						const blob = await (await fetch(imageUrl)).blob();
						const compressedFile = new File([blob], file.name, { type: file.type });
						uploadFileHandler(compressedFile, false);
					}
				};
				reader.readAsDataURL(file['type'] === 'image/heic' ? await convertHeicToJpeg(file) : file);
			} else {
				uploadFileHandler(file);
			}
		});
	};

	// Drag & drop onto the desk: files land as enclosures at the edge.
	const onDragOver = (e: DragEvent) => {
		e.preventDefault();
		dragged = e.dataTransfer?.types?.includes('Files') ?? false;
	};
	const onDragLeave = (e: DragEvent) => {
		if ((e.currentTarget as HTMLElement)?.contains(e.relatedTarget as Node)) {
			return;
		}
		dragged = false;
	};
	const onDrop = async (e: DragEvent) => {
		e.preventDefault();
		dragged = false;
		if (e.dataTransfer?.files) {
			const inputFiles = Array.from(e.dataTransfer.files);
			if (inputFiles.length > 0) {
				inputFilesHandler(inputFiles);
			}
		}
	};

	const onHistoryChange = (history) => {
		if (history) {
			clearTimeout(contentsRAF);
			contentsRAF = setTimeout(() => {
				getContents();
				contentsRAF = null;
			}, 0);
		} else {
			artifactContents.set([]);
		}
	};

	$: onHistoryChange(history);

	const getContents = () => {
		const messages = history ? createMessagesList(history, history.currentId) : [];
		let contents = [];
		messages.forEach((message) => {
			if (message?.role !== 'user' && message?.content) {
				const { codeBlocks: codeBlocks, htmlGroups: htmlGroups } = getCodeBlockContents(
					message.content
				);

				if (htmlGroups && htmlGroups.length > 0) {
					htmlGroups.forEach((group) => {
						const renderedContent = `
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
							<${''}style>
								body {
									background-color: white; /* Ensure the iframe has a white background */
								}

								${group.css}
							</${''}style>
                        </head>
                        <body>
                            ${group.html}

							<${''}script>
                            	${group.js}
							</${''}script>
                        </body>
                        </html>
                    `;
						contents = [...contents, { type: 'iframe', content: renderedContent }];
					});
				} else {
					// Check for SVG content
					for (const block of codeBlocks) {
						if (block.lang === 'svg' || (block.lang === 'xml' && block.code.includes('<svg'))) {
							contents = [...contents, { type: 'svg', content: block.code }];
						}
					}
				}
			}
		});

		artifactContents.set(contents);
	};

	//////////////////////////
	// Web functions
	//////////////////////////

	const initNewChat = async () => {
		console.log('initNewChat');
		if ($user?.role !== 'admin' && $user?.permissions?.chat?.temporary_enforced) {
			await temporaryChatEnabled.set(true);
		}

		if ($settings?.temporaryChatByDefault ?? false) {
			if ($temporaryChatEnabled === false) {
				await temporaryChatEnabled.set(true);
			} else if ($temporaryChatEnabled === null) {
				// if set to null set to false; refer to temp chat toggle click handler
				await temporaryChatEnabled.set(false);
			}
		}

		if ($user?.role !== 'admin' && !$user?.permissions?.chat?.temporary) {
			await temporaryChatEnabled.set(false);
		}

		const availableModels = $models
			.filter((m) => !(m?.info?.meta?.hidden ?? false))
			.map((m) => m.id);

		const defaultModels = $config?.default_models ? $config?.default_models.split(',') : [];

		if ($page.url.searchParams.get('models') || $page.url.searchParams.get('model')) {
			const urlModels = (
				$page.url.searchParams.get('models') ||
				$page.url.searchParams.get('model') ||
				''
			)?.split(',');

			if (urlModels.length === 1) {
				if (!$models.find((m) => m.id === urlModels[0])) {
					// Model not found; open model selector and prefill
					const modelSelectorButton = document.getElementById('model-selector-0-button');
					if (modelSelectorButton) {
						modelSelectorButton.click();
						await tick();

						const modelSelectorInput = document.getElementById('model-search-input');
						if (modelSelectorInput) {
							modelSelectorInput.focus();
							modelSelectorInput.value = urlModels[0];
							modelSelectorInput.dispatchEvent(new Event('input'));
						}
					}
				} else {
					// Model found; set it as selected
					selectedModels = urlModels;
				}
			} else {
				// Multiple models; set as selected
				selectedModels = urlModels;
			}

			// Unavailable models filtering
			selectedModels = selectedModels.filter((modelId) =>
				$models.map((m) => m.id).includes(modelId)
			);
		} else {
			if ($selectedFolder?.data?.model_ids) {
				// Set from folder model IDs
				selectedModels = $selectedFolder?.data?.model_ids;
			} else {
				if (sessionStorage.selectedModels) {
					// Set from session storage (temporary selection)
					selectedModels = JSON.parse(sessionStorage.selectedModels);
					sessionStorage.removeItem('selectedModels');
				} else {
					if ($settings?.models) {
						// Set from user settings
						selectedModels = $settings?.models;
					} else if (defaultModels && defaultModels.length > 0) {
						// Set from default models
						selectedModels = defaultModels;
					}
				}
			}

			// Unavailable & hidden models filtering
			selectedModels = selectedModels.filter((modelId) => availableModels.includes(modelId));
		}

		// Ensure at least one model is selected
		if (selectedModels.length === 0 || (selectedModels.length === 1 && selectedModels[0] === '')) {
			if (availableModels.length > 0) {
				if (defaultModels && defaultModels.length > 0) {
					selectedModels = defaultModels.filter((modelId) => availableModels.includes(modelId));
				}

				if (
					selectedModels.length === 0 ||
					(selectedModels.length === 1 && selectedModels[0] === '')
				) {
					// Only fall back to first available model if default models didn't resolve
					selectedModels = [availableModels?.at(0) ?? ''];
				}
			} else {
				selectedModels = [''];
			}
		}

		await showControls.set(false);
		await showArtifacts.set(false);

		if ($page.url.pathname.includes('/c/')) {
			window.history.replaceState(history.state, '', `/`);
		}

		await resetInput();
		await chatId.set('');
		await chatTitle.set('');

		history = {
			messages: {},
			currentId: null
		};

		chatFiles = [];
		params = {};
		taskIds = null;
		chatTasks = [];

		if ($page.url.searchParams.get('youtube')) {
			await uploadWeb(`https://www.youtube.com/watch?v=${$page.url.searchParams.get('youtube')}`);
		}

		if ($page.url.searchParams.get('load-url')) {
			await uploadWeb($page.url.searchParams.get('load-url'));
		}

		if ($page.url.searchParams.get('web-search') === 'true') {
			webSearchEnabled = true;
		}

		if ($page.url.searchParams.get('image-generation') === 'true') {
			imageGenerationEnabled = true;
		}

		if ($page.url.searchParams.get('code-interpreter') === 'true') {
			codeInterpreterEnabled = true;
		}

		if ($page.url.searchParams.get('tools')) {
			selectedToolIds = $page.url.searchParams
				.get('tools')
				?.split(',')
				.map((id) => id.trim())
				.filter((id) => id);
		} else if ($page.url.searchParams.get('tool-ids')) {
			selectedToolIds = $page.url.searchParams
				.get('tool-ids')
				?.split(',')
				.map((id) => id.trim())
				.filter((id) => id);
		}

		// Restore tool selection after OAuth redirect
		const pendingToolId = sessionStorage.getItem('pendingOAuthToolId');
		if (pendingToolId) {
			sessionStorage.removeItem('pendingOAuthToolId');
			if (!selectedToolIds.includes(pendingToolId)) {
				selectedToolIds = [...selectedToolIds, pendingToolId];
			}
		}

		// Consume one-shot desktop event (e.g. Spotlight query, call shortcut)
		if ($desktopEvent) {
			const event = $desktopEvent;
			desktopEvent.set(null);

			if (event.type === 'query') {
				const query = event.data?.query;
				const eventFiles = event.data?.files;

				// Attach screenshot images from desktop (e.g. Spotlight region capture)
				if (eventFiles?.length) {
					for (const ef of eventFiles) {
						files = [
							...files,
							{
								type: 'image',
								url: ef.dataUrl,
								name: ef.name
							}
						];
					}
				}

				if (query || eventFiles?.length) {
					if (query) {
					}
					await tick();
					submitHandler(query || '');
				}
			}
		} else if ($page.url.searchParams.get('q')) {
			const q = $page.url.searchParams.get('q') ?? '';

			if (q) {
				if (($page.url.searchParams.get('submit') ?? 'true') === 'true') {
					await tick();
					submitHandler(q);
				}
			}
		}

		selectedModels = selectedModels.map((modelId) =>
			$models.map((m) => m.id).includes(modelId) ? modelId : ''
		);

		const chatInput = document.getElementById('chat-input');
		setTimeout(() => chatInput?.focus(), 0);
	};

	const loadChat = async () => {
		chatId.set(chatIdProp);

		if ($temporaryChatEnabled) {
			temporaryChatEnabled.set(false);
		}

		chat = await getChatById(localStorage.token, $chatId).catch(async (error) => {
			await goto('/');
			return null;
		});

		if (chat) {
			tags = await getTagsById(localStorage.token, $chatId).catch(async (error) => {
				return [];
			});

			const chatContent = chat.chat;

			if (chatContent) {
				console.log(chatContent);

				selectedModels =
					(chatContent?.models ?? undefined) !== undefined
						? chatContent.models
						: [chatContent.models ?? ''];

				if (!($user?.role === 'admin' || ($user?.permissions?.chat?.multiple_models ?? true))) {
					selectedModels = selectedModels.length > 0 ? [selectedModels[0]] : [''];
				}

				oldSelectedModelIds = structuredClone(selectedModels);

				history =
					(chatContent?.history ?? undefined) !== undefined
						? chatContent.history
						: convertMessagesToHistory(chatContent.messages);

				// Sanitize history: repair orphaned references from failed regenerations (#24424)
				for (const message of Object.values(history.messages)) {
					if (message.childrenIds) {
						message.childrenIds = message.childrenIds.filter(
							(childId) => history.messages[childId]
						);
					}
				}
				if (history.currentId && !history.messages[history.currentId]) {
					const messageIds = Object.keys(history.messages);
					let lastMessageId = null;
					for (const messageId of messageIds) {
						const message = history.messages[messageId];
						if (
							(message.childrenIds ?? []).length === 0 &&
							(!lastMessageId ||
								(message.timestamp ?? 0) > (history.messages[lastMessageId].timestamp ?? 0))
						) {
							lastMessageId = messageId;
						}
					}
					history.currentId = lastMessageId ?? messageIds[0] ?? null;
				}

				chatTitle.set(chatContent.title);

				params = chatContent?.params ?? {};
				chatFiles = chatContent?.files ?? [];

				// Load tasks from chat-level DB field
				chatTasks = chat?.tasks ?? [];
				if (chatContent?.scratchboard !== undefined) {
					scratchboardContentStore.set(chatContent.scratchboard ?? '');
				}

				await tick();

				// Mark all non-current assistant messages as done
				if (history.currentId) {
					for (const message of Object.values(history.messages)) {
						if (
							message &&
							message.role === 'assistant' &&
							message.id !== history.currentId &&
							message.done !== false
						) {
							message.done = true;
						}
					}
				}

				// Reconcile active tasks with message state:
				// If the response is already done, remaining tasks are just background
				// work (follow-ups, title gen) that shouldn't block the input.
				const pendingTaskIds = await getTaskIdsByChatId(localStorage.token, $chatId)
					.then((res) => res?.task_ids ?? [])
					.catch(() => []);
				const currentMessage = history.currentId ? history.messages[history.currentId] : null;
				const responseComplete = currentMessage?.role === 'assistant' && currentMessage?.done;

				if (pendingTaskIds.length > 0 && !responseComplete) {
					taskIds = pendingTaskIds;
				} else {
					taskIds = null;
					// No active tasks and message incomplete → generation was interrupted
					if (currentMessage?.role === 'assistant' && !currentMessage.done) {
						currentMessage.done = true;
					}
				}

				await tick();

				return true;
			} else {
				return null;
			}
		}
	};

	let contentsRAF = null;

	let processingQueueChats = new Set<string>();

	const processNextInQueue = async (targetChatId: string) => {
		if (processingQueueChats.has(targetChatId)) return;

		const queue = $chatRequestQueues[targetChatId];
		if (!queue || queue.length === 0) return;

		processingQueueChats.add(targetChatId);
		try {
			const combinedPrompt = queue.map((m) => m.prompt).join('\n\n');
			const combinedFiles = queue.flatMap((m) => m.files);

			chatRequestQueues.update((q) => {
				const { [targetChatId]: _, ...rest } = q;
				return rest;
			});

			await submitPrompt(combinedPrompt, combinedFiles);
		} finally {
			processingQueueChats.delete(targetChatId);
		}
	};

	// ─── The Margin: the agent writes follow-ups onto the shared scratchboard ───
	// When a finished response carries a list (a plan / next steps), the agent
	// streams those items into the margin live — the FOLIO "draft → margin notes".
	const extractFollowups = (content: string): string[] => {
		const items: string[] = [];
		for (const ln of String(content ?? '').split('\n')) {
			const m = ln.match(/^\s*(?:[-*]|\d+\.)\s+(.+)/);
			if (m) {
				const text = m[1].replace(/[*_`]/g, '').trim();
				if (text) items.push(text.length > 90 ? `${text.slice(0, 88)}…` : text);
			}
		}
		return items.slice(0, 4);
	};

	let marginWriteToken = 0;
	const writeMarginNote = (text: string) => {
		const token = ++marginWriteToken;
		scratchboardAgentWriting.set(true);
		showScratchboard.set(true);
		let buf = get(scratchboardContentStore);
		let i = 0;
		const step = () => {
			if (token !== marginWriteToken) return; // superseded by a newer note
			if (i >= text.length) {
				scratchboardAgentWriting.set(false);
				return;
			}
			const n = 1 + Math.floor(Math.random() * 2);
			buf += text.slice(i, i + n);
			i += n;
			scratchboardContentStore.set(buf);
			setTimeout(step, 16 + Math.random() * 26);
		};
		setTimeout(step, 300);
	};

	const chatCompletedHandler = async (_chatId, modelId, responseMessageId, messages) => {
		// Backend handles outlet filters and persistence inline.
		// Just refresh the sidebar chat list.
		if ($chatId == _chatId && !$temporaryChatEnabled) {
			currentChatPage.set(1);
			await chats.set(await getChatList(localStorage.token, $currentChatPage));
		}
		taskIds = null;

		// The agent writes the response's follow-ups into the margin
		const completed = history?.messages?.[responseMessageId];
		const followups = extractFollowups(completed?.content);
		if (followups.length >= 2 && !get(scratchboardAgentWriting)) {
			writeMarginNote(`\n\n## Follow-ups\n${followups.map((f) => `- ${f}`).join('\n')}`);
		}
	};

	const chatActionHandler = async (_chatId, actionId, modelId, responseMessageId, event = null) => {
		const messages = createMessagesList(history, responseMessageId);

		const res = await chatAction(localStorage.token, actionId, {
			model: modelId,
			messages: messages.map((m) => ({
				id: m.id,
				role: m.role,
				content: m.content,
				info: m.info ? m.info : undefined,
				timestamp: m.timestamp,
				...(m.sources ? { sources: m.sources } : {})
			})),
			...(event ? { event: event } : {}),
			model_item: $models.find((m) => m.id === modelId),
			chat_id: _chatId,
			session_id: $socket?.id,
			id: responseMessageId
		}).catch((error) => {
			toast.error(`${error}`);
			messages.at(-1).error = { content: error };
			return null;
		});

		if (res !== null && res.messages) {
			// Update chat history with the new messages
			for (const message of res.messages) {
				history.messages[message.id] = {
					...history.messages[message.id],
					...(history.messages[message.id].content !== message.content
						? { originalContent: history.messages[message.id].content }
						: {}),
					...message
				};
			}
		}

		if ($chatId == _chatId) {
			if (!$temporaryChatEnabled) {
				chat = await updateChatById(localStorage.token, _chatId, {
					models: selectedModels,
					messages: messages,
					history: history,
					params: params,
					scratchboard: get(scratchboardContentStore),
					files: chatFiles
				});

				currentChatPage.set(1);
				await chats.set(await getChatList(localStorage.token, $currentChatPage));
			}
		}
	};

	const getChatEventEmitter = async (modelId: string, chatId: string = '') => {
		return setInterval(() => {
			$socket?.emit('usage', {
				action: 'chat',
				model: modelId,
				chat_id: chatId
			});
		}, 1000);
	};

	const createMessagePair = async (userPrompt) => {
		if (selectedModels.length === 0) {
			toast.error($i18n.t('Model not selected'));
		} else {
			const modelId = selectedModels[0];
			const model = $models.filter((m) => m.id === modelId).at(0);

			if (!model) {
				toast.error($i18n.t('Model not found'));
				return;
			}

			const messages = createMessagesList(history, history.currentId);
			const parentMessage = messages.length !== 0 ? messages.at(-1) : null;

			const userMessageId = uuidv4();
			const responseMessageId = uuidv4();

			const userMessage = {
				id: userMessageId,
				parentId: parentMessage ? parentMessage.id : null,
				childrenIds: [responseMessageId],
				role: 'user',
				content: userPrompt ? userPrompt : `[PROMPT] ${userMessageId}`,
				timestamp: Math.floor(Date.now() / 1000)
			};

			const responseMessage = {
				id: responseMessageId,
				parentId: userMessageId,
				childrenIds: [],
				role: 'assistant',
				content: `[RESPONSE] ${responseMessageId}`,
				done: true,

				model: modelId,
				modelName: model.name ?? model.id,
				modelIdx: 0,
				timestamp: Math.floor(Date.now() / 1000)
			};

			if (parentMessage) {
				parentMessage.childrenIds.push(userMessageId);
				history.messages[parentMessage.id] = parentMessage;
			}
			history.messages[userMessageId] = userMessage;
			history.messages[responseMessageId] = responseMessage;

			history.currentId = responseMessageId;

			await tick();

			if (messages.length === 0) {
				await initChatHandler(history);
			} else {
				await saveChatHandler($chatId, history);
			}
		}
	};

	const addMessages = async ({ modelId, parentId, messages }) => {
		const model = $models.filter((m) => m.id === modelId).at(0);

		let parentMessage = history.messages[parentId];
		let currentParentId = parentMessage ? parentMessage.id : null;
		for (const message of messages) {
			let messageId = uuidv4();

			if (message.role === 'user') {
				const userMessage = {
					id: messageId,
					parentId: currentParentId,
					childrenIds: [],
					timestamp: Math.floor(Date.now() / 1000),
					...message
				};

				if (parentMessage) {
					parentMessage.childrenIds.push(messageId);
					history.messages[parentMessage.id] = parentMessage;
				}

				history.messages[messageId] = userMessage;
				parentMessage = userMessage;
				currentParentId = messageId;
			} else {
				const responseMessage = {
					id: messageId,
					parentId: currentParentId,
					childrenIds: [],
					done: true,
					model: model.id,
					modelName: model.name ?? model.id,
					modelIdx: 0,
					timestamp: Math.floor(Date.now() / 1000),
					...message
				};

				if (parentMessage) {
					parentMessage.childrenIds.push(messageId);
					history.messages[parentMessage.id] = parentMessage;
				}

				history.messages[messageId] = responseMessage;
				parentMessage = responseMessage;
				currentParentId = messageId;
			}
		}

		history.currentId = currentParentId;
		await tick();

		if (messages.length === 0) {
			await initChatHandler(history);
		} else {
			await saveChatHandler($chatId, history);
		}
	};

	const chatCompletionEventHandler = async (data, message, chatId) => {
		const { id, done, choices, content, output, sources, selected_model_id, error, usage } = data;

		// Store raw OR-aligned output items from backend
		if (output) {
			message.output = output;
		}

		if (error) {
			await handleOpenAIError(error, message);
		}

		if (sources && !message?.sources) {
			message.sources = sources;
		}

		if (choices) {
			if (choices[0]?.message?.content) {
				// Non-stream response
				message.content += choices[0]?.message?.content;
			} else {
				// Stream response
				let value = choices[0]?.delta?.content ?? '';
				if (message.content == '' && value == '\n') {
					console.log('Empty response');
				} else {
					message.content += value;

					if (navigator.vibrate && ($settings?.hapticFeedback ?? false)) {
						navigator.vibrate(5);
					}
				}
			}
		}

		if (content) {
			// REALTIME_CHAT_SAVE is disabled
			message.content = content;

			if (navigator.vibrate && ($settings?.hapticFeedback ?? false)) {
				navigator.vibrate(5);
			}
		}

		if (selected_model_id) {
			message.selectedModelId = selected_model_id;
			message.arena = true;
		}

		if (usage) {
			message.usage = usage;
		}

		history.messages[message.id] = message;

		if (done) {
			message.done = true;

			if ($settings.responseAutoCopy) {
				copyToClipboard(message.content);
			}

			if ($settings.responseAutoPlayback) {
				await tick();
				document.getElementById(`speak-button-${message.id}`)?.click();
			}
			eventTarget.dispatchEvent(
				new CustomEvent('chat:finish', {
					detail: {
						id: message.id,
						content: message.content
					}
				})
			);

			history.messages[message.id] = message;
			history = { ...history };

			await tick();

			// Fire-and-forget: run chatCompletedHandler for background work
			// (outlet filters, chat save, title gen, follow-ups, tags)
			// without blocking the user from sending new messages.
			chatCompletedHandler(
				chatId,
				message.model,
				message.id,
				createMessagesList(history, message.id)
			);

			// Process next queued request if any
			await processNextInQueue(chatId);
		}

		console.log(data);
		await tick();
	};

	//////////////////////////
	// Chat functions
	//////////////////////////

	const submitPrompt = async (inputContent, inputFiles) => {
		const _files = structuredClone(inputFiles);

		chatFiles.push(
			..._files.filter(
				(item) =>
					['doc', 'text', 'note', 'chat', 'folder', 'collection'].includes(item.type) ||
					(item.type === 'file' && !(item?.content_type ?? '').startsWith('image/'))
			)
		);
		chatFiles = chatFiles.filter(
			// Remove duplicates
			(item, index, array) => array.findIndex((i) => equal(i, item)) === index
		);

		// Create user message
		let userMessageId = uuidv4();
		let userMessage = {
			id: userMessageId,
			parentId: history.currentId ?? null,
			childrenIds: [],
			role: 'user',
			content: inputContent,
			files: _files.length > 0 ? _files : undefined,
			timestamp: Math.floor(Date.now() / 1000), // Unix epoch
			models: selectedModels
		};

		// Add message to history and Set currentId to messageId
		history.messages[userMessageId] = userMessage;

		// Append messageId to childrenIds of parent message
		if (history.currentId !== null) {
			history.messages[history.currentId].childrenIds.push(userMessageId);
		}

		history.currentId = userMessageId;

		const chatInput = document.getElementById('chat-input');
		chatInput?.focus();

		saveSessionSelectedModels();

		await sendMessage(history, userMessageId);
	};

	const submitHandler = async (userPrompt, { _raw = false } = {}) => {
		console.log('submitHandler', userPrompt, $chatId);

		const _selectedModels = selectedModels.map((modelId) =>
			$models.map((m) => m.id).includes(modelId) ? modelId : ''
		);

		if (!equal(selectedModels, _selectedModels)) {
			selectedModels = _selectedModels;
		}

		if (pendingOAuthTools.length > 0) {
			toast.warning($i18n.t('Please connect all required integrations before sending a message'));
			return;
		}
		if (userPrompt === '' && files.length === 0) {
			toast.error($i18n.t('Please enter a prompt'));
			return;
		}
		if (selectedModels.includes('')) {
			toast.error($i18n.t('Model not selected'));
			return;
		}

		if (
			files.length > 0 &&
			files.filter((file) => file.type !== 'image' && file.status === 'uploading').length > 0
		) {
			toast.error(
				$i18n.t(`Oops! There are files still uploading. Please wait for the upload to complete.`)
			);
			return;
		}

		if (
			($config?.file?.max_count ?? null) !== null &&
			files.length + chatFiles.length > $config?.file?.max_count
		) {
			toast.error(
				$i18n.t(`You can only chat with a maximum of {{maxCount}} file(s) at a time.`, {
					maxCount: $config?.file?.max_count
				})
			);
			return;
		}

		// Check if the assistant is still generating the main response
		// (don't block on background tasks like title gen, follow-ups, tags)
		const lastMessage = history.currentId ? history.messages[history.currentId] : null;
		const isGenerating = lastMessage && lastMessage.role === 'assistant' && !lastMessage.done;

		if (isGenerating) {
			if ($settings?.enableMessageQueue ?? true) {
				// Enqueue the request
				const _files = structuredClone(files);
				chatRequestQueues.update((q) => ({
					...q,
					[$chatId]: [...(q[$chatId] ?? []), { id: uuidv4(), prompt: userPrompt, files: _files }]
				}));
				// Clear input
				prompt = '';
				files = [];
				return;
			} else {
				// Interrupt: stop current generation and proceed
				await stopResponse();
				await tick();
			}
		}

		if (history?.currentId) {
			const currentMessage = history.messages[history.currentId];

			if (currentMessage.error && !currentMessage.content) {
				// Error in response
				toast.error($i18n.t(`Oops! There was an error in the previous response.`));
				return;
			}
		}

		// Clear input and submit
		prompt = '';
		const _files = structuredClone(files);
		files = [];

		await submitPrompt(userPrompt, _files);
	};

	const sendMessage = async (
		_history,
		parentId: string,
		{
			messages = null,
			modelId = null,
			modelIdx = null,
			regenerationPrompt = null
		}: {
			messages?: any[] | null;
			modelId?: string | null;
			modelIdx?: number | null;
			regenerationPrompt?: string | null;
		} = {}
	) => {
		let _chatId = JSON.parse(JSON.stringify($chatId));
		_history = structuredClone(_history);

		const responseMessageIds: Record<PropertyKey, string> = {};
		// If modelId is provided, use it, else use selected model
		let selectedModelIds = modelId
			? [modelId]
			: atSelectedModel !== undefined
				? [atSelectedModel.id]
				: selectedModels;

		// Create response messages for each selected model
		// Build message_ids map: {model_id: assistant_message_id}
		const messageIdsMap: Record<string, string> = {};
		for (const [_modelIdx, modelId] of selectedModelIds.entries()) {
			const model = $models.filter((m) => m.id === modelId).at(0);

			if (model) {
				let responseMessageId = uuidv4();
				let responseMessage = {
					parentId: parentId,
					id: responseMessageId,
					childrenIds: [],
					role: 'assistant',
					content: '',
					done: false,
					model: model.id,
					modelName: model.name ?? model.id,
					modelIdx: modelIdx ? modelIdx : _modelIdx,
					timestamp: Math.floor(Date.now() / 1000) // Unix epoch
				};

				// Add message to history and Set currentId to messageId
				history.messages[responseMessageId] = responseMessage;
				history.currentId = responseMessageId;

				// Append messageId to childrenIds of parent message
				if (parentId !== null && history.messages[parentId]) {
					history.messages[parentId].childrenIds = [
						...history.messages[parentId].childrenIds,
						responseMessageId
					];
				}

				responseMessageIds[`${modelId}-${modelIdx ? modelIdx : _modelIdx}`] = responseMessageId;
				messageIdsMap[modelId] = responseMessageId;
			}
		}
		history = history;

		// New chat — backend generates the chat_id on first request
		if (!_chatId) {
			if ($temporaryChatEnabled) {
				_chatId = `local:${$socket?.id}`;
				await chatId.set(_chatId);
			}
			await tick();
		}

		await tick();

		// Re-clone history so sendMessageSocket gets the response messages we just added
		_history = structuredClone(history);

		// Vision capability check
		for (const mid of selectedModelIds) {
			const model = $models.filter((m) => m.id === mid).at(0);
			if (model) {
				const hasImages = createMessagesList(_history, parentId).some((message) =>
					message.files?.some(
						(file) => file.type === 'image' || (file?.content_type ?? '').startsWith('image/')
					)
				);

				if (
					hasImages &&
					!(model.info?.meta?.capabilities?.vision ?? true) &&
					!imageGenerationEnabled
				) {
					toast.error(
						$i18n.t('Model {{modelName}} is not vision capable', {
							modelName: model.name ?? model.id
						})
					);
				}
			}
		}

		// Single request — backend fans out to all models
		const primaryModelId = selectedModelIds[0];
		const primaryModel = $models.filter((m) => m.id === primaryModelId).at(0);
		const primaryResponseMessageId = messageIdsMap[primaryModelId];

		if (primaryModel && primaryResponseMessageId) {
			const chatEventEmitter = await getChatEventEmitter(primaryModel.id, _chatId);

			await sendMessageSocket(
				primaryModel,
				messages && messages.length > 0
					? messages
					: createMessagesList(_history, primaryResponseMessageId),
				_history,
				primaryResponseMessageId,
				_chatId,
				{
					messageIdsMap: selectedModelIds.length > 1 ? messageIdsMap : undefined,
					regenerationPrompt
				}
			);

			if (chatEventEmitter) clearInterval(chatEventEmitter);
		}
	};

	const getFeatures = () => {
		let features = {};

		if ($config?.features)
			features = {
				voice: false,
				image_generation:
					$config?.features?.enable_image_generation &&
					($user?.role === 'admin' || $user?.permissions?.features?.image_generation)
						? imageGenerationEnabled
						: false,
				code_interpreter:
					$config?.features?.enable_code_interpreter &&
					($user?.role === 'admin' || $user?.permissions?.features?.code_interpreter)
						? codeInterpreterEnabled
						: false,
				web_search:
					$config?.features?.enable_web_search &&
					($user?.role === 'admin' || $user?.permissions?.features?.web_search)
						? webSearchEnabled
						: false
			};

		const currentModels = atSelectedModel?.id ? [atSelectedModel.id] : selectedModels;
		if (
			currentModels.filter(
				(model) => $models.find((m) => m.id === model)?.info?.meta?.capabilities?.web_search ?? true
			).length === currentModels.length
		) {
			if ($config?.features?.enable_web_search && ($settings?.webSearch ?? false) === 'always') {
				features = { ...features, web_search: true };
			}
		}

		if ($settings?.memory ?? false) {
			features = { ...features, memory: true };
		}

		return features;
	};

	const getStopTokens = () => {
		const stop = params?.stop ?? $settings?.params?.stop;
		if (!stop) return undefined;

		const tokens = Array.isArray(stop) ? stop : stop.split(',').map((s) => s.trim());

		return tokens
			.filter(Boolean)
			.map((token) => decodeURIComponent(JSON.parse(`"${token.replace(/"/g, '\\"')}"`)));
	};

	const sendMessageSocket = async (
		model,
		_messages,
		_history,
		responseMessageId,
		_chatId,
		{
			messageIdsMap,
			regenerationPrompt,
			continueResponse = false
		}: {
			messageIdsMap?: Record<string, string>;
			regenerationPrompt?: string | null;
			continueResponse?: boolean;
		} = {}
	) => {
		const responseMessage = _history.messages[responseMessageId];
		const userMessage = _history.messages[responseMessage.parentId];

		const chatMessageFiles = _messages
			.filter((message) => message.files)
			.flatMap((message) => message.files);

		// Filter chatFiles to only include files that are in the chatMessageFiles
		chatFiles = chatFiles.filter((item) => {
			const fileExists = chatMessageFiles.some((messageFile) => messageFile.id === item.id);
			return fileExists;
		});

		let files = structuredClone(chatFiles);
		files.push(
			...(userMessage?.files ?? []).filter(
				(item) =>
					['doc', 'text', 'note', 'chat', 'collection', 'folder'].includes(item.type) ||
					(item.type === 'file' && !(item?.content_type ?? '').startsWith('image/'))
			)
		);
		// Remove duplicates
		files = files.filter((item, index, array) => array.findIndex((i) => equal(i, item)) === index);

		eventTarget.dispatchEvent(
			new CustomEvent('chat:start', {
				detail: {
					id: responseMessageId
				}
			})
		);
		await tick();

		let userLocation;
		if ($settings?.userLocation) {
			userLocation = await getAndUpdateUserLocation(localStorage.token).catch((err) => {
				console.error(err);
				return undefined;
			});
		}

		const stream =
			model?.info?.params?.stream_response ??
			$settings?.params?.stream_response ??
			params?.stream_response ??
			true;
		// Always include system prompt — backend extracts it and prepends to DB messages.
		// Only temp chats need conversation messages (persisted chats load from DB).
		let messages = [
			params?.system || $settings.system
				? { role: 'system', content: `${params?.system ?? $settings?.system ?? ''}` }
				: undefined
		].filter(Boolean);

		if ($temporaryChatEnabled) {
			messages = [
				...messages,
				..._messages.map((message) => ({
					...message,
					content: processDetails(message.content),
					...(message.output ? { output: message.output } : {})
				}))
			].filter((message) => message);

			messages = messages
				.map((message, idx, arr) => {
					const imageFiles = (message?.files ?? []).filter(
						(file) => file.type === 'image' || (file?.content_type ?? '').startsWith('image/')
					);

					return {
						role: message.role,
						...(message.output ? { output: message.output } : {}),
						...(message.role === 'user' && imageFiles.length > 0
							? {
									content: [
										{
											type: 'text',
											text: message?.merged?.content ?? message.content
										},
										...imageFiles.map((file) => ({
											type: 'image_url',
											image_url: {
												url: file.url
											}
										}))
									]
								}
							: {
									content: message?.merged?.content ?? message.content
								})
					};
				})
				.filter((message) => message?.role === 'user' || message?.content?.trim());
		}

		const toolIds = [];
		const toolServerIds = [];

		for (const toolId of selectedToolIds) {
			if (toolId.startsWith('direct_server:')) {
				let serverId = toolId.replace('direct_server:', '');
				// Check if serverId is a number
				if (!isNaN(parseInt(serverId))) {
					toolServerIds.push(parseInt(serverId));
				} else {
					toolServerIds.push(serverId);
				}
			} else {
				toolIds.push(toolId);
			}
		}

		// Parse skill mentions (<$skillId|label>) from user messages
		// Use the user-selected terminal from the dropdown
		const activeTerminalId = $selectedTerminalId ?? null;

		// Only send terminal_id if the model has terminal capability enabled
		const terminalEnabled = model.info?.meta?.capabilities?.terminal ?? true;

		const res = await generateOpenAIChatCompletion(
			localStorage.token,
			{
				stream: stream,
				model: model.id,
				...(messages.length > 0 ? { messages } : {}),
				params: {
					...$settings?.params,
					...params,
					stop: getStopTokens()
				},

				files: (files?.length ?? 0) > 0 ? files : undefined,

				filter_ids: selectedFilterIds.length > 0 ? selectedFilterIds : undefined,
				tool_ids: toolIds.length > 0 ? toolIds : undefined,
				terminal_id: terminalEnabled ? (activeTerminalId ?? undefined) : undefined,
				tool_servers: [
					...($toolServers ?? []).filter(
						(server, idx) => toolServerIds.includes(idx) || toolServerIds.includes(server?.id)
					),
					// Direct terminal servers — always included when enabled (not routed through selectedToolIds)
					...($terminalServers ?? []).filter((t) => !t.id)
				],
				features: getFeatures(),
				variables: {
					...getPromptVariables(
						$user?.name,
						$settings?.userLocation ? userLocation : undefined,
						$user?.email
					)
				},
				model_item: $models.find((m) => m.id === model.id),

				session_id: $socket?.id,
				chat_id: _chatId || undefined,
				folder_id: $selectedFolder?.id ?? undefined,

				id: responseMessageId,
				...(messageIdsMap ? { message_ids: messageIdsMap } : {}),
				parent_id: userMessage?.parentId ?? null,
				user_message: userMessage,
				...(regenerationPrompt ? { regeneration_prompt: regenerationPrompt } : {}),
				...(continueResponse ? { assistant_message_id: responseMessageId } : {}),

				background_tasks: {
					...(!$temporaryChatEnabled && !_chatId && (userMessage?.parentId ?? null) === null
						? {
								title_generation: $settings?.title?.auto ?? true,
								tags_generation: $settings?.autoTags ?? true
							}
						: {}),
					follow_up_generation: $settings?.autoFollowUps ?? true
				},

				...(stream && (model.info?.meta?.capabilities?.usage ?? false)
					? {
							stream_options: {
								include_usage: true
							}
						}
					: {})
			},
			`${WEBUI_BASE_URL}/api`
		).catch(async (error) => {
			console.log(error);

			let errorMessage = error;
			if (error?.error?.message) {
				errorMessage = error.error.message;
			} else if (error?.message) {
				errorMessage = error.message;
			}

			if (typeof errorMessage === 'object') {
				errorMessage = $i18n.t(`Uh-oh! There was an issue with the response.`);
			}

			toast.error(`${errorMessage}`);
			responseMessage.error = {
				content: error
			};

			responseMessage.done = true;

			history.messages[responseMessageId] = responseMessage;
			history.currentId = responseMessageId;

			return null;
		});

		if (res) {
			if (res.error) {
				await handleOpenAIError(res.error, responseMessage);
			} else {
				// Backend returns task_ids (multi-model) or task_id (single model)
				const newTaskIds = res.task_ids ?? (res.task_id ? [res.task_id] : []);
				if (taskIds) {
					taskIds.push(...newTaskIds);
				} else {
					taskIds = newTaskIds;
				}

				// Backend returns chat_id for new chats — set store + URL.
				// Only update if the user hasn't navigated to a different chat
				// while the request was in flight (prevents overwriting $chatId
				// and causing spurious toast notifications / state duplication).
				if (res.chat_id && $chatId !== res.chat_id && $chatId === _chatId) {
					await chatId.set(res.chat_id);
					if (!$temporaryChatEnabled) {
						window.history.replaceState(history.state, '', `/c/${res.chat_id}`);
						currentChatPage.set(1);
						await chats.set(await getChatList(localStorage.token, $currentChatPage));

						// Persist chat-level params (system prompt, advanced
						// params) that the backend doesn't receive in the
						// chat completion request.  Files are now persisted
						// by the backend at chat creation time.
						if (Object.keys(params).length > 0 || get(scratchboardContentStore)) {
							await updateChatById(localStorage.token, res.chat_id, {
								params: params,
								scratchboard: get(scratchboardContentStore)
							});
						}
					}
				}
			}
		}

		await tick();
	};

	const handleOpenAIError = async (error, responseMessage) => {
		let errorMessage = '';
		let innerError;

		if (error) {
			innerError = error;
		}

		console.error(innerError);
		if ('detail' in innerError) {
			// FastAPI error
			toast.error(innerError.detail);
			errorMessage = innerError.detail;
		} else if ('error' in innerError) {
			// OpenAI error
			if ('message' in innerError.error) {
				toast.error(innerError.error.message);
				errorMessage = innerError.error.message;
			} else {
				toast.error(innerError.error);
				errorMessage = innerError.error;
			}
		} else if ('message' in innerError) {
			// OpenAI error
			toast.error(innerError.message);
			errorMessage = innerError.message;
		}

		responseMessage.error = {
			content: $i18n.t(`Uh-oh! There was an issue with the response.`) + '\n' + errorMessage
		};
		responseMessage.done = true;

		if (responseMessage.statusHistory) {
			responseMessage.statusHistory = responseMessage.statusHistory.filter(
				(status) => status.action !== 'knowledge_search'
			);
		}

		history.messages[responseMessage.id] = responseMessage;
	};

	const stopResponse = async (processQueue = true) => {
		if (taskIds) {
			if ($chatId) {
				await stopTasksByChatId(localStorage.token, $chatId).catch((error) => {
					toast.error(`${error}`);
					return null;
				});
			} else {
				for (const taskId of taskIds) {
					const res = await stopTask(localStorage.token, taskId).catch((error) => {
						toast.error(`${error}`);
						return null;
					});
				}
			}

			taskIds = null;

			const responseMessage = history.messages[history.currentId];
			// Set all response messages to done
			if (responseMessage.parentId && history.messages[responseMessage.parentId]) {
				for (const messageId of history.messages[responseMessage.parentId].childrenIds) {
					history.messages[messageId].done = true;
				}
			}

			history.messages[history.currentId] = responseMessage;
		}

		if (generating) {
			generating = false;
			generationController?.abort();
			generationController = null;
		}

		if (processQueue) {
			await processNextInQueue($chatId);
		}
	};

	const submitMessage = async (parentId, prompt) => {
		let userPrompt = prompt;
		let userMessageId = uuidv4();

		let userMessage = {
			id: userMessageId,
			parentId: parentId,
			childrenIds: [],
			role: 'user',
			content: userPrompt,
			models: selectedModels,
			timestamp: Math.floor(Date.now() / 1000) // Unix epoch
		};

		if (parentId !== null) {
			history.messages[parentId].childrenIds = [
				...history.messages[parentId].childrenIds,
				userMessageId
			];
		}

		history.messages[userMessageId] = userMessage;
		history.currentId = userMessageId;

		await tick();

		await sendMessage(history, userMessageId);
	};

	const regenerateResponse = async (message, suggestionPrompt = null) => {
		console.log('regenerateResponse');

		if (history.currentId) {
			let userMessage = history.messages[message.parentId];

			if (!userMessage) {
				toast.error($i18n.t('Parent message not found'));
				return;
			}

			const currentModelIds = selectedModels.filter(Boolean);
			const regenerationModelId =
				currentModelIds.length === 1
					? currentModelIds[0]
					: (userMessage?.models ?? []).length > 1
						? message.model
						: null;

			await sendMessage(history, userMessage.id, {
				...(suggestionPrompt
					? {
							messages: createMessagesList(history, message.id),
							regenerationPrompt: suggestionPrompt
						}
					: {}),
				...(regenerationModelId
					? {
							modelId: regenerationModelId,
							modelIdx: currentModelIds.length === 1 ? 0 : message.modelIdx
						}
					: {})
			});
		}
	};

	const continueResponse = async () => {
		console.log('continueResponse');
		const _chatId = JSON.parse(JSON.stringify($chatId));

		if (history.currentId && history.messages[history.currentId].done == true) {
			const responseMessage = history.messages[history.currentId];
			responseMessage.done = false;
			await tick();

			const model = $models
				.filter((m) => m.id === (responseMessage?.selectedModelId ?? responseMessage.model))
				.at(0);

			if (model) {
				await sendMessageSocket(
					model,
					createMessagesList(history, responseMessage.id),
					history,
					responseMessage.id,
					_chatId,
					{ continueResponse: true }
				);
			}
		}
	};

	const mergeResponses = async (messageId, responses, _chatId) => {
		console.log('mergeResponses', messageId, responses);
		const message = history.messages[messageId];
		const mergedResponse = {
			status: true,
			content: ''
		};
		message.merged = mergedResponse;
		history.messages[messageId] = message;

		try {
			generating = true;
			const [res, controller] = await generateMoACompletion(
				localStorage.token,
				message.model ?? '',
				message.parentId ? history.messages[message.parentId].content : '',
				responses
			);

			if (res && res.ok && res.body && generating) {
				generationController = controller as AbortController;
				const textStream = await createOpenAITextStream(
					res.body,
					Boolean($settings?.splitLargeChunks ?? false)
				);
				for await (const update of textStream) {
					const { value, done, sources, error, usage } = update;
					if (error || done) {
						generating = false;
						generationController = null;
						break;
					}

					if (mergedResponse.content == '' && value == '\n') {
						continue;
					} else {
						mergedResponse.content += value;
						history.messages[messageId] = message;
					}
				}

				await saveChatHandler(_chatId, history);
			} else {
				console.error(res);
			}
		} catch (e) {
			console.error(e);
		}
	};

	const initChatHandler = async (history) => {
		let _chatId = $chatId;

		if (!$temporaryChatEnabled) {
			chat = await createNewChat(
				localStorage.token,
				{
					id: _chatId,
					title: $i18n.t('New Chat'),
					models: selectedModels,
					system: $settings.system ?? undefined,
					params: params,
					scratchboard: get(scratchboardContentStore),
					history: history,
					messages: createMessagesList(history, history.currentId),
					tags: [],
					timestamp: Date.now()
				},
				$selectedFolder?.id
			);

			_chatId = chat.id;
			await chatId.set(_chatId);

			window.history.replaceState(history.state, '', `/c/${_chatId}`);

			await tick();

			await chats.set(await getChatList(localStorage.token, $currentChatPage));
			currentChatPage.set(1);

			selectedFolder.set(null);
		} else {
			_chatId = `local:${$socket?.id}`; // Use socket id for temporary chat
			await chatId.set(_chatId);
		}
		await tick();

		return _chatId;
	};

	const saveChatHandler = async (_chatId, history) => {
		if ($chatId == _chatId) {
			if (!$temporaryChatEnabled) {
				chat = await updateChatById(localStorage.token, _chatId, {
					models: selectedModels,
					history: history,
					messages: createMessagesList(history, history.currentId),
					params: params,
					scratchboard: get(scratchboardContentStore),
					files: chatFiles
				});
			}
		}
	};

	const saveControls = async () => {
		if (!$chatId || $temporaryChatEnabled) return;
		await updateChatById(localStorage.token, $chatId, { params, files: chatFiles }).catch((err) =>
			console.error('[controls autosave]', err)
		);
	};

	const MAX_DRAFT_LENGTH = 5000;
	let saveDraftTimeout: ReturnType<typeof setTimeout> | null = null;

	const saveDraft = async (draft: any, chatId: string | null = null) => {
		if (saveDraftTimeout) {
			clearTimeout(saveDraftTimeout);
		}

		if (draft.prompt !== null && draft.prompt.length < MAX_DRAFT_LENGTH) {
			saveDraftTimeout = setTimeout(async () => {
				await sessionStorage.setItem(
					`chat-input${chatId ? `-${chatId}` : ''}`,
					JSON.stringify(draft)
				);
			}, 500);
		} else {
			sessionStorage.removeItem(`chat-input${chatId ? `-${chatId}` : ''}`);
		}
	};

	const clearDraft = async (chatId: string | null = null) => {
		if (saveDraftTimeout) {
			clearTimeout(saveDraftTimeout);
		}
		await sessionStorage.removeItem(`chat-input${chatId ? `-${chatId}` : ''}`);
	};

	const moveChatHandler = async (chatId, folderId) => {
		if (chatId && folderId) {
			const res = await updateChatFolderIdById(localStorage.token, chatId, folderId).catch(
				(error) => {
					toast.error(`${error}`);
					return null;
				}
			);

			if (res) {
				currentChatPage.set(1);
				await chats.set(await getChatList(localStorage.token, $currentChatPage));
				await pinnedChats.set(await getPinnedChatList(localStorage.token));

				toast.success($i18n.t('Chat moved successfully'));
			}
		} else {
			toast.error($i18n.t('Failed to move chat'));
		}
	};

	const archiveChatHandler = async (id: string) => {
		try {
			await archiveChatById(localStorage.token, id);
			currentChatPage.set(1);
			initNewChat();
			await goto('/');
			chats.set(await getChatList(localStorage.token, $currentChatPage));
			pinnedChats.set(await getPinnedChatList(localStorage.token));
		} catch (error) {
			console.error('Error archiving chat:', error);
			toast.error($i18n.t('Failed to archive chat.'));
		}
	};

	let showDeleteConfirm = false;

	const deleteChatHandler = async (id: string) => {
		showDeleteConfirm = true;
	};

	const confirmDeleteChat = async () => {
		const id = $chatId;
		if (!id) return;

		try {
			const res = await deleteChatById(localStorage.token, id);
			if (res) {
				currentChatPage.set(1);
				initNewChat();
				await goto('/');
				chats.set(await getChatList(localStorage.token, $currentChatPage));
				pinnedChats.set(await getPinnedChatList(localStorage.token));
				allTags.set(await getAllTags(localStorage.token));
			}
		} catch (error) {
			console.error('Error deleting chat:', error);
			toast.error(`${error}`);
		}
	};
</script>

<svelte:head>
	<title>
		{$settings.showChatTitleInTab !== false && $chatTitle
			? `${$chatTitle.length > 30 ? `${$chatTitle.slice(0, 30)}...` : $chatTitle} • ${$WEBUI_NAME}`
			: `${$WEBUI_NAME}`}
	</title>
</svelte:head>

<DeleteConfirmDialog
	bind:show={showDeleteConfirm}
	title={$i18n.t('Delete chat?')}
	on:confirm={() => {
		confirmDeleteChat();
	}}
>
	<div class=" text-sm text-gray-500 flex-1 line-clamp-3">
		{$i18n.t('This will delete')} <span class="  font-semibold">{$chatTitle}</span>.
	</div>
</DeleteConfirmDialog>

<EventConfirmDialog
	bind:show={showEventConfirmation}
	title={eventConfirmationTitle}
	message={eventConfirmationMessage}
	input={eventConfirmationInput}
	inputPlaceholder={eventConfirmationInputPlaceholder}
	inputValue={eventConfirmationInputValue}
	inputType={eventConfirmationInputType}
	on:confirm={(e) => {
		if (e.detail) {
			eventCallback(e.detail);
		} else {
			eventCallback(true);
		}
	}}
	on:cancel={() => {
		eventCallback(false);
	}}
/>

<div
	class="h-screen max-h-[100dvh] transition-width duration-200 ease-in-out w-full max-w-full flex flex-col"
	id="chat-container"
>
	{#if !loading}
		<div in:fade={{ duration: 50 }} class="w-full h-full flex flex-col">
			{#if $selectedFolder && $selectedFolder?.meta?.background_image_url}
				<div
					class="absolute top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat"
					style="background-image: url({$selectedFolder?.meta?.background_image_url})  "
				/>

				<div
					class="absolute top-0 left-0 w-full h-full bg-linear-to-t from-white to-white/85 dark:from-gray-900 dark:to-gray-900/90 z-0"
				/>
			{:else if $settings?.backgroundImageUrl ?? $config?.license_metadata?.background_image_url ?? null}
				<div
					class="absolute top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat"
					style="background-image: url({$settings?.backgroundImageUrl ??
						$config?.license_metadata?.background_image_url})  "
				/>

				<div
					class="absolute top-0 left-0 w-full h-full bg-linear-to-t from-white to-white/85 dark:from-gray-900 dark:to-gray-900/90 z-0"
				/>
			{/if}

			<div
				class="w-full h-full flex relative max-w-full flex-col"
				role="region"
				aria-label="Chat"
				on:dragover={onDragOver}
				on:dragleave={onDragLeave}
				on:drop={onDrop}
			>
				<FilesOverlay show={dragged} />

				<div
					id="chat-pane"
					class="flex flex-col flex-auto z-10 w-full @container overflow-hidden min-h-0"
				>
					<div class="relative flex-1 min-h-0 w-full">
						<Folio
							bind:history
							bind:selectedModels
							bind:files
							chatId={$chatId}
							chatTitle={$chatTitle}
							{generating}
							user={$user}
							query={pendingQuestion}
							onQueryAnswer={(result) => {
								if (eventCallback) eventCallback(result);
								eventCallback = null;
								pendingQuestion = null;
							}}
							onUploadFiles={(fl) => inputFilesHandler(fl)}
							onSubmit={(text) => submitHandler(text)}
							onNewChat={initNewChat}
							onRegenerate={(m) => regenerateResponse(m)}
							onRenameChat={async (t) => {
								chatTitle.set(t);
								if ($chatId && !$temporaryChatEnabled) {
									await updateChatById(localStorage.token, $chatId, { title: t });
									currentChatPage.set(1);
									await chats.set(await getChatList(localStorage.token, $currentChatPage));
								}
							}}
							onEditPrompt={(id, content) => {
								if (history.messages[id]) {
									history.messages[id].content = content;
									history = history;
								}
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	{:else if loading}
		<div class=" flex items-center justify-center h-full w-full">
			<div class="m-auto">
				<Spinner className="size-5" />
			</div>
		</div>
	{/if}
</div>

<style>
	::-webkit-scrollbar {
		height: 0.5rem;
		width: 0.5rem;
	}
</style>
