<script>
	const {
		workspaceItems,
		chatFolders,
		conversations,
		darkMode,
		annotations,
		onToggleTheme,
		onSelectConversation,
		onTogglePanel
	} = $props();

	let activeConversationIndex = $derived(
		Math.max(
			0,
			conversations.findIndex((conversation) => conversation.active)
		)
	);
</script>

<aside class="sidebar">
	<div class="sidebar-inner">
		<div class="sidebar-brand">
			<div class="brand-mark">OW</div>
			<span class="brand-name">Open WebUI</span>
		</div>

		<button class="new-chat-btn">
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"><path d="M12 5v14M5 12h14" /></svg
			>
			<span>New conversation</span>
		</button>

		<div class="section-header">
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25A2.25 2.25 0 0 0 10.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
				/></svg
			>
			<span>Workspace</span>
		</div>
		<div class="workspace-list">
			{#each workspaceItems as item}
				<a class="ws-item" href={item.href}>
					<span class="ws-icon" aria-hidden="true">
						{#if item.id === 'models'}
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M21 8.25 12 3 3 8.25l9 5.25 9-5.25Z"
								/><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 15.75 12 21l9-5.25"
								/><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 12l9 5.25L21 12"
								/></svg
							>
						{:else if item.id === 'skills'}
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"
								/></svg
							>
						{:else if item.id === 'tools'}
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.8 5.8a2.1 2.1 0 0 0 3 3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.8 2.8-3-3 2.8-2.8Z"
								/></svg
							>
						{:else}
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v6.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
								/></svg
							>
						{/if}
					</span>
					<span class="ws-name">{item.name}</span>
				</a>
			{/each}
		</div>

		<div class="sidebar-divider"></div>

		<div class="folder-section">
			<div class="section-header folder-section-header">
				<span class="folder-section-title">
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v6.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
						/></svg
					>
					<span>Folders</span>
				</span>
				<button class="folder-add" aria-label="New Folder">
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"><path d="M12 5v14M5 12h14" /></svg
					>
				</button>
			</div>

			<div class="chat-folder-list">
				{#each chatFolders as folder}
					<button class="chat-folder-item" class:active={folder.active}>
						<span class="chat-folder-icon">
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v6.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
								/></svg
							>
						</span>
						<span class="chat-folder-name">{folder.name}</span>
						<span class="chat-folder-count">{folder.count}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="sidebar-divider"></div>

		<div class="section-header">
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
			>
			<span>Conversations</span>
		</div>
		<div class="conversation-list" style:--active-conversation-index={activeConversationIndex}>
			{#each conversations as conv}
				<button
					class="conv-card"
					class:active={conv.active}
					onclick={() => onSelectConversation(conv.id)}
				>
					<div class="conv-header">
						<span class="conv-title">{conv.title}</span>
						<span class="conv-meta">{conv.date}</span>
					</div>
					<div class="conv-summary">{conv.summary}</div>
				</button>
			{/each}
		</div>

		<div class="sidebar-divider"></div>

		<button class="ann-trigger" onclick={onTogglePanel} class:has-ann={annotations.length > 0}>
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg
			>
			<span>Annotations</span>
			{#if annotations.length > 0}
				<span class="ann-count">{annotations.length}</span>
			{/if}
		</button>

		<div class="sidebar-footer">
			<div class="user-avatar">JD</div>
			<div class="user-info">
				<div class="user-name">John Doe</div>
				<div class="user-role">Admin</div>
			</div>
			<button
				class="theme-btn"
				class:is-dark={darkMode}
				onclick={(e) => onToggleTheme(e)}
				aria-label="Toggle theme"
			>
				<svg
					class="icon-sun"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					><circle cx="12" cy="12" r="5" /><path
						d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
					/></svg
				>
				<svg
					class="icon-moon"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg
				>
			</button>
		</div>
	</div>
</aside>

<style>
	.sidebar {
		background: var(--bg-sidebar);
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
	}

	.sidebar-inner {
		display: flex;
		flex-direction: column;
		padding: 16px 12px 12px;
		gap: 6px;
		flex: 1;
		min-height: 0;
	}


	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 4px;
		margin-bottom: 10px;
	}

	.brand-mark {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: var(--accent);
		color: #fff;
		display: grid;
		place-items: center;
		font-size: 11px;
		font-weight: 700;
		flex: none;
	}

	.brand-name {
		font-size: 14px;
		font-weight: 700;
		letter-spacing: -0.3px;
		color: var(--text);
	}

	.new-chat-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 10px;
		background: var(--accent);
		color: #fff;
		border: none;
		font-family: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition:
			filter 0.2s,
			transform 0.1s;
		margin-bottom: 4px;
	}

	.new-chat-btn:hover {
		filter: brightness(1.15);
	}
	.new-chat-btn:active {
		transform: scale(0.98);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-tertiary);
		margin-top: 6px;
		padding: 0 4px;
	}

	/* Workspace */
	.workspace-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
		margin-top: 2px;
	}

	.ws-item {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 30px;
		padding: 5px 8px;
		border-radius: 8px;
		background: transparent;
		border: none;
		font-family: inherit;
		font-size: 13px;
		color: var(--text-secondary);
		cursor: pointer;
		text-align: left;
		text-decoration: none;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.ws-item:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: translateX(2px);
	}

	.ws-icon {
		width: 18px;
		height: 18px;
		border-radius: 6px;
		background: transparent;
		color: var(--text-tertiary);
		display: grid;
		place-items: center;
		flex: none;
	}

	.ws-item:hover .ws-icon {
		color: var(--accent);
	}

	.ws-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.sidebar-divider {
		height: 1px;
		background: var(--border);
		margin: 6px 4px;
	}

	/* Chat folders */
	.folder-section {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.folder-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0;
	}

	.folder-section-title {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.folder-add {
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.folder-add:hover {
		background: var(--surface-hover);
		color: var(--text-secondary);
	}

	.chat-folder-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
		margin-top: 2px;
	}

	.chat-folder-item {
		display: flex;
		align-items: center;
		gap: 7px;
		width: 100%;
		min-height: 28px;
		padding: 5px 8px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--text-secondary);
		font-family: inherit;
		font-size: 12.5px;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.chat-folder-item:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: translateX(2px);
	}

	.chat-folder-item.active {
		background: var(--accent-glow);
		color: var(--accent);
		transform: translateX(2px);
	}

	.chat-folder-icon {
		display: grid;
		place-items: center;
		color: var(--text-tertiary);
		flex: none;
		width: 16px;
	}

	.chat-folder-name {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.chat-folder-count {
		color: var(--text-tertiary);
		font-size: 11px;
		font-weight: 500;
	}

	/* Conversations */
	.conversation-list {
		--conv-row-h: 48px;
		--conv-gap: 1px;
		display: flex;
		flex-direction: column;
		gap: var(--conv-gap);
		margin-top: 2px;
		position: relative;
		flex: 1;
		overflow-y: auto;
		min-height: 0;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--text-secondary) 72%, transparent) transparent;
	}

	/* Track */
	.conversation-list::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 2px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--border) 90%, transparent);
		pointer-events: none;
		z-index: 0;
	}

	/* Sliding indicator */
	.conversation-list::after {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		width: 2px;
		height: var(--conv-row-h);
		border-radius: 999px;
		background: var(--accent);
		transform: translateY(
			calc(var(--active-conversation-index) * (var(--conv-row-h) + var(--conv-gap)))
		);
		transition: transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
		pointer-events: none;
		z-index: 2;
	}

	.conv-card {
		display: flex;
		flex-direction: column;
		gap: 3px;
		width: 100%;
		height: var(--conv-row-h);
		padding: 7px 8px 7px 12px;
		border-radius: 6px;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		text-align: left;
		font-family: inherit;
		cursor: pointer;
		overflow: hidden;
		position: relative;
		z-index: 1;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.conv-card:hover {
		color: var(--text);
		background: color-mix(in srgb, var(--surface-hover) 55%, transparent);
	}

	.conv-card.active {
		color: var(--text);
	}

	.conv-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.conv-title {
		font-size: 12px;
		font-weight: 600;
		color: currentColor;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.conv-meta {
		font-size: 10px;
		color: var(--text-tertiary);
		font-weight: 500;
		flex: none;
	}
	.conv-summary {
		font-size: 11.5px;
		line-height: 1.35;
		color: var(--text-tertiary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Annotations */
	.ann-trigger {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 30px;
		padding: 5px 8px;
		border-radius: 8px;
		background: transparent;
		border: none;
		font-family: inherit;
		font-size: 13px;
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.ann-trigger:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: translateX(2px);
	}

	.ann-trigger:hover svg {
		color: var(--accent);
	}

	.ann-trigger.has-ann {
		color: var(--orange);
		background: var(--orange-soft);
	}

	.ann-trigger.has-ann svg {
		color: var(--orange);
	}

	.ann-count {
		margin-left: auto;
		font-size: 10px;
		padding: 1px 5px;
		border-radius: 4px;
		background: var(--orange);
		color: #fff;
		font-weight: 700;
	}

	/* Footer */
	.sidebar-footer {
		padding-top: 12px;
		border-top: 1px solid var(--border);
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.user-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--accent-glow);
		border: 1.5px solid var(--accent);
		color: var(--accent);
		display: grid;
		place-items: center;
		font-size: 10px;
		font-weight: 700;
		flex: none;
	}

	.user-info {
		flex: 1;
		min-width: 0;
	}
	.user-name {
		font-size: 12px;
		font-weight: 600;
		color: var(--text);
	}
	.user-role {
		font-size: 11px;
		color: var(--text-tertiary);
	}

	.theme-btn {
		position: relative;
		width: 28px;
		height: 28px;
		border-radius: 7px;
		display: grid;
		place-items: center;
		background: transparent;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
		flex: none;
		overflow: hidden;
	}

	.theme-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.theme-btn svg {
		position: absolute;
		transition:
			transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 0.35s ease;
	}

	.icon-sun {
		transform: rotate(0deg) scale(1);
		opacity: 0;
	}

	.icon-moon {
		transform: rotate(0deg) scale(1);
		opacity: 1;
	}

	/* Dark mode: sun appears, moon rotates out */
	.theme-btn.is-dark .icon-sun {
		transform: rotate(180deg) scale(1);
		opacity: 1;
	}

	.theme-btn.is-dark .icon-moon {
		transform: rotate(180deg) scale(0.5);
		opacity: 0;
	}

	/* Light mode: moon appears, sun rotates out */
	.theme-btn:not(.is-dark) .icon-sun {
		transform: rotate(-180deg) scale(0.5);
		opacity: 0;
	}

	.theme-btn:not(.is-dark) .icon-moon {
		transform: rotate(0deg) scale(1);
		opacity: 1;
	}
</style>
