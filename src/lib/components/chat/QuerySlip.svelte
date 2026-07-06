<script>
	import { tick } from 'svelte';

	/*
	 * The Query — the agent's structured question, set where the composer would be.
	 *
	 * Driven by an `ask_user` tool call (a `question` event). Up to 3 questions,
	 * up to 5 options each, single- or multiple-choice, each with a title and an
	 * optional one-line gloss — plus a write-your-own line and a skip. The user's
	 * answer is returned to the tool as the result via `onAnswer`.
	 *
	 * Palette: warm paper + ink, vermilion = the user's hand, green = done.
	 */

	let { question, onAnswer = () => {} } = $props();

	let questions = $derived(question?.questions ?? []);

	// per-question answer state (picks are option indices)
	let qAns = $state(
		(question?.questions ?? []).map(() => ({
			picks: [],
			custom: '',
			customOpen: false,
			skipped: false
		}))
	);
	let qIndex = $state(0);
	let qDir = $state(1);
	let sealing = $state(false);
	// the meter only advances when you move on (Next / skip), never on selection alone
	let qCommitted = $state(new Set());

	let curQ = $derived(questions[qIndex] ?? null);
	let curAns = $derived(qAns[qIndex] ?? null);
	let isLastQ = $derived(qIndex === questions.length - 1);
	let qAnswered = $derived(
		!!curAns && (curAns.picks.length > 0 || curAns.custom.trim().length > 0 || curAns.skipped)
	);
	let qDone = $derived(qCommitted.size);
	let qProgress = $derived(questions.length ? qDone / questions.length : 0);

	function autogrow(e) {
		const el = e.currentTarget;
		el.style.height = 'auto';
		el.style.height = el.scrollHeight + 'px';
		el.style.overflowY = el.scrollHeight > el.clientHeight + 2 ? 'auto' : 'hidden';
	}

	function pickOption(oi) {
		const a = qAns[qIndex];
		a.skipped = false;
		if (curQ.multi) {
			a.picks = a.picks.includes(oi) ? a.picks.filter((x) => x !== oi) : [...a.picks, oi];
		} else {
			a.picks = [oi];
			a.customOpen = false;
			a.custom = '';
		}
	}

	function openCustom() {
		const a = qAns[qIndex];
		a.skipped = false;
		a.customOpen = true;
		if (!curQ.multi) a.picks = [];
		tick().then(() => {
			const el = document.getElementById('qcustom-' + qIndex);
			if (el) {
				el.focus();
				el.style.height = 'auto';
				el.style.height = el.scrollHeight + 'px';
			}
		});
	}

	function goQ(delta) {
		qDir = delta;
		qIndex = Math.max(0, Math.min(questions.length - 1, qIndex + delta));
	}

	function advance() {
		// committing the current question is what fills the meter
		qCommitted = new Set(qCommitted).add(qIndex);
		if (isLastQ) seal();
		else goQ(1);
	}

	function skipQuestion() {
		const a = qAns[qIndex];
		a.picks = [];
		a.custom = '';
		a.customOpen = false;
		a.skipped = true;
		advance();
	}

	// a clear, readable answer line per question, joined the way a margin note would read
	function composeText() {
		const said = questions
			.map((q, i) => {
				const a = qAns[i];
				if (a.skipped) return null;
				const titles = a.picks.map((pi) => q.options[pi]?.title).filter(Boolean);
				if (a.custom.trim()) titles.push('“' + a.custom.trim() + '”');
				return titles.length ? titles.join(', ') : null;
			})
			.filter(Boolean);
		return said.length ? said.join(' · ') : 'No strong preference — your call.';
	}

	function buildResult() {
		return {
			responses: questions.map((q, i) => {
				const a = qAns[i];
				return {
					question: q.prompt,
					selected: a.skipped ? [] : a.picks.map((pi) => q.options[pi]?.title).filter(Boolean),
					custom: a.custom.trim() || null,
					skipped: !!a.skipped
				};
			}),
			text: composeText()
		};
	}

	function seal() {
		if (sealing) return;
		sealing = true;
		const result = buildResult();
		// let the meter land at full, then return the answer to the tool
		setTimeout(() => onAnswer(result), 240);
	}
