/*
 * inlineConfirm — a pointer-anchored confirmation, the inline answer to the
 * corner toast. A small wax-seal ✓ rises from where the user just clicked and
 * fades like drying ink. It tracks the last pointer position globally, so every
 * call site stays a one-liner — no threading events through handlers.
 *
 * Use this for confirmations that are tied to a click but have no persistent
 * element to mark (content-click copies, closing menu items, etc.). For actions
 * with a durable control, prefer flipping that control's own state instead.
 */

let lastX = 0;
let lastY = 0;
let tracking = false;

function startTracking() {
	if (tracking || typeof window === 'undefined') return;
	tracking = true;
	const update = (e: PointerEvent) => {
		lastX = e.clientX;
		lastY = e.clientY;
	};
	window.addEventListener('pointerdown', update, { capture: true, passive: true });
	window.addEventListener('pointermove', update, { capture: true, passive: true });
}

// begin tracking as soon as the module is imported
startTracking();

export interface InlineConfirmOptions {
	/** Override the anchor point (defaults to the last pointer position). */
	x?: number;
	y?: number;
	/** Show the rising wax-seal ✓ glyph (default true). */
	icon?: boolean;
}

export function inlineConfirm(message: string, opts: InlineConfirmOptions = {}): void {
	if (typeof document === 'undefined') return;
	startTracking();

	const x = opts.x ?? lastX ?? window.innerWidth / 2;
	const y = opts.y ?? lastY ?? 80;
	const withIcon = opts.icon ?? true;

	const el = document.createElement('div');
	el.className = 'inline-confirm';
	el.setAttribute('role', 'status');
	el.setAttribute('aria-live', 'polite');

	if (withIcon) {
		const ns = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(ns, 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('width', '12');
		svg.setAttribute('height', '12');
		svg.setAttribute('fill', 'none');
		svg.setAttribute('stroke', 'currentColor');
		svg.setAttribute('stroke-width', '2.6');
		svg.setAttribute('stroke-linecap', 'round');
		svg.setAttribute('stroke-linejoin', 'round');
		svg.setAttribute('aria-hidden', 'true');
		const path = document.createElementNS(ns, 'path');
		path.setAttribute('d', 'M5 13l4 4L19 7');
		svg.appendChild(path);
		el.appendChild(svg);
	}

	const label = document.createElement('span');
	label.textContent = message;
	el.appendChild(label);

	// keep the chip on-screen if the click was near an edge
	el.style.left = `${Math.max(12, Math.min(x, window.innerWidth - 12))}px`;
	el.style.top = `${Math.max(28, y)}px`;

	document.body.appendChild(el);

	requestAnimationFrame(() => el.classList.add('inline-confirm--in'));
	window.setTimeout(() => el.classList.add('inline-confirm--out'), 1000);
	window.setTimeout(() => el.remove(), 1450);
}
