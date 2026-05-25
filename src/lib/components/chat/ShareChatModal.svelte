<script lang="ts">
	import { getContext } from 'svelte';
	import { models, config } from '$lib/stores';

	import { toast } from 'svelte-sonner';
	import { deleteSharedChatById, getChatById } from '$lib/apis/chats';

	import Modal from '../common/Modal.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';

	export let chatId;

	let chat = null;
	const i18n = getContext('i18n');

	const shareChat = async () => {
		const _chat = chat.chat;
		console.log('share', _chat);

		toast.success($i18n.t('Redirecting you to Open WebUI Community'));
		const url = 'https://openwebui.com';
		// const url = 'http://localhost:5173';

		const tab = await window.open(`${url}/chats/upload`, '_blank');
		window.addEventListener(
			'message',
			(event) => {
				if (event.origin !== url) return;
				if (event.data === 'loaded') {
					tab.postMessage(
						JSON.stringify({
							chat: _chat,
							models: $models.filter((m) => _chat.models.includes(m.id))
						}),
						'*'
					);
				}
			},
			false
		);
	};

	export let show = false;

	const isDifferentChat = (_chat) => {
		if (!chat) {
			return true;
		}
		if (!_chat) {
			return false;
		}
		return chat.id !== _chat.id || chat.share_id !== _chat.share_id;
	};

	$: if (show) {
		(async () => {
			if (chatId) {
				const _chat = await getChatById(localStorage.token, chatId);
				if (isDifferentChat(_chat)) {
					chat = _chat;
				}
			} else {
				chat = null;
				console.log(chat);
			}
		})();
	}
</script>

<Modal bind:show size="md">
	<div>
		<div class=" flex justify-between dark:text-gray-300 px-5 pt-4 pb-0.5">
			<div class=" text-lg font-medium self-center">{$i18n.t('Share Chat')}</div>
			<button
				class="self-center"
				aria-label={$i18n.t('Close')}
				on:click={() => {
					show = false;
				}}
			>
				<XMark className={'size-5'} />
			</button>
		</div>

		{#if chat}
			<div class="px-5 pt-4 pb-5 w-full flex flex-col">
				<div class="text-sm text-gray-600 dark:text-gray-300">
					{$i18n.t('Public shared chat links are disabled for this workspace.')}
					{#if chat.share_id}
						{$i18n.t('This chat has an existing public link.')}
						<button
							class="underline text-gray-800 dark:text-gray-100"
							on:click={async () => {
								const res = await deleteSharedChatById(localStorage.token, chatId);

								if (res) {
									chat = await getChatById(localStorage.token, chatId);
								}
							}}
							>{$i18n.t('delete this link')}
						</button>
					{/if}
				</div>

				<div class="flex justify-end gap-1 mt-3">
					{#if $config?.features.enable_community_sharing}
						<button
							class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-850 dark:text-gray-300 dark:hover:bg-gray-800 transition rounded-full"
							type="button"
							on:click={() => {
								shareChat();
							}}
						>
							{$i18n.t('Share to Open WebUI Community')}
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</Modal>