</script>

<div class="query" class:sealing aria-label="A question from Claude">
	<div class="query-head">
		<span class="q-badge" aria-hidden="true">
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.9"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
				<path d="M12 17h.01" />
			</svg>
		</span>
		<span class="q-kicker">An inquiry</span>
		<span class="q-from">Claude needs a steer</span>
		{#if questions.length > 1}
			<div class="q-meter" aria-label="{qDone} of {questions.length} answered">
				<span class="q-track">
					<span class="q-fill" style:width="{qProgress * 100}%"></span>
				</span>
				<span class="q-count">{qDone} / {questions.length}</span>
			</div>
		{/if}
	</div>

	{#key qIndex}
		<div class="q-body" style:--dir={qDir}>
			<h3 class="q-prompt">{curQ.prompt}</h3>
			<span class="q-hint">{curQ.multi ? 'choose any' : 'choose one'}</span>

			<div class="q-options" role={curQ.multi ? 'group' : 'radiogroup'}>
				{#each curQ.options as opt, oi (oi)}
					<button
						class="opt"
						class:sel={curAns.picks.includes(oi)}
						class:multi={curQ.multi}
						style:--oi={oi}
						role={curQ.multi ? 'checkbox' : 'radio'}
						aria-checked={curAns.picks.includes(oi)}
						onclick={() => pickOption(oi)}
					>
						<span class="opt-mark" aria-hidden="true">
							<span class="opt-letter">{String.fromCharCode(97 + oi)}</span>
						</span>
						<span class="opt-text">
							<span class="opt-title">
								{opt.title}
								{#if opt.recommend}
									<span class="opt-rec">
										<svg
											width="9"
											height="9"
											viewBox="0 0 24 24"
											fill="currentColor"
											aria-hidden="true"
											><path
												d="M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.8 6.2 20.3l1.6-6.6L2.6 8.8l6.8-.5z"
											/></svg
										>
										Claude suggests
									</span>
								{/if}
							</span>
							{#if opt.explain}<span class="opt-explain">{opt.explain}</span>{/if}
						</span>
					</button>
				{/each}

				{#if curQ.allowCustom}
					{#if curAns.customOpen}
						<div class="q-write">
							<span class="pilcrow" aria-hidden="true">¶</span>
							<div class="wl">
								<textarea
									id="qcustom-{qIndex}"
									rows="1"
									placeholder="In your own words…"
									bind:value={curAns.custom}
									oninput={autogrow}
									onkeydown={(e) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault();
											if (qAnswered) advance();
										}
									}}
								></textarea>
								<div class="rule" aria-hidden="true"></div>
							</div>
						</div>
					{:else}
						<button class="opt custom" style:--oi={curQ.options.length} onclick={openCustom}>
							<span class="opt-mark" aria-hidden="true">
								<svg
									class="opt-quill"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg
								>
							</span>
							<span class="opt-text"><span class="opt-title write">Write your own…</span></span>
						</button>
					{/if}
				{/if}
			</div>

			<div class="q-foot">
				{#if curQ.allowSkip}
					<button class="q-skip" onclick={skipQuestion}>none of these — skip</button>
				{/if}
				<div class="q-nav">
					{#if qIndex > 0}
						<button class="q-back" onclick={() => goQ(-1)} aria-label="Previous question">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg
							>
						</button>
					{/if}
					<button class="q-next" class:ready={qAnswered} disabled={!qAnswered} onclick={advance}>
						<span class="next-label">{isLastQ ? 'Seal answer' : 'Next'}</span>
						{#if isLastQ}
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.4"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg
							>
						{:else}
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.4"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg
							>
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/key}
</div>

<style>
	/* a soft leaf laid on the page — every corner rounded, no hard rule */
	.query {
		position: relative;
		padding: 20px 22px 18px;
		border: 1px solid var(--rule);
		border-radius: 22px;
		background: var(--paper);
		box-shadow: 0 20px 52px -34px rgba(0, 0, 0, 0.4);
		font-family: var(--body);
	}
	.query.sealing {
		pointer-events: none;
	}

	.query-head {
		display: flex;
		align-items: center;
		gap: 9px;
		margin-bottom: 16px;
	}
	.q-badge {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		flex: none;
		color: var(--ink-2);
		background: color-mix(in srgb, var(--ink) 7%, transparent);
		animation: badgeIn 0.5s 0.1s var(--spring) backwards;
	}
	@keyframes badgeIn {
		from {
			transform: scale(0);
		}
	}
	.q-kicker {
		font-family: var(--mono);
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.q-from {
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		color: var(--ink-3);
	}
	/* progress as a thread that fills green, the way the spine fills with ink */
	.q-meter {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.q-track {
		width: clamp(64px, 12vw, 104px);
		height: 4px;
		border-radius: 999px;
		background: var(--rule-faint);
		overflow: hidden;
	}
	.q-fill {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--ok);
		transition: width 0.45s var(--spring);
	}
	.q-count {
		font-family: var(--mono);
		font-size: 10px;
		color: var(--ink-3);
	}

	.q-body {
		animation: qIn 0.42s var(--out);
	}
	@keyframes qIn {
		from {
			opacity: 0;
			transform: translateX(calc(var(--dir, 1) * 26px));
		}
	}
	.q-prompt {
		font-family: var(--serif);
		font-size: clamp(20px, 2.8vw, 25px);
		font-weight: 400;
		line-height: 1.25;
		margin: 0;
		color: var(--ink);
	}
	.q-hint {
		display: inline-block;
		margin: 7px 0 14px;
		font-family: var(--mono);
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ink-3);
	}

	.q-options {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.opt {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		width: 100%;
		text-align: left;
		padding: 11px 14px;
		border-radius: 12px;
		border: 1px solid var(--rule-faint);
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		transition:
			border-color 0.18s,
			background 0.18s,
			transform 0.22s var(--spring);
		animation: optIn 0.5s var(--out) backwards;
		animation-delay: calc(var(--oi) * 0.055s + 0.08s);
	}
	@keyframes optIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	.opt:hover {
		border-color: color-mix(in srgb, var(--vermilion) 40%, var(--rule));
		background: var(--vermilion-soft);
		transform: translateX(3px);
	}
	.opt.sel {
		border-color: var(--vermilion);
		background: var(--vermilion-soft);
	}
	/* a typeset ballot: each choice carries a letter; your pick is stamped in vermilion */
	.opt-mark {
		flex: none;
		display: grid;
		place-items: center;
		width: 23px;
		height: 23px;
		margin-top: 1px;
		border: 1.5px solid var(--rule);
		border-radius: 50%;
		background: color-mix(in srgb, var(--ink) 4%, transparent);
		transition:
			border-color 0.2s,
			background 0.3s var(--spring);
	}
	.opt.multi .opt-mark {
		border-radius: 7px;
	}
	.opt-letter {
		font-family: var(--mono);
		font-size: 11px;
		font-weight: 500;
		line-height: 1;
		color: var(--ink-3);
		transition: color 0.2s;
	}
	.opt-quill {
		color: var(--ink-3);
		transition: color 0.2s;
	}
	.opt:hover .opt-mark {
		border-color: var(--vermilion);
	}
	.opt:hover .opt-letter,
	.opt.custom:hover .opt-quill {
		color: var(--vermilion);
	}
	.opt.sel .opt-mark {
		border-color: var(--vermilion);
		background: var(--vermilion);
		animation: stampIn 0.35s var(--spring);
	}
	.opt.sel .opt-letter {
		color: var(--paper);
	}
	@keyframes stampIn {
		from {
			transform: scale(1.6);
		}
		to {
			transform: scale(1);
		}
	}
	.opt-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.opt-title {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-family: var(--body);
		font-size: 14.5px;
		font-weight: 600;
		line-height: 1.4;
		color: var(--ink);
	}
	.opt-title.write {
		font-family: var(--serif);
		font-style: italic;
		font-weight: 400;
		font-size: 15px;
		color: var(--ink-2);
	}
	.opt-explain {
		font-family: var(--body);
		font-size: 13px;
		line-height: 1.5;
		color: var(--ink-2);
	}
	/* the agent's own recommendation — a quiet marginal note, not a loud tag */
	.opt-rec {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--mono);
		font-size: 9px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-3);
		border: 1px solid var(--rule);
		padding: 2px 7px 2px 6px;
		border-radius: 999px;
		transform: translateY(-1px);
	}
	.opt-rec svg {
		opacity: 0.7;
		color: var(--ink-2);
	}
	.opt.custom {
		border-style: dashed;
	}

	/* write-your-own: the page's growing edge, in miniature */
	.q-write {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 6px 14px 4px;
		margin-top: 2px;
		animation: optIn 0.4s var(--out);
	}
	.q-write .pilcrow {
		flex: none;
		font-family: var(--serif);
		font-size: 19px;
		color: var(--vermilion);
		transform: translateY(2px);
	}
	.q-write .wl {
		flex: 1;
		position: relative;
	}
	.q-write textarea {
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		overflow-y: hidden;
		font-family: var(--body);
		font-size: 15px;
		line-height: 1.55;
		color: var(--ink);
		caret-color: var(--vermilion);
		padding: 2px 0 7px;
		max-height: 28vh;
	}
	.q-write textarea::placeholder {
		font-family: var(--serif);
		font-style: italic;
		font-size: 15.5px;
		color: var(--ink-3);
	}
	.q-write .rule {
		height: 1.5px;
		background: var(--rule);
		border-radius: 999px;
		position: relative;
		overflow: hidden;
	}
	.q-write .rule::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--vermilion);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.55s var(--out);
	}
	.q-write:focus-within .rule::after {
		transform: scaleX(1);
	}

	.q-foot {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-top: 18px;
	}
	.q-skip {
		border: none;
		background: none;
		padding: 0;
		font-family: var(--body);
		font-size: 12.5px;
		color: var(--ink-3);
		cursor: pointer;
		border-bottom: 1px dotted var(--rule);
		transition: color 0.2s;
	}
	.q-skip:hover {
		color: var(--vermilion);
	}
	.q-nav {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.q-back {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 999px;
		border: 1.5px solid var(--rule);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
		transition:
			transform 0.2s var(--spring),
			border-color 0.2s,
			color 0.2s;
	}
	.q-back:hover {
		color: var(--vermilion);
		border-color: var(--vermilion);
		transform: translateX(-2px);
	}
	.q-next {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 18px;
		border-radius: 999px;
		border: 1.5px solid var(--rule);
		background: transparent;
		color: var(--ink-3);
		font-family: var(--sans, var(--body));
		font-size: 13px;
		font-weight: 620;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition:
			background 0.25s,
			color 0.25s,
			border-color 0.25s,
			transform 0.15s,
			box-shadow 0.25s;
	}
	.q-next:disabled {
		cursor: default;
		opacity: 0.5;
	}
	.q-next.ready {
		background: var(--vermilion);
		border-color: var(--vermilion);
		color: #fff8ef;
		box-shadow: 0 4px 18px var(--vermilion-soft);
	}
	.q-next.ready:hover {
		transform: translateY(-2px);
		box-shadow: 0 7px 22px color-mix(in srgb, var(--vermilion) 25%, transparent);
	}
	.q-next svg {
		transition: transform 0.3s var(--spring);
	}
	.q-next.ready:hover svg {
		transform: translateX(2px);
	}
	.next-label {
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.query *,
		.query *::before,
		.query *::after {
			animation-duration: 0.01ms !important;
			animation-delay: 0s !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
