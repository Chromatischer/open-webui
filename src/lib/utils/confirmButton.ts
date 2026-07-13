/*
 * confirmButton — true inline confirmation for actions with no visible result.
 *
 * For things like "Save settings" where nothing on the page changes, the button
 * itself becomes the confirmation: a green wash sweeps over it and a ✓ draws on,
 * then it settles back. No toast, no separate indicator.
 *
 * It overlays the button rather than replacing its label, so it works on any
 * button regardless of internal markup and never disturbs layout. Pass the
 * button element (e.currentTarget, or a bind:this) on a successful action.
 *
 * Do NOT use this for actions that already announce themselves by changing the
 * UI (archiving removes a row, a toggle flips) — those need no confirmation.
 */

export interface ConfirmButtonOptions {
	/** Optional short word shown next to the ✓ (e.g. "Saved"). */
	label?: string;
	/** How long the confirmed state holds, ms (default 1100). */
	hold?: number;
}

export function confirmButton(
	el: HTMLElement | null | undefined,
	opts: ConfirmButtonOptions = {}
): void {
	if (!el || typeof document === 'undefined') return;
	// don't stack if pressed repeatedly
	if (el.dataset.confirming === '1') return;
	el.dataset.confirming = '1';

	const hold = opts.hold ?? 1100;
	const prevPosition = el.style.position;
	if (getComputedStyle(el).position === 'static') {
		el.style.position = 'relative';
	}
	// the seal sizes to its own content and can overhang a narrow button, so the
	// button must not clip it while the confirmation is showing
	const prevOverflow = el.style.overflow;
	if (getComputedStyle(el).overflow !== 'visible') {
		el.style.overflow = 'visible';
	}

	const overlay = document.createElement('span');
	overlay.className = 'btn-confirm-overlay';
	overlay.setAttribute('aria-hidden', 'true');

	const ns = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(ns, 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('width', '15');
	svg.setAttribute('height', '15');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2.6');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	const path = document.createElementNS(ns, 'path');
	path.setAttribute('d', 'M5 13l4 4L19 7');
	path.setAttribute('class', 'btn-confirm-check');
	svg.appendChild(path);
	overlay.appendChild(svg);

	if (opts.label) {
		const label = document.createElement('span');
		label.textContent = opts.label;
		overlay.appendChild(label);
	}

	el.appendChild(overlay);
	requestAnimationFrame(() => overlay.classList.add('btn-confirm-overlay--in'));

	window.setTimeout(() => {
		overlay.classList.remove('btn-confirm-overlay--in');
		window.setTimeout(() => {
			overlay.remove();
			el.style.position = prevPosition;
			el.style.overflow = prevOverflow;
			delete el.dataset.confirming;
		}, 420);
	}, hold);
}
