<script>
	let {
		messages,
		generating,
		inputValue = $bindable(),
		onSend,
		onSelectMessage,
		selectedMessageId
	} = $props();

	let inputRef = $state(null);
	let composerFocused = $state(false);
	let showBlockMenu = $state(false);

	function autoResize(node) {
		const resize = () => {
			node.style.height = 'auto';
			node.style.height = Math.min(node.scrollHeight, 200) + 'px';
		};
		node.addEventListener('input', resize);
		return {
			destroy() {
				node.removeEventListener('input', resize);
			}
		};
	}

	function handleKey(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			onSend();
		}
	}

	function scrollToBottom(node) {
		node.scrollTop = node.scrollHeight;
		return { destroy() {} };
	}

	const hasContent = $derived(inputValue.trim().length > 0);
</script>

<div class="canvas-wrap">
	<div class="canvas-scroll" use:scrollToBottom>
		<div class="messages-container">
			{#each messages as msg, i (msg.id)}
				<div
					class="msg-entry"
					class:user={msg.role === 'user'}
					class:agent={msg.role === 'assistant'}
				>
					<!-- Role Indicator -->
					<div class="msg-gutter">
						{#if msg.role === 'user'}
							<div class="role-badge user-badge" title="You">
								<svg
									width="10"
									height="10"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
										cx="12"
										cy="7"
										r="4"
									/></svg
								>
							</div>
						{:else}
							<div class="role-badge agent-badge" title="AI">
								<svg
									width="10"
									height="10"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path
										d="M2 12l10 5 10-5"
									/></svg
								>
							</div>
						{/if}
						<button
							class="version-trigger"
							class:active={selectedMessageId === msg.id}
							onclick={() => onSelectMessage(msg.id)}
							aria-label="View versions"
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"><path d="M6 9 12 3l6 6" /><path d="M6 15l6 6 6-6" /></svg
							>
						</button>
					</div>

					<!-- Content -->
					<div class="msg-body">
						<div class="msg-content">{msg.content}</div>
						<div class="msg-footer">
							<span class="msg-time">{msg.timestamp}</span>
							{#if msg.role === 'assistant'}
								<div class="msg-actions">
									<button class="action-btn" aria-label="Copy" title="Copy">
										<svg
											width="13"
											height="13"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											><rect width="14" height="14" x="8" y="8" rx="2" /><path
												d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
											/></svg
										>
									</button>
									<button class="action-btn" aria-label="Regenerate" title="Regenerate">
										<svg
											width="13"
											height="13"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path
												d="M3 3v5h5"
											/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path
												d="M16 21h5v-5"
											/></svg
										>
									</button>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}

			{#if generating}
				<div class="msg-entry agent">
					<div class="msg-gutter">
						<div class="role-badge agent-badge pulse">
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path
									d="M2 12l10 5 10-5"
								/></svg
							>
						</div>
					</div>
					<div class="msg-body">
						<div class="typing-indicator">
							<span class="t-dot"></span>
							<span class="t-dot"></span>
							<span class="t-dot"></span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Innovative Composer: Block-based, minimal dock -->
	<div class="composer-dock" class:focused={composerFocused}>
		<div class="composer-inner">
			<div class="composer-toolbar">
				<button
					class="tool-btn"
					onclick={() => (showBlockMenu = !showBlockMenu)}
					aria-label="Add block"
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"><path d="M12 5v14M5 12h14" /></svg
					>
				</button>
				<div class="toolbar-divider"></div>
				<button class="tool-btn" aria-label="Attach file">
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						><path
							d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
						/></svg
					>
				</button>
				<button class="tool-btn" aria-label="Web search">
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg
					>
				</button>
				<button class="tool-btn" aria-label="Voice">
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path
							d="M19 10v2a7 7 0 0 1-14 0v-2"
						/><path d="M12 19v4M8 23h8" /></svg
					>
				</button>
			</div>

			<div class="composer-input-wrap">
				<textarea
					bind:this={inputRef}
					bind:value={inputValue}
					use:autoResize
					rows="1"
					placeholder={composerFocused ? 'Type your message...' : 'Press / to command, or type...'}
					class="composer-textarea"
					onfocus={() => (composerFocused = true)}
					onblur={() => {
						if (!inputValue) composerFocused = false;
					}}
					onkeydown={handleKey}
				></textarea>

				{#if hasContent}
					<button class="send-orb" onclick={onSend} aria-label="Send">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg
						>
					</button>
				{/if}
			</div>

			{#if composerFocused}
				<div class="composer-hint">
					<span>Shift + Enter for newline</span>
					<span class="hint-key">/</span>
					<span>for commands</span>
					<span class="hint-key">@</span>
					<span>to mention</span>
					<span class="hint-key">↑</span>
					<span>to edit last</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.canvas-wrap {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-width: 0;
		position: relative;
	}

	.canvas-scroll {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding-bottom: 20px;
	}

	.canvas-scroll::-webkit-scrollbar {
		width: 6px;
	}
	.canvas-scroll::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 999px;
	}

	.messages-container {
		max-width: 100%;
		padding: 40px 60px 20px;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* Message Entry — Same Side Document Style */
	.msg-entry {
		display: flex;
		gap: 16px;
		padding: 18px 0;
		border-bottom: 1px solid var(--border);
		position: relative;
		animation: msgSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		opacity: 0;
		transform: translateY(8px);
	}

	@keyframes msgSlide {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.msg-entry:last-child {
		border-bottom: none;
	}

	/* Gutter — Role + Version Trigger */
	.msg-gutter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		flex: none;
		padding-top: 2px;
	}

	.role-badge {
		width: 26px;
		height: 26px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		flex: none;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.user-badge {
		background: var(--user-glow);
		color: var(--user);
		border: 1px solid var(--user-glow);
	}

	.agent-badge {
		background: var(--accent-glow);
		color: var(--accent);
		border: 1px solid var(--accent-glow);
	}

	.agent-badge.pulse {
		animation: avatarPulse 2s ease-in-out infinite;
	}

	@keyframes avatarPulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 var(--accent-glow);
		}
		50% {
			box-shadow: 0 0 0 10px transparent;
		}
	}

	.version-trigger {
		width: 22px;
		height: 22px;
		border-radius: 6px;
		display: grid;
		place-items: center;
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-tertiary);
		cursor: pointer;
		transition: all 0.2s;
		opacity: 0;
	}

	.msg-entry:hover .version-trigger {
		opacity: 1;
	}

	.version-trigger:hover {
		background: var(--surface-hover);
		color: var(--text);
		border-color: var(--border-strong);
	}

	.version-trigger.active {
		opacity: 1;
		background: var(--accent);
		color: #fff;
		border-color: var(--accent);
	}

	/* Message Body */
	.msg-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-right: 40px;
	}

	.msg-content {
		font-size: 15px;
		line-height: 1.7;
		color: var(--text-secondary);
		white-space: pre-wrap;
	}

	.msg-entry.user .msg-content {
		color: var(--text);
		font-weight: 450;
	}

	.msg-footer {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.msg-time {
		font-size: 11px;
		color: var(--text-tertiary);
		font-weight: 500;
	}

	.msg-actions {
		display: flex;
		gap: 2px;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.msg-entry:hover .msg-actions {
		opacity: 1;
	}

	.action-btn {
		width: 24px;
		height: 24px;
		border-radius: 5px;
		display: grid;
		place-items: center;
		background: transparent;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.action-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	/* Typing */
	.typing-indicator {
		display: flex;
		gap: 5px;
		align-items: center;
		padding: 8px 0;
	}

	.t-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		animation: bounce 1.4s infinite ease-in-out both;
	}

	.t-dot:nth-child(1) {
		animation-delay: -0.32s;
		background: var(--accent-soft);
	}
	.t-dot:nth-child(2) {
		animation-delay: -0.16s;
	}
	.t-dot:nth-child(3) {
		animation-delay: 0s;
		background: var(--accent-soft);
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: scale(0.3);
			opacity: 0.3;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* ——— Composer Dock ——— */
	.composer-dock {
		flex: none;
		padding: 0 20px 20px;
		z-index: 10;
	}

	.composer-inner {
		max-width: 720px;
		margin: 0 auto;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow: 0 4px 24px var(--shadow-color);
		transition:
			border-color 0.3s,
			box-shadow 0.3s;
		overflow: hidden;
	}

	.composer-dock.focused .composer-inner {
		border-color: var(--accent-soft);
		box-shadow:
			0 0 0 3px var(--accent-glow),
			0 8px 32px var(--shadow-color);
	}

	.composer-toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--border);
	}

	.toolbar-divider {
		width: 1px;
		height: 16px;
		background: var(--border);
		margin: 0 4px;
	}

	.tool-btn {
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
	}

	.tool-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.composer-input-wrap {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 10px 12px 8px;
	}

	.composer-textarea {
		flex: 1;
		min-width: 0;
		max-height: 200px;
		overflow-y: auto;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		font-family: inherit;
		font-size: 15px;
		line-height: 1.55;
		color: var(--text);
		padding: 4px 0;
	}

	.composer-textarea::placeholder {
		color: var(--text-tertiary);
	}

	.send-orb {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--accent);
		color: var(--accent-text);
		border: none;
		cursor: pointer;
		flex: none;
		transition:
			transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.2s;
		box-shadow: 0 2px 12px var(--accent-glow);
		animation: orbAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes orbAppear {
		from {
			transform: scale(0);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.send-orb:hover {
		transform: scale(1.1);
		box-shadow: 0 4px 20px var(--accent-glow);
	}

	.send-orb:active {
		transform: scale(0.95);
	}

	.composer-hint {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 12px 8px;
		font-size: 11px;
		color: var(--text-tertiary);
		animation: fadeIn 0.2s ease;
	}

	.hint-key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		border-radius: 4px;
		background: var(--surface);
		border: 1px solid var(--border);
		font-size: 10px;
		font-weight: 600;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 900px) {
		.messages-container {
			padding: 20px 20px 10px;
		}
	}
</style>
