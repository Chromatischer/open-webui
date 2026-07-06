<script lang="ts">
	import { config, settings, user } from '$lib/stores';
	import { onMount, onDestroy, getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { inlineError } from '$lib/utils/inlineError';
	import { updateUserInfo } from '$lib/apis/users';
	import { getUserPosition } from '$lib/utils';
	import { setTextScale } from '$lib/utils/text-scale';

	import Minus from '$lib/components/icons/Minus.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import Textarea from '$lib/components/common/Textarea.svelte';
	import ToggleCard from './Interface/ToggleCard.svelte';

	const i18n = getContext('i18n');

	export let saveSettings: Function;

	let backgroundImageUrl = null;
	let inputFiles = null;
	let filesInputElement;

	// Addons
	let titleAutoGenerate = true;
	let autoFollowUps = true;
	let autoTags = true;

	let responseAutoCopy = false;
	let widescreenMode = false;
	let splitLargeChunks = false;
	let scrollOnBranchChange = true;
	let userLocation = false;

	// Interface
	let showUsername = false;

	let notificationSound = true;
	let notificationSoundAlways = false;

	let highContrastMode = false;

	let detectArtifacts = true;
	let displayMultiModelResponsesInTabs = false;

	let richTextInput = true;
	let showFormattingToolbar = false;
	let insertPromptAsRichText = false;
	let promptAutocomplete = false;

	let largeTextAsFile = false;

	let insertSuggestionPrompt = false;
	let keepFollowUpPrompts = false;
	let insertFollowUpPrompt = false;

	let regenerateMenu = true;
	let enableMessageQueue = true;

	let landingPageMode = '';
	let chatBubble = true;
	let chatDirection: 'LTR' | 'RTL' | 'auto' = 'auto';
	let ctrlEnterToSend = false;
	let copyFormatted = false;

	let temporaryChatByDefault = false;
	let chatFadeStreamingText = true;
	let collapseCodeBlocks = false;
	let renderMarkdownInUserMessages = true;
	let renderMarkdownInAssistantMessages = true;
	let expandDetails = false;
	let renderMarkdownInPreviews = true;
	let showChatTitleInTab = true;

	let showFloatingActionButtons = true;
	let floatingActionButtons = null;

	let imageCompression = false;
	let imageCompressionSize = {
		width: '',
		height: ''
	};

	// chat export
	let stylizedPdfExport = true;

	// Admin - Show Update Available Toast
	let showUpdateToast = true;
	let showChangelog = true;

	let showEmojiInCall = false;
	let voiceInterruption = false;
	let hapticFeedback = false;

	let webSearch = null;

	let iframeSandboxAllowSameOrigin = false;
	let iframeSandboxAllowForms = false;

	let textScale = null;

	// inlineError anchors
	let userLocationCard: HTMLElement | null = null;
	let autoCopyCard: HTMLElement | null = null;

	// Inline editors autosave silently after a short pause
	let actionsSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	let sizeSaveTimeout: ReturnType<typeof setTimeout> | null = null;

	const queueActionsSave = () => {
		if (actionsSaveTimeout) clearTimeout(actionsSaveTimeout);
		actionsSaveTimeout = setTimeout(() => {
			actionsSaveTimeout = null;
			saveSettings({ floatingActionButtons });
		}, 500);
	};

	const saveActionsNow = () => {
		if (actionsSaveTimeout) clearTimeout(actionsSaveTimeout);
		actionsSaveTimeout = null;
		saveSettings({ floatingActionButtons });
	};

	const customizeFloatingActions = () => {
		floatingActionButtons = [
			{
				id: 'ask',
				label: $i18n.t('Ask'),
				input: true,
				prompt: `{{SELECTED_CONTENT}}\n\n\n{{INPUT_CONTENT}}`
			},
			{
				id: 'explain',
				label: $i18n.t('Explain'),
				input: false,
				prompt: `{{SELECTED_CONTENT}}\n\n\n${$i18n.t('Explain')}`
			}
		];
		saveActionsNow();
	};

	const addFloatingAction = () => {
		let id = 'new-button';
		let idx = 0;
		while ((floatingActionButtons ?? []).some((b) => b.id === id)) {
			idx++;
			id = `new-button-${idx}`;
		}
		floatingActionButtons = [
			...(floatingActionButtons ?? []),
			{
				id: id,
				label: $i18n.t('New Button'),
				input: true,
				prompt: `{{CONTENT}}\n\n\n{{INPUT_CONTENT}}`
			}
		];
		saveActionsNow();
	};

	const removeFloatingAction = (id) => {
		floatingActionButtons = floatingActionButtons.filter((b) => b.id !== id);
		saveActionsNow();
	};

	const resetFloatingActions = () => {
		floatingActionButtons = null;
		saveActionsNow();
	};

	const queueSizeSave = () => {
		if (sizeSaveTimeout) clearTimeout(sizeSaveTimeout);
		sizeSaveTimeout = setTimeout(() => {
			sizeSaveTimeout = null;
			saveSettings({ imageCompressionSize });
		}, 500);
	};

	onDestroy(() => {
		// flush pending autosaves so edits survive closing the modal mid-typing
		if (actionsSaveTimeout) {
			clearTimeout(actionsSaveTimeout);
			saveSettings({ floatingActionButtons });
		}
		if (sizeSaveTimeout) {
			clearTimeout(sizeSaveTimeout);
			saveSettings({ imageCompressionSize });
		}
	});

	const toggleLandingPageMode = async () => {
		landingPageMode = landingPageMode === '' ? 'chat' : '';
		saveSettings({ landingPageMode: landingPageMode });
	};

	const toggleUserLocation = async () => {
		if (userLocation) {
			const position = await getUserPosition().catch((error) => {
				inlineError(userLocationCard, error.message);
				return null;
			});

			if (position) {
				await updateUserInfo(localStorage.token, { location: position });
			} else {
				userLocation = false;
			}
		}

		saveSettings({ userLocation });
	};

	const toggleTitleAutoGenerate = async () => {
		saveSettings({
			title: {
				...$settings.title,
				auto: titleAutoGenerate
			}
		});
	};

	const toggleResponseAutoCopy = async () => {
		const permission = await navigator.clipboard
			.readText()
			.then(() => {
				return 'granted';
			})
			.catch(() => {
				return '';
			});

		if (permission === 'granted') {
			saveSettings({ responseAutoCopy: responseAutoCopy });
		} else {
			responseAutoCopy = false;
			inlineError(
				autoCopyCard,
				$i18n.t(
					'Clipboard write permission denied. Please check your browser settings to grant the necessary access.'
				)
			);
		}
	};

	const toggleChangeChatDirection = async () => {
		if (chatDirection === 'auto') {
			chatDirection = 'LTR';
		} else if (chatDirection === 'LTR') {
			chatDirection = 'RTL';
		} else if (chatDirection === 'RTL') {
			chatDirection = 'auto';
		}
		saveSettings({ chatDirection });
	};

	const togglectrlEnterToSend = async () => {
		ctrlEnterToSend = !ctrlEnterToSend;
		saveSettings({ ctrlEnterToSend });
	};

	const toggleWebSearch = async () => {
		webSearch = webSearch === null ? 'always' : null;
		saveSettings({ webSearch: webSearch });
	};

	const setTextScaleHandler = (scale) => {
		textScale = scale;
		setTextScale(textScale);

		if (textScale === 1) {
			textScale = null;
		}
		saveSettings({ textScale });
	};

	onMount(async () => {
		titleAutoGenerate = $settings?.title?.auto ?? true;
		autoTags = $settings?.autoTags ?? true;
		autoFollowUps = $settings?.autoFollowUps ?? true;

		highContrastMode = $settings?.highContrastMode ?? false;

		detectArtifacts = $settings?.detectArtifacts ?? true;
		responseAutoCopy = $settings?.responseAutoCopy ?? false;

		showUsername = $settings?.showUsername ?? false;
		showUpdateToast = $settings?.showUpdateToast ?? true;
		showChangelog = $settings?.showChangelog ?? true;

		showEmojiInCall = $settings?.showEmojiInCall ?? false;
		voiceInterruption = $settings?.voiceInterruption ?? false;

		displayMultiModelResponsesInTabs = $settings?.displayMultiModelResponsesInTabs ?? false;
		chatFadeStreamingText = $settings?.chatFadeStreamingText ?? true;

		richTextInput = $settings?.richTextInput ?? true;
		showFormattingToolbar = $settings?.showFormattingToolbar ?? false;
		insertPromptAsRichText = $settings?.insertPromptAsRichText ?? false;
		promptAutocomplete = $settings?.promptAutocomplete ?? false;

		insertSuggestionPrompt = $settings?.insertSuggestionPrompt ?? false;
		keepFollowUpPrompts = $settings?.keepFollowUpPrompts ?? false;
		insertFollowUpPrompt = $settings?.insertFollowUpPrompt ?? false;

		regenerateMenu = $settings?.regenerateMenu ?? true;
		enableMessageQueue = $settings?.enableMessageQueue ?? true;

		largeTextAsFile = $settings?.largeTextAsFile ?? false;
		copyFormatted = $settings?.copyFormatted ?? false;

		collapseCodeBlocks = $settings?.collapseCodeBlocks ?? false;
		renderMarkdownInUserMessages = $settings?.renderMarkdownInUserMessages ?? true;
		renderMarkdownInAssistantMessages = $settings?.renderMarkdownInAssistantMessages ?? true;
		expandDetails = $settings?.expandDetails ?? false;
		renderMarkdownInPreviews = $settings?.renderMarkdownInPreviews ?? true;

		landingPageMode = $settings?.landingPageMode ?? '';
		chatBubble = $settings?.chatBubble ?? true;
		widescreenMode = $settings?.widescreenMode ?? false;
		splitLargeChunks = $settings?.splitLargeChunks ?? false;
		scrollOnBranchChange = $settings?.scrollOnBranchChange ?? true;

		temporaryChatByDefault = $settings?.temporaryChatByDefault ?? false;
		chatDirection = $settings?.chatDirection ?? 'auto';
		userLocation = $settings?.userLocation ?? false;
		showChatTitleInTab = $settings?.showChatTitleInTab ?? true;

		notificationSound = $settings?.notificationSound ?? true;
		notificationSoundAlways = $settings?.notificationSoundAlways ?? false;

		iframeSandboxAllowSameOrigin = $settings?.iframeSandboxAllowSameOrigin ?? false;
		iframeSandboxAllowForms = $settings?.iframeSandboxAllowForms ?? false;

		stylizedPdfExport = $settings?.stylizedPdfExport ?? true;

		hapticFeedback = $settings?.hapticFeedback ?? false;
		ctrlEnterToSend = $settings?.ctrlEnterToSend ?? false;

		showFloatingActionButtons = $settings?.showFloatingActionButtons ?? true;
		floatingActionButtons = $settings?.floatingActionButtons ?? null;

		imageCompression = $settings?.imageCompression ?? false;
		imageCompressionSize = $settings?.imageCompressionSize ?? { width: '', height: '' };

		backgroundImageUrl = $settings?.backgroundImageUrl ?? null;
		webSearch = $settings?.webSearch ?? null;

		textScale = $settings?.textScale ?? null;
	});
</script>

<div id="tab-interface" class="flex flex-col h-full justify-between space-y-3 text-sm">
	<input
		bind:this={filesInputElement}
		bind:files={inputFiles}
		type="file"
		hidden
		accept="image/*"
		on:change={() => {
			let reader = new FileReader();
			reader.onload = (event) => {
				let originalImageUrl = `${event.target.result}`;

				backgroundImageUrl = originalImageUrl;
				saveSettings({ backgroundImageUrl });
			};

			if (
				inputFiles &&
				inputFiles.length > 0 &&
				['image/gif', 'image/webp', 'image/jpeg', 'image/png'].includes(inputFiles[0]['type'])
			) {
				reader.readAsDataURL(inputFiles[0]);
			} else {
				console.log(`Unsupported File Type '${inputFiles[0]['type']}'.`);
				inputFiles = null;
			}
		}}
	/>

	<div class="space-y-1 overflow-y-scroll max-h-[28rem] md:max-h-full">
		<!-- ── UI ─────────────────────────── -->
		<div id="design-section-ui" class="ix-section">
			<div class="ix-group-label">{$i18n.t('UI')}</div>

			<div class="ix-rows">
				<div class="ix-row ix-row-col">
					<div class="flex w-full items-center justify-between">
						<label id="ui-scale-label" class="ix-row-title" for="ui-scale-slider">
							{$i18n.t('UI Scale')}
						</label>
						<button
							class="ix-pill"
							aria-live="polite"
							type="button"
							on:click={() => {
								if (textScale === null) {
									textScale = 1;
								} else {
									textScale = null;
									setTextScaleHandler(1);
								}
							}}
						>
							{#if textScale === null}
								<span>{$i18n.t('Default')}</span>
							{:else}
								<span>{textScale}x</span>
							{/if}
						</button>
					</div>

					{#if textScale !== null}
						<div class="flex items-center gap-2 w-full pt-2">
							<button
								type="button"
								class="ix-step"
								on:click={() => {
									textScale = Math.max(1, parseFloat((textScale - 0.1).toFixed(2)));
									setTextScaleHandler(textScale);
								}}
								aria-labelledby="ui-scale-label"
								aria-label={$i18n.t('Decrease UI Scale')}
							>
								<Minus className="h-3.5 w-3.5" />
							</button>

							<div class="flex-1 flex items-center">
								<input
									id="ui-scale-slider"
									class="w-full"
									type="range"
									min="1"
									max="1.5"
									step={0.01}
									bind:value={textScale}
									on:change={() => {
										setTextScaleHandler(textScale);
									}}
									aria-labelledby="ui-scale-label"
									aria-valuemin="1"
									aria-valuemax="1.5"
									aria-valuenow={textScale}
									aria-valuetext={`${textScale}x`}
								/>
							</div>

							<button
								type="button"
								class="ix-step"
								on:click={() => {
									textScale = Math.min(1.5, parseFloat((textScale + 0.1).toFixed(2)));
									setTextScaleHandler(textScale);
								}}
								aria-labelledby="ui-scale-label"
								aria-label={$i18n.t('Increase UI Scale')}
							>
								<Plus className="h-3.5 w-3.5" />
							</button>
						</div>
					{/if}
				</div>
			</div>

			<div class="ix-grid">
				<ToggleCard
					title="{$i18n.t('High Contrast Mode')} ({$i18n.t('Beta')})"
					bind:state={highContrastMode}
					on:change={() => saveSettings({ highContrastMode })}
				/>
				<ToggleCard
					title={$i18n.t('Display chat title in tab')}
					bind:state={showChatTitleInTab}
					on:change={() => saveSettings({ showChatTitleInTab })}
				/>
				<ToggleCard
					title={$i18n.t('Notification Sound')}
					bind:state={notificationSound}
					on:change={() => saveSettings({ notificationSound })}
				/>
				{#if notificationSound}
					<ToggleCard
						title={$i18n.t('Always Play Notification Sound')}
						bind:state={notificationSoundAlways}
						on:change={() => saveSettings({ notificationSoundAlways })}
					/>
				{/if}
				<ToggleCard
					title={$i18n.t('Allow User Location')}
					bind:state={userLocation}
					bind:el={userLocationCard}
					on:change={() => toggleUserLocation()}
				/>
				<ToggleCard
					title="{$i18n.t('Haptic Feedback')} ({$i18n.t('Android')})"
					bind:state={hapticFeedback}
					on:change={() => saveSettings({ hapticFeedback })}
				/>
				<ToggleCard
					title={$i18n.t('Copy Formatted Text')}
					bind:state={copyFormatted}
					on:change={() => saveSettings({ copyFormatted })}
				/>
				{#if $user?.role === 'admin'}
					<ToggleCard
						title={$i18n.t('Toast notifications for new updates')}
						bind:state={showUpdateToast}
						on:change={() => saveSettings({ showUpdateToast })}
					/>
					<ToggleCard
						title={$i18n.t(`Show "What's New" modal on login`)}
						bind:state={showChangelog}
						on:change={() => saveSettings({ showChangelog })}
					/>
				{/if}
			</div>
		</div>

		<!-- ── Chat ─────────────────────────── -->
		<div id="design-section-chat" class="ix-section">
			<div class="ix-group-label">{$i18n.t('Chat')}</div>

			<div class="ix-rows">
				<div class="ix-row">
					<div id="chat-direction-label" class="ix-row-title">{$i18n.t('Chat direction')}</div>
					<button
						aria-labelledby="chat-direction-label chat-direction-mode"
						class="ix-pill"
						on:click={toggleChangeChatDirection}
						type="button"
					>
						<span id="chat-direction-mode">
							{chatDirection === 'LTR'
								? $i18n.t('LTR')
								: chatDirection === 'RTL'
									? $i18n.t('RTL')
									: $i18n.t('Auto')}
						</span>
					</button>
				</div>

				<div class="ix-row">
					<div id="landing-page-mode-label" class="ix-row-title">
						{$i18n.t('Landing Page Mode')}
					</div>
					<button
						aria-labelledby="landing-page-mode-label landing-page-mode-state"
						class="ix-pill"
						on:click={() => toggleLandingPageMode()}
						type="button"
					>
						<span id="landing-page-mode-state"
							>{landingPageMode === '' ? $i18n.t('Default') : $i18n.t('Chat')}</span
						>
					</button>
				</div>

				<div class="ix-row">
					<div id="chat-background-label" class="ix-row-title">
						{$i18n.t('Chat Background Image')}
					</div>
					<button
						aria-labelledby="chat-background-label background-image-url-state"
						class="ix-pill"
						on:click={() => {
							if (backgroundImageUrl !== null) {
								backgroundImageUrl = null;
								saveSettings({ backgroundImageUrl });
							} else {
								filesInputElement.click();
							}
						}}
						type="button"
					>
						<span id="background-image-url-state"
							>{backgroundImageUrl !== null ? $i18n.t('Reset') : $i18n.t('Upload')}</span
						>
					</button>
				</div>

				<div class="ix-row">
					<div id="web-search-in-chat-label" class="ix-row-title">
						{$i18n.t('Web Search in Chat')}
					</div>
					<button
						aria-labelledby="web-search-in-chat-label web-search-state"
						class="ix-pill"
						on:click={() => toggleWebSearch()}
						type="button"
					>
						<span id="web-search-state"
							>{webSearch === 'always' ? $i18n.t('Always') : $i18n.t('Default')}</span
						>
					</button>
				</div>

				<div class="ix-row ix-row-col">
					<div class="flex w-full items-center justify-between">
						<div id="floating-action-buttons-label" class="ix-row-title">
							{$i18n.t('Floating Quick Actions')}
						</div>
						<button
							type="button"
							aria-labelledby="floating-action-buttons-label"
							aria-pressed={showFloatingActionButtons}
							class="ix-pill {showFloatingActionButtons ? 'on' : ''}"
							on:click={() => {
								showFloatingActionButtons = !showFloatingActionButtons;
								saveSettings({ showFloatingActionButtons });
							}}
						>
							{showFloatingActionButtons ? $i18n.t('On') : $i18n.t('Off')}
						</button>
					</div>

					{#if showFloatingActionButtons}
						<div class="ix-editor" transition:slide={{ duration: 180 }}>
							{#if floatingActionButtons === null}
								<div class="ix-editor-hint">
									<span>{$i18n.t('Default action buttons will be used.')}</span>
									<button class="ix-link" type="button" on:click={customizeFloatingActions}>
										{$i18n.t('Customize')}
									</button>
								</div>
							{:else}
								{#each floatingActionButtons as button (button.id)}
									<div class="ix-action" transition:slide={{ duration: 150 }}>
										<div class="ix-action-head">
											<input
												class="ix-action-label"
												placeholder={$i18n.t('Button Label')}
												aria-label={$i18n.t('Button Label')}
												bind:value={button.label}
												on:input={queueActionsSave}
											/>
											<button
												class="ix-remove"
												type="button"
												aria-label={$i18n.t('Remove action')}
												on:click={() => removeFloatingAction(button.id)}
											>
												<XMark className="size-3.5" />
											</button>
										</div>
										<Textarea
											className="ix-action-prompt"
											placeholder={$i18n.t('Button Prompt')}
											ariaLabel={$i18n.t('Button Prompt')}
											bind:value={button.prompt}
											onInput={queueActionsSave}
										/>
									</div>
								{/each}

								<div class="ix-editor-foot">
									<button class="ix-add" type="button" on:click={addFloatingAction}>
										<Plus className="size-3.5" />
										<span>{$i18n.t('Add action')}</span>
									</button>
									<button
										class="ix-link ix-link-quiet"
										type="button"
										on:click={resetFloatingActions}
									>
										{$i18n.t('Use defaults')}
									</button>
								</div>

								<div class="ix-editor-note">
									{$i18n.t('Prompts can reference {{selected}} and {{input}}.', {
										selected: '{{SELECTED_CONTENT}}',
										input: '{{INPUT_CONTENT}}'
									})}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<div class="ix-grid">
				<ToggleCard
					title={$i18n.t('Enable Message Queue')}
					bind:state={enableMessageQueue}
					on:change={() => saveSettings({ enableMessageQueue })}
				/>
				<ToggleCard
					title={$i18n.t('Chat Bubble UI')}
					bind:state={chatBubble}
					on:change={() => saveSettings({ chatBubble })}
				/>
				{#if !$settings.chatBubble}
					<ToggleCard
						title={$i18n.t('Display the username instead of You in the Chat')}
						bind:state={showUsername}
						on:change={() => saveSettings({ showUsername })}
					/>
				{/if}
				<ToggleCard
					title={$i18n.t('Widescreen Mode')}
					bind:state={widescreenMode}
					on:change={() => saveSettings({ widescreenMode })}
				/>
				{#if $user.role === 'admin' || $user?.permissions?.chat?.temporary}
					<ToggleCard
						title={$i18n.t('Temporary Chat by Default')}
						bind:state={temporaryChatByDefault}
						on:change={() => saveSettings({ temporaryChatByDefault })}
					/>
				{/if}
				<ToggleCard
					title={$i18n.t('Fade Effect for Streaming Text')}
					bind:state={chatFadeStreamingText}
					on:change={() => saveSettings({ chatFadeStreamingText })}
				/>
				<ToggleCard
					title={$i18n.t('Render Markdown in User Messages')}
					bind:state={renderMarkdownInUserMessages}
					on:change={() => saveSettings({ renderMarkdownInUserMessages })}
				/>
				<ToggleCard
					title={$i18n.t('Render Markdown in Assistant Messages')}
					bind:state={renderMarkdownInAssistantMessages}
					on:change={() => saveSettings({ renderMarkdownInAssistantMessages })}
				/>
				<ToggleCard
					title={$i18n.t('Title Auto-Generation')}
					bind:state={titleAutoGenerate}
					on:change={() => toggleTitleAutoGenerate()}
				/>
				<ToggleCard
					title={$i18n.t('Follow-Up Auto-Generation')}
					bind:state={autoFollowUps}
					on:change={() => saveSettings({ autoFollowUps })}
				/>
				<ToggleCard
					title={$i18n.t('Chat Tags Auto-Generation')}
					bind:state={autoTags}
					on:change={() => saveSettings({ autoTags })}
				/>
				<ToggleCard
					title={$i18n.t('Auto-Copy Response to Clipboard')}
					bind:state={responseAutoCopy}
					bind:el={autoCopyCard}
					on:change={() => toggleResponseAutoCopy()}
				/>
				<ToggleCard
					title={$i18n.t('Insert Suggestion Prompt to Input')}
					bind:state={insertSuggestionPrompt}
					on:change={() => saveSettings({ insertSuggestionPrompt })}
				/>
				<ToggleCard
					title={$i18n.t('Keep Follow-Up Prompts in Chat')}
					bind:state={keepFollowUpPrompts}
					on:change={() => saveSettings({ keepFollowUpPrompts })}
				/>
				<ToggleCard
					title={$i18n.t('Insert Follow-Up Prompt to Input')}
					bind:state={insertFollowUpPrompt}
					on:change={() => saveSettings({ insertFollowUpPrompt })}
				/>
				<ToggleCard
					title={$i18n.t('Regenerate Menu')}
					bind:state={regenerateMenu}
					on:change={() => saveSettings({ regenerateMenu })}
				/>
				<ToggleCard
					title={$i18n.t('Always Collapse Code Blocks')}
					bind:state={collapseCodeBlocks}
					on:change={() => saveSettings({ collapseCodeBlocks })}
				/>
				<ToggleCard
					title={$i18n.t('Always Expand Details')}
					bind:state={expandDetails}
					on:change={() => saveSettings({ expandDetails })}
				/>
				<ToggleCard
					title={$i18n.t('Render Markdown in Previews')}
					bind:state={renderMarkdownInPreviews}
					on:change={() => saveSettings({ renderMarkdownInPreviews })}
				/>
				<ToggleCard
					title={$i18n.t('Display Multi-model Responses in Tabs')}
					bind:state={displayMultiModelResponsesInTabs}
					on:change={() => saveSettings({ displayMultiModelResponsesInTabs })}
				/>
				<ToggleCard
					title={$i18n.t('Scroll On Branch Change')}
					bind:state={scrollOnBranchChange}
					on:change={() => saveSettings({ scrollOnBranchChange })}
				/>
				<ToggleCard
					title={$i18n.t('Stylized PDF Export')}
					bind:state={stylizedPdfExport}
					on:change={() => saveSettings({ stylizedPdfExport })}
				/>
			</div>
		</div>

		<!-- ── Input ─────────────────────────── -->
		<div id="design-section-input" class="ix-section">
			<div class="ix-group-label">{$i18n.t('Input')}</div>

			<div class="ix-rows">
				<div class="ix-row">
					<div id="enter-key-behavior-label" class="ix-row-title">
						{$i18n.t('Enter Key Behavior')}
					</div>
					<button
						aria-labelledby="enter-key-behavior-label ctrl-enter-to-send-state"
						class="ix-pill"
						on:click={() => togglectrlEnterToSend()}
						type="button"
					>
						<span id="ctrl-enter-to-send-state"
							>{ctrlEnterToSend === true
								? $i18n.t('Ctrl+Enter to Send')
								: $i18n.t('Enter to Send')}</span
						>
					</button>
				</div>
			</div>

			<div class="ix-grid">
				<ToggleCard
					title={$i18n.t('Rich Text Input for Chat')}
					bind:state={richTextInput}
					on:change={() => saveSettings({ richTextInput })}
				/>
				{#if $config?.features?.enable_autocomplete_generation}
					<ToggleCard
						title={$i18n.t('Prompt Autocompletion')}
						bind:state={promptAutocomplete}
						on:change={() => saveSettings({ promptAutocomplete })}
					/>
				{/if}
				{#if richTextInput}
					<ToggleCard
						title={$i18n.t('Show Formatting Toolbar')}
						bind:state={showFormattingToolbar}
						on:change={() => saveSettings({ showFormattingToolbar })}
					/>
					<ToggleCard
						title={$i18n.t('Insert Prompt as Rich Text')}
						bind:state={insertPromptAsRichText}
						on:change={() => saveSettings({ insertPromptAsRichText })}
					/>
				{/if}
				<ToggleCard
					title={$i18n.t('Paste Large Text as File')}
					bind:state={largeTextAsFile}
					on:change={() => saveSettings({ largeTextAsFile })}
				/>
			</div>
		</div>

		<!-- ── Artifacts ─────────────────────────── -->
		<div id="design-section-artifacts" class="ix-section">
			<div class="ix-group-label">{$i18n.t('Artifacts')}</div>
			<div class="ix-grid">
				<ToggleCard
					title={$i18n.t('Detect Artifacts Automatically')}
					bind:state={detectArtifacts}
					on:change={() => saveSettings({ detectArtifacts })}
				/>
				<ToggleCard
					title={$i18n.t('iframe Sandbox Allow Same Origin')}
					bind:state={iframeSandboxAllowSameOrigin}
					on:change={() => saveSettings({ iframeSandboxAllowSameOrigin })}
				/>
				<ToggleCard
					title={$i18n.t('iframe Sandbox Allow Forms')}
					bind:state={iframeSandboxAllowForms}
					on:change={() => saveSettings({ iframeSandboxAllowForms })}
				/>
			</div>
		</div>

		<!-- ── Voice ─────────────────────────── -->
		<div id="design-section-voice" class="ix-section">
			<div class="ix-group-label">{$i18n.t('Voice')}</div>
			<div class="ix-grid">
				<ToggleCard
					title={$i18n.t('Allow Voice Interruption in Call')}
					bind:state={voiceInterruption}
					on:change={() => saveSettings({ voiceInterruption })}
				/>
				<ToggleCard
					title={$i18n.t('Display Emoji in Call')}
					bind:state={showEmojiInCall}
					on:change={() => saveSettings({ showEmojiInCall })}
				/>
			</div>
		</div>

		<!-- ── File ─────────────────────────── -->
		<div id="design-section-file" class="ix-section">
			<div class="ix-group-label">{$i18n.t('File')}</div>

			<div class="ix-rows">
				<div class="ix-row ix-row-col">
					<div class="flex w-full items-center justify-between">
						<div id="image-compression-label" class="ix-row-title">
							{$i18n.t('Image Compression')}
						</div>
						<button
							type="button"
							aria-labelledby="image-compression-label"
							aria-pressed={imageCompression}
							class="ix-pill {imageCompression ? 'on' : ''}"
							on:click={() => {
								imageCompression = !imageCompression;
								saveSettings({ imageCompression });
							}}
						>
							{imageCompression ? $i18n.t('On') : $i18n.t('Off')}
						</button>
					</div>

					{#if imageCompression}
						<div class="ix-editor" transition:slide={{ duration: 180 }}>
							<div class="ix-size">
								<span class="ix-size-label">{$i18n.t('Image Max Compression Size')}</span>
								<input
									class="ix-size-input"
									type="number"
									min="0"
									placeholder={$i18n.t('Width')}
									aria-label={$i18n.t('Image Max Compression Size width')}
									bind:value={imageCompressionSize.width}
									on:input={queueSizeSave}
								/>
								<span class="ix-size-x">×</span>
								<input
									class="ix-size-input"
									type="number"
									min="0"
									placeholder={$i18n.t('Height')}
									aria-label={$i18n.t('Image Max Compression Size height')}
									bind:value={imageCompressionSize.height}
									on:input={queueSizeSave}
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
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
	.ix-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.ix-rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 8px;
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
	.ix-row-col {
		flex-direction: column;
		align-items: stretch;
	}
	.ix-row-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
	}
	.ix-pill {
		font-size: 12px;
		font-weight: 500;
		padding: 5px 12px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text);
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.ix-pill:hover {
		background: var(--surface-hover);
		border-color: var(--border-hover);
	}
	.ix-pill.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.ix-link {
		font-size: 12px;
		font-weight: 500;
		color: var(--accent);
		text-decoration: underline;
	}
	.ix-link-quiet {
		color: var(--text-tertiary);
		text-decoration: none;
		transition: color 0.15s ease;
	}
	.ix-link-quiet:hover {
		color: var(--accent);
	}

	/* ── Inline editors (unfold beneath a row; autosave, no modal) ── */
	.ix-editor {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid var(--border);
	}
	.ix-editor-hint {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		font-size: 12px;
		color: var(--text-secondary);
	}
	.ix-editor-note {
		font-size: 11px;
		color: var(--text-tertiary);
	}
	.ix-editor-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.ix-action {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 9px 11px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		transition: border-color 0.15s ease;
	}
	.ix-action:focus-within {
		border-color: var(--accent);
	}
	.ix-action-head {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.ix-action-label {
		flex: 1;
		min-width: 0;
		font-size: 12.5px;
		font-weight: 600;
		background: transparent;
		outline: none;
		color: var(--text);
	}
	.ix-action-label::placeholder {
		color: var(--text-tertiary);
		font-weight: 500;
	}
	.ix-action :global(.ix-action-prompt) {
		width: 100%;
		font-size: 12px;
		line-height: 1.5;
		background: transparent;
		outline: none;
		border: none;
		padding: 0;
		resize: none;
		color: var(--text-secondary);
	}
	.ix-action :global(.ix-action-prompt:focus) {
		color: var(--text);
	}
	.ix-action :global(.ix-action-prompt::placeholder) {
		color: var(--text-tertiary);
	}
	.ix-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		padding: 3px;
		border-radius: 6px;
		color: var(--text-tertiary);
		transition:
			color 0.15s ease,
			background 0.15s ease;
	}
	.ix-remove:hover {
		color: #e0533d;
		background: var(--surface-hover);
	}
	.ix-add {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 500;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1px dashed var(--border-hover);
		color: var(--text-secondary);
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.ix-add:hover {
		color: var(--accent);
		border-color: var(--accent);
		background: var(--accent-glow);
	}
	.ix-size {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.ix-size-label {
		flex: 1;
		font-size: 12px;
		color: var(--text-secondary);
	}
	.ix-size-input {
		width: 72px;
		text-align: center;
		font-size: 12.5px;
		padding: 5px 8px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text);
		outline: none;
		transition: border-color 0.15s ease;
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.ix-size-input::-webkit-outer-spin-button,
	.ix-size-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.ix-size-input:focus {
		border-color: var(--accent);
	}
	.ix-size-input::placeholder {
		color: var(--text-tertiary);
	}
	.ix-size-x {
		font-size: 12px;
		color: var(--text-tertiary);
	}
	.ix-step {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 5px;
		border-radius: 8px;
		color: var(--text-secondary);
		transition: background 0.15s ease;
	}
	.ix-step:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	@media (max-width: 767px) {
		.ix-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
