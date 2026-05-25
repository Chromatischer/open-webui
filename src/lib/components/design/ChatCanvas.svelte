<script>
	import { onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import CursorLiftText from '$lib/components/design/CursorLiftText.svelte';

	let {
		messages,
		generating,
		annotations,
		showAnnotationPanel,
		marks = [],
		onSend,
		onAnnotate,
		onRemoveAnnotation,
		onSendAnnotations,
		onMark,
		onRemoveMark
	} = $props();

	let inputValue = $state('');
	let composerActive = $state(false);
	let sending = $state(false);
	const selectionLift = {
		enabled: true,
		radius: 56,
		lift: 2,
		falloff: 1.9,
		settle: 110
	};
	let streamText = $state('Here is a streamed response test. It should grow token by token, keep the layout stable, and make the message feel like it is arriving live.');
	let streamDelay = $state(34);
	let streamChunkSize = $state(1);
	let streamRunning = $state(false);
	let streamTokenCount = $state(0);
	let activeStreamId = $state(null);
	let streamTimer = null;
	let selPopup = $state(null); // { x, y, msgId }
	let selNote = $state('');
	let hoveredMsg = $state(null);
	let scrollNode = $state(null);
	let ignoreNextClick = false;
	let thinkingOpen = $state(new Set());
	let versionDirections = $state(new Map()); /* msgId -> 1 | -1 */
	let versionCardApis = $state(new Map()); /* msgId -> { animate() } */

	function autoResize(node) {
		const fn = () => {
			const previousHeight = node.offsetHeight;
			node.style.height = 'auto';
			node.style.height = Math.min(node.scrollHeight, 160) + 'px';
			const delta = node.offsetHeight - previousHeight;
			if (delta && scrollNode) {
				scrollNode.scrollTop += delta;
			}
		};
		node.addEventListener('input', fn);
		fn();
		return { destroy() { node.removeEventListener('input', fn); } };
	}

	function initScroll(node) {
		scrollNode = node;
		return {};
	}

	function handleKey(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (inputValue.trim()) {
				sendComposerMessage();
			}
		}
	}

	function sendComposerMessage() {
		const text = inputValue.trim();
		if (!text || sending) return;

		sending = true;
		const outgoing = inputValue;
		inputValue = '';
		composerActive = false;

		setTimeout(() => {
			onSend(outgoing);
		}, 220);

		setTimeout(() => {
			sending = false;
		}, 720);
	}

	function scrollToBottom() {
		if (!scrollNode) return;
		requestAnimationFrame(() => {
			scrollNode.scrollTo({ top: scrollNode.scrollHeight, behavior: 'smooth' });
		});
	}

	function streamChunks(text, chunkSize) {
		const tokens = text.match(/\S+\s*/g) ?? [];
		if (chunkSize <= 1) return tokens;
		const chunks = [];
		for (let i = 0; i < tokens.length; i += chunkSize) {
			chunks.push(tokens.slice(i, i + chunkSize).join(''));
		}
		return chunks;
	}

	function stopTokenStream() {
		clearTimeout(streamTimer);
		streamTimer = null;
		if (activeStreamId) {
			messages = messages.map(m =>
				m.id === activeStreamId
					? { ...m, streaming: false, timestamp: m.content ? 'Stopped' : 'Just now' }
					: m
			);
		}
		activeStreamId = null;
		streamRunning = false;
	}

	function startTokenStream() {
		const chunks = streamChunks(streamText.trim(), Number(streamChunkSize));
		if (!chunks.length || streamRunning) return;

		stopTokenStream();
		streamRunning = true;
		streamTokenCount = 0;

		const id = `stream-${Date.now()}`;
		activeStreamId = id;
		messages = [
			...messages,
			{
				id,
				role: 'assistant',
				content: '',
				tokens: [],
				timestamp: 'Streaming',
				streaming: true
			}
		];
		scrollToBottom();

		let i = 0;
		const tick = () => {
			if (!messages.some(m => m.id === id)) {
				stopTokenStream();
				return;
			}

			messages = messages.map(m =>
				m.id === id
					? { ...m, content: `${m.content ?? ''}${chunks[i]}`, tokens: [...(m.tokens ?? []), chunks[i]] }
					: m
			);
			streamTokenCount = i + 1;
			scrollToBottom();
			i += 1;

			if (i >= chunks.length) {
				messages = messages.map(m =>
					m.id === id ? { ...m, streaming: false, timestamp: 'Just now' } : m
				);
				activeStreamId = null;
				stopTokenStream();
				return;
			}

			streamTimer = setTimeout(tick, Number(streamDelay));
		};

		streamTimer = setTimeout(tick, Number(streamDelay));
	}

	function onSelectUp(e) {
			const selected = window.getSelection();
		if (selected?.toString().trim().length > 0) {
			const range = selected.getRangeAt(0);
			const rect = range.getBoundingClientRect();
			if (!rect.width && !rect.height) {
				selPopup = null;
				return;
			}
			const targetX = rect.left + rect.width / 2;
			const targetY = rect.top + rect.height / 2;
			const msgEl = e.target.closest('[data-msg-id]');
			if (msgEl) {
				const popupWidth = 260;
				const popupHeight = 56;
				const margin = 12;
				const gap = 12;
				const placement = rect.top - popupHeight - gap > margin ? 'above' : 'below';
				const left = Math.min(
					window.innerWidth - popupWidth - margin,
					Math.max(margin, targetX - popupWidth / 2)
				);
				const rawTop = placement === 'above' ? rect.top - popupHeight - gap : rect.bottom + gap;
				const top = Math.min(
					window.innerHeight - popupHeight - margin,
					Math.max(margin, rawTop)
				);
				const tailX = Math.min(
					popupWidth - 22,
					Math.max(22, targetX - left)
				);

				selPopup = {
					x: left,
					y: top,
					tailX,
					placement,
					msgId: msgEl.dataset.msgId,
					text: selected.toString().trim()
				};
				ignoreNextClick = true; // the click event following this mouseup would immediately close it
			}
		} else {
			if (!e.target.closest?.('.sel-popup')) {
				selPopup = null;
			}
		}
	}

	function saveAnnotation() {
		if (selPopup && selNote.trim()) {
			onAnnotate(Date.now().toString(), selPopup.msgId, selPopup.text, selNote.trim());
			selNote = '';
			selPopup = null;
			window.getSelection()?.removeAllRanges();
		}
	}

	function cancelAnnotation() {
		selPopup = null;
		selNote = '';
		window.getSelection()?.removeAllRanges();
	}

	function onWindowClick(e) {
		if (ignoreNextClick) {
			ignoreNextClick = false;
			return;
		}
		if (selPopup && !e.target.closest('.sel-popup')) {
			selPopup = null;
			selNote = '';
		}
	}

	function toggleThinking(msgId) {
		const next = new Set(thinkingOpen);
		if (next.has(msgId)) next.delete(msgId);
		else next.add(msgId);
		thinkingOpen = next;
	}

	function switchVersion(msgId, versionId) {
		const msg = messages.find(m => m.id === msgId);
		if (!msg || !msg.versions) return;

		const currentIdx = msg.versions.findIndex(v => v.active);
		const targetIdx = msg.versions.findIndex(v => v.id === versionId);
		const direction = targetIdx > currentIdx ? 1 : -1;

		// Freeze the card at its current height BEFORE mutating state.
		// This prevents the browser from painting a frame where the card
		// has already snapped to the new content size.
		const api = versionCardApis.get(msgId);
		if (api) api.freeze();

		msg.versions.forEach(v => v.active = (v.id === versionId));
		const active = msg.versions.find(v => v.active);
		if (active) msg.content = active.content;

		versionDirections = new Map(versionDirections);
		versionDirections.set(msgId, direction);
		messages = [...messages];

		// Svelte updates the DOM synchronously, so we can read the new
		// content height immediately and start the transition.
		if (api) api.animate(versionId);
	}

	function registerVersionCard(node, msgId) {
		let frozenHeight = 0;
		let cleanupTimer = null;

		const api = {
			freeze() {
				// Cancel any pending cleanup from a previous transition
				if (cleanupTimer) {
					clearTimeout(cleanupTimer);
					cleanupTimer = null;
				}
				frozenHeight = node.scrollHeight;
				node.style.transition = 'none';
				node.style.height = frozenHeight + 'px';
			},
			animate(targetVerId) {
				requestAnimationFrame(() => {
					// Take exiting siblings out of flow so they don't inflate the
					// measurement. Also reset height to auto so scrollHeight reflects
					// actual content height, not the frozen explicit value (which
					// would make scrollHeight === frozenHeight and kill the animation
					// when shrinking).
					const entering = node.querySelector(`[data-ver-id="${targetVerId}"]`);
					const siblings = entering
						? Array.from(node.children).filter(c => c !== entering)
						: [];

					siblings.forEach(c => { c.style.position = 'absolute'; });
					node.style.height = 'auto';
					const targetHeight = node.scrollHeight;
					// Restore frozen height before starting the transition so the
					// browser animates from the old size, not from auto.
					node.style.height = frozenHeight + 'px';
					siblings.forEach(c => { c.style.position = ''; });

					if (Math.abs(targetHeight - frozenHeight) < 1) {
						node.style.height = '';
						node.style.transition = '';
						return;
					}
					// Force reflow so the browser commits the frozen height before
					// the transition property is applied.
					node.offsetHeight;
					node.style.transition = 'height 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
					node.style.height = targetHeight + 'px';
					cleanupTimer = setTimeout(() => {
						node.style.height = '';
						node.style.transition = '';
						cleanupTimer = null;
					}, 380); // outlasts the 340ms out:fly so the exiting element is gone first
				});
			}
		};

		versionCardApis = new Map(versionCardApis);
		versionCardApis.set(msgId, api);

		return {
			destroy() {
				if (cleanupTimer) clearTimeout(cleanupTimer);
				versionCardApis.delete(msgId);
			}
		};
	}

	function streamingHeight(node, streaming) {
		let rafId = null;
		let lastH = 0;
		let mo = null;

		function check() {
			rafId = null;
			const newH = node.scrollHeight;
			if (Math.abs(newH - lastH) < 1) return;
			node.style.transition = 'height 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
			node.style.height = newH + 'px';
			lastH = newH;
		}

		function start() {
			lastH = node.offsetHeight;
			node.style.height = lastH + 'px';
			mo = new MutationObserver(() => {
				if (rafId) return;
				rafId = requestAnimationFrame(check);
			});
			mo.observe(node, { childList: true, subtree: true });
		}

		function stop() {
			if (mo) { mo.disconnect(); mo = null; }
			if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
			node.style.height = '';
			node.style.transition = '';
		}

		if (streaming) start();

		return {
			update(s) { s ? start() : stop(); },
			destroy() { stop(); }
		};
	}

	function msgAnnotations(msgId) {
		return annotations.filter(a => a.msgId === msgId);
	}

	function markText() {
		if (selPopup) {
			onMark(Date.now().toString(), selPopup.msgId, selPopup.text);
			selPopup = null;
			window.getSelection()?.removeAllRanges();
		}
	}

	function msgMarks(msgId) {
		return marks.filter(m => m.msgId === msgId);
	}

	function segmentContent(content, msgMarkList) {
		if (!msgMarkList.length) return [{ text: content, marked: false, markId: null }];
		const segs = [];
		// Build sorted list of [start, end, markId] from first occurrence of each mark text
		const positions = msgMarkList
			.map(m => ({
				idx: content.indexOf(m.selectedText),
				len: m.selectedText.length,
				id: m.id,
				angle: m.angle ?? 0,
				offset: m.offset ?? 0,
				height: m.height ?? 0.62
			}))
			.filter(m => m.idx !== -1)
			.sort((a, b) => a.idx - b.idx);
		let pos = 0;
		for (const m of positions) {
			if (m.idx < pos) continue; // overlapping, skip
			if (m.idx > pos) segs.push({ text: content.slice(pos, m.idx), marked: false, markId: null });
			segs.push({
				text: content.slice(m.idx, m.idx + m.len),
				marked: true,
				markId: m.id,
				markAngle: m.angle,
				markOffset: m.offset,
				markHeight: m.height
			});
			pos = m.idx + m.len;
		}
		if (pos < content.length) segs.push({ text: content.slice(pos), marked: false, markId: null });
		return segs;
	}

	onDestroy(() => {
		clearTimeout(streamTimer);
	});
