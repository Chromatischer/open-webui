<script lang="ts">
	import { getContext } from 'svelte';

	const i18n = getContext('i18n');

	import { WEBUI_API_BASE_URL } from '$lib/constants';

	import Tooltip from '$lib/components/common/Tooltip.svelte';

	export let user: any = null;
</script>

{#if user}
	<div class="py-3">
		<div class=" flex gap-3.5 w-full px-3 items-center">
			<div class=" items-center flex shrink-0">
				<img
					src={`${WEBUI_API_BASE_URL}/users/${user?.id}/profile/image`}
					class=" size-14 object-cover rounded-xl"
					alt="profile"
				/>
			</div>

			<div class=" flex flex-col w-full flex-1">
				<div class="mb-0.5 font-medium line-clamp-1 pr-2">
					{user.name}
				</div>

				<div class="text-xs text-gray-500 line-clamp-1">{user?.email}</div>
			</div>
		</div>

		{#if user?.bio}
			<div class="mx-3.5 mt-2">
				<Tooltip content={user?.bio}>
					<div class=" self-center line-clamp-3 flex-1 text-left text-xs">
						{user?.bio}
					</div>
				</Tooltip>
			</div>
		{/if}

		{#if (user?.groups ?? []).length > 0}
			<div class="mx-3.5 mt-2 flex flex-wrap gap-0.5 max-h-20 overflow-y-auto">
				{#each user.groups as group}
					<div
						class="px-1.5 py-0.5 rounded-lg bg-gray-50 dark:text-white dark:bg-gray-900/50 text-black transition text-xs"
					>
						{group.name}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
