<script>
	let {
		messages,
		generating,
		inputValue = $bindable(),
		onSend
	} = $props();

	let inputRef = $state(null);
	let isSending = $state(false);
	let composerFocused = $state(false);

	function autoResize(node) {
		const resize = () => {
			node.style.height = 'auto';
			node.style.height = Math.min(node.scrollHeight, 180) + 'px';
		};
		node.addEventListener('input', resize);
		return { destroy() { node.removeEventListener('input', resize); } };
	}

	function handleKey(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			doSend();
		}
	}

	async function doSend() {
		if (!inputValue.trim() || isSending) return;
		isSending = true;
		await onSend();
		isSending = false;
		setTimeout(() => inputRef?.focus(), 50);
	}

	function scrollToEnd(node) {
		const observer = new MutationObserver(() => {
			node.scrollTop = node.scrollHeight;
		});
		observer.observe(node, { childList: true, subtree: true });
		return { destroy() { observer.disconnect(); } };
	}

	const hasContent = $derived(inputValue.trim().length > 0);
</script>

<div class="chat-wrap">
	<div class="chat-scroll" use:scrollToEnd>
		<div class="messages-flow">
			{#each messages as msg, i (msg.id)}
				<div
					class="msg-row"
					class:user={msg.role === 'user'}
					class:ai={msg.role === 'assistant'}
					style="animation-delay: {i * 50}ms"
				>
					<!-- Inline Version Graph Gutter -->
					<div class="msg-graph">
						<div class="spine" class:first={i === 0} class:last={i === messages.length - 1 && !generating}></div>
						<div class="spine-dot" class:user={msg.role === 'user'} class:ai={msg.role === 'assistant'}></div>

						{#if msg.branches && msg.branches.length > 1}
							{#each msg.branches.filter(b => !b.active) as branch, bi}
								<div
									class="branch-connector"
									style="top: calc(50% + {(bi - (msg.branches.length-1)/2) * 14}px)"
								></div>
								<div
									class="branch-dot"
									style="top: calc(50% + {(bi - (msg.branches.length-1)/2) * 14}px)"
									title="Switch to {branch.label}"
								>
									<span class="branch-label">{branch.label}</span>
								</div>
							{/each}
						{/if}
					</div>

					<!-- Message Body -->
					<div class="msg-body">
						<div class="msg-header">
							<span class="msg-role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
							<span class="msg-time">{msg.timestamp}</span>
						</div>
						<div class="msg-content">{msg.content}</div>
						<div class="msg-footer">
							{#if msg.branches && msg.branches.length > 1}
								<div class="version-badge">
									<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9 12 3l6 6"/><path d="M6 15l6 6 6-6"/></svg>
									{msg.branches.find(b => b.active)?.label || 'v1'} of {msg.branches.length}
								</div>
							{/if}
							<div class="msg-actions">
								<button aria-label="Copy" title="Copy">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
								</button>
								<button aria-label="Regenerate" title="Regenerate">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
								</button>
							</div>
						</div>
					</div>
				</div>
			{/each}

			{#if generating}
				<div class="msg-row ai generating">
					<div class="msg-graph">
						<div class="spine"></div>
						<div class="spine-dot ai pulse"></div>
					</div>
					<div class="msg-body">
						<div class="msg-header">
							<span class="msg-role">Assistant</span>
						</div>
						<div class="typing-dots">
							<span class="t-dot"></span>
							<span class="t-dot"></span>
							<span class="t-dot"></span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Bottom Input Bar -->
	<div class="input-bar" class:focused={composerFocused} class:sending={isSending}>
		<div class="input-inner">
			<div class="input-toolbar">
				<button class="tool-btn" aria-label="Attach file">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
				</button>
				<button class="tool-btn" aria-label="Web search">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
				</button>
				<button class="tool-btn" aria-label="Generate image">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
				</button>
				<button class="tool-btn" aria-label="Voice">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v4M8 23h8"/></svg>
				</button>
			</div>

			<div class="input-main">
				<textarea
					bind:this={inputRef}
					bind:value={inputValue}
					use:autoResize
					rows="1"
					placeholder="Message..."
					class="input-field"
					onfocus={() => composerFocused = true}
					onblur={() => composerFocused = false}
					onkeydown={handleKey}
				></textarea>
				<button
					class="send-btn"
					class:ready={hasContent}
					onclick={doSend}
					aria-label="Send"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
				</button>
			</div>

			<div class="input-hints">
				<span class="hint">Return to send</span>
				<span class="hint-sep">·</span>
				<span class="hint">Shift + Return for newline</span>
				<span class="hint-sep">·</span>
				<span class="hint">/ for commands</span>
				<span class="hint-sep">·</span>
				<span class="hint">@ for context</span>
			</div>
		</div>
	</div>
</div>

<style>
	.chat-wrap {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-width: 0;
		background: var(--bg-base);
		position: relative;
	}

	.chat-scroll {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.chat-scroll::-webkit-scrollbar { width: 5px; }
	.chat-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
	.chat-scroll:hover::-webkit-scrollbar-thumb { background: var(--border-hover); }

	.messages-flow {
		padding: 28px 32px 20px;
		max-width: 100%;
	}

	/* ─── Message Row ─── */
	.msg-row {
		display: flex;
		gap: 0;
		position: relative;
		animation: msgSlide 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		opacity: 0;
		transform: translateY(8px);
		transition: background 0.2s;
	}

	.msg-row:hover {
		background: var(--surface);
		border-radius: 0 8px 8px 0;
	}

	@keyframes msgSlide {
		to { opacity: 1; transform: translateY(0); }
	}

	/* ─── Inline Version Graph Gutter ─── */
	.msg-graph {
		width: 48px;
		flex: none;
		position: relative;
		padding: 14px 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	/* Spine line */
	.spine {
		position: absolute;
		left: 20px;
		top: 0;
		bottom: 0;
		width: 2px;
		background: linear-gradient(to bottom,
			var(--border) 0%,
			var(--border-hover) 50%,
			var(--border) 100%
		);
		transition: background 0.3s;
	}

	.msg-row:hover .spine {
		background: linear-gradient(to bottom,
			var(--border-hover) 0%,
			var(--accent-soft) 50%,
			var(--border-hover) 100%
		);
	}

	.spine.first {
		top: 50%;
		border-radius: 2px 2px 0 0;
	}

	.spine.last {
		bottom: 50%;
		border-radius: 0 0 2px 2px;
	}

	/* Main dot on spine */
	.spine-dot {
		position: absolute;
		left: 16px;
		top: 50%;
		transform: translateY(-50%);
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 2px solid transparent;
		z-index: 2;
		transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
	}

	.spine-dot.user {
		background: var(--orange);
		border-color: var(--orange);
		box-shadow: 0 0 10px var(--orange-glow);
	}

	.spine-dot.ai {
		background: var(--accent);
		border-color: var(--accent);
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.msg-row:hover .spine-dot {
		transform: translateY(-50%) scale(1.5);
	}

	.spine-dot.pulse {
		animation: dotPulse 2s ease-in-out infinite;
	}

	@keyframes dotPulse {
		0%, 100% { box-shadow: 0 0 0 0 var(--accent-glow); }
		50% { box-shadow: 0 0 0 8px transparent; }
	}

	/* Branch connectors */
	.branch-connector {
		position: absolute;
		left: 22px;
		width: 14px;
		height: 1.5px;
		background: var(--border);
		z-index: 1;
		transition: background 0.2s, width 0.2s;
	}

	.msg-row:hover .branch-connector {
		background: var(--border-hover);
	}

	/* Branch dots */
	.branch-dot {
		position: absolute;
		left: 34px;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--border);
		border: 1.5px solid var(--border-hover);
		cursor: pointer;
		z-index: 2;
		transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.branch-dot:hover {
		transform: scale(1.6);
		background: var(--text-tertiary);
		border-color: var(--text-secondary);
		box-shadow: 0 0 8px var(--shadow-color);
	}

	.branch-label {
		position: absolute;
		left: calc(100% + 6px);
		font-size: 9px;
		color: var(--text-tertiary);
		white-space: nowrap;
		opacity: 0;
		transform: translateX(-4px);
		transition: all 0.2s;
		pointer-events: none;
	}

	.branch-dot:hover .branch-label {
		opacity: 1;
		transform: translateX(0);
	}

	/* ─── Message Body ─── */
	.msg-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px 16px 14px 0;
		border-bottom: 1px solid var(--border);
	}

	.msg-row:hover .msg-body {
		border-bottom-color: transparent;
	}

	.msg-header {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	.msg-role {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		transition: color 0.3s;
	}

	.msg-row.user .msg-role { color: var(--orange); }
	.msg-row.ai .msg-role { color: var(--accent); }

	.msg-time {
		font-size: 11px;
		color: var(--text-tertiary);
		font-weight: 500;
	}

	.msg-content {
		font-size: 15px;
		line-height: 1.7;
		color: var(--text-secondary);
		white-space: pre-wrap;
		transition: color 0.2s;
	}

	.msg-row.user .msg-content {
		color: var(--text);
	}

	.msg-row:hover .msg-content {
		color: var(--text);
	}

	/* Footer */
	.msg-footer {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 4px;
		opacity: 0;
		transform: translateY(3px);
		transition: opacity 0.25s, transform 0.25s;
	}

	.msg-row:hover .msg-footer {
		opacity: 1;
		transform: translateY(0);
	}

	.version-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 10px;
		font-weight: 600;
		background: var(--surface-active);
		border: 1px solid var(--border);
		color: var(--text-tertiary);
		transition: all 0.2s;
	}

	.version-badge:hover {
		background: var(--accent-glow);
		color: var(--accent);
		border-color: var(--accent-glow);
	}

	.msg-actions {
		display: flex;
		gap: 2px;
		margin-left: auto;
	}

	.msg-actions button {
		width: 24px; height: 24px;
		border-radius: 5px;
		display: grid; place-items: center;
		background: transparent;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.msg-actions button:hover {
		background: var(--surface-active);
		color: var(--text);
		transform: scale(1.1);
	}

	/* ─── Typing ─── */
	.typing-dots {
		display: flex;
		gap: 5px;
		padding: 10px 0;
	}

	.t-dot {
		width: 5px; height: 5px;
		border-radius: 50%;
		background: var(--accent);
		animation: bounce 1.3s infinite ease-in-out both;
		opacity: 0.4;
	}

	.t-dot:nth-child(1) { animation-delay: -0.32s; background: var(--accent-soft); }
	.t-dot:nth-child(2) { animation-delay: -0.16s; }
	.t-dot:nth-child(3) { animation-delay: 0s; background: var(--accent-soft); }

	@keyframes bounce {
		0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
		40% { transform: scale(1); opacity: 1; }
	}

	/* ─── Input Bar ─── */
	.input-bar {
		flex: none;
		padding: 12px 20px 16px;
		z-index: 10;
		background: linear-gradient(to top, var(--bg-base) 80%, transparent);
	}

	.input-inner {
		max-width: 720px;
		margin: 0 auto;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 14px;
		box-shadow: 0 4px 24px var(--shadow-color);
		overflow: hidden;
		transition: border-color 0.3s, box-shadow 0.3s;
	}

	.input-bar.focused .input-inner {
		border-color: var(--orange-soft);
		box-shadow: 0 0 0 3px var(--orange-glow), 0 8px 32px var(--shadow-color);
	}

	.input-toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--border);
	}

	.tool-btn {
		width: 28px; height: 28px;
		border-radius: 7px;
		display: grid; place-items: center;
		background: transparent;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.tool-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: scale(1.15);
	}

	.input-main {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 8px 12px;
	}

	.input-field {
		flex: 1;
		min-width: 0;
		max-height: 180px;
		overflow-y: auto;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		font-family: inherit;
		font-size: 15px;
		line-height: 1.55;
		color: var(--text);
		padding: 6px 0;
	}

	.input-field::placeholder {
		color: var(--text-tertiary);
	}

	.send-btn {
		width: 36px; height: 36px;
		border-radius: 50%;
		display: grid; place-items: center;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text-tertiary);
		cursor: pointer;
		flex: none;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.send-btn.ready {
		background: var(--orange);
		border-color: var(--orange);
		color: #fff;
		box-shadow: 0 2px 16px var(--orange-glow);
	}

	.send-btn.ready:hover {
		transform: scale(1.15);
		box-shadow: 0 4px 24px var(--orange-glow);
	}

	.send-btn:active {
		transform: scale(0.95) !important;
	}

	.input-hints {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 12px 8px;
		font-size: 11px;
		color: var(--text-tertiary);
	}

	.hint-sep { color: var(--border); font-size: 11px; }

	:global(::selection) {
		background: rgba(255,136,0,0.25);
		color: inherit;
	}
</style>
