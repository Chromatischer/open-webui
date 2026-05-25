<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { tick, getContext, onMount, createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	const i18n = getContext('i18n');

	import { settings } from '$lib/stores';
	import { copyToClipboard } from '$lib/utils';

	import MultiResponseMessages from './MultiResponseMessages.svelte';
	import ResponseMessage from './ResponseMessage.svelte';
	import UserMessage from './UserMessage.svelte';

	export let chatId;
	export let selectedModels = [];
	export let idx = 0;

	export let history;
	export let messageId;

	export let user;

	export let setInputText: Function = () => {};
	export let gotoMessage;
	export let showPreviousMessage;
	export let showNextMessage;
	export let updateChat;

	export let editMessage;
	export let saveMessage;
	export let deleteMessage;
	export let rateMessage;
	export let actionMessage;
	export let submitMessage;

	export let regenerateResponse;
	export let continueResponse;
	export let mergeResponses;

	export let addMessages;
	export let triggerScroll;
	export let readOnly = false;
	export let editCodeBlock = true;
	export let topPadding = false;
</script>

<div
	role="listitem"
	class="flex flex-col justify-between w-full rounded-lg group message-listitem"
>
	{#if history.messages[messageId]}
		{#if history.messages[messageId].role === 'user'}
			<UserMessage
				{user}
				{chatId}
				{history}
				{messageId}
				isFirstMessage={idx === 0}
				siblings={history.messages[messageId].parentId !== null
					? (history.messages[history.messages[messageId].parentId]?.childrenIds ?? [])
					: (Object.values(history.messages)
							.filter((message) => message.parentId === null)
							.map((message) => message.id) ?? [])}
				{gotoMessage}
				{showPreviousMessage}
				{showNextMessage}
				{editMessage}
				{deleteMessage}
				{readOnly}
				{editCodeBlock}
				{topPadding}
			/>
		{:else if (history.messages[history.messages[messageId].parentId]?.models?.length ?? 1) === 1}
			<ResponseMessage
				{chatId}
				{history}
				{messageId}
				{selectedModels}
				isLastMessage={messageId === history.currentId}
				siblings={history.messages[history.messages[messageId].parentId]?.childrenIds ?? []}
				{setInputText}
				{gotoMessage}
				{showPreviousMessage}
				{showNextMessage}
				{updateChat}
				{editMessage}
				{saveMessage}
				{rateMessage}
				{actionMessage}
				{submitMessage}
				{deleteMessage}
				{continueResponse}
				{regenerateResponse}
				{addMessages}
				{readOnly}
				{editCodeBlock}
				{topPadding}
			/>
		{:else}
			{#key messageId}
				<MultiResponseMessages
					bind:history
					{chatId}
					{messageId}
					{selectedModels}
					isLastMessage={messageId === history?.currentId}
					{setInputText}
					{updateChat}
					{editMessage}
					{saveMessage}
					{rateMessage}
					{actionMessage}
					{submitMessage}
					{deleteMessage}
					{continueResponse}
					{regenerateResponse}
					{mergeResponses}
					{triggerScroll}
					{addMessages}
					{readOnly}
					{editCodeBlock}
					{topPadding}
				/>
			{/key}
		{/if}
	{/if}
</div>

<style>
	.message-listitem {
		content-visibility: auto;
		contain-intrinsic-size: auto 150px;
	}

	.gen-dots {
		display: flex;
		gap: 5px;
		padding: 10px 2px;
	}
	.gen-dots span {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--accent);
		animation: genBounce 1.3s infinite ease-in-out both;
		opacity: 0.3;
	}
	.gen-dots span:nth-child(1) { animation-delay: -0.32s; }
	.gen-dots span:nth-child(2) { animation-delay: -0.16s; }
	@keyframes genBounce {
		0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
		40% { transform: scale(1); opacity: 1; }
	}

	.toolcard {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-radius: 8px;
		background: var(--surface);
		border: 1px solid var(--border);
		font-size: 12px;
		transition: background 0.2s, border-color 0.2s, transform 0.2s;
	}
	.toolcard:hover {
		background: var(--surface-hover);
		border-color: var(--border-hover);
		transform: translateY(-1px);
	}
	.tool-name {
		font-weight: 600;
		color: var(--text);
	}
	.tool-status {
		font-size: 10px;
		padding: 1px 5px;
		border-radius: 3px;
		background: var(--surface-active);
		color: var(--text-tertiary);
	}
	.tool-status.done {
		background: rgba(45, 159, 82, 0.15);
		color: var(--success);
	}

	.thinking {
		display: flex;
		align-items: flex-start;
		gap: 5px;
		cursor: pointer;
		color: var(--text-tertiary);
		font-size: 11px;
		font-family: ui-monospace, 'JetBrains Mono', monospace;
		line-height: 1.6;
		transition: color 0.15s;
		user-select: none;
	}
	.thinking:hover {
		color: var(--text-secondary);
	}
	.think-slash {
		flex: none;
		opacity: 0.38;
		font-weight: 700;
		letter-spacing: -1px;
	}
	.think-content {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.thinking.open .think-content {
		white-space: pre-wrap;
		overflow: visible;
		text-overflow: clip;
	}

	:global(.chat-assistant pre),
	:global(.chat-user pre) {
		background: var(--code-bg);
		border: 1px solid var(--border);
		border-radius: 10px;
	}
	:global(.chat-assistant code),
	:global(.chat-user code) {
		background: var(--code-bg);
	}
</style>