</script>

<svelte:window onmouseup={onSelectUp} onclick={onWindowClick} />

<div class="wrap">
	<div class="stream-lab">
		<div class="lab-head">
			<span>Token stream</span>
			<span class="stream-count">{streamTokenCount}</span>
		</div>
		<textarea
			class="stream-input"
			rows="3"
			bind:value={streamText}
			placeholder="Type a test response..."
		></textarea>
		<div class="stream-controls">
			<label>
				<span>Delay <b>{streamDelay}ms</b></span>
				<input type="range" min="8" max="180" step="2" bind:value={streamDelay} />
			</label>
			<label>
				<span>Chunk <b>{streamChunkSize}</b></span>
				<input type="range" min="1" max="5" step="1" bind:value={streamChunkSize} />
			</label>
		</div>
		<div class="stream-actions">
			<button class="stream-btn primary" class:running={streamRunning} onclick={startTokenStream} disabled={streamRunning || !streamText.trim()}>
				{streamRunning ? 'Streaming' : 'Stream'}
			</button>
			<button class="stream-btn" onclick={stopTokenStream} disabled={!streamRunning}>Stop</button>
		</div>
	</div>

	<!-- Selection popup -->
	{#if selPopup}
		<div
			class="sel-popup"
			class:below={selPopup.placement === 'below'}
			style="left:{selPopup.x}px; top:{selPopup.y}px; --tail-x:{selPopup.tailX}px;"
		>
			<div class="sel-quick-actions">
				<button class="sel-mark-btn" onclick={markText} title="Highlight">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="m9 11-6 6v3h9l3-3"/>
						<path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>
					</svg>
				</button>
				<div class="sel-ann-row">
					<input
						type="text"
						placeholder="Add a note..."
						bind:value={selNote}
						onkeydown={(e) => { if (e.key === 'Enter') saveAnnotation(); if (e.key === 'Escape') cancelAnnotation(); }}
					/>
						<button
							class="sel-ann-save"
							class:visible={selNote.trim()}
							disabled={!selNote.trim()}
							onclick={saveAnnotation}
							title="Add note"
						>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<polyline points="9 10 4 15 9 20"/>
							<path d="M20 4v7a4 4 0 0 1-4 4H4"/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div
		class="scroll"
		role="list"
		use:initScroll
		onmouseleave={() => hoveredMsg = null}
	>
		<div class="flow">
			{#each messages as msg, i (msg.id)}
				<div class="message-group" class:user={msg.role === 'user'} class:ai={msg.role === 'assistant'}>
					<div class="meta-line">
						<span class="meta-role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
						{#if msg.versions && msg.versions.length > 1}
							<div class="meta-versions">
								{#each msg.versions as ver}
									<button
										class="meta-ver-btn"
										class:active={ver.active}
										onclick={() => switchVersion(msg.id, ver.id)}
									>{ver.label}</button>
								{/each}
							</div>
						{/if}
						{#if msgAnnotations(msg.id).length > 0}
							<span class="meta-ann">{msgAnnotations(msg.id).length} annotation{msgAnnotations(msg.id).length > 1 ? 's' : ''}</span>
						{/if}
					</div>

					{#if msg.thinking}
						<div
							class="thinking"
							class:open={thinkingOpen.has(msg.id)}
							role="button"
							tabindex="0"
							onclick={() => toggleThinking(msg.id)}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleThinking(msg.id); } }}
							aria-expanded={thinkingOpen.has(msg.id)}
						>
							<span class="think-slash">//</span>
							<span class="think-content">{msg.thinking}</span>
						</div>
					{/if}

					{#if msg.toolCalls}
						<div class="toolcalls">
							{#each msg.toolCalls as tc}
								<div class="toolcard">
									<div class="tool-icon">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
									</div>
									<div class="tool-info">
										<span class="tool-name">{tc.tool}</span>
										<span class="tool-status" class:done={tc.status === 'completed'}>{tc.status}</span>
									</div>
									<span class="tool-result">{tc.result}</span>
								</div>
							{/each}
						</div>
					{/if}

					<div class="versions-row">
						{#if msg.versions && msg.versions.length > 1}
							<div class="version-content-wrapper" use:registerVersionCard={msg.id} data-msg-id={msg.id}>

								{#each msg.versions as ver}
									{#if ver.active}
										{@const dir = versionDirections.get(msg.id) ?? 1}
										<div
											class="ver-text"
											data-ver-id={ver.id}
											in:fly={{ x: dir * 30, duration: 380, easing: quintOut }}
											out:fly={{ x: -dir * 30, duration: 340, easing: quintOut }}
										>
											<CursorLiftText
												segments={segmentContent(ver.content, msgMarks(msg.id))}
												enabled={selectionLift.enabled}
												radius={selectionLift.radius}
												lift={selectionLift.lift}
												falloff={selectionLift.falloff}
												settle={selectionLift.settle}
											/>
										</div>
									{/if}
								{/each}
							</div>
						{:else}
							<div class="ver-text" data-msg-id={msg.id} use:streamingHeight={!!msg.streaming}>
								{#if msg.streaming}
									{#each (msg.tokens ?? []) as token, i (i)}
										<span class="stream-token">{token}</span>
									{/each}
								{:else}
									<CursorLiftText
										segments={segmentContent(msg.content, msgMarks(msg.id))}
										enabled={selectionLift.enabled}
										radius={selectionLift.radius}
										lift={selectionLift.lift}
										falloff={selectionLift.falloff}
										settle={selectionLift.settle}
									/>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Inline annotations -->
					{#if msgAnnotations(msg.id).length > 0}
						<div class="inline-anns">
							{#each msgAnnotations(msg.id) as ann}
								<div class="ann-chip">
									<span class="ann-dot"></span>
									<span class="ann-note">{ann.note}</span>
									<button onclick={() => onRemoveAnnotation(ann.id)} aria-label="Remove annotation">
										<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}

			{#if generating}
				<div class="message-group ai">
					<div class="meta-line">
						<span class="meta-role">Assistant</span>
						<span class="typing-wip">composing...</span>
					</div>
					<div class="gen-dots">
						{#each [0,1,2] as j}
							<span style="animation-delay: {j * 0.14}s"></span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Input: sits exactly like a user message -->
			<div class="message-group user composer" class:active={composerActive}>
				<div class="meta-line">
					<span class="meta-role">You</span>
				</div>
				<div class="composer-card" class:sending>
					<textarea
						bind:value={inputValue}
						use:autoResize
						rows="1"
						placeholder="Continue..."
						class="composer-field"
						onfocus={() => composerActive = true}
						onblur={() => { if (!inputValue) composerActive = false; }}
						onkeydown={handleKey}
					></textarea>
					<button
						class="composer-send"
						class:visible={inputValue.trim() || sending}
						aria-label="Send"
						disabled={!inputValue.trim() || sending}
						onclick={sendComposerMessage}
					>
						<svg class="send-plane" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Annotation Panel -->
	{#if showAnnotationPanel}
		<div class="ann-panel">
			<div class="ann-panel-head">
				<span>Annotations ({annotations.length})</span>
				<button class="ghost" onclick={() => showAnnotationPanel = false}>Hide</button>
			</div>
			{#if annotations.length === 0}
				<div class="ann-empty">Select text in any message and add a note.</div>
			{:else}
				<div class="ann-list">
					{#each annotations as ann}
						<div class="ann-item">
							<div class="ann-source">on message #{messages.findIndex(m => m.id === ann.msgId) + 1}</div>
							<div class="ann-quote">"{ann.selectedText}"</div>
							<div class="ann-note">{ann.note}</div>
							<button class="ann-rm" onclick={() => onRemoveAnnotation(ann.id)}>Remove</button>
						</div>
					{/each}
				</div>
				<button class="ann-send" onclick={onSendAnnotations}>Send all to Assistant</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		position: relative;
	}

	.stream-lab {
		position: absolute;
		top: 14px;
		right: 16px;
		z-index: 30;
		width: 230px;
		padding: 10px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: color-mix(in srgb, var(--bg-elevated) 90%, transparent);
		box-shadow: 0 12px 34px var(--shadow-color);
		backdrop-filter: blur(16px);
		display: flex;
		flex-direction: column;
		gap: 8px;
		opacity: 0.42;
		transition:
			opacity 0.18s ease,
			transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.stream-lab:hover,
	.stream-lab:focus-within {
		opacity: 1;
		transform: translateY(1px);
	}

	.stream-count {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		color: var(--text-tertiary);
	}

	.stream-input {
		width: 100%;
		min-height: 68px;
		max-height: 120px;
		resize: vertical;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg-elevated);
		color: var(--text);
		outline: none;
		padding: 8px 9px;
		font-family: var(--font-message);
		font-size: 12px;
		line-height: 1.45;
		transition:
			border-color 0.18s ease,
			box-shadow 0.18s ease;
	}

	.stream-input:focus {
		border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	.stream-input::placeholder {
		color: var(--text-tertiary);
		font-style: italic;
	}

	.stream-controls {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.stream-controls label {
		display: grid;
		gap: 4px;
		font-size: 10px;
		color: var(--text-tertiary);
	}

	.stream-controls label span {
		display: flex;
		justify-content: space-between;
		gap: 6px;
	}

	.stream-controls b {
		color: var(--text-secondary);
		font-weight: 650;
	}

	.stream-controls input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.stream-actions {
		display: flex;
		gap: 6px;
	}

	.stream-btn {
		flex: 1;
		height: 30px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text-secondary);
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		transition:
			opacity 0.18s ease,
			background 0.18s ease,
			color 0.18s ease,
			box-shadow 0.18s ease;
	}

	.stream-btn.primary {
		background: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 76%, black);
		color: #fff;
		box-shadow: 0 3px 14px var(--accent-glow);
	}

	.stream-btn.running {
		animation: streamPulse 0.92s ease-in-out infinite;
	}

	.stream-btn:disabled {
		cursor: default;
		opacity: 0.38;
		box-shadow: none;
	}

	.stream-btn:not(:disabled):hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.stream-btn.primary:not(:disabled):hover {
		background: color-mix(in srgb, var(--accent) 88%, white);
		color: #fff;
	}

	@keyframes streamPulse {
		0%, 100% { filter: brightness(1); }
		50% { filter: brightness(1.12); }
	}

	.lab-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 11px;
		font-weight: 750;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text);
	}

	.scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 24px 32px;
		scroll-behavior: smooth;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--text-secondary) 72%, transparent) transparent;
		position: relative;
	}

	.scroll::-webkit-scrollbar { width: 17px; }
	.scroll::-webkit-scrollbar-track { background: transparent; }
	.scroll::-webkit-scrollbar-thumb {
		background-color: color-mix(in srgb, var(--text-secondary) 72%, transparent);
		border: 2px solid transparent;
		border-radius: 999px;
		background-clip: content-box;
	}
	.scroll::-webkit-scrollbar-thumb:hover {
		background-color: color-mix(in srgb, var(--text) 78%, transparent);
	}

	.flow {
		max-width: 720px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* ─── Selection popup ─── */
	.sel-popup {
		position: fixed;
		z-index: 100;
		border: none;
		border-radius: 0;
		background: transparent;
		box-shadow: none;
		animation: popIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.sel-popup.below {
		animation: popInBelow 0.18s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes popIn {
		from { opacity: 0; transform: translateY(6px) scale(0.96); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	@keyframes popInBelow {
		from { opacity: 0; transform: translateY(-6px) scale(0.96); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	.sel-quick-actions {
		display: flex;
		align-items: stretch;
		gap: 5px;
		padding: 0;
		height: 44px;
		filter: drop-shadow(0 8px 24px var(--shadow-color));
	}

	.sel-mark-btn {
		width: 40px;
		display: grid;
		place-items: center;
		border-radius: 10px;
		background: var(--highlight);
		border: 1px solid color-mix(in srgb, var(--highlight) 74%, var(--border-hover));
		box-shadow: 0 8px 24px var(--highlight-glow);
		color: color-mix(in srgb, var(--text) 82%, #6b4e00);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			filter 0.16s ease;
		flex: none;
	}

	.sel-mark-btn:hover {
		background: color-mix(in srgb, var(--highlight) 86%, white);
		color: var(--text);
		filter: brightness(1.02);
	}

	.sel-ann-row {
		display: flex;
		align-items: stretch;
		gap: 5px;
		flex: 1;
		overflow: visible;
		border-radius: 0;
	}

	.sel-ann-row input {
		flex: 1;
		min-width: 110px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-hover);
		border-radius: 9px;
		padding: 0 10px;
		font-size: 12px;
		font-family: inherit;
		color: var(--text);
		outline: none;
	}

	.sel-ann-row input::placeholder { color: var(--text-tertiary); font-style: italic; }

	.sel-ann-save {
		width: 40px;
		display: grid;
		place-items: center;
		border: 1px solid var(--border-hover);
		border-radius: 10px;
		background: var(--bg-elevated);
		color: var(--text-tertiary);
		cursor: pointer;
		opacity: 0.44;
		transition:
			opacity 0.18s ease,
			border-color 0.18s ease,
			background 0.15s,
			color 0.15s,
			filter 0.16s ease,
			box-shadow 0.18s ease;
		flex: none;
	}

	.sel-ann-save.visible {
		opacity: 1;
		border-color: color-mix(in srgb, var(--orange) 76%, black);
		background: var(--orange);
		color: #fff;
		box-shadow: inset 1px 0 0 rgba(255,255,255,0.16), 0 3px 14px var(--orange-glow);
	}

	.sel-ann-save:disabled {
		cursor: default;
	}

	.sel-ann-save.visible:hover {
		background: color-mix(in srgb, var(--orange) 88%, white);
		box-shadow: inset 1px 0 0 rgba(255,255,255,0.18), 0 3px 14px var(--orange-glow);
		filter: brightness(1.02);
	}

	.sel-cancel:hover { background: var(--surface-hover); color: var(--text); }

	/* ─── Text mark (highlight) ─── */
	:global(mark.text-mark) {
		--mark-angle: 0deg;
		--mark-offset: 0;
		--mark-height: 0.62;
		background: transparent;
		color: inherit;
		border-radius: 2px;
		padding: 0 2px;
		margin: 0 -1px;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
		cursor: default;
		position: relative;
		isolation: isolate;
	}

	:global(mark.text-mark::before) {
		content: '';
		position: absolute;
		left: -0.08em;
		right: -0.08em;
		top: calc((1 - var(--mark-height)) * 100% + (var(--mark-offset) * 1em));
		height: calc(var(--mark-height) * 1em);
		z-index: -1;
		border-radius: 0.18em 0.28em 0.16em 0.24em;
		background:
			linear-gradient(
				100deg,
				color-mix(in srgb, var(--highlight) 42%, transparent) 0%,
				color-mix(in srgb, var(--highlight) 82%, transparent) 22%,
				color-mix(in srgb, var(--highlight) 74%, transparent) 70%,
				color-mix(in srgb, var(--highlight) 38%, transparent) 100%
			);
		clip-path: polygon(0 22%, 98% 4%, 100% 82%, 2% 100%);
		transform: rotate(var(--mark-angle));
		transform-origin: left center;
		animation: markerSwipe 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes markerSwipe {
		from { clip-path: inset(0 100% 0 0 round 0.18em); }
		to { clip-path: inset(0 0 0 0 round 0.18em); }
	}

	/* ─── Message Group ─── */
	.message-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		opacity: 0;
		transform: translateY(6px);
	}

	@keyframes slideIn {
		to { opacity: 1; transform: translateY(0); }
	}

	.meta-line {
		display: flex;
		align-items: center;
		gap: 10px;
		padding-left: 2px;
	}

	.meta-role {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.message-group.user .meta-role { color: var(--orange); }
	.message-group.ai .meta-role { color: var(--accent); }

	.meta-time {
		font-size: 11px;
		color: var(--text-tertiary);
	}

	.meta-ann {
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 4px;
		background: color-mix(in srgb, var(--highlight) 34%, transparent);
		border: 1px solid color-mix(in srgb, var(--highlight) 52%, transparent);
		color: var(--text-secondary);
		font-weight: 600;
		margin-left: auto;
	}

	/* ─── Thinking ─── */
	.thinking {
		display: flex;
		align-items: flex-start;
		gap: 5px;
		margin-bottom: 4px;
		padding: 0 2px;
		cursor: pointer;
		color: var(--text-tertiary);
		font-size: 11px;
		font-family: ui-monospace, 'JetBrains Mono', 'Cascadia Code', monospace;
		line-height: 1.6;
		max-width: 100%;
		transition: color 0.15s ease;
		user-select: none;
	}

	.thinking:hover { color: var(--text-secondary); }

	.think-slash {
		flex: none;
		opacity: 0.38;
		font-weight: 700;
		letter-spacing: -1px;
		margin-top: 0.05em;
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

	/* ─── Tool Calls ─── */
	.toolcalls {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		padding-left: 2px;
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
		transition: all 0.2s;
	}

	.toolcard:hover {
		background: var(--surface-hover);
		border-color: var(--border-hover);
		transform: translateY(-1px);
	}

	.tool-icon { color: var(--accent); }

	.tool-info {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.tool-name { font-weight: 600; color: var(--text); }

	.tool-status {
		font-size: 10px;
		padding: 1px 5px;
		border-radius: 3px;
		background: var(--surface-active);
		color: var(--text-tertiary);
	}

	.tool-status.done {
		background: rgba(45,159,82,0.15);
		color: var(--success);
	}

	.tool-result {
		color: var(--text-tertiary);
		font-size: 11px;
	}

	/* ─── Versions ─── */
	.versions-row {
		display: block;
		padding-left: 2px;
		overflow: visible;
	}

	/* Version buttons in the header */
	.meta-versions {
		display: flex;
		align-items: center;
		gap: 1px;
		margin-left: 4px;
	}

	.meta-ver-btn {
		padding: 1px 5px;
		border-radius: 3px;
		border: none;
		background: transparent;
		color: var(--text-tertiary);
		font-family: var(--font-sans);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: color 0.15s, background 0.15s;
	}

	.meta-ver-btn:hover { color: var(--text-secondary); background: var(--surface-hover); }
	.meta-ver-btn.active { color: var(--accent); }

	.version-content-wrapper {
		display: grid;
		grid-template-columns: 1fr;
		width: 100%;
		overflow: hidden;
	}

	.version-content-wrapper > * {
		grid-column: 1 / -1;
		grid-row: 1 / -1;
		min-width: 0;
	}

	/* Each version text slide item */
	.ver-text,
	.version-content-wrapper > .ver-text {
		font-size: var(--message-font-size);
		line-height: var(--message-line-height);
		color: var(--text);
		font-family: var(--font-message);
		font-weight: var(--message-font-weight);
		white-space: pre-wrap;
	}

	.stream-token {
		display: inline;
		animation: tokenFadeIn 0.22s ease forwards;
	}

	@keyframes tokenFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.stream-caret {
		display: inline-block;
		width: 6px;
		height: 1.1em;
		margin-left: 2px;
		border-radius: 999px;
		background: var(--accent);
		vertical-align: -0.18em;
		animation: streamCaretBlink 0.8s ease-in-out infinite;
	}

	@keyframes streamCaretBlink {
		0%, 100% { opacity: 0.18; }
		50% { opacity: 1; }
	}

	/* ─── Inline annotations ─── */
	.inline-anns {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding-left: 2px;
		padding-top: 4px;
	}

	.ann-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 7px 3px 6px;
		border-radius: 6px;
		background: color-mix(in srgb, var(--highlight) 30%, transparent);
		border: 1px solid color-mix(in srgb, var(--highlight) 52%, transparent);
		font-size: 11.5px;
		color: var(--text-secondary);
		animation: annPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.ann-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--highlight) 90%, #a07000);
		flex: none;
		align-self: center;
	}

	@keyframes annPop {
		from { opacity: 0; transform: scale(0.88); }
		to { opacity: 1; transform: scale(1); }
	}

	.ann-text { display: none; }
	.ann-note { font-weight: 500; color: var(--text-secondary); }
	.ann-chip button {
		width: 14px; height: 14px;
		border-radius: 50%;
		display: grid; place-items: center;
		background: transparent;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		padding: 0;
		margin-left: 1px;
	}
	.ann-chip button:hover { color: var(--text-secondary); background: var(--surface-hover); }

	/* ─── Composer ─── */
	.composer {
		transition: all 0.3s;
		position: relative;
		z-index: 2;
		margin-top: auto;
	}

	.composer-card {
		display: flex;
		align-items: stretch;
		gap: 5px;
		padding: 0;
		border-radius: 0;
		border: none;
		background: transparent;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		overflow: visible;
		position: relative;
	}

	.composer-card::before {
		content: '';
		position: absolute;
		inset: -5px;
		border-radius: 17px;
		border: 1px solid transparent;
		box-shadow: 0 0 0 0 transparent;
		pointer-events: none;
		transition:
			border-color 0.24s ease,
			box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.24s ease;
		opacity: 0;
	}

	.composer.active .composer-card {
		filter: drop-shadow(0 5px 18px var(--shadow-color));
	}

	.composer.active .composer-card::before {
		opacity: 1;
		border-color: color-mix(in srgb, var(--orange) 38%, transparent);
		box-shadow:
			0 0 0 3px var(--orange-soft),
			0 0 0 7px color-mix(in srgb, var(--orange-glow) 68%, transparent);
	}

	.composer-field {
		flex: 1;
		min-width: 0;
		max-height: 160px;
		overflow-y: auto;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		font-family: var(--font-message);
		font-weight: var(--message-font-weight);
		font-size: var(--message-font-size);
		line-height: var(--message-line-height);
		color: var(--text);
		padding: 12px 14px;
		border: 1.5px solid var(--border);
		border-radius: 12px 5px 5px 12px;
		background: var(--bg-elevated);
		transition:
			border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.composer.active .composer-field {
		border-color: color-mix(in srgb, var(--orange) 42%, var(--border));
	}

	.composer-field::placeholder { color: var(--text-tertiary); font-style: italic; }

	.composer-send {
		align-self: stretch;
		width: 48px;
		min-height: 100%;
		border-radius: 5px 12px 12px 5px;
		display: grid; place-items: center;
		background: var(--orange);
		color: #fff;
		border: 1.5px solid color-mix(in srgb, var(--orange) 76%, black);
		cursor: pointer;
		flex: none;
		position: relative;
		overflow: visible;
		opacity: 0.34;
		transform: none;
		transition:
			opacity 0.2s ease,
			background 0.2s ease,
			color 0.2s ease,
			box-shadow 0.25s ease;
		box-shadow: inset 1px 0 0 rgba(255,255,255,0.14);
	}

	.composer-send.visible {
		opacity: 1;
		box-shadow: inset 1px 0 0 rgba(255,255,255,0.18), 0 3px 14px var(--orange-glow);
	}

	.composer-send:disabled {
		cursor: default;
	}

	.composer-send.visible:not(:disabled):hover {
		background: color-mix(in srgb, var(--orange) 88%, white);
	}

	.send-plane {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 1;
		transform: translate(-50%, -50%);
		transform-origin: center;
		transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
		pointer-events: none;
	}

	.composer-send.visible:not(:disabled):hover .send-plane {
		transform: translate(calc(-50% + 1px), calc(-50% - 1px)) rotate(6deg);
	}

	.composer-card.sending .send-plane {
		animation: planeTakeoff 0.72s cubic-bezier(0.18, 0.86, 0.18, 1) forwards;
	}

	.composer-card.sending .composer-send::after {
		content: '';
		position: absolute;
		left: 14px;
		top: 50%;
		width: 18px;
		height: 2px;
		border-radius: 999px;
		background: rgba(255,255,255,0.65);
		transform: translateY(-50%);
		animation: contrail 0.5s ease-out forwards;
	}

	@keyframes planeTakeoff {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(0deg) scale(1);
			filter: drop-shadow(0 0 0 transparent);
		}
		16% {
			opacity: 1;
			transform: translate(calc(-50% + 6px), calc(-50% - 7px)) rotate(10deg) scale(1.14);
		}
		34% {
			opacity: 1;
			transform: translate(calc(-50% + 28px), calc(-50% - 26px)) rotate(22deg) scale(1.08);
			filter: drop-shadow(0 8px 10px rgba(0,0,0,0.24));
		}
		64% {
			opacity: 0.88;
			transform: translate(calc(-50% + 74px), calc(-50% - 62px)) rotate(32deg) scale(0.86);
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + 132px), calc(-50% - 108px)) rotate(42deg) scale(0.48);
			filter: drop-shadow(0 12px 12px rgba(0,0,0,0));
		}
	}

	@keyframes contrail {
		0% { opacity: 0; transform: translateY(-50%) translateX(4px) scaleX(0.2); }
		35% { opacity: 0.85; }
		100% { opacity: 0; transform: translateY(-50%) translateX(-12px) scaleX(1.7); }
	}

	/* ─── Generating ─── */
	.typing-wip {
		font-size: 11px;
		color: var(--text-tertiary);
		font-style: italic;
		animation: wipPulse 1.5s ease-in-out infinite;
	}

	@keyframes wipPulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}

	.gen-dots {
		display: flex;
		gap: 5px;
		padding: 10px 2px;
	}

	.gen-dots span {
		width: 5px; height: 5px;
		border-radius: 50%;
		background: var(--accent);
		animation: genBounce 1.3s infinite ease-in-out both;
		opacity: 0.3;
	}

	.gen-dots span:nth-child(1) { animation-delay: 0s; background: var(--accent-soft); }
	.gen-dots span:nth-child(2) { animation-delay: 0.14s; }
	.gen-dots span:nth-child(3) { animation-delay: 0.28s; background: var(--accent-soft); }

	@keyframes genBounce {
		0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
		40% { transform: scale(1); opacity: 1; }
	}

	/* ─── Annotation Panel ─── */
	.ann-panel {
		position: absolute;
		bottom: 0; left: 0; right: 0;
		background: var(--bg-elevated);
		border-top: 1px solid var(--border);
		padding: 16px 20px;
		max-height: 240px;
		overflow-y: auto;
		box-shadow: 0 -4px 24px var(--shadow-color);
		animation: panelUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		z-index: 20;
	}

	@keyframes panelUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.ann-panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.ann-panel-head button.ghost {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 4px;
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-tertiary);
		cursor: pointer;
	}

	.ann-empty {
		font-size: 13px;
		color: var(--text-tertiary);
		font-style: italic;
		padding: 12px 0;
		font-family: var(--font-serif);
	}

	.ann-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ann-item {
		padding: 10px 12px;
		border-radius: 8px;
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.ann-source {
		font-size: 10px;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 4px;
	}

	.ann-quote {
		font-size: 13px;
		color: var(--text-secondary);
		font-style: italic;
		font-family: var(--font-serif);
	}

	.ann-item .ann-note {
		font-size: 13px;
		color: var(--text);
		margin-top: 4px;
		font-weight: 500;
	}

	.ann-rm {
		margin-top: 6px;
		font-size: 11px;
		color: var(--text-tertiary);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
	}
	.ann-rm:hover { color: var(--text); text-decoration: underline; }

	.ann-send {
		width: 100%;
		margin-top: 10px;
		padding: 8px;
		border-radius: 8px;
		background: var(--orange);
		color: #fff;
		border: none;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: filter 0.15s;
	}
	.ann-send:hover { filter: brightness(1.1); }
</style>
