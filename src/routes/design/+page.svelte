<script>
	import Sidebar from '$lib/components/design/Sidebar.svelte';
	import ChatCanvas from '$lib/components/design/ChatCanvas.svelte';
	import Scratchboard from '$lib/components/design/Scratchboard.svelte';
	import { flushSync } from 'svelte';

	let darkMode = $state(false);

	// ─── Theme ripple effect ───
	// Old-bg overlay with a circular HOLE that grows outward from the click point,
	// revealing the already-switched new theme beneath. Uses a mask-image radial-gradient
	// driven by @property --reveal-r so the browser interpolates it as a typed length.
	function triggerThemeRipple(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;
		const maxR = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y)
		);

		const oldBg = darkMode ? '#1E1D1C' : '#F7F5F0';
		const gradient = `radial-gradient(circle var(--reveal-r) at ${x}px ${y}px, transparent 99.9%, black 100%)`;

		const el = document.createElement('div');
		el.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:${oldBg};--reveal-r:0px;mask-image:${gradient};-webkit-mask-image:${gradient}`;
		document.body.appendChild(el);

		flushSync(() => {
			darkMode = !darkMode;
		});

		el.animate([{ '--reveal-r': '0px' }, { '--reveal-r': `${maxR}px` }], {
			duration: 600,
			easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
		}).finished.then(() => el.remove());
	}

	let sidebarOpen = $state(false);
	let cursorX = $state(500);
	let tabY = $state(360);

	// Proximity: 1 when cursor is at x=0, 0 when x >= 80px
	let proximity = $derived(Math.max(0, Math.min(1, 1 - cursorX / 80)));
	// Notch grows from 12px (always visible hint) to 40px at full proximity
	let notchW = $derived(12 + proximity * 28);
	// Notch height grows from 52px to 84px
	let notchH = $derived(52 + proximity * 32);

	const workspaceItems = $state([
		{ id: 'models', name: 'Models', href: '/workspace/models', description: 'Model presets' },
		{ id: 'skills', name: 'Skills', href: '/workspace/skills', description: 'Assistant skills' },
		{ id: 'tools', name: 'Tools', href: '/workspace/tools', description: 'Toolkits' }
	]);

	const chatFolders = $state([
		{ id: 'f1', name: 'Client work', count: 8, active: false },
		{ id: 'f2', name: 'Research', count: 5, active: false },
		{ id: 'f3', name: 'Archive', count: 17, active: false }
	]);

	const conversations = $state([
		{
			id: 'c1',
			title: 'Annual Report Analysis',
			summary:
				'Revenue trends, churn analysis, and Q4 projections with 3 action items derived from the PDF.',
			model: 'llama3.1',
			active: true,
			date: '2m ago'
		},
		{
			id: 'c2',
			title: 'Python OCR Pipeline',
			summary:
				'Built a document ingestion pipeline using Tesseract and OpenCV with async batch processing.',
			model: 'gpt-4o',
			active: false,
			date: '1h ago'
		},
		{
			id: 'c3',
			title: 'Docker Compose Setup',
			summary:
				'Multi-service orchestration with Postgres, Redis, and the FastAPI backend configured for prod.',
			model: 'mistral',
			active: false,
			date: '3h ago'
		},
		{
			id: 'c4',
			title: 'RAG Chunking Strategy',
			summary:
				'Comparing recursive, semantic, and fixed-size chunking for legal document retrieval.',
			model: 'claude',
			active: false,
			date: 'Yesterday'
		}
	]);

	const scratchboards = $state({
		c1: '# Q4 Campaign Plan\n\n- Review annual report findings\n- Draft enterprise retention play\n- Prepare campaign hero direction\n\n| Metric | Current | Q4 target |\n| --- | ---: | ---: |\n| ARR growth | 18% | 22% |\n| Churn | 4.2% | 3.8% |\n\nInline lift target: $ARR = MRR \\times 12$.\n',
		c2: '# OCR Pipeline Notes\n\n- Normalize scanned page contrast\n- Batch files by document source\n- Queue failed OCR jobs for manual review\n\n| Stage | Tool | Status |\n| --- | --- | --- |\n| Preprocess | OpenCV | Ready |\n| OCR | Tesseract | Testing |\n\nConfidence score: $p(y \\mid x)$.\n',
		c3: '# Compose Setup\n\n- Add Postgres healthcheck\n- Pin Redis version\n- Move secrets into environment overrides\n\n| Service | Port | Healthcheck |\n| --- | ---: | --- |\n| API | 8080 | `/health` |\n| Redis | 6379 | `PING` |\n',
		c4: '# RAG Chunking Strategy\n\n- Compare recursive and semantic chunks\n- Track retrieval precision by document type\n- Test overlap at 48, 64, and 96 tokens\n\n| Chunker | Precision | Notes |\n| --- | ---: | --- |\n| Recursive | 0.82 | Stable baseline |\n| Semantic | 0.87 | Better legal sections |\n\nSimilarity: $\\cos(\\theta)=\\frac{a \\cdot b}{\\lVert a \\rVert\\lVert b \\rVert}$.\n'
	});

	let activeConversationId = $derived(
		conversations.find((c) => c.active)?.id ?? conversations[0].id
	);

	// ─── Marks (persistent text highlights) ───
	let marks = $state([]);

	function addMark(id, msgId, selectedText) {
		marks = [
			...marks,
			{
				id,
				msgId,
				selectedText,
				angle: Number((Math.random() * 2.8 - 1.4).toFixed(2)),
				offset: Number((Math.random() * 0.14 - 0.07).toFixed(3)),
				height: Number((0.56 + Math.random() * 0.14).toFixed(3))
			}
		];
	}

	function removeMark(id) {
		marks = marks.filter((m) => m.id !== id);
	}

	// ─── Annotations ───
	let annotations = $state([]);
	let showAnnotationPanel = $state(false);

	function addAnnotation(id, msgId, selectedText, note) {
		annotations = [...annotations, { id, msgId, selectedText, note, createdAt: Date.now() }];
	}

	function removeAnnotation(id) {
		annotations = annotations.filter((a) => a.id !== id);
	}

	function sendAnnotations() {
		if (annotations.length === 0) return;
		const body = annotations.map((a) => `> "${a.selectedText}"\n${a.note}`).join('\n\n');
		messages = [
			...messages,
			{
				id: 'm' + Date.now(),
				role: 'user',
				content: `Here are my annotations:\n\n${body}`,
				timestamp: 'Just now'
			}
		];
		annotations = [];
		showAnnotationPanel = false;
		generating = true;
		setTimeout(() => {
			generating = false;
			messages = [
				...messages,
				{
					id: 'm' + (Date.now() + 1),
					role: 'assistant',
					content:
						"Thanks for the annotations! I'll take these into account and refine my analysis.",
					timestamp: 'Just now'
				}
			];
		}, 1200);
	}

	// ─── Messages ───
	let messages = $state([
		{
			id: 'm1',
			role: 'user',
			content:
				'Summarize the key takeaways from the annual report and suggest action items for Q4.',
			timestamp: '2m ago'
		},
		{
			id: 'm2',
			role: 'assistant',
			thinking:
				'I need to identify the key financial metrics first, then look at strategic initiatives, and finally formulate actionable recommendations based on the Q4 projections mentioned in the document.',
			versions: [
				{
					id: 'm2v1',
					label: 'Short',
					active: false,
					content:
						'Revenue grew 18% YoY. Three actions: expand team, launch retention campaign, test pricing.'
				},
				{
					id: 'm2v2',
					label: 'Balanced',
					active: true,
					content:
						'Based on the annual report, revenue grew 18% YoY driven by enterprise subscriptions. Churn dropped to 4.2% — the lowest in 3 years. Q4 projections suggest a 22% ARR increase if current pipeline closes.\n\nThree recommended actions:\n\n1. Expand the enterprise success team by 2 heads before November.\n2. Launch a retention-play campaign for the mid-market segment.\n3. Model a pricing experiment for the "Pro" tier to capture projected demand.'
				},
				{
					id: 'm2v3',
					label: 'Detailed',
					active: false,
					content:
						'The comprehensive analysis of the annual report reveals multiple layers of strategic insight. Revenue growth of 18% YoY was primarily fueled by a 34% increase in enterprise subscription revenue, while SMB remained flat. Operational metrics improved significantly: churn declined from 6.8% to 4.2%, NPS reached an all-time high of 62, and gross margins expanded by 320 basis points to 78%. The Q4 pipeline, if closed at current conversion rates, implies a 22% ARR run-rate increase heading into FY2025.'
				}
			],
			timestamp: 'Just now'
		},
		{
			id: 'm3',
			role: 'user',
			content: 'Can you also generate a hero banner image for the Q4 campaign?',
			timestamp: 'Just now'
		},
		{
			id: 'm4',
			role: 'assistant',
			toolCalls: [
				{
					tool: 'generate_image',
					input: {
						prompt:
							'Futuristic cityscape at sunset, cyberpunk style, neon orange and indigo tones, wide banner format',
						size: '1792x1024'
					},
					status: 'completed',
					result: 'Generated 3 variations'
				}
			],
			content:
				'Done! I used DALL-E 3 to generate three variations of a wide-format hero banner. The prompt emphasized the cyberpunk aesthetic with your brand colours. Here are all three — which direction feels right?',
			timestamp: 'Just now',
			versions: [
				{
					id: 'm4v1',
					label: 'v1',
					active: true,
					content:
						'Done! I used DALL-E 3 to generate three variations of a wide-format hero banner. The prompt emphasized the cyberpunk aesthetic with your brand colours. Here are all three — which direction feels right?'
				}
			]
		},
		{
			id: 'm5',
			role: 'user',
			content: 'Show me a quick Python snippet to chunk a document for RAG using LangChain.',
			timestamp: 'Just now'
		},
		{
			id: 'm6',
			role: 'assistant',
			thinking:
				'The user wants a concrete code example for document chunking. I should use RecursiveCharacterTextSplitter since it preserves semantic boundaries better than fixed-size splitting.',
			content:
				'This keeps semantic boundaries intact while targeting ~512-token chunks. You can tune `chunk_overlap` based on how much context your retriever needs.\n\n```python\nfrom langchain.text_splitter import RecursiveCharacterTextSplitter\n\nsplitter = RecursiveCharacterTextSplitter(\n    chunk_size=512,\n    chunk_overlap=64,\n    separators=["\\n\\n", "\\n", ".", "!", "?", " "]\n)\n\nchunks = splitter.split_documents(documents)\nprint(f"Created {len(chunks)} chunks")\n```\n\nFor legal documents you might want separators like `["\\n\\nArticle", "\\n\\nSection", "\\n", " "]` to keep statutory structure intact.',
			timestamp: 'Just now',
			versions: [
				{ id: 'm6v1', label: 'v1', active: false, content: 'Here is a basic snippet...' },
				{
					id: 'm6v2',
					label: 'v2',
					active: true,
					content: 'This keeps semantic boundaries intact while targeting ~512-token chunks...'
				}
			]
		}
	]);

	let generating = $state(false);

	function sendMessage(text) {
		if (!text.trim()) return;
		messages = [
			...messages,
			{
				id: 'm' + Date.now(),
				role: 'user',
				content: text,
				timestamp: 'Just now'
			}
		];
		generating = true;
		setTimeout(() => {
			generating = false;
			messages = [
				...messages,
				{
					id: 'm' + (Date.now() + 1),
					role: 'assistant',
					content: 'I can help with that. Let me think through it step by step.',
					thinking:
						'The user seems to be continuing the conversation. I should provide a helpful, structured response.',
					timestamp: 'Just now',
					versions: [
						{
							id: 'mv1',
							label: 'v1',
							active: true,
							content: 'I can help with that. Let me think through it step by step.'
						}
					]
				}
			];
		}, 1200);
	}

	function selectConversation(id) {
		conversations.forEach((c) => (c.active = c.id === id));
	}
</script>

<div
	class="root {darkMode ? 'dark' : ''}"
	onmousemove={(e) => {
		cursorX = e.clientX;
		tabY = Math.max(42, Math.min(e.clientY, window.innerHeight - 42));
	}}
	role="presentation"
>
	<!-- Sidebar lives behind the app at z-index 0 -->
	<div class="sidebar-layer">
		<Sidebar
			{workspaceItems}
			{chatFolders}
			{conversations}
			{darkMode}
			{annotations}
			onToggleTheme={triggerThemeRipple}
			onSelectConversation={selectConversation}
			onTogglePanel={() => (showAnnotationPanel = !showAnnotationPanel)}
		/>
	</div>

	<!-- Notch: a hole in the app's left edge showing the sidebar below -->
	{#if !sidebarOpen}
		<button
			class="notch"
			style:top="{tabY}px"
			style:width="{notchW}px"
			style:height="{notchH}px"
			style:border-radius="0 {notchW}px {notchW}px 0"
			onclick={() => (sidebarOpen = true)}
			aria-label="Open sidebar"
		>
			<svg
				width="6"
				height="10"
				viewBox="0 0 6 10"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				style:opacity={0.35 + proximity * 0.5}
				aria-hidden="true"
			>
				<path d="M1 1l4 4-4 4" />
			</svg>
		</button>
	{/if}

	<!-- App shell slides right to reveal the sidebar -->
	<div class="app-shell" class:open={sidebarOpen}>
		<!-- Backdrop: transparent cover that intercepts clicks when sidebar is open -->
		{#if sidebarOpen}
			<div
				class="backdrop"
				onclick={() => (sidebarOpen = false)}
				role="presentation"
				aria-hidden="true"
			></div>
		{/if}

		<div class="content-grid">
			<ChatCanvas
				{messages}
				{generating}
				{annotations}
				{showAnnotationPanel}
				{marks}
				onSend={sendMessage}
				onAnnotate={addAnnotation}
				onRemoveAnnotation={removeAnnotation}
				onSendAnnotations={sendAnnotations}
				onMark={addMark}
				onRemoveMark={removeMark}
			/>

			<Scratchboard
				content={scratchboards[activeConversationId] ?? ''}
				onChange={(value) => {
					scratchboards[activeConversationId] = value;
				}}
			/>
		</div>
	</div>
</div>

<style>
	/* Registered so the browser can interpolate it as a length (potentially on the compositor) */
	@property --reveal-r {
		syntax: '<length>';
		inherits: false;
		initial-value: 0px;
	}

	@font-face {
		font-family: 'Archivo Design';
		src: url('/assets/fonts/Archivo-Variable.ttf') format('truetype');
		font-weight: 100 900;
		font-display: swap;
	}

	@font-face {
		font-family: 'Instrument Serif Design';
		src: url('/assets/fonts/InstrumentSerif-Regular.ttf') format('truetype');
		font-weight: 400;
		font-display: swap;
	}

	@font-face {
		font-family: 'Atkinson Next Design';
		font-style: normal;
		font-display: swap;
		font-weight: 200 800;
		src: url('https://cdn.jsdelivr.net/fontsource/fonts/atkinson-hyperlegible-next:vf@latest/latin-wght-normal.woff2')
			format('woff2-variations');
	}

	:root {
		--sidebar-w: 260px;
		--bg-sidebar: #e8e4db;
		--bg-base: #f7f5f0;
		--bg-elevated: #ffffff;
		--surface: rgba(0, 0, 0, 0.025);
		--surface-hover: rgba(0, 0, 0, 0.05);
		--surface-active: rgba(0, 0, 0, 0.08);
		--border: rgba(0, 0, 0, 0.06);
		--border-hover: rgba(0, 0, 0, 0.12);
		--text: #2a2927;
		--text-secondary: #6b6964;
		--text-tertiary: #a9a69d;
		--accent: #7b7ef6;
		--accent-glow: rgba(123, 126, 246, 0.12);
		--accent-soft: #9fa1f9;
		--orange: #e8730a;
		--orange-glow: rgba(232, 115, 10, 0.14);
		--orange-soft: rgba(232, 115, 10, 0.06);
		--success: #2d9f52;
		--code-bg: #f3f1ec;
		--shadow-color: rgba(0, 0, 0, 0.06);
		--highlight: #ffe082;
		--highlight-glow: rgba(255, 224, 130, 0.3);
		--font-serif: 'Instrument Serif Design', Georgia, 'Times New Roman', serif;
		--font-message:
			'Atkinson Next Design', 'Archivo Design', -apple-system, BlinkMacSystemFont, 'Segoe UI',
			sans-serif;
		--message-font-size: 15.5px;
		--message-font-weight: 440;
		--message-line-height: 1.55;
		--font-sans: 'Archivo Design', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		color-scheme: light;
	}

	.dark {
		--bg-sidebar: #141312;
		--bg-base: #1e1d1c;
		--bg-elevated: #252422;
		--surface: rgba(255, 255, 255, 0.03);
		--surface-hover: rgba(255, 255, 255, 0.05);
		--surface-active: rgba(255, 255, 255, 0.07);
		--border: rgba(255, 255, 255, 0.06);
		--border-hover: rgba(255, 255, 255, 0.1);
		--text: #f0eeeb;
		--text-secondary: #a09e99;
		--text-tertiary: #6e6c67;
		--accent: #9fa1f9;
		--accent-glow: rgba(159, 161, 249, 0.15);
		--accent-soft: #bbbcfb;
		--orange: #f5a04c;
		--orange-glow: rgba(245, 160, 76, 0.14);
		--orange-soft: rgba(245, 160, 76, 0.06);
		--success: #43c778;
		--code-bg: #1a1918;
		--shadow-color: rgba(0, 0, 0, 0.3);
		--highlight: #c9a84c;
		--highlight-glow: rgba(201, 168, 76, 0.2);
		color-scheme: dark;
	}

	:global(html) {
		font-family: var(--font-sans);
	}

	.root {
		position: fixed;
		inset: 0;
		background: var(--bg-sidebar);
		color: var(--text);
		overflow: hidden;
		font-family: var(--font-sans);
	}

	/* Sidebar sits at z-index 0, always rendered but hidden behind app */
	.sidebar-layer {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: var(--sidebar-w);
		z-index: 0;
	}

	/* App shell — full coverage, notch element creates the visual cutout */
	.app-shell {
		position: absolute;
		inset: 0;
		z-index: 1;
		background: var(--bg-base);
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-radius: 0;
		transform: translateX(0);
		transition:
			transform 0.38s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.38s cubic-bezier(0.16, 1, 0.3, 1),
			border-radius 0.38s cubic-bezier(0.16, 1, 0.3, 1);
		overflow: hidden;
	}

	.app-shell.open {
		border-radius: 20px;
		transform: translateX(var(--sidebar-w));
		box-shadow: -12px 0 48px rgba(0, 0, 0, 0.22);
	}

	/*
	 * Notch: a proxy-colored "hole" cut into the app's left edge.
	 * Sits at z-index 2 (above app), uses --bg-sidebar color to look
	 * like the sidebar showing through. Width and height driven by
	 * cursor proximity (inline styles). Border-radius rounds the
	 * right side to give the "D" cutout shape.
	 */
	.notch {
		position: absolute;
		left: 0;
		transform: translateY(-50%);
		z-index: 2;
		background: var(--bg-sidebar);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-tertiary);
		/* Inset shadows: back wall (right), top rim, bottom rim */
		box-shadow:
			inset -10px 0 18px rgba(0, 0, 0, 0.13),
			inset 0 6px 12px rgba(0, 0, 0, 0.07),
			inset 0 -6px 12px rgba(0, 0, 0, 0.05);
		/* width/height/border-radius animated via inline style changes */
		transition:
			width 0.14s ease-out,
			height 0.14s ease-out,
			border-radius 0.14s ease-out,
			top 0.06s ease-out,
			color 0.14s ease;
		padding-left: 1px;
	}

	.notch:hover {
		color: var(--text-secondary);
	}
	.notch:active {
		filter: brightness(0.95);
	}

	/* Transparent backdrop — intercepts clicks to close sidebar */
	.backdrop {
		position: absolute;
		inset: 0;
		z-index: 5;
		cursor: default;
	}

	/* Content fills the app shell */
	.content-grid {
		display: grid;
		grid-template-columns: 1fr minmax(340px, 32vw);
		height: 100%;
		min-width: 0;
		min-height: 0;
	}

	.content-grid > :global(*) {
		min-width: 0;
		min-height: 0;
	}
</style>
