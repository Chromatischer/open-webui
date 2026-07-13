/*
 * inlineError — inline, element-anchored error feedback (the toast replacement).
 *
 * Instead of a detached toast, the error appears ON the element the user just
 * interacted with: the element gives a short red shake and a small message
 * bubble is anchored just beneath it, then fades on its own (or on the next
 * interaction). This keeps cause and effect together.
 *
 * Use this when the error is coupled to an on-screen element (a clicked button,
 * a field) and/or is something the user can act on. Pass that element
 * (e.currentTarget in a handler, or a bind:this ref).
 *
 * Do NOT use this for hard, unrecoverable failures — those get a popup
 * (ConfirmDialog / a modal). And if there is genuinely no element to anchor to
 * AND the failure is graceful + not user-fixable, a toast is still acceptable.
 */

export interface InlineErrorOptions {
	/** How long the bubble stays before fading, ms (default 4200). */
	hold?: number;
	/** Skip the shake (e.g. for non-button anchors). */
	noShake?: boolean;
}

let activeBubble: HTMLElement | null = null;
let activeCleanup: (() => void) | null = null;

function dismissActive() {
	if (activeCleanup) {
		const fn = activeCleanup;
		activeCleanup = null;
		activeBubble = null;
		fn();
	}
}

export function inlineError(
	el: HTMLElement | null | undefined,
	message: string,
	opts: InlineErrorOptions = {}
): void {
	if (typeof document === 'undefined') return;
	// No anchor → caller should fall back to a toast; do nothing here.
	if (!el) return;

	// Only one inline error at a time.
	dismissActive();

	const hold = opts.hold ?? 4200;

	if (!opts.noShake) {
		el.classList.remove('inline-error-shake');
		// force reflow so the animation can replay
		void el.offsetWidth;
		el.classList.add('inline-error-shake');
		window.setTimeout(() => el.classList.remove('inline-error-shake'), 480);
	}

	const bubble = document.createElement('div');
	bubble.className = 'inline-error-bubble';
	bubble.setAttribute('role', 'alert');
	bubble.textContent = message;
	document.body.appendChild(bubble);

	const place = () => {
		const r = el.getBoundingClientRect();
		const bw = bubble.offsetWidth;
		// anchor under the element, clamped to the viewport
		let left = r.left + r.width / 2 - bw / 2;
		left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
		bubble.style.left = `${left}px`;
		bubble.style.top = `${r.bottom + 8}px`;
	};
	place();
	requestAnimationFrame(() => {
		place();
		bubble.classList.add('inline-error-bubble--in');
	});

	const reposition = () => place();
	window.addEventListener('scroll', reposition, true);
	window.addEventListener('resize', reposition);

	let removeTimer = 0;
	const cleanup = () => {
		window.clearTimeout(removeTimer);
		window.removeEventListener('scroll', reposition, true);
		window.removeEventListener('resize', reposition);
		bubble.classList.remove('inline-error-bubble--in');
		window.setTimeout(() => bubble.remove(), 220);
	};

	activeBubble = bubble;
	activeCleanup = cleanup;

	removeTimer = window.setTimeout(dismissActive, hold);
	// any pointer/keydown elsewhere clears it early
	const onDismiss = () => dismissActive();
	window.setTimeout(() => {
		window.addEventListener('pointerdown', onDismiss, { once: true });
		window.addEventListener('keydown', onDismiss, { once: true });
	}, 0);
}
